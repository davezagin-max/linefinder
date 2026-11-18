/**
 * Recommendation engine entry point. Pure: no I/O.
 *
 *   recommend(input, catalog, now) → RecommendationResult
 *
 * Steps: targets → hard filters (with relaxation) → score → budget ranking →
 * tags/reasons → why-not → quivers → bindings & boots.
 */
import { bestValueIndex, rankWithBudget, resolvePrice, splitBudget } from "./budget";
import { abilityRangeMatch } from "./fit";
import { approxSkiCoverage, buildQuivers, cosine, jobCoverage, needVector, type QuiverPiece } from "./quiver";
import { buildReasons, type AveragePoints } from "./reasons";
import { reviewFallback, scorePrimary, type PrimaryScore } from "./score";
import { matchSetup } from "./setup";
import { sizeBoard, sizeSki, type SizeResult } from "./sizing";
import { deriveTargets } from "./targets";
import type {
  ComponentKey,
  EngineCatalog,
  EnginePrimary,
  PickTag,
  RecommendationResult,
  ResolvedPrice,
  RiderInput,
  RiderTargets,
  ScoredProduct,
} from "./types";
import { REASONS, SIZE_FIT, WEIGHTS_VERSION } from "./weights";
import { explainWhyNot, type Exclusion, type WhyNotCandidate } from "./whyNot";

export const ENGINE_VERSION = "0.2.0";

const COMPONENTS: ComponentKey[] = ["skillFlex", "conditions", "terrainStyle", "review", "brand", "demographic"];

type FilterLevel = "STRICT" | "RELAXED_SIZE" | "NONE";

interface Evaluated {
  product: EnginePrimary;
  size: SizeResult;
  score: PrimaryScore;
  total: number;
  price: ResolvedPrice;
}

function sizeFor(p: EnginePrimary, t: RiderTargets, input: RiderInput, relaxed: boolean): SizeResult {
  return p.kind === "SKI" ? sizeSki(p, t, relaxed) : sizeBoard(p, t, input.weightKg, relaxed);
}

/** Closest size ignoring every limit (for "closest matches" mode). */
function closestSize(p: EnginePrimary, t: RiderTargets, input: RiderInput): SizeResult {
  const s = sizeFor(p, t, input, true);
  if (s.eligible) return s;
  const target = s.targetCm;
  const sizes = p.kind === "SKI" ? p.sizes.map((x) => ({ label: `${x.lengthCm} cm`, len: x.lengthCm })) : p.sizes.map((x) => ({ label: x.label, len: x.lengthCm }));
  const best = sizes.reduce((a, b) => (Math.abs(b.len - target) < Math.abs(a.len - target) ? b : a));
  return { eligible: true, label: best.label, lengthCm: best.len, targetCm: target, delta: best.len - target, sizeFit: SIZE_FIT.minMultiplier };
}

function kitExclusion(p: EnginePrimary, size: SizeResult, input: RiderInput): Exclusion | undefined {
  if (p.kind !== "SKI") return undefined;
  const kept = input.kit.find((k) => k.kind === "SKI_BINDING" && k.intent === "KEEP" && k.brakeWidthMm);
  if (!kept) return undefined;
  const waist = p.sizes.find((s) => s.lengthCm === size.lengthCm)?.waistMm ?? p.waistMm;
  const brake = kept.brakeWidthMm!;
  if (brake >= waist && brake <= waist + 15) return undefined;
  return { kind: "KIT", text: `Your ${kept.label} has ${brake}mm brakes; this ${waist}mm-waist ski needs ${waist}–${waist + 15}mm` };
}

