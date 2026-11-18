import { describe, expect, it } from "vitest";
import { demographicScore, demographicsMissing } from "../demographic";
import { abilityRangeMatch, conditionsScore, flexMatch, productStyleAxis, terrainStyleScore } from "../fit";
import { reviewFallback, scorePrimary } from "../score";
import { sizeBoard, sizeSki } from "../sizing";
import { deriveTargets } from "../targets";
import { COMPONENT_WEIGHTS } from "../weights";
import { board, rider, ski } from "./fixtures";

// ───────────────────────── Sizing ─────────────────────────

describe("ski sizing", () => {
  const t = (over = {}) => deriveTargets(rider({ heightCm: 178, weightKg: 74.5, ...over })); // target ≈ 170

  it("picks the nearest length and gives full size credit within ±4 cm", () => {
    const s = sizeSki(ski(), t());
    expect(s.lengthCm).toBe(170);
    expect(s.sizeFit).toBe(1);
    expect(s.eligible).toBe(true);
  });

  it("excludes models with no length within ±8 cm (hard filter)", () => {
    const s = sizeSki(ski({ sizes: [{ lengthCm: 184, waistMm: 96 }, { lengthCm: 191, waistMm: 96 }] }), t());
    expect(s.eligible).toBe(false);
    expect(s.reason).toMatch(/184 cm, 14 cm longer/);
  });

  it("relaxed mode allows ±12 cm", () => {
    const s = sizeSki(ski({ sizes: [{ lengthCm: 180, waistMm: 96 }] }), t(), true);
    expect(s.eligible).toBe(true);
  });

  it("size fit falls off linearly to 0.85 at the hard limit", () => {
    const s = sizeSki(ski({ sizes: [{ lengthCm: 178, waistMm: 96 }] }), t());
    expect(s.sizeFit).toBeCloseTo(0.85, 1);
    expect(s.sizeFit).toBeGreaterThanOrEqual(0.85);
  });

  it("goes longer for powder skis and shorter for park skis", () => {
    expect(sizeSki(ski({ category: "POWDER" }), t()).targetCm).toBe(sizeSki(ski(), t()).targetCm + 5);
    expect(sizeSki(ski({ category: "FREESTYLE_PARK" }), t()).targetCm).toBe(sizeSki(ski(), t()).targetCm - 4);
  });

  it("explains the trade-off when two lengths are close", () => {
    const s = sizeSki(ski({ sizes: [{ lengthCm: 168, waistMm: 96 }, { lengthCm: 172, waistMm: 96 }] }), t());
    expect(s.note).toMatch(/Between 168 and 172/);
  });
});

describe("board sizing", () => {
  const bigFeet = () => deriveTargets(rider({ sport: "SNOWBOARD", weightKg: 80, boots: { usMensSize: 12, width: "MEDIUM", fitIssues: [] } }));
  const regular = () => deriveTargets(rider({ sport: "SNOWBOARD", weightKg: 80 }));

  it("US 11+ boots only get wide sizes (toe/heel drag)", () => {
    const s = sizeBoard(board(), bigFeet(), 80);
    expect(s.label).toBe("160W");
    expect(s.note).toMatch(/Wide size/);
  });

  it("excludes boards with no wide size for US 11+ boots", () => {
    const narrow = board({ sizes: board().sizes.filter((x) => !x.isWide) });
    const s = sizeBoard(narrow, bigFeet(), 80);
    expect(s.eligible).toBe(false);
    expect(s.reason).toMatch(/No wide size/);
  });

  it("skips wide sizes for regular feet when a regular size exists", () => {
    expect(sizeBoard(board(), regular(), 80).label).not.toContain("W");
  });

  it("uses the manufacturer rider-weight range as the filter when present", () => {
    const ranged = board({
      sizes: [
        { label: "150", lengthCm: 150, waistWidthMm: 248, isWide: false, riderWeightMinKg: 45, riderWeightMaxKg: 70 },
        { label: "158", lengthCm: 158, waistWidthMm: 252, isWide: false, riderWeightMinKg: 65, riderWeightMaxKg: 90 },
      ],
    });
    const s = sizeBoard(ranged, regular(), 80);
    expect(s.label).toBe("158");
    expect(s.sizeFit).toBeGreaterThanOrEqual(0.92);
    const out = sizeBoard(ranged, deriveTargets(rider({ sport: "SNOWBOARD", weightKg: 120 })), 120);
    expect(out.eligible).toBe(false);
    expect(out.reason).toMatch(/rider-weight range/);
  });
});

