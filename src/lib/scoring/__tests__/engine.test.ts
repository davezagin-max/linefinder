import { describe, expect, it } from "vitest";
import { seedCatalog } from "../../../../scripts/lib/seedCatalog";
import { SAMPLE_RIDERS } from "../../../../scripts/sampleRiders";
import { recommend } from "../engine";
import type { KitItem, RiderInput } from "../types";
import { NOW, board, catalog, rider, ski } from "./fixtures";

const seed = seedCatalog();
const byId = new Map([...seed.skis, ...seed.boards].map((p) => [p.id, p]));

describe("engine on the seed catalog", () => {
  for (const [name, input] of Object.entries(SAMPLE_RIDERS) as [string, RiderInput][]) {
    it(`${name}: returns a full, well-formed result`, () => {
      const r = recommend(input, seed, NOW);
      expect(r.picks.length).toBeGreaterThanOrEqual(5);
      expect(r.picks.length).toBeLessThanOrEqual(15);
      for (const p of r.picks) {
        const prod = byId.get(p.productId)!;
        expect(prod.kind).toBe(input.sport);
        expect(p.total).toBeGreaterThan(0);
        expect(p.total).toBeLessThanOrEqual(100);
        expect(p.recommendedSize.label).not.toBe("");
        expect(p.reasons.length).toBeGreaterThan(0);
        expect(r.setups[p.productId]).toBeDefined();
      }
      // In-budget picks (non-stretch) are in score order.
      const plain = r.picks.filter((p) => !p.tags.includes("STRETCH")).map((p) => p.total);
      expect([...plain].sort((a, b) => b - a)).toEqual(plain);
      expect(r.picks.filter((p) => p.tags.includes("STRETCH")).length).toBeLessThanOrEqual(2);
      expect(r.picks.filter((p) => p.tags.includes("BEST_VALUE")).length).toBeLessThanOrEqual(1);
    });
  }

  it("is deterministic", () => {
    const a = recommend(SAMPLE_RIDERS.wasatch, seed, NOW);
    const b = recommend(SAMPLE_RIDERS.wasatch, seed, NOW);
    expect(a).toEqual(b);
  });

  it("a heavy Wasatch charger gets stiff, metal, mid-fat skis", () => {
    const top = recommend(SAMPLE_RIDERS.wasatch, seed, NOW).picks.slice(0, 3).map((p) => byId.get(p.productId)!);
    for (const s of top) {
      if (s.kind !== "SKI") throw new Error("expected skis");
      expect(s.flex).toBeGreaterThanOrEqual(8);
      expect(["FULL_METAL", "PARTIAL_METAL"]).toContain(s.laminate);
      expect(s.waistMm).toBeGreaterThanOrEqual(94);
    }
  });

  it("a Northeast beginner gets soft, narrow, beginner-friendly skis, plus a DIN note", () => {
    const r = recommend(SAMPLE_RIDERS["ne-beginner"], seed, NOW);
    for (const p of r.picks.slice(0, 2)) expect(byId.get(p.productId)!.abilityMin).toBe("BEGINNER");
    for (const p of r.picks.slice(0, 3)) {
      const s = byId.get(p.productId)!;
      expect(s.kind === "SKI" && s.waistMm).toBeLessThanOrEqual(92);
      expect(s.flex).toBeLessThanOrEqual(5);
    }
    // Anything above beginner level is at most one level up, and says so.
    for (const p of r.picks) {
      const s = byId.get(p.productId)!;
      expect(["BEGINNER", "INTERMEDIATE"]).toContain(s.abilityMin);
      if (s.abilityMin !== "BEGINNER") expect(p.warnings.join(" ")).toMatch(/a bit of a stretch/);
    }
    expect(r.disclaimers.join(" ")).toMatch(/certified ski shop technician/);
    expect(r.targets.dinEstimate).toBeDefined();
  });

  it("US 12 boots only get wide boards", () => {
    const r = recommend(SAMPLE_RIDERS["big-feet"], seed, NOW);
    for (const p of r.picks) {
      const b = byId.get(p.productId)!;
      if (b.kind !== "SNOWBOARD") throw new Error("expected boards");
      const size = b.sizes.find((s) => s.label === p.recommendedSize.label)!;
      expect(size.waistWidthMm).toBeGreaterThanOrEqual(258);
    }
  });

  it("a young expert park rider gets twin shapes, led by a true twin", () => {
    const top = recommend(SAMPLE_RIDERS["park-kid"], seed, NOW).picks.slice(0, 3).map((p) => byId.get(p.productId)!);
    for (const b of top) expect(["TRUE_TWIN", "DIRECTIONAL_TWIN"]).toContain(b.kind === "SNOWBOARD" && b.shape);
    expect(top[0]!.kind === "SNOWBOARD" && top[0]!.shape).toBe("TRUE_TWIN");
  });

  it("My Kit REPLACE: 'too stiff' + 'sinks in powder' → softer, wider than the old ski", () => {
    const r = recommend(SAMPLE_RIDERS["kit-replace"], seed, NOW);
    for (const p of r.picks.slice(0, 3)) {
      const s = byId.get(p.productId)!;
      if (s.kind !== "SKI") throw new Error("expected skis");
      expect(s.flex).toBeLessThan(8.5);
      expect(s.waistMm).toBeGreaterThan(88);
    }
    expect(r.picks.some((p) => p.reasons.some((x) => x.component === "kit"))).toBe(true);
  });

  it("My Kit KEEP: kept ski anchors the quiver, kept boots → no boot picks, overlaps are tagged", () => {
    const r = recommend(SAMPLE_RIDERS["quiver-add"], seed, NOW);
    expect(r.quivers.two[0]!.pieces[0]!.ownedLabel).toBe("my Kendo 92");
    expect(r.quivers.three[0]!.pieces[0]!.ownedLabel).toBe("my Kendo 92");
    for (const s of Object.values(r.setups)) expect(s.boots).toEqual([]);
    const kendo = r.picks.find((p) => p.productId === "volkl-kendo-92-2025");
    expect(kendo?.tags).toContain("OVERLAPS_KIT");
  });

  it("explains why popular models dropped out", () => {
    const r = recommend(SAMPLE_RIDERS["ne-beginner"], seed, NOW);
    expect(r.whyNot.length).toBeGreaterThan(0);
    expect(r.whyNot.every((w) => byId.get(w.productId)!.isPopular)).toBe(true);
  });

  it("flags placeholder review data in the disclaimers", () => {
    expect(recommend(SAMPLE_RIDERS.wasatch, seed, NOW).disclaimers.join(" ")).toMatch(/placeholders/);
  });
});

