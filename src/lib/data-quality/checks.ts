/**
 * Data-quality checks: pure functions over a catalog snapshot.
 * The script (scripts/data-quality.ts) loads the snapshot from Postgres.
 *
 * Severity: ERROR fails the run; WARN is reported; INFO is context.
 * `strict` (launch mode) escalates LAUNCH_BLOCKERS from WARN to ERROR.
 */
import { REVIEW_AGGREGATION, BUDGET } from "../scoring/weights";

export type Severity = "ERROR" | "WARN" | "INFO";

export type IssueCode =
  | "MISSING_SPEC"
  | "INCONSISTENT_DIMS"
  | "CATEGORY_MISMATCH"
  | "MOUNT_STYLE_MISMATCH"
  | "SIZE_NO_WEIGHT_RANGE"
  | "MISSING_IMAGE"
  | "IMAGE_NO_LICENSE"
  | "IMAGE_UNVERIFIED"
  | "IMAGE_BROKEN"
  | "NO_REVIEWS"
  | "PLACEHOLDER_REVIEWS"
  | "STALE_REVIEWS"
  | "REVIEW_SOURCE_DISAGREEMENT"
  | "REVIEW_SCORE_OUTLIER"
  | "UNVERIFIED_SPECS"
  | "NO_FRESH_PRICE"
  | "ONLY_MOCK_PRICES"
  | "OLD_MODEL_YEAR"
  | "BRAND_REPUTATION_ESTIMATE"
  | "BRAND_REPUTATION_STALE";

export interface Issue {
  severity: Severity;
  code: IssueCode;
  subject: string; // product or brand slug
  message: string;
}

export const LAUNCH_BLOCKERS: IssueCode[] = [
  "MISSING_IMAGE",
  "PLACEHOLDER_REVIEWS",
  "UNVERIFIED_SPECS",
  "BRAND_REPUTATION_ESTIMATE",
  "NO_REVIEWS",
  "ONLY_MOCK_PRICES",
];

export const DQ = {
  imageVerifyMaxAgeDays: 30,
  sourceDisagreementPts: 15,
  outlierSd: 2.5,
  outlierMinGroupSize: 5,
  wideBoardMinWaistMm: 258,
  skiWaistByCategory: {
    FRONTSIDE: [60, 92],
    ALL_MOUNTAIN: [84, 103],
    ALL_MOUNTAIN_WIDE: [98, 112],
    POWDER: [104, 140],
  } as Record<string, [number, number]>,
};

// ── Snapshot shape (a structural subset of the Prisma include in the script) ──

export interface DQSkiSize { lengthCm: number; waistMm: number }
export interface DQBoardSize {
  label: string;
  lengthCm: number;
  waistWidthMm: number;
  isWide: boolean;
  riderWeightMinKg: number | null;
  riderWeightMaxKg: number | null;
}

export interface DQProduct {
  slug: string;
  kind: string;
  modelYear: number;
  discontinued: boolean;
  specsVerifiedAt: Date | null;
  reviewScoreAgg: number | null;
  ski?: {
    category: string;
    flex: number;
    refTipMm: number;
    refWaistMm: number;
    refTailMm: number;
    refRadiusM: number;
    refLengthCm: number;
    mountPointCm: number | null;
    mountStyle: string;
    sizes: DQSkiSize[];
  } | null;
  snowboard?: {
    category: string;
    flex: number;
    shape: string;
    setbackMm: number;
    taperMm: number;
    sizes: DQBoardSize[];
  } | null;
  skiBinding?: { dinMin: number; dinMax: number; brakeWidthsMm: number[]; soleCompat: string[] } | null;
  boardBinding?: { flex: number; mountCompat: string[]; sizeRanges: unknown } | null;
  skiBoot?: { flex: number; lastWidthMm: number; mondoMin: number; mondoMax: number } | null;
  boardBoot?: { flex: number; usSizeMin: number; usSizeMax: number } | null;
  images: { isPrimary: boolean; licenseNote: string; lastVerifiedAt: Date | null; brokenSince?: Date | null }[];
  reviews: { score: number; reviewedAt: Date; modelYearReviewed: number; source: { name: string; isPlaceholder: boolean } }[];
  prices: { checkedAt: Date; retailer?: { network: string } }[];
}