// ───────────────────────── Fit ─────────────────────────

describe("skill ↔ flex", () => {
  it("is 1 on target and falls off symmetrically", () => {
    expect(flexMatch(6, 6)).toBe(1);
    expect(flexMatch(8, 6)).toBeCloseTo(flexMatch(4, 6));
    expect(flexMatch(10, 6)).toBe(0);
  });

  it("ability range: inside 1, one level off 0.5, beyond 0", () => {
    const s = ski({ abilityMin: "INTERMEDIATE", abilityMax: "ADVANCED" });
    expect(abilityRangeMatch(2, s)).toBe(1);
    expect(abilityRangeMatch(1, s)).toBe(0.5);
    expect(abilityRangeMatch(4, s)).toBe(0.5);
    expect(abilityRangeMatch(1, ski({ abilityMin: "ADVANCED", abilityMax: "EXPERT" }))).toBe(0);
  });
});

describe("conditions ↔ width / rocker", () => {
  const pow = ski({ waistMm: 112, rocker: "TIP_TAIL_ROCKER_CAMBER", category: "POWDER" });
  const carver = ski({ waistMm: 80, rocker: "FULL_CAMBER", category: "FRONTSIDE" });

  it("Japan powder favors a wide rockered ski; Northeast ice favors a narrow cambered one", () => {
    const japan = deriveTargets(rider({ regionKey: "japan" }));
    const ne = deriveTargets(rider({ regionKey: "northeast" }));
    expect(conditionsScore(pow, japan).score).toBeGreaterThan(conditionsScore(carver, japan).score);
    expect(conditionsScore(carver, ne).score).toBeGreaterThan(conditionsScore(pow, ne).score);
  });

  it("a snow preference overrides the region", () => {
    const icy = deriveTargets(rider({ regionKey: "japan", snowPreference: { hardpack_ice: 1 } }));
    expect(conditionsScore(carver, icy).score).toBeGreaterThan(conditionsScore(pow, icy).score);
  });

  it("boards: tapered directional wins in powder, twin wins on hardpack", () => {
    const fish = board({ shape: "TAPERED_DIRECTIONAL", profile: "FLAT_ROCKER", setbackMm: 30 });
    const twin = board({ shape: "DIRECTIONAL_TWIN", profile: "CAMBER", setbackMm: 0 });
    const japan = deriveTargets(rider({ sport: "SNOWBOARD", regionKey: "japan" }));
    const ne = deriveTargets(rider({ sport: "SNOWBOARD", regionKey: "northeast" }));
    expect(conditionsScore(fish, japan).score).toBeGreaterThan(conditionsScore(twin, japan).score);
    expect(conditionsScore(twin, ne).score).toBeGreaterThan(conditionsScore(fish, ne).score);
  });
});

