import { describe, expect, it } from "vitest";
import { estimateDin, skierType } from "../din";
import { kitEffects } from "../kit";
import { deriveTargets, resolveSnowMix } from "../targets";
import type { KitItem } from "../types";
import { rider } from "./fixtures";

const kitItem = (over: Partial<KitItem> = {}): KitItem => ({
  kind: "SKI", label: "my old skis", intent: "REPLACE", condition: "WORN", likes: [], dislikes: [], ...over,
});

describe("flex target", () => {
  it("starts from ability: beginner 3 → expert 8", () => {
    expect(deriveTargets(rider({ ability: "BEGINNER" })).flexTarget).toBe(3);
    expect(deriveTargets(rider({ ability: "INTERMEDIATE" })).flexTarget).toBe(5);
    expect(deriveTargets(rider({ ability: "ADVANCED" })).flexTarget).toBe(7);
    expect(deriveTargets(rider({ ability: "EXPERT" })).flexTarget).toBe(8);
  });

  it("heavier riders → stiffer, lighter riders → softer (0.5 per 10 kg, capped at 1.5)", () => {
    expect(deriveTargets(rider({ weightKg: 95 })).flexTarget).toBeCloseTo(6);
    expect(deriveTargets(rider({ weightKg: 55 })).flexTarget).toBeCloseTo(4);
    expect(deriveTargets(rider({ weightKg: 140 })).flexTarget).toBeCloseTo(6.5);
  });

  it("playful softens, charging stiffens", () => {
    expect(deriveTargets(rider({ style: "PLAYFUL" })).flexTarget).toBe(4);
    expect(deriveTargets(rider({ style: "CHARGING" })).flexTarget).toBe(6);
  });

  it("park-only riders go softer; park split with groomers half as much", () => {
    expect(deriveTargets(rider({ terrain: ["park"] })).flexTarget).toBeCloseTo(3.5);
    expect(deriveTargets(rider({ terrain: ["park", "groomers"] })).flexTarget).toBeCloseTo(4.25);
  });

  it("is clamped to 1–10", () => {
    const t = deriveTargets(rider({ ability: "EXPERT", weightKg: 150, style: "CHARGING", terrain: ["steeps"] }));
    expect(t.flexTarget).toBeLessThanOrEqual(10);
    const soft = deriveTargets(rider({ ability: "BEGINNER", weightKg: 30, style: "PLAYFUL", terrain: ["park"] }));
    expect(soft.flexTarget).toBe(1);
  });
});

describe("ski length target", () => {
  it("is height plus an ability offset", () => {
    expect(deriveTargets(rider({ ability: "BEGINNER", heightCm: 180, weightKg: 74.5 })).lengthTargetCm).toBeCloseTo(165, 0);
    expect(deriveTargets(rider({ ability: "EXPERT", heightCm: 180, weightKg: 74.5 })).lengthTargetCm).toBeCloseTo(183, 0);
  });

  it("goes longer for heavier riders (capped at +5) and for charging", () => {
    const base = deriveTargets(rider()).lengthTargetCm;
    expect(deriveTargets(rider({ weightKg: 85 })).lengthTargetCm).toBeGreaterThan(base);
    expect(deriveTargets(rider({ weightKg: 200 })).lengthTargetCm - base).toBeLessThanOrEqual(5 + 1e-9 + 1.3);
    expect(deriveTargets(rider({ style: "CHARGING" })).lengthTargetCm).toBeCloseTo(base + 4);
    expect(deriveTargets(rider({ style: "PLAYFUL" })).lengthTargetCm).toBeCloseTo(base - 4);
  });
});

