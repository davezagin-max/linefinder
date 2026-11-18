import { describe, expect, it } from "vitest";
import { aggregateReviewScore, brandReputation, categoryMean, weightedReviewMean } from "./reviews";
import { assertWeightsSumToOne } from "./weights";

const NOW = new Date("2026-11-16T00:00:00Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000);

describe("weights config", () => {
  it("sums to 1 at every level", () => {
    expect(() => assertWeightsSumToOne()).not.toThrow();
  });
});

describe("weightedReviewMean", () => {
  it("weights credible sources more", () => {
    const { mean } = weightedReviewMean(
      [
        { score: 90, credibility: 1.5, reviewedAt: daysAgo(0), modelYearReviewed: 2026 },
        { score: 60, credibility: 0.5, reviewedAt: daysAgo(0), modelYearReviewed: 2026 },
      ],
      2026,
      NOW,
    );
    expect(mean).toBeCloseTo(82.5);
  });

  it("halves the weight of a review one half-life old", () => {
    const { weight } = weightedReviewMean(
      [{ score: 80, credibility: 1, reviewedAt: daysAgo(365), modelYearReviewed: 2026 }],
      2026,
      NOW,
    );
    expect(weight).toBeCloseTo(0.5);
  });

  it("discounts prior-model-year reviews and ignores newer ones", () => {
    const { weight } = weightedReviewMean(
      [
        { score: 80, credibility: 1, reviewedAt: daysAgo(0), modelYearReviewed: 2025 },
        { score: 10, credibility: 1, reviewedAt: daysAgo(0), modelYearReviewed: 2027 },
      ],
      2026,
      NOW,
    );
    expect(weight).toBeCloseTo(0.7);
  });

  it("clamps out-of-range scores", () => {
    const { mean } = weightedReviewMean(
      [{ score: 140, credibility: 1, reviewedAt: daysAgo(0), modelYearReviewed: 2026 }],
      2026,
      NOW,
    );
    expect(mean).toBe(100);
  });
});

describe("aggregateReviewScore", () => {
  it("shrinks a single glowing review toward the category mean", () => {
    const r = aggregateReviewScore(
      [{ score: 100, credibility: 1, reviewedAt: daysAgo(0), modelYearReviewed: 2026 }],
      2026,
      80,
      NOW,
    );
    expect(r.score).toBeCloseTo((1 * 100 + 2 * 80) / 3);
    expect(r.limited).toBe(false);
  });

  it("many strong reviews stay near their mean", () => {
    const reviews = Array.from({ length: 10 }, () => ({
      score: 92, credibility: 1, reviewedAt: daysAgo(0), modelYearReviewed: 2026,
    }));
    // (10 × 92 + 2 × 80) / 12 = 90
    expect(aggregateReviewScore(reviews, 2026, 80, NOW).score).toBeCloseTo(90);
  });

  it("no reviews → category mean × 0.9 and limited", () => {
    const r = aggregateReviewScore([], 2026, 80, NOW);
    expect(r.score).toBeCloseTo(72);
    expect(r.limited).toBe(true);
  });

  it("old low-weight reviews are flagged limited", () => {
    const r = aggregateReviewScore(
      [{ score: 90, credibility: 1, reviewedAt: daysAgo(730), modelYearReviewed: 2026 }],
      2026,
      80,
      NOW,
    );
    expect(r.limited).toBe(true);
  });
});

describe("categoryMean / brandReputation", () => {
  it("ignores products without reviews and falls back when empty", () => {
    expect(categoryMean([80, null, 90])).toBe(85);
    expect(categoryMean([null], 77)).toBe(77);
  });

  it("blends 40/30/30", () => {
    expect(brandReputation({ durability: 100, warranty: 50, reviewConsensus: 80 })).toBe(79);
  });
});