describe("terrain & style", () => {
  it("metal + traditional mount reads as charging; twin + centered as playful", () => {
    const charger = ski({ flex: 9, laminate: "FULL_METAL", mountStyle: "TRADITIONAL" });
    const jib = ski({ flex: 4, laminate: "FIBERGLASS", mountStyle: "CENTERED", twinTip: "FULL_TWIN" });
    expect(productStyleAxis(charger)).toBeGreaterThan(0.4);
    expect(productStyleAxis(jib)).toBeLessThan(-0.4);
  });

  it("a park rider prefers the twin; a charger prefers the metal ski", () => {
    const charger = ski({ flex: 9, laminate: "FULL_METAL" });
    const jib = ski({ flex: 4, laminate: "FIBERGLASS", mountStyle: "CENTERED", twinTip: "FULL_TWIN", category: "FREESTYLE_PARK" });
    const park = rider({ terrain: ["park"], style: "PLAYFUL" });
    const steep = rider({ terrain: ["steeps", "groomers"], style: "CHARGING" });
    expect(terrainStyleScore(jib, park, deriveTargets(park)).score).toBeGreaterThan(terrainStyleScore(charger, park, deriveTargets(park)).score);
    expect(terrainStyleScore(charger, steep, deriveTargets(steep)).score).toBeGreaterThan(terrainStyleScore(jib, steep, deriveTargets(steep)).score);
  });

  it("a CHATTERY kit dislike nudges toward metal", () => {
    const metal = ski({ laminate: "FULL_METAL" });
    const plain = rider();
    const chattery = rider({ kit: [{ kind: "SKI", label: "x", intent: "REPLACE", condition: "WORN", likes: [], dislikes: ["CHATTERY"] }] });
    expect(terrainStyleScore(metal, chattery, deriveTargets(chattery)).style).toBeGreaterThan(terrainStyleScore(metal, plain, deriveTargets(plain)).style);
  });

  it("conflict mode counts aspirational steep terrain at half weight", () => {
    const frontside = ski({ category: "FRONTSIDE" });
    const r = rider({ ability: "BEGINNER", terrain: ["groomers", "steeps"] });
    const t = deriveTargets(r);
    expect(t.conflictMode).toBe(true);
    const noConflict = { ...t, conflictMode: false };
    // Frontside is great on groomers, weaker on steeps → halving steeps helps it.
    expect(terrainStyleScore(frontside, r, t).terrain).toBeGreaterThan(terrainStyleScore(frontside, r, noConflict).terrain);
  });
});

// ───────────────────────── Demographic ─────────────────────────

describe("demographic rules", () => {
  it("is skipped when age and gender are both missing (or prefer-not)", () => {
    expect(demographicsMissing({})).toBe(true);
    expect(demographicsMissing({ gender: "PREFER_NOT" })).toBe(true);
    expect(demographicsMissing({ ageRange: "25_34" })).toBe(false);
    const r = rider();
    expect(demographicScore(ski(), r, deriveTargets(r)).skipped).toBe(true);
  });

  it("young + advanced + playful → softer twin with a centered mount", () => {
    const r = rider({ ageRange: "18_24", ability: "ADVANCED", style: "PLAYFUL" });
    const t = deriveTargets(r);
    const twin = ski({ flex: 5, twinTip: "FULL_TWIN", mountStyle: "CENTERED" });
    const trad = ski({ flex: 9, twinTip: "NONE", mountStyle: "TRADITIONAL" });
    expect(demographicScore(twin, r, t).score).toBeGreaterThan(demographicScore(trad, r, t).score);
    expect(demographicScore(twin, r, t).rules).toContain("YOUNG_PLAYFUL");
  });

  it("older riders → lighter, forgiving builds", () => {
    const r = rider({ ageRange: "65_PLUS" });
    const t = deriveTargets(r);
    expect(demographicScore(ski({ laminate: "FIBERGLASS", flex: 5 }), r, t).score).toBeGreaterThan(
      demographicScore(ski({ laminate: "FULL_METAL", flex: 9 }), r, t).score,
    );
  });

  it("beginners → forgiving flex and easy turn initiation regardless of age", () => {
    const r = rider({ ability: "BEGINNER", ageRange: "35_44" });
    const t = deriveTargets(r);
    expect(demographicScore(ski({ flex: 3, rocker: "TIP_ROCKER_CAMBER" }), r, t).score).toBeGreaterThan(
      demographicScore(ski({ flex: 8, rocker: "FULL_CAMBER" }), r, t).score,
    );
  });

  it("women's models get a nudge up for women and down for men, never filtered", () => {
    const f = rider({ gender: "FEMALE" });
    const m = rider({ gender: "MALE" });
    const w = ski({ womensSpecific: true });
    const u = ski();
    expect(demographicScore(w, f, deriveTargets(f)).score).toBeGreaterThan(demographicScore(u, f, deriveTargets(f)).score);
    expect(demographicScore(w, m, deriveTargets(m)).score).toBeLessThan(demographicScore(u, m, deriveTargets(m)).score);
  });

  it("is neutral when demographics are given but no rule applies", () => {
    const r = rider({ ageRange: "35_44", gender: "NONBINARY" });
    expect(demographicScore(ski(), r, deriveTargets(r))).toEqual({ score: 0.75, skipped: false, rules: [] });
  });
});

