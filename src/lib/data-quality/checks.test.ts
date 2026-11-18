import { describe, expect, it } from "vitest";
import {
  checkBrands,
  checkImages,
  checkProvenanceAndFreshness,
  checkReviews,
  checkScoreOutliers,
  checkSpecs,
  currentSeason,
  runChecks,
  type DQProduct,
} from "./checks";

const NOW = new Date("2026-11-16T00:00:00Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000);
const real = { name: "Test Mag", isPlaceholder: false };
const placeholder = { name: "Seed placeholder", isPlaceholder: true };

function ski(over: Partial<DQProduct> = {}, spec: Partial<NonNullable<DQProduct["ski"]>> = {}): DQProduct {
  return {
    slug: "brand-ski-2026",
    kind: "SKI",
    modelYear: 2026,
    discontinued: false,
    specsVerifiedAt: daysAgo(10),
    reviewScoreAgg: 85,
    ski: {
      category: "ALL_MOUNTAIN",
      flex: 7,
      refTipMm: 135,
      refWaistMm: 96,
      refTailMm: 120,
      refRadiusM: 18,
      refLengthCm: 177,
      mountPointCm: -8,
      mountStyle: "PROGRESSIVE",
      sizes: [170, 177, 184].map((lengthCm) => ({ lengthCm, waistMm: 96 })),
      ...spec,
    },
    images: [{ isPrimary: true, licenseNote: "Press kit, editorial use OK", lastVerifiedAt: daysAgo(1) }],
    reviews: [{ score: 88, reviewedAt: daysAgo(30), modelYearReviewed: 2026, source: real }],
    prices: [{ checkedAt: daysAgo(1) }],
    ...over,
  };
}

const codes = (xs: { code: string }[]) => xs.map((x) => x.code);

describe("currentSeason", () => {
  it("rolls over in July", () => {
    expect(currentSeason(new Date("2026-11-16"))).toBe(2026);
    expect(currentSeason(new Date("2027-03-01"))).toBe(2026);
    expect(currentSeason(new Date("2027-07-01"))).toBe(2027);
  });
});

describe("a clean product", () => {
  it("raises nothing", () => {
    const { issues } = runChecks([ski()], [], { now: NOW });
    expect(issues).toEqual([]);
  });
});

describe("checkSpecs", () => {
  it("errors when the spec row is missing", () => {
    expect(codes(checkSpecs(ski({ ski: null })))).toEqual(["MISSING_SPEC"]);
  });

  it("errors when the waist is wider than tip or tail", () => {
    expect(codes(checkSpecs(ski({}, { refTipMm: 90 })))).toContain("INCONSISTENT_DIMS");
  });

  it("errors when the reference length isn't sold", () => {
    expect(codes(checkSpecs(ski({}, { refLengthCm: 180 })))).toContain("INCONSISTENT_DIMS");
  });

  it("warns when the waist doesn't fit the category", () => {
    const issues = checkSpecs(ski({}, { category: "POWDER" }));
    expect(issues.find((i) => i.code === "CATEGORY_MISMATCH")?.severity).toBe("WARN");
  });

  it("warns when mount style contradicts mount point", () => {
    expect(codes(checkSpecs(ski({}, { mountPointCm: -1 })))).toContain("MOUNT_STYLE_MISMATCH");
  });

  it("flags a wide board size that isn't wide, and missing weight ranges", () => {
    const board: DQProduct = {
      ...ski({ kind: "SNOWBOARD", ski: null }),
      snowboard: {
        category: "ALL_MOUNTAIN",
        flex: 6,
        shape: "TRUE_TWIN",
        setbackMm: 0,
        taperMm: 0,
        sizes: [
          { label: "158", lengthCm: 158, waistWidthMm: 252, isWide: false, riderWeightMinKg: 60, riderWeightMaxKg: 90 },
          { label: "158W", lengthCm: 158, waistWidthMm: 255, isWide: true, riderWeightMinKg: null, riderWeightMaxKg: null },
        ],
      },
    };
    const c = codes(checkSpecs(board));
    expect(c).toContain("INCONSISTENT_DIMS");
    expect(c).toContain("SIZE_NO_WEIGHT_RANGE");
  });

  it("errors on an inverted DIN range", () => {
    const binding: DQProduct = {
      ...ski({ kind: "SKI_BINDING", ski: null }),
      skiBinding: { dinMin: 12, dinMax: 4, brakeWidthsMm: [100], soleCompat: ["GRIPWALK"] },
    };
    expect(codes(checkSpecs(binding))).toEqual(["INCONSISTENT_DIMS"]);
  });
});

describe("checkImages", () => {
  it("warns on missing primary image", () => {
    expect(codes(checkImages(ski({ images: [] }), NOW))).toEqual(["MISSING_IMAGE"]);
  });

  it("errors when an image has no license note", () => {
    const issues = checkImages(ski({ images: [{ isPrimary: true, licenseNote: " ", lastVerifiedAt: daysAgo(1) }] }), NOW);
    expect(issues[0]?.severity).toBe("ERROR");
  });

  it("warns when an image hasn't been health-checked recently", () => {
    const issues = checkImages(ski({ images: [{ isPrimary: true, licenseNote: "ok", lastVerifiedAt: daysAgo(45) }] }), NOW);
    expect(codes(issues)).toEqual(["IMAGE_UNVERIFIED"]);
  });
});

describe("checkReviews", () => {
  it("flags reviews older than a season", () => {
    const p = ski({ reviews: [{ score: 85, reviewedAt: daysAgo(500), modelYearReviewed: 2024, source: real }] });
    expect(codes(checkReviews(p, NOW))).toEqual(["STALE_REVIEWS"]);
  });

  it("flags placeholder-only reviews and nothing else", () => {
    const p = ski({ reviews: [{ score: 85, reviewedAt: daysAgo(900), modelYearReviewed: 2020, source: placeholder }] });
    expect(codes(checkReviews(p, NOW))).toEqual(["PLACEHOLDER_REVIEWS"]);
  });

  it("flags a source that disagrees with the rest", () => {
    const p = ski({
      reviews: [
        { score: 88, reviewedAt: daysAgo(10), modelYearReviewed: 2026, source: { name: "A", isPlaceholder: false } },
        { score: 86, reviewedAt: daysAgo(10), modelYearReviewed: 2026, source: { name: "B", isPlaceholder: false } },
        { score: 55, reviewedAt: daysAgo(10), modelYearReviewed: 2026, source: { name: "C", isPlaceholder: false } },
      ],
    });
    const issues = checkReviews(p, NOW).filter((i) => i.code === "REVIEW_SOURCE_DISAGREEMENT");
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain("C scored 55");
  });

  it("warns when there are no reviews at all", () => {
    expect(codes(checkReviews(ski({ reviews: [] }), NOW))).toEqual(["NO_REVIEWS"]);
  });
});

describe("checkScoreOutliers", () => {
  it("flags a product far from its category peers", () => {
    const peers = [80, 81, 82, 83, 84, 85, 82, 81, 83, 82].map((s, i) => ski({ slug: `p${i}`, reviewScoreAgg: s }));
    const outlier = ski({ slug: "weird", reviewScoreAgg: 40 });
    const issues = checkScoreOutliers([...peers, outlier]);
    expect(issues.map((i) => i.subject)).toEqual(["weird"]);
  });

  it("skips groups that are too small", () => {
    expect(checkScoreOutliers([ski({ reviewScoreAgg: 40 }), ski({ reviewScoreAgg: 90 })])).toEqual([]);
  });
});

describe("provenance, freshness and brands", () => {
  it("flags unverified specs, missing fresh price, and old model years", () => {
    const p = ski({ specsVerifiedAt: null, prices: [{ checkedAt: daysAgo(8) }], modelYear: 2023 });
    expect(codes(checkProvenanceAndFreshness(p, NOW)).sort()).toEqual(["NO_FRESH_PRICE", "OLD_MODEL_YEAR", "UNVERIFIED_SPECS"]);
  });

  it("does not nag about prices for discontinued products", () => {
    expect(codes(checkProvenanceAndFreshness(ski({ discontinued: true, prices: [] }), NOW))).toEqual([]);
  });

  it("flags estimated and stale brand reputation", () => {
    const c = codes(checkBrands([{ slug: "b", reputationIsEstimate: true, reputationReviewedAt: daysAgo(500) }], NOW));
    expect(c).toEqual(["BRAND_REPUTATION_ESTIMATE", "BRAND_REPUTATION_STALE"]);
  });
});

describe("feeds and image health", () => {
  it("flags broken images and treats a broken primary as missing", () => {
    const p = ski({ images: [{ isPrimary: true, licenseNote: "ok license", lastVerifiedAt: daysAgo(1), brokenSince: daysAgo(2) }] });
    expect(codes(checkImages(p, NOW)).sort()).toEqual(["IMAGE_BROKEN", "MISSING_IMAGE"]);
  });

  it("flags products whose only fresh prices are from the mock feed", () => {
    const p = ski({ prices: [{ checkedAt: daysAgo(1), retailer: { network: "MOCK" } }] });
    expect(codes(checkProvenanceAndFreshness(p, NOW))).toEqual(["ONLY_MOCK_PRICES"]);
    const real = ski({ prices: [{ checkedAt: daysAgo(1), retailer: { network: "MOCK" } }, { checkedAt: daysAgo(1), retailer: { network: "CJ" } }] });
    expect(codes(checkProvenanceAndFreshness(real, NOW))).toEqual([]);
  });

  it("mock-only prices block launch in strict mode", () => {
    const p = ski({ prices: [{ checkedAt: daysAgo(1), retailer: { network: "MOCK" } }] });
    expect(runChecks([p], [], { now: NOW, strict: true }).issues.find((i) => i.code === "ONLY_MOCK_PRICES")?.severity).toBe("ERROR");
  });
});

describe("strict mode", () => {
  it("escalates launch blockers to errors", () => {
    const p = ski({ images: [], specsVerifiedAt: null });
    expect(runChecks([p], [], { now: NOW }).summary.ERROR).toBe(0);
    expect(runChecks([p], [], { now: NOW, strict: true }).summary.ERROR).toBe(2);
  });
});
