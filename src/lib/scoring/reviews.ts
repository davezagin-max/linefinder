import { BRAND_REPUTATION_BLEND, REVIEW_AGGREGATION } from "./weights";

const DAY_MS = 86_400_000;

export interface ReviewInput {
  score: number; // 0–100
  credibility: number; // source multiplier
  reviewedAt: Date;
  modelYearReviewed: number;
}

/**
 * Weighted mean of one product's reviews (credibility × recency × model-year
 * factor). Returns the raw mean and the total weight ("effective reviews").
 * Reviews of a NEWER model year than the product are ignored.
 */
export function weightedReviewMean(reviews: ReviewInput[], productModelYear: number, now: Date) {
  let sumW = 0;
  let sumWS = 0;
  for (const r of reviews) {
    if (r.modelYearReviewed > productModelYear) continue;
    const ageDays = Math.max(0, (now.getTime() - r.reviewedAt.getTime()) / DAY_MS);
    const recency = 0.5 ** (ageDays / REVIEW_AGGREGATION.recencyHalfLifeDays);
    const yearFactor = r.modelYearReviewed < productModelYear ? REVIEW_AGGREGATION.priorYearSameLineageFactor : 1;
    const w = r.credibility * recency * yearFactor;
    sumW += w;
    sumWS += w * clamp(r.score, 0, 100);
  }
  return { mean: sumW > 0 ? sumWS / sumW : null, weight: sumW };
}

/**
 * Bayesian shrinkage toward the category mean: a product with few/old
 * reviews is pulled toward average so one glowing review can't dominate.
 */
export function aggregateReviewScore(
  reviews: ReviewInput[],
  productModelYear: number,
  categoryMean: number,
  now: Date,
): { score: number; limited: boolean; effectiveCount: number } {
  const { mean, weight } = weightedReviewMean(reviews, productModelYear, now);
  if (mean === null) {
    return { score: categoryMean * REVIEW_AGGREGATION.noReviewFactor, limited: true, effectiveCount: 0 };
  }
  const k = REVIEW_AGGREGATION.bayesPriorCount;
  const score = (weight * mean + k * categoryMean) / (weight + k);
  return { score, limited: weight < 1, effectiveCount: weight };
}

/** Mean of raw weighted means across a category (products with reviews only). */
export function categoryMean(rawMeans: (number | null)[], fallback = 80): number {
  const xs = rawMeans.filter((x): x is number => x !== null);
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : fallback;
}

export function brandReputation(b: { durability: number; warranty: number; reviewConsensus: number }): number {
  const w = BRAND_REPUTATION_BLEND;
  return Math.round(w.durability * b.durability + w.warranty * b.warranty + w.reviewConsensus * b.reviewConsensus);
}

function clamp(x: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, x));
}