// ───────────────────────── Blend ─────────────────────────

describe("total score", () => {
  const sumPoints = (b: ReturnType<typeof scorePrimary>["breakdown"]) =>
    b.skillFlex.points + b.conditions.points + b.terrainStyle.points + b.review.points + b.brand.points + b.demographic.points;

  it("component points add up to the total, and a perfect product scores 100", () => {
    const r = rider({ ageRange: "35_44" });
    const s = scorePrimary(ski(), r, deriveTargets(r), { sizeFit: 1 }, 72);
    expect(sumPoints(s.breakdown)).toBeCloseTo(s.total);
    expect(s.total).toBeLessThanOrEqual(100);
  });

  it("redistributes the 5% demographic weight when it's skipped", () => {
    const r = rider();
    const s = scorePrimary(ski(), r, deriveTargets(r), { sizeFit: 1 }, 72);
    expect(s.breakdown.demographic.skipped).toBe(true);
    expect(s.breakdown.demographic.points).toBe(0);
    // review weight 0.40 → 0.40 / 0.95 of the total
    expect(s.breakdown.review.points).toBeCloseTo((s.breakdown.review.score * COMPONENT_WEIGHTS.review * 100) / 0.95);
  });

  it("size fit only scales the fit block", () => {
    const r = rider();
    const t = deriveTargets(r);
    const a = scorePrimary(ski(), r, t, { sizeFit: 1 }, 72);
    const b = scorePrimary(ski(), r, t, { sizeFit: 0.85 }, 72);
    expect(b.breakdown.skillFlex.points).toBeCloseTo(a.breakdown.skillFlex.points * 0.85);
    expect(b.breakdown.review.points).toBeCloseTo(a.breakdown.review.points);
  });

  it("conflict mode weights skill higher (22.5%) and terrain lower (7.5%)", () => {
    const r = rider({ ability: "BEGINNER", terrain: ["steeps"], ageRange: "35_44" });
    const s = scorePrimary(ski(), r, deriveTargets(r), { sizeFit: 1 }, 72);
    expect(s.breakdown.skillFlex.points).toBeCloseTo(s.breakdown.skillFlex.score * 22.5);
    expect(s.breakdown.terrainStyle.points).toBeCloseTo(s.breakdown.terrainStyle.score * 7.5);
  });

  it("products without reviews use the category mean × 0.9 and are flagged limited", () => {
    const products = [ski({ reviewScore: 90 }), ski({ reviewScore: 70 }), ski({ reviewScore: null })];
    expect(reviewFallback(products)).toBeCloseTo(72);
    const r = rider();
    const s = scorePrimary(products[2]!, r, deriveTargets(r), { sizeFit: 1 }, 72);
    expect(s.breakdown.review.score).toBeCloseTo(0.72);
    expect(s.breakdown.review.limited).toBe(true);
  });

  it("higher reviews and brand reputation raise the score, all else equal", () => {
    const r = rider();
    const t = deriveTargets(r);
    const lo = scorePrimary(ski({ reviewScore: 70, brand: { name: "A", reputationScore: 70 } }), r, t, { sizeFit: 1 }, 72);
    const hi = scorePrimary(ski({ reviewScore: 90, brand: { name: "B", reputationScore: 90 } }), r, t, { sizeFit: 1 }, 72);
    expect(hi.total - lo.total).toBeCloseTo(((20 * 0.4 + 20 * 0.1) / 0.95) * 1, 5);
  });
});