export interface DQBrand {
  slug: string;
  reputationIsEstimate: boolean;
  reputationReviewedAt: Date;
}

// ── Helpers ──

const DAY = 86_400_000;
const ageDays = (d: Date, now: Date) => (now.getTime() - d.getTime()) / DAY;

/** Season start year: Jul–Dec → this year; Jan–Jun → last year. */
export function currentSeason(now: Date) {
  return now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}

function median(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

// ── Per-product checks ──

export function checkSpecs(p: DQProduct): Issue[] {
  const out: Issue[] = [];
  const err = (code: IssueCode, message: string, severity: Severity = "ERROR") =>
    out.push({ severity, code, subject: p.slug, message });

  switch (p.kind) {
    case "SKI": {
      const s = p.ski;
      if (!s) return [{ severity: "ERROR", code: "MISSING_SPEC", subject: p.slug, message: "No ski spec row" }];
      if (!s.sizes.length) err("MISSING_SPEC", "No lengths listed");
      if (s.flex < 1 || s.flex > 10) err("MISSING_SPEC", `Flex ${s.flex} outside 1–10`);
      if (s.refTipMm <= s.refWaistMm || s.refTailMm <= s.refWaistMm)
        err("INCONSISTENT_DIMS", `Tip/tail must be wider than waist (${s.refTipMm}/${s.refWaistMm}/${s.refTailMm})`);
      if (s.sizes.length && !s.sizes.some((z) => z.lengthCm === s.refLengthCm))
        err("INCONSISTENT_DIMS", `Reference length ${s.refLengthCm}cm is not an available length`);
      const range = DQ.skiWaistByCategory[s.category];
      if (range && (s.refWaistMm < range[0] || s.refWaistMm > range[1]))
        err("CATEGORY_MISMATCH", `${s.refWaistMm}mm waist is unusual for ${s.category} (${range[0]}–${range[1]})`, "WARN");
      if (s.mountPointCm !== null) {
        const expected = s.mountPointCm <= -10 ? "TRADITIONAL" : s.mountPointCm <= -4 ? "PROGRESSIVE" : "CENTERED";
        if (expected !== s.mountStyle)
          err("MOUNT_STYLE_MISMATCH", `Mount ${s.mountPointCm}cm implies ${expected}, recorded ${s.mountStyle}`, "WARN");
      }
      break;
    }
    case "SNOWBOARD": {
      const b = p.snowboard;
      if (!b) return [{ severity: "ERROR", code: "MISSING_SPEC", subject: p.slug, message: "No snowboard spec row" }];
      if (!b.sizes.length) err("MISSING_SPEC", "No sizes listed");
      if (b.flex < 1 || b.flex > 10) err("MISSING_SPEC", `Flex ${b.flex} outside 1–10`);
      if (b.shape === "TRUE_TWIN" && (b.setbackMm > 0 || b.taperMm > 0))
        err("INCONSISTENT_DIMS", "True twin with setback or taper", "WARN");
      for (const z of b.sizes) {
        if (z.isWide && z.waistWidthMm < DQ.wideBoardMinWaistMm)
          err("INCONSISTENT_DIMS", `${z.label} marked wide but waist is ${z.waistWidthMm}mm`, "WARN");
        if (z.riderWeightMinKg !== null && z.riderWeightMaxKg !== null && z.riderWeightMinKg >= z.riderWeightMaxKg)
          err("INCONSISTENT_DIMS", `${z.label} rider-weight range is inverted`);
      }
      const missingRange = b.sizes.filter((z) => z.riderWeightMinKg === null || z.riderWeightMaxKg === null);
      if (missingRange.length)
        err("SIZE_NO_WEIGHT_RANGE", `${missingRange.length}/${b.sizes.length} sizes lack a rider-weight range (formula fallback used)`, "INFO");
      break;
    }
    case "SKI_BINDING": {
      const b = p.skiBinding;
      if (!b) return [{ severity: "ERROR", code: "MISSING_SPEC", subject: p.slug, message: "No ski binding spec row" }];
      if (b.dinMin >= b.dinMax) err("INCONSISTENT_DIMS", `DIN range ${b.dinMin}–${b.dinMax} is inverted`);
      if (!b.brakeWidthsMm.length) err("MISSING_SPEC", "No brake widths");
      if (!b.soleCompat.length) err("MISSING_SPEC", "No sole compatibility");
      break;
    }
    case "SNOWBOARD_BINDING": {
      const b = p.boardBinding;
      if (!b) return [{ severity: "ERROR", code: "MISSING_SPEC", subject: p.slug, message: "No snowboard binding spec row" }];
      if (!b.mountCompat.length) err("MISSING_SPEC", "No mount compatibility");
      if (!Array.isArray(b.sizeRanges) || !b.sizeRanges.length) err("MISSING_SPEC", "No size ranges");
      break;
    }
    case "SKI_BOOT": {
      const b = p.skiBoot;
      if (!b) return [{ severity: "ERROR", code: "MISSING_SPEC", subject: p.slug, message: "No ski boot spec row" }];
      if (b.mondoMin >= b.mondoMax) err("INCONSISTENT_DIMS", "Mondo size range is inverted");
      if (b.lastWidthMm < 95 || b.lastWidthMm > 106) err("INCONSISTENT_DIMS", `Last width ${b.lastWidthMm}mm is implausible`);
      break;
    }
    case "SNOWBOARD_BOOT": {
      const b = p.boardBoot;
      if (!b) return [{ severity: "ERROR", code: "MISSING_SPEC", subject: p.slug, message: "No snowboard boot spec row" }];
      if (b.usSizeMin >= b.usSizeMax) err("INCONSISTENT_DIMS", "US size range is inverted");
      break;
    }
  }
  return out;
}

export function checkImages(p: DQProduct, now: Date): Issue[] {
  const out: Issue[] = [];
  if (!p.images.some((i) => i.isPrimary && !i.brokenSince))
    out.push({ severity: "WARN", code: "MISSING_IMAGE", subject: p.slug, message: "No working primary image (category silhouette will show)" });
  for (const i of p.images) {
    if (i.brokenSince) {
      out.push({ severity: "WARN", code: "IMAGE_BROKEN", subject: p.slug, message: `Image failing health check since ${i.brokenSince.toISOString().slice(0, 10)} (hidden on site)` });
      continue;
    }
    if (!i.licenseNote.trim())
      out.push({ severity: "ERROR", code: "IMAGE_NO_LICENSE", subject: p.slug, message: "Image has no license note" });
    if (!i.lastVerifiedAt || ageDays(i.lastVerifiedAt, now) > DQ.imageVerifyMaxAgeDays)
      out.push({ severity: "WARN", code: "IMAGE_UNVERIFIED", subject: p.slug, message: "Image URL not health-checked in 30 days" });
  }
  return out;
}

export function checkReviews(p: DQProduct, now: Date): Issue[] {
  const out: Issue[] = [];
  if (!p.reviews.length) {
    return [{ severity: "WARN", code: "NO_REVIEWS", subject: p.slug, message: "No review scores" }];
  }
  const real = p.reviews.filter((r) => !r.source.isPlaceholder);
  if (!real.length) {
    out.push({ severity: "WARN", code: "PLACEHOLDER_REVIEWS", subject: p.slug, message: "Only placeholder review scores" });
    return out; // staleness/outliers are meaningless for placeholders
  }
  const newest = real.reduce((a, b) => (a.reviewedAt > b.reviewedAt ? a : b));
  const season = currentSeason(now);
  if (ageDays(newest.reviewedAt, now) > REVIEW_AGGREGATION.staleAfterDays || newest.modelYearReviewed < season - 1) {
    out.push({
      severity: "WARN",
      code: "STALE_REVIEWS",
      subject: p.slug,
      message: `Newest review is from ${newest.reviewedAt.toISOString().slice(0, 10)} (model year ${newest.modelYearReviewed})`,
    });
  }
  if (real.length === 2) {
    const [a, b] = real as [(typeof real)[0], (typeof real)[0]];
    if (Math.abs(a.score - b.score) > DQ.sourceDisagreementPts)
      out.push({
        severity: "WARN",
        code: "REVIEW_SOURCE_DISAGREEMENT",
        subject: p.slug,
        message: `${a.source.name} (${a.score}) and ${b.source.name} (${b.score}) disagree by ${Math.abs(a.score - b.score)} pts`,
      });
  } else if (real.length >= 3) {
    const mid = median(real.map((r) => r.score));
    for (const r of real) {
      const diff = r.score - mid;
      if (Math.abs(diff) > DQ.sourceDisagreementPts)
        out.push({
          severity: "WARN",
          code: "REVIEW_SOURCE_DISAGREEMENT",
          subject: p.slug,
          message: `${r.source.name} scored ${r.score}, ${Math.round(Math.abs(diff))} pts from the median of ${real.length} sources`,
        });
    }
  }
  return out;
}

export function checkProvenanceAndFreshness(p: DQProduct, now: Date): Issue[] {
  const out: Issue[] = [];
  if (!p.specsVerifiedAt)
    out.push({ severity: "WARN", code: "UNVERIFIED_SPECS", subject: p.slug, message: "Specs not yet checked against the manufacturer" });
  const fresh = p.prices.filter((x) => ageDays(x.checkedAt, now) <= BUDGET.priceMaxAgeDays);
  if (!p.discontinued && !fresh.length)
    out.push({ severity: "INFO", code: "NO_FRESH_PRICE", subject: p.slug, message: "No retailer price in the last 7 days (MSRP shown)" });
  else if (!p.discontinued && fresh.every((x) => x.retailer?.network === "MOCK"))
    out.push({ severity: "INFO", code: "ONLY_MOCK_PRICES", subject: p.slug, message: "Only mock-feed prices (connect real affiliate feeds before launch)" });
  if (!p.discontinued && p.modelYear < currentSeason(now) - 2)
    out.push({ severity: "INFO", code: "OLD_MODEL_YEAR", subject: p.slug, message: `Model year ${p.modelYear} may be superseded` });
  return out;
}

// ── Catalog-level checks ──

/** Aggregate review score far from its kind/category peers. */
export function checkScoreOutliers(products: DQProduct[]): Issue[] {
  const groups = new Map<string, DQProduct[]>();
  for (const p of products) {
    if (p.reviewScoreAgg === null) continue;
    const key = `${p.kind}:${p.ski?.category ?? p.snowboard?.category ?? "-"}`;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  const out: Issue[] = [];
  for (const [key, ps] of groups) {
    if (ps.length < DQ.outlierMinGroupSize) continue;
    const xs = ps.map((p) => p.reviewScoreAgg!);
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length);
    if (sd === 0) continue;
    for (const p of ps) {
      const z = (p.reviewScoreAgg! - mean) / sd;
      if (Math.abs(z) > DQ.outlierSd)
        out.push({
          severity: "WARN",
          code: "REVIEW_SCORE_OUTLIER",
          subject: p.slug,
          message: `Review score ${p.reviewScoreAgg!.toFixed(1)} is ${z.toFixed(1)} SD from ${key} mean ${mean.toFixed(1)}`,
        });
    }
  }
  return out;
}

export function checkBrands(brands: DQBrand[], now: Date): Issue[] {
  const out: Issue[] = [];
  for (const b of brands) {
    if (b.reputationIsEstimate)
      out.push({ severity: "WARN", code: "BRAND_REPUTATION_ESTIMATE", subject: b.slug, message: "Reputation sub-scores are seed estimates" });
    if (ageDays(b.reputationReviewedAt, now) > REVIEW_AGGREGATION.staleAfterDays)
      out.push({ severity: "WARN", code: "BRAND_REPUTATION_STALE", subject: b.slug, message: "Reputation not reviewed this season" });
  }
  return out;
}

// ── Runner ──

export function runChecks(
  products: DQProduct[],
  brands: DQBrand[],
  opts: { now: Date; strict?: boolean },
): { issues: Issue[]; summary: Record<Severity, number> } {
  const { now } = opts;
  let issues: Issue[] = [
    ...products.flatMap((p) => [
      ...checkSpecs(p),
      ...checkImages(p, now),
      ...checkReviews(p, now),
      ...checkProvenanceAndFreshness(p, now),
    ]),
    ...checkScoreOutliers(products),
    ...checkBrands(brands, now),
  ];
  if (opts.strict) {
    issues = issues.map((i) => (LAUNCH_BLOCKERS.includes(i.code) && i.severity !== "ERROR" ? { ...i, severity: "ERROR" } : i));
  }
  const summary = { ERROR: 0, WARN: 0, INFO: 0 } as Record<Severity, number>;
  for (const i of issues) summary[i.severity]++;
  return { issues, summary };
}