describe("board size target", () => {
  it("is mostly weight-driven", () => {
    const light = deriveTargets(rider({ sport: "SNOWBOARD", weightKg: 60 })).lengthTargetCm;
    const heavy = deriveTargets(rider({ sport: "SNOWBOARD", weightKg: 95 })).lengthTargetCm;
    expect(heavy - light).toBeCloseTo(0.7 * 0.42 * 35);
  });

  it("requires a wide board at US 11+ and prefers one at 10.5", () => {
    const at = (us: number) => deriveTargets(rider({ sport: "SNOWBOARD", boots: { usMensSize: us, width: "MEDIUM", fitIssues: [] } }));
    expect(at(10).needsWideBoard).toBe(false);
    expect(at(10.5).wideBoardPreferred).toBe(true);
    expect(at(10.5).needsWideBoard).toBe(false);
    expect(at(11).needsWideBoard).toBe(true);
  });

  it("never flags wide boards for skiers", () => {
    expect(deriveTargets(rider({ boots: { usMensSize: 13, width: "WIDE", fitIssues: [] } })).needsWideBoard).toBe(false);
  });
});

describe("snow mix", () => {
  it("uses the region default", () => {
    expect(resolveSnowMix({ regionKey: "northeast" }).hardpack_ice).toBe(0.45);
  });

  it("is replaced (and normalized) by a snow preference", () => {
    const mix = resolveSnowMix({ regionKey: "northeast", snowPreference: { powder: 3, packed: 1 } });
    expect(mix.powder).toBe(0.75);
    expect(mix.hardpack_ice).toBe(0);
  });

  it("falls back to a balanced mix for unknown regions", () => {
    const mix = resolveSnowMix({ regionKey: "mars" });
    expect(Object.values(mix).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });
});

describe("conflicting answers", () => {
  it("beginner + steeps/backcountry → note, conflict mode, no stiffening", () => {
    const t = deriveTargets(rider({ ability: "BEGINNER", terrain: ["steeps", "backcountry"] }));
    expect(t.conflicts.map((c) => c.code)).toContain("BEGINNER_STEEP_TERRAIN");
    expect(t.conflictMode).toBe(true);
    expect(t.flexTarget).toBe(3);
  });

  it("beginner + charging → note and no style stiffening or lengthening", () => {
    const t = deriveTargets(rider({ ability: "BEGINNER", style: "CHARGING" }));
    expect(t.conflicts.map((c) => c.code)).toContain("BEGINNER_CHARGING");
    expect(t.flexTarget).toBe(3);
    expect(t.lengthTargetCm).toBeCloseTo(deriveTargets(rider({ ability: "BEGINNER" })).lengthTargetCm);
  });

  it("park-only rider in a powder region gets a quiver nudge (no conflict mode)", () => {
    const t = deriveTargets(rider({ regionKey: "japan", terrain: ["park"] }));
    expect(t.conflicts.map((c) => c.code)).toEqual(["PARK_ONLY_POWDER_REGION"]);
    expect(t.conflictMode).toBe(false);
  });

  it("no notes for consistent answers", () => {
    expect(deriveTargets(rider({ ability: "EXPERT", terrain: ["steeps"] })).conflicts).toEqual([]);
  });
});

describe("My Kit effects", () => {
  it("TOO_STIFF on a ski being replaced lowers the flex target by 1", () => {
    const t = deriveTargets(rider({ kit: [kitItem({ dislikes: ["TOO_STIFF"] })] }));
    expect(t.flexTarget).toBe(4);
    expect(t.kitAdjustments[0]?.because).toContain("my old skis");
  });

  it("SINKS_IN_POWDER widens the waist target", () => {
    const base = deriveTargets(rider()).waistTargetMm;
    expect(deriveTargets(rider({ kit: [kitItem({ dislikes: ["SINKS_IN_POWDER"] })] })).waistTargetMm).toBeCloseTo(base + 8);
  });

  it("UNSURE items count half, KEEP items don't move targets", () => {
    expect(kitEffects([kitItem({ intent: "UNSURE", dislikes: ["TOO_STIFF"] })], "SKI").flex).toBe(-0.5);
    expect(kitEffects([kitItem({ intent: "KEEP", dislikes: ["TOO_STIFF"] })], "SKI").flex).toBe(0);
  });

  it("caps the total nudge", () => {
    const many = [1, 2, 3].map(() => kitItem({ dislikes: ["TOO_STIFF", "HARD_TO_TURN"] }));
    expect(kitEffects(many, "SKI").flex).toBe(-1.5);
  });

  it("ignores kit of the other sport, and waist nudges for boards", () => {
    expect(kitEffects([kitItem({ dislikes: ["TOO_STIFF"] })], "SNOWBOARD").flex).toBe(0);
    const b = kitEffects([kitItem({ kind: "SNOWBOARD", dislikes: ["SINKS_IN_POWDER"] })], "SNOWBOARD");
    expect(b.waistMm).toBe(0);
  });

  it("CHATTERY sets a metal preference; LIGHT a light preference", () => {
    const e = kitEffects([kitItem({ dislikes: ["CHATTERY"], likes: ["LIGHT"] })], "SKI");
    expect(e.prefs.metal).toBe(1);
    expect(e.prefs.light).toBe(1);
  });
});

describe("boots", () => {
  it("uses women's flex ranges for women and adjusts for weight", () => {
    expect(deriveTargets(rider({ ability: "ADVANCED" })).bootFlexRange).toEqual([110, 130]);
    expect(deriveTargets(rider({ ability: "ADVANCED", gender: "FEMALE" })).bootFlexRange).toEqual([95, 115]);
    expect(deriveTargets(rider({ ability: "ADVANCED", weightKg: 100 })).bootFlexRange).toEqual([125, 145]);
  });

  it("shifts last width wider for forefoot pinch and narrower for heel lift", () => {
    expect(deriveTargets(rider()).bootLastRangeMm).toEqual([99, 101]);
    expect(deriveTargets(rider({ boots: { usMensSize: 10, width: "MEDIUM", fitIssues: ["FOREFOOT_PINCH"] } })).bootLastRangeMm).toEqual([100, 102]);
    expect(deriveTargets(rider({ kit: [kitItem({ kind: "SKI_BOOT", intent: "KEEP", fitIssues: ["HEEL_LIFT"] })] })).bootLastRangeMm).toEqual([98, 100]);
  });

  it("snowboard boot flex follows the board flex target ±1.5", () => {
    expect(deriveTargets(rider({ sport: "SNOWBOARD" })).bootFlexRange).toEqual([3.5, 6.5]);
  });
});

describe("DIN estimate (guidance only)", () => {
  it("maps ability and style to skier type", () => {
    expect(skierType("BEGINNER", "BALANCED").type).toBe("I");
    expect(skierType("BEGINNER", "CHARGING").type).toBe("II");
    expect(skierType("INTERMEDIATE", "BALANCED").type).toBe("II");
    expect(skierType("ADVANCED", "PLAYFUL").type).toBe("III");
  });

  it("uses the lesser of the weight and height codes", () => {
    // 85 kg → L, 160 cm → J: J wins
    expect(estimateDin({ weightKg: 85, heightCm: 160, ability: "BEGINNER", style: "BALANCED", mondo: 27 }).code).toBe("J");
  });

  it("goes up with skier type and down with age 55+ and longer boot soles", () => {
    const at = (o: Partial<Parameters<typeof estimateDin>[0]>) =>
      estimateDin({ weightKg: 75, heightCm: 178, ability: "INTERMEDIATE", style: "BALANCED", mondo: 27, ...o }).value;
    expect(at({ ability: "EXPERT" })).toBeGreaterThan(at({}));
    expect(at({ ageRange: "55_64" })).toBeLessThan(at({}));
    expect(at({ mondo: 30 })).toBeLessThan(at({ mondo: 24 }));
  });

  it("is a ±0.5 range, never below 0.75", () => {
    const d = estimateDin({ weightKg: 20, heightCm: 120, ability: "BEGINNER", style: "BALANCED", mondo: 20 });
    expect(d.low).toBeGreaterThanOrEqual(0.75);
    expect(d.high - d.value).toBe(0.5);
  });

  it("is only produced for skiers", () => {
    expect(deriveTargets(rider()).dinEstimate).toBeDefined();
    expect(deriveTargets(rider({ sport: "SNOWBOARD" })).dinEstimate).toBeUndefined();
  });
});