function evaluate(input: RiderInput, t: RiderTargets, products: EnginePrimary[], level: FilterLevel, now: Date) {
  const noReview = reviewFallback(products);
  const passed: Evaluated[] = [];
  const excluded = new Map<string, Exclusion>();
  for (const p of products) {
    let size: SizeResult;
    if (level === "NONE") {
      size = closestSize(p, t, input);
    } else {
      size = sizeFor(p, t, input, level === "RELAXED_SIZE");
      const touringGear = (p.kind === "SKI" && p.category === "TOURING") || (p.kind === "SNOWBOARD" && p.category === "SPLITBOARD");
      if (touringGear && !input.terrain.includes("backcountry")) {
        excluded.set(p.id, { kind: "TERRAIN", text: "Built for backcountry touring, which isn't on your terrain list" });
        continue;
      }
      if (level === "STRICT" && abilityRangeMatch(t.abilityIndex, p) === 0) {
        excluded.set(p.id, { kind: "ABILITY", text: `Built for ${p.abilityMin.toLowerCase()}–${p.abilityMax.toLowerCase()} riders` });
        continue;
      }
      if (!size.eligible) {
        excluded.set(p.id, { kind: "SIZE", text: size.reason ?? "No size fits you" });
        continue;
      }
      const kit = kitExclusion(p, size, input);
      if (kit) {
        excluded.set(p.id, kit);
        continue;
      }
    }
    const score = scorePrimary(p, input, t, size, noReview);
    passed.push({ product: p, size, score, total: score.total, price: resolvePrice(p, now) });
  }
  return { passed, excluded };
}

function ownedPieces(input: RiderInput, catalog: EngineCatalog): QuiverPiece[] {
  const kind = input.sport === "SKI" ? "SKI" : "SNOWBOARD";
  const all: EnginePrimary[] = [...catalog.skis, ...catalog.boards];
  const pieces: QuiverPiece[] = [];
  for (const k of input.kit) {
    if (k.kind !== kind || k.intent !== "KEEP") continue;
    const match = k.productId ? all.find((p) => p.id === k.productId) : undefined;
    if (match) {
      pieces.push({ ownedLabel: k.label, coverage: jobCoverage(match), itemScore: 0.7, priceCents: 0, waistMm: match.kind === "SKI" ? match.waistMm : undefined });
    } else if (kind === "SKI" && k.approxWaistMm) {
      pieces.push({ ownedLabel: k.label, coverage: approxSkiCoverage(k.approxWaistMm, k.approxFlex), itemScore: 0.7, priceCents: 0, waistMm: k.approxWaistMm });
    }
  }
  return pieces;
}

