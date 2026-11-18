/**
 * Recompute cached scores: brand reputation and each product's aggregated
 * review score (Bayesian-shrunk toward its category mean).
 */
import type { Db } from "../../src/lib/db";
import { aggregateReviewScore, brandReputation, categoryMean, weightedReviewMean } from "../../src/lib/scoring/reviews";

export async function recomputeScores(db: Db, opts: { now: Date; allowPlaceholders: boolean }) {
  const brands = await db.brand.findMany();
  for (const b of brands) {
    await db.brand.update({
      where: { id: b.id },
      data: {
        reputationScore: brandReputation({
          durability: b.durabilityScore,
          warranty: b.warrantyScore,
          reviewConsensus: b.reviewConsensusScore,
        }),
      },
    });
  }

  const products = await db.product.findMany({
    select: {
      id: true,
      kind: true,
      modelYear: true,
      ski: { select: { category: true } },
      snowboard: { select: { category: true } },
      reviews: { select: { score: true, reviewedAt: true, modelYearReviewed: true, source: true } },
    },
  });

  const rows = products.map((p) => {
    const reviews = p.reviews
      .filter((r) => opts.allowPlaceholders || !r.source.isPlaceholder)
      .map((r) => ({ score: r.score, credibility: r.source.credibility, reviewedAt: r.reviewedAt, modelYearReviewed: r.modelYearReviewed }));
    const group = `${p.kind}:${p.ski?.category ?? p.snowboard?.category ?? "-"}`;
    return { p, reviews, group, raw: weightedReviewMean(reviews, p.modelYear, opts.now).mean };
  });

  const groupMeans = new Map<string, number>();
  for (const g of new Set(rows.map((r) => r.group))) {
    groupMeans.set(g, categoryMean(rows.filter((r) => r.group === g).map((r) => r.raw)));
  }

  for (const r of rows) {
    const agg = aggregateReviewScore(r.reviews, r.p.modelYear, groupMeans.get(r.group)!, opts.now);
    await db.product.update({
      where: { id: r.p.id },
      data: { reviewScoreAgg: r.reviews.length ? agg.score : null, reviewCount: r.reviews.length },
    });
  }
  return { brands: brands.length, products: products.length };
}