describe("engine edge cases", () => {
  it("relaxes the budget first when nothing is affordable", () => {
    const input = rider({ budget: { mode: "SEPARATE", primaryCents: 10000 } });
    const r = recommend(input, catalog({ skis: [ski(), ski()] }), NOW);
    expect(r.relaxed).toBe("BUDGET");
    expect(r.picks).toHaveLength(2);
    expect(r.targets.conflicts.map((c) => c.code)).toContain("LOW_BUDGET");
  });

  it("then relaxes size tolerance", () => {
    // target ≈ 170 cm; only a 180 cm ski: outside ±8, inside ±12
    const r = recommend(rider({ heightCm: 178, weightKg: 74.5 }), catalog({ skis: [ski({ sizes: [{ lengthCm: 180, waistMm: 96 }] })] }), NOW);
    expect(r.relaxed).toBe("SIZE_TOLERANCE");
    expect(r.picks).toHaveLength(1);
    expect(r.picks[0]!.warnings.join(" ")).toMatch(/cm off your/);
  });

  it("finally shows the closest matches, tagged", () => {
    const r = recommend(rider({ ability: "BEGINNER" }), catalog({ skis: [ski({ abilityMin: "EXPERT", abilityMax: "EXPERT", sizes: [{ lengthCm: 200, waistMm: 96 }] })] }), NOW);
    expect(r.relaxed).toBe("CLOSEST");
    expect(r.picks[0]!.tags).toContain("CLOSEST_MATCH");
  });

  it("returns an empty, valid result for an empty catalog", () => {
    const r = recommend(rider(), catalog(), NOW);
    expect(r.picks).toEqual([]);
    expect(r.quivers).toEqual({ two: [], three: [] });
  });

  it("beginner + backcountry: gentle note and skill weighted up", () => {
    const r = recommend(rider({ ability: "BEGINNER", terrain: ["backcountry", "groomers"] }), seed, NOW);
    expect(r.targets.conflicts[0]!.code).toBe("BEGINNER_STEEP_TERRAIN");
    const top = byId.get(r.picks[0]!.productId)!;
    expect(["BEGINNER", "INTERMEDIATE"]).toContain(top.abilityMin);
  });

  it("missing demographics: component skipped and weight redistributed on every pick", () => {
    const r = recommend(rider(), seed, NOW);
    for (const p of r.picks) expect(p.breakdown.demographic.skipped).toBe(true);
  });

  it("touring skis and splitboards appear only for backcountry riders", () => {
    const touring = ski({ id: "tour", category: "TOURING", laminate: "CARBON_FIBERGLASS" });
    const resort = recommend(rider(), catalog({ skis: [touring, ski()] }), NOW);
    expect(resort.picks.map((p) => p.productId)).not.toContain("tour");
    const bc = recommend(rider({ terrain: ["backcountry"] }), catalog({ skis: [touring, ski()] }), NOW);
    expect(bc.picks[0]!.productId).toBe("tour");
    const split = board({ id: "split", category: "SPLITBOARD" });
    expect(recommend(rider({ sport: "SNOWBOARD" }), catalog({ boards: [split, board()] }), NOW).picks.map((p) => p.productId)).not.toContain("split");
  });

  it("kept bindings exclude skis their brakes don't fit", () => {
    const kit: KitItem[] = [{ kind: "SKI_BINDING", label: "my Griffons", brakeWidthMm: 100, intent: "KEEP", condition: "GOOD", likes: [], dislikes: [] }];
    const narrow = ski({ id: "n", waistMm: 94, sizes: [{ lengthCm: 170, waistMm: 94 }] });
    const wide = ski({ id: "w", waistMm: 106, sizes: [{ lengthCm: 170, waistMm: 106 }] });
    const r = recommend(rider({ kit: [...kit] }), catalog({ skis: [narrow, wide] }), NOW);
    expect(r.picks.map((p) => p.productId)).toEqual(["n"]);
  });

  it("a stretch pick is clearly labeled and within 15%", () => {
    const cheap = ski({ id: "cheap", msrpCents: 50000, reviewScore: 70 });
    const nicer = ski({ id: "nicer", msrpCents: 56000, reviewScore: 95 });
    const r = recommend(rider({ budget: { mode: "SEPARATE", primaryCents: 50000 } }), catalog({ skis: [cheap, nicer] }), NOW);
    const s = r.picks.find((p) => p.productId === "nicer")!;
    expect(s.tags).toContain("STRETCH");
    expect(s.price.cents).toBeLessThanOrEqual(50000 * 1.15);
  });
});