export function recommend(input: RiderInput, catalog: EngineCatalog, now: Date = new Date()): RecommendationResult {
  const t = deriveTargets(input);
  const products: EnginePrimary[] = input.sport === "SKI" ? catalog.skis : catalog.boards;
  const budgets = splitBudget(input);

  // ── Steps 1–3 with relaxation: budget first (inside rankWithBudget), then size, then closest ──
  let relaxed: RecommendationResult["relaxed"] = null;
  let { passed, excluded } = evaluate(input, t, products, "STRICT", now);
  const strictExcluded = excluded;
  if (!passed.length) {
    ({ passed, excluded } = evaluate(input, t, products, "RELAXED_SIZE", now));
    relaxed = "SIZE_TOLERANCE";
  }
  if (!passed.length) {
    ({ passed, excluded } = evaluate(input, t, products, "NONE", now));
    relaxed = "CLOSEST";
  }
  const ranked = rankWithBudget(passed, budgets.primary);
  if (ranked.relaxedBudget && relaxed === null) relaxed = "BUDGET";
  if (ranked.relaxedBudget) {
    t.conflicts.push({ code: "LOW_BUDGET", message: "Nothing fits your budget right now, so we're showing the best matches at any price." });
  }

  // ── Tags, reasons, warnings ──
  const avg = Object.fromEntries(
    COMPONENTS.map((k) => [k, passed.reduce((a, e) => a + e.score.breakdown[k].points, 0) / passed.length]),
  ) as AveragePoints;
  const owned = ownedPieces(input, catalog);
  const bestValue = bestValueIndex(ranked.list);

  const picks: ScoredProduct[] = ranked.list.map((e, i) => {
    const tags: PickTag[] = [];
    if (e.stretch) tags.push("STRETCH");
    if (i === bestValue) tags.push("BEST_VALUE");
    if (e.score.breakdown.review.limited) tags.push("LIMITED_REVIEWS");
    if (relaxed === "CLOSEST") tags.push("CLOSEST_MATCH");
    const cov = jobCoverage(e.product);
    if (owned.some((o) => cosine(o.coverage, cov) >= 0.97)) tags.push("OVERLAPS_KIT");

    const warnings: string[] = [];
    if (e.size.sizeFit < 1) warnings.push(`Closest size (${e.size.label}) is ${Math.round(Math.abs(e.size.delta))} cm off your ~${e.size.targetCm} cm target`);
    if (abilityRangeMatch(t.abilityIndex, e.product) < 1)
      warnings.push(`Built for ${e.product.abilityMin.toLowerCase()}–${e.product.abilityMax.toLowerCase()} riders, a bit of a stretch for you`);

    return {
      productId: e.product.id,
      total: Math.round(e.total * 10) / 10,
      breakdown: e.score.breakdown,
      recommendedSize: { label: e.size.label, deltaFromTargetCm: e.size.delta, targetCm: e.size.targetCm, note: e.size.note },
      price: e.price,
      tags,
      reasons: buildReasons(e.product, input, t, e.score, e.size, avg).slice(0, REASONS.detailPageMax),
      warnings,
    };
  });

  // ── Why not this one? ──
  const rankOf = new Map(ranked.list.map((e, i) => [e.product.id, i + 1]));
  const passedById = new Map(passed.map((e) => [e.product.id, e]));
  const candidates: WhyNotCandidate[] = products.map((p) => ({
    product: p,
    rank: rankOf.get(p.id) ?? null,
    breakdown: passedById.get(p.id)?.score.breakdown,
    priceCents: passedById.get(p.id)?.price.cents ?? resolvePrice(p, now).cents,
    exclusion: passedById.has(p.id) ? undefined : (excluded.get(p.id) ?? strictExcluded.get(p.id)),
  }));
  const reference = (ranked.list[9] ?? ranked.list.at(-1))?.score.breakdown;
  const whyNot = explainWhyNot(candidates, reference, t, budgets.primary);

  // ── Quivers ──
  const need = needVector(input, t);
  const pool: QuiverPiece[] = [...passed]
    .sort((a, b) => b.total - a.total)
    .map((e) => ({
      productId: e.product.id,
      coverage: jobCoverage(e.product),
      itemScore: e.total / 100,
      priceCents: e.price.cents,
      waistMm: e.product.kind === "SKI" ? e.product.waistMm : undefined,
    }));
  const quivers = { two: buildQuivers(pool, owned, need, 2), three: buildQuivers(pool, owned, need, 3) };

  // ── Bindings & boots ──
  const setups: RecommendationResult["setups"] = {};
  const ctx = { input, t, now, bindingBudget: budgets.binding, bootBudget: budgets.boot };
  for (const e of ranked.list) setups[e.product.id] = matchSetup(e.product, e.size, catalog, ctx);

  // ── Disclaimers ──
  const disclaimers: string[] = [];
  if (input.sport === "SKI") {
    disclaimers.push(
      "The DIN range shown is general guidance only. A certified ski shop technician must set your bindings' release value.",
    );
  }
  disclaimers.push("Boot recommendations are a starting point. Get fitted in person by a boot fitter before you buy.");
  if (ranked.list.some((e) => e.product.reviewsArePlaceholder)) {
    disclaimers.push("Development data: some review scores are placeholders, not real reviews.");
  }
  if (picks.some((p) => p.price.isMsrp)) disclaimers.push("Prices show MSRP where no current retailer price is available.");

  return {
    engineVersion: ENGINE_VERSION,
    weightsVersion: WEIGHTS_VERSION,
    targets: t,
    picks,
    relaxed,
    whyNot,
    quivers,
    setups,
    disclaimers,
  };
}
