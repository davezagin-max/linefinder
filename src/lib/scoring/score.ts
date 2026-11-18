/** Step 3: blend sub-scores into a 0–100 total with a per-component breakdown. */
import { demographicScore } from "./demographic";
import { conditionsScore, skillFlexScore, terrainStyleScore } from "./fit";
import type { SizeResult } from "./sizing";
import type { EnginePrimary, RiderInput, RiderTargets, ScoreBreakdown } from "./types";
import { COMPONENT_WEIGHTS, CONFLICT_FIT_WEIGHTS, FIT_WEIGHTS, REVIEW_AGGREGATION } from "./weights";

export interface PrimaryScore {
  total: number;
  breakdown: ScoreBreakdown;
  detail: {
    conditions: ReturnType<typeof conditionsScore>;
    terrainStyle: ReturnType<typeof terrainStyleScore>;
  };
}

/** Category-level fallback for products with no reviews. */
export function reviewFallback(products: EnginePrimary[]) {
  const xs = products.map((p) => p.reviewScore).filter((x): x is number => x !== null);
  const mean = xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 80;
  return mean * REVIEW_AGGREGATION.noReviewFactor;
}

export function scorePrimary(
  p: EnginePrimary,
  input: RiderInput,
  t: RiderTargets,
  size: Pick<SizeResult, "sizeFit">,
  noReviewScore: number,
): PrimaryScore {
  const fw = t.conflictMode ? CONFLICT_FIT_WEIGHTS : FIT_WEIGHTS;
  const demo = demographicScore(p, input, t);
  // Redistribute the demographic weight proportionally when it's skipped.
  const scale = demo.skipped ? 1 / (1 - COMPONENT_WEIGHTS.demographic) : 1;

  const skill = skillFlexScore(p, t);
  const cond = conditionsScore(p, t);
  const ts = terrainStyleScore(p, input, t);
  const review = (p.reviewScore ?? noReviewScore) / 100;
  const brand = p.brand.reputationScore / 100;
  const sf = size.sizeFit;

  const pts = (score: number, weight: number, mult = 1) => score * weight * mult * scale * 100;
  const breakdown: ScoreBreakdown = {
    skillFlex: { score: skill, points: pts(skill, fw.skillFlex, sf) },
    conditions: { score: cond.score, points: pts(cond.score, fw.conditions, sf) },
    terrainStyle: { score: ts.score, points: pts(ts.score, fw.terrainStyle, sf) },
    review: { score: review, points: pts(review, COMPONENT_WEIGHTS.review), limited: p.reviewScore === null },
    brand: { score: brand, points: pts(brand, COMPONENT_WEIGHTS.brand) },
    demographic: {
      score: demo.score,
      points: demo.skipped ? 0 : pts(demo.score, COMPONENT_WEIGHTS.demographic),
      skipped: demo.skipped,
      rules: demo.rules,
    },
    sizeFit: sf,
  };
  const total =
    breakdown.skillFlex.points +
    breakdown.conditions.points +
    breakdown.terrainStyle.points +
    breakdown.review.points +
    breakdown.brand.points +
    breakdown.demographic.points;
  return { total, breakdown, detail: { conditions: cond, terrainStyle: ts } };
}
