import { describe, expect, it } from "vitest";
import { emptyDraft, finalizeDraft, heightCmOf, toRiderInput, usMensSizeOf, weightKgOf, type SurveyDraft } from "./schema";
import { firstIncompleteStep, liveNotes, STEPS, stepErrors } from "./steps";

const complete = (over: Partial<SurveyDraft> = {}): SurveyDraft => ({
  ...emptyDraft(),
  sport: "SKI",
  ability: "ADVANCED",
  heightFt: 5,
  heightIn: 11,
  weightLbs: 185,
  regionKey: "wasatch",
  terrain: ["trees", "steeps"],
  style: "CHARGING",
  daysPerSeason: 25,
  budgetTotal: 1800,
  shoeSize: 10,
  footWidth: "MEDIUM",
  ...over,
});

describe("unit conversion", () => {
  it("handles imperial and metric height/weight", () => {
    expect(heightCmOf(complete())).toBeCloseTo(180.34);
    expect(weightKgOf(complete())).toBeCloseTo(83.9, 1);
    const metric = complete({ units: "metric", heightCmInput: 172, weightKgInput: 70 });
    expect(heightCmOf(metric)).toBe(172);
    expect(weightKgOf(metric)).toBe(70);
  });

  it("converts shoe sizes to US men's", () => {
    expect(usMensSizeOf(complete({ shoeSystem: "US_WOMENS", shoeSize: 8.5 }))).toBe(7);
    expect(usMensSizeOf(complete({ shoeSystem: "MONDO", shoeSize: 28 }))).toBe(10);
    expect(usMensSizeOf(complete({ shoeSystem: "EU", shoeSize: 43 }))).toBe(10);
  });
});

describe("step validation", () => {
  it("blocks Next until required answers are given", () => {
    const d = emptyDraft();
    for (const s of STEPS) {
      if (s.optional || s.id === "review") expect(stepErrors(s.id, d)).toEqual([]);
      else expect(stepErrors(s.id, d).length).toBeGreaterThan(0);
    }
  });

  it("height and weight are required and sanity-checked", () => {
    expect(stepErrors("body", complete())).toEqual([]);
    expect(stepErrors("body", complete({ weightLbs: undefined }))).toEqual(["Add your weight."]);
    expect(stepErrors("body", complete({ heightFt: 9 }))[0]).toMatch(/looks off/);
  });

  it("snowboarders must pick a stance; skiers don't", () => {
    expect(stepErrors("feet", complete({ sport: "SNOWBOARD" }))).toEqual(["Pick regular or goofy."]);
    expect(stepErrors("feet", complete({ sport: "SNOWBOARD", stance: "GOOFY" }))).toEqual([]);
    expect(stepErrors("feet", complete())).toEqual([]);
  });

  it("budget needs a total, or at least a ski/board amount", () => {
    expect(stepErrors("budget", complete({ budgetTotal: undefined }))).toHaveLength(1);
    expect(stepErrors("budget", complete({ budgetMode: "SEPARATE", budgetPrimary: 700 }))).toEqual([]);
    expect(stepErrors("budget", complete({ sport: "SNOWBOARD", budgetMode: "SEPARATE" }))[0]).toMatch(/board/);
  });

  it("resumes at the first unanswered step", () => {
    expect(firstIncompleteStep(emptyDraft())).toBe("sport");
    expect(firstIncompleteStep(complete({ style: undefined }))).toBe("style");
    expect(firstIncompleteStep(complete())).toBe("review");
  });
});

describe("live notes for conflicting answers", () => {
  it("beginner + steeps → gentle note", () => {
    expect(liveNotes(complete({ ability: "BEGINNER" })).map((n) => n.code)).toContain("BEGINNER_STEEP_TERRAIN");
    expect(liveNotes(complete())).toEqual([]);
  });
});

describe("finalize → engine input", () => {
  it("produces a valid RiderInput", () => {
    const a = finalizeDraft(complete({ snowPreference: ["powder", "packed"], ageRange: "35_44" }));
    const r = toRiderInput(a);
    expect(r.heightCm).toBeCloseTo(180.34);
    expect(r.snowPreference).toEqual({ powder: 0.5, packed: 0.5 });
    expect(r.budget).toEqual({ mode: "TOTAL", totalCents: 180000 });
    expect(r.boots.usMensSize).toBe(10);
  });

  it("empty snow preference means 'use my region'", () => {
    expect(toRiderInput(finalizeDraft(complete())).snowPreference).toBeUndefined();
  });

  it("drops kit from the other sport and resets kit mode when there's no kit", () => {
    const board = { kind: "SNOWBOARD" as const, label: "old board", intent: "REPLACE" as const, condition: "WORN" as const, likes: [], dislikes: [] };
    const a = finalizeDraft(complete({ kit: [board], kitMode: "REPLACE" }));
    expect(a.kit).toEqual([]);
    expect(finalizeDraft(complete({ kitMode: "REPLACE" })).kitMode).toBe("FRESH_START");
  });

  it("adds a default stance for snowboarders and none for skiers", () => {
    expect(finalizeDraft(complete({ sport: "SNOWBOARD", stance: "GOOFY" })).snowboard).toEqual({ stance: "GOOFY" });
    expect(finalizeDraft(complete()).snowboard).toBeUndefined();
  });

  it("rejects incomplete drafts", () => {
    expect(() => finalizeDraft(complete({ terrain: [] }))).toThrow();
  });
});
