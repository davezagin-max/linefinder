import { describe, expect, it } from "vitest";
import { bestValueIndex, rankWithBudget, resolvePrice, splitBudget } from "../budget";
import { JOBS, RUN_NAMES } from "../kit";
import { buildQuivers, cosine, jobCoverage, labelQuiver, needVector, overlapPenalty, scoreQuiver, type QuiverPiece } from "../quiver";
import { buildReasons } from "../reasons";
import { scorePrimary } from "../score";
import { matchBoardBindings, matchBoardBoots, matchSkiBindings, matchSkiBoots } from "../setup";
import { sizeSki } from "../sizing";
import { deriveTargets } from "../targets";
import type { KitItem, ScoreBreakdown } from "../types";
import { explainWhyNot } from "../whyNot";
import { NOW, board, boardBinding, boardBoot, catalog, daysAgo, rider, ski, skiBinding, skiBoot } from "./fixtures";

const price = (cents: number) => ({ cents, isMsrp: false });
const item = (id: string, total: number, cents: number) => ({ id, total, price: price(cents) });
const keep = (over: Partial<KitItem>): KitItem => ({ kind: "SKI", label: "kept", intent: "KEEP", condition: "GOOD", likes: [], dislikes: [], ...over });

// ───────────────────────── Prices & budget ─────────────────────────

describe("resolvePrice", () => {
  const p = (prices: { priceCents: number; inStock: boolean; checkedAt: Date }[]) =>
    resolvePrice({ msrpCents: 90000, prices: prices.map((x) => ({ ...x, retailer: "R", affiliateUrl: "" })) }, NOW);

  it("uses the lowest fresh in-stock price", () => {
    const r = p([
      { priceCents: 80000, inStock: true, checkedAt: daysAgo(1) },
      { priceCents: 70000, inStock: false, checkedAt: daysAgo(1) },
      { priceCents: 75000, inStock: true, checkedAt: daysAgo(2) },
    ]);
    expect(r.cents).toBe(75000);
    expect(r.isMsrp).toBe(false);
  });

  it("ignores prices older than 7 days and falls back to MSRP", () => {
    const r = p([{ priceCents: 50000, inStock: true, checkedAt: daysAgo(8) }]);
    expect(r).toEqual({ cents: 90000, isMsrp: true });
  });

  it("uses an out-of-stock fresh price only if nothing is in stock", () => {
    expect(p([{ priceCents: 60000, inStock: false, checkedAt: daysAgo(1) }]).cents).toBe(60000);
  });
});

describe("splitBudget", () => {
  it("splits a ski total 50/20/30 and a board total 50/25/25", () => {
    expect(splitBudget({ sport: "SKI", kit: [], budget: { mode: "TOTAL", totalCents: 100000 } })).toEqual({ primary: 50000, binding: 20000, boot: 30000 });
    expect(splitBudget({ sport: "SNOWBOARD", kit: [], budget: { mode: "TOTAL", totalCents: 100000 } })).toEqual({ primary: 50000, binding: 25000, boot: 25000 });
  });

  it("gives the boot share to the other items when boots are kept", () => {
    const b = splitBudget({ sport: "SKI", kit: [keep({ kind: "SKI_BOOT" })], budget: { mode: "TOTAL", totalCents: 70000 } });
    expect(b).toEqual({ primary: 50000, binding: 20000, boot: undefined });
  });

  it("passes separate budgets through", () => {
    expect(splitBudget({ sport: "SKI", kit: [], budget: { mode: "SEPARATE", primaryCents: 60000 } }).primary).toBe(60000);
  });
});

describe("rankWithBudget", () => {
  const pool = [
    item("cheap-good", 85, 50000),
    item("cheap-ok", 70, 40000),
    item("stretch-great", 95, 56000), // 12% over
    item("stretch-great-2", 92, 57000),
    item("stretch-great-3", 91, 57400), // third stretch: dropped (max 2)
    item("way-over", 99, 70000), // > 115%: never shown
    item("stretch-weak", 60, 55000), // doesn't beat #10 in-budget
  ];

  it("ranks in-budget first, adds ≤ 2 stretch picks after the top 3, never > 115%", () => {
    const { list, relaxedBudget } = rankWithBudget(pool, 50000);
    expect(relaxedBudget).toBe(false);
    const ids = list.map((x) => x.id);
    expect(ids).toEqual(["cheap-good", "cheap-ok", "stretch-great", "stretch-great-2"]);
    expect(list.filter((x) => x.stretch).map((x) => x.id)).toEqual(["stretch-great", "stretch-great-2"]);
    expect(ids).not.toContain("way-over");
  });

  it("stretch picks must outscore the #10 in-budget pick", () => {
    const many = Array.from({ length: 12 }, (_, i) => item(`in${i}`, 80 - i, 40000));
    const { list } = rankWithBudget([...many, item("s-low", 70, 55000), item("s-high", 75, 55000)], 50000);
    const stretch = list.filter((x) => x.stretch).map((x) => x.id);
    expect(stretch).toEqual(["s-high"]); // #10 in-budget scores 71
    expect(list.findIndex((x) => x.id === "s-high")).toBe(3);
    expect(list.length).toBe(13);
  });

  it("relaxes the budget when nothing is within reach", () => {
    const { list, relaxedBudget } = rankWithBudget([item("a", 80, 90000), item("b", 90, 95000)], 50000);
    expect(relaxedBudget).toBe(true);
    expect(list.map((x) => x.id)).toEqual(["b", "a"]);
  });

  it("caps the list at 15", () => {
    const many = Array.from({ length: 30 }, (_, i) => item(`x${i}`, i, 1000));
    expect(rankWithBudget(many, undefined).list).toHaveLength(15);
  });

  it("Best Value = best score per dollar among picks scoring ≥ 75", () => {
    expect(bestValueIndex([item("a", 90, 90000), item("b", 80, 50000), item("c", 70, 10000)])).toBe(1);
    expect(bestValueIndex([item("c", 70, 10000)])).toBe(-1);
  });
});

// ───────────────────────── Quiver ─────────────────────────

describe("quiver builder", () => {
  const pow = ski({ id: "pow", waistMm: 115, category: "POWDER", rocker: "TIP_TAIL_ROCKER_CAMBER" });
  const am = ski({ id: "am", waistMm: 98 });
  const am2 = ski({ id: "am2", waistMm: 100 });
  const carve = ski({ id: "carve", waistMm: 78, category: "FRONTSIDE", rocker: "FULL_CAMBER" });
  const piece = (p: typeof pow, score = 0.85): QuiverPiece => ({ productId: p.id, coverage: jobCoverage(p), itemScore: score, priceCents: 80000, waistMm: p.waistMm });
  const r = rider({ regionKey: "wasatch", terrain: ["groomers", "trees", "steeps"] });
  const need = needVector(r, deriveTargets(r));

  it("need vector sums to 1", () => {
    expect(JOBS.reduce((a, j) => a + need[j], 0)).toBeCloseTo(1);
  });

  it("penalizes two skis that do the same job", () => {
    expect(cosine(jobCoverage(am), jobCoverage(am2))).toBeGreaterThan(0.97);
    expect(overlapPenalty([piece(am), piece(am2)])).toBeGreaterThan(0.2);
    expect(overlapPenalty([piece(pow), piece(carve)])).toBe(0);
  });

  it("a powder + carver pair beats two near-identical all-mountain skis", () => {
    expect(scoreQuiver([piece(pow), piece(carve)], need).score).toBeGreaterThan(scoreQuiver([piece(am), piece(am2)], need).score);
  });

  it("returns the best 2- and 3-piece combos with unique run names", () => {
    const pool = [piece(am), piece(am2), piece(pow), piece(carve)];
    const two = buildQuivers(pool, [], need, 2);
    expect(two[0]!.pieces.map((p) => p.productId).sort()).not.toEqual(["am", "am2"]);
    const three = buildQuivers(pool, [], need, 3);
    for (const q of three) expect(new Set(q.pieces.map((p) => p.runName)).size).toBe(3);
  });

  it("always includes kept kit pieces and fills around them", () => {
    const owned: QuiverPiece = { ownedLabel: "my Kendo", coverage: jobCoverage(am), itemScore: 0.7, priceCents: 0, waistMm: 98 };
    const two = buildQuivers([piece(am2), piece(pow), piece(carve)], [owned], need, 2);
    expect(two[0]!.pieces[0]!.ownedLabel).toBe("my Kendo");
    expect(two[0]!.pieces[1]!.productId).not.toBe("am2");
    expect(two[0]!.totalPriceCents).toBe(80000);
  });

  it("skips sizes the kit already fills", () => {
    const owned = [piece(am), piece(pow)].map((p) => ({ ...p, productId: undefined, ownedLabel: "x" }));
    expect(buildQuivers([piece(carve)], owned, need, 2)).toEqual([]);
  });

  it("labels each piece by the job it does best", () => {
    const labels = labelQuiver([piece(pow), piece(carve)], need);
    expect(labels[0]!.runName).toBe(RUN_NAMES.powder);
    expect(labels[1]!.runName).toBe(RUN_NAMES.groomer_hardpack);
  });
});

// ───────────────────────── Bindings & boots ─────────────────────────

describe("setup matching", () => {
  const ctx = (over = {}) => {
    const input = rider({ ability: "ADVANCED", ...over });
    return { input, t: deriveTargets(input), now: NOW };
  };

  it("ski bindings: brake must cover the waist (≤ +15 mm) and DIN must fit", () => {
    const c = ctx();
    const s = ski({ waistMm: 104, sizes: [{ lengthCm: 177, waistMm: 104 }] });
    const size = sizeSki(s, c.t);
    const ok = skiBinding({ id: "ok", brakeWidthsMm: [100, 110] });
    const narrow = skiBinding({ id: "narrow", brakeWidthsMm: [90, 100] });
    const wide = skiBinding({ id: "wide", brakeWidthsMm: [130] });
    const lowDin = skiBinding({ id: "lowdin", dinMin: 1, dinMax: 4 });
    const picks = matchSkiBindings(s, size, catalog({ skiBindings: [ok, narrow, wide, lowDin] }), c);
    expect(picks.map((p) => p.productId)).toEqual(["ok"]);
    expect(picks[0]!.sizeLabel).toBe("110mm brake");
  });

  it("kept boots restrict binding sole compatibility; kept bindings → no binding picks", () => {
    const s = ski({ waistMm: 96 });
    const touringBootCtx = ctx({ kit: [keep({ kind: "SKI_BOOT", soleNorm: "TOURING_ISO9523" })] });
    const alpineOnly = skiBinding({ id: "alpine" });
    const multi = skiBinding({ id: "multi", soleCompat: ["ALPINE_ISO5355", "GRIPWALK", "TOURING_ISO9523"] });
    const picks = matchSkiBindings(s, sizeSki(s, touringBootCtx.t), catalog({ skiBindings: [alpineOnly, multi] }), touringBootCtx);
    expect(picks.map((p) => p.productId)).toEqual(["multi"]);
    const keptBindings = ctx({ kit: [keep({ kind: "SKI_BINDING" })] });
    expect(matchSkiBindings(s, sizeSki(s, keptBindings.t), catalog({ skiBindings: [multi] }), keptBindings)).toEqual([]);
  });

  it("ski boots: must cover mondo; flex and last width drive the order; no wildly soft boots", () => {
    const c = ctx({ boots: { usMensSize: 10, width: "WIDE", fitIssues: [] } }); // flex 110–130, last 102–106
    const right = skiBoot({ id: "right", flex: 120, lastWidthMm: 102 });
    const narrow = skiBoot({ id: "narrow", flex: 120, lastWidthMm: 98 });
    const tooSoft = skiBoot({ id: "soft", flex: 70, lastWidthMm: 102, abilityMin: "BEGINNER", abilityMax: "INTERMEDIATE" });
    const tooSmall = skiBoot({ id: "small", mondoMin: 22, mondoMax: 26 });
    const picks = matchSkiBoots(catalog({ skiBoots: [narrow, tooSoft, right, tooSmall] }), c);
    expect(picks.map((p) => p.productId)).toEqual(["right", "narrow"]);
  });

  it("a cheap but poorly fitting boot doesn't jump ahead of a good one", () => {
    const c = { ...ctx(), bootBudget: 40000 };
    const good = skiBoot({ id: "good", flex: 120, msrpCents: 80000 });
    const cheapMeh = skiBoot({ id: "meh", flex: 100, lastWidthMm: 104, msrpCents: 35000, abilityMin: "INTERMEDIATE", abilityMax: "ADVANCED" });
    expect(matchSkiBoots(catalog({ skiBoots: [cheapMeh, good] }), c)[0]!.productId).toBe("good");
  });

  it("board bindings: mount pattern, boot size and flex (step-on not auto-paired)", () => {
    const c = ctx({ sport: "SNOWBOARD", boots: { usMensSize: 11.5, width: "MEDIUM", fitIssues: [] } });
    const b = board({ insertPattern: "CHANNEL", flex: 6 });
    const ok = boardBinding({ id: "ok" });
    const noChannel = boardBinding({ id: "nochan", mountCompat: ["FOUR_X_FOUR"] });
    const smallOnly = boardBinding({ id: "small", sizeRanges: [{ label: "M", usMin: 7, usMax: 10.5 }] });
    const stiff = boardBinding({ id: "stiff", flex: 10 });
    const stepOn = boardBinding({ id: "step", entry: "STEP_ON", stepOnSystem: "X" });
    const picks = matchBoardBindings(b, catalog({ boardBindings: [ok, noChannel, smallOnly, stiff, stepOn] }), c);
    expect(picks.map((p) => p.productId)).toEqual(["ok"]);
    expect(picks[0]!.sizeLabel).toBe("L");
  });

  it("board boots: size range, wide-foot preference, step-on excluded", () => {
    const c = ctx({ sport: "SNOWBOARD", boots: { usMensSize: 10, width: "WIDE", fitIssues: [] } });
    const b = board({ flex: 6 });
    const wide = boardBoot({ id: "wide", wideAvailable: true });
    const plain = boardBoot({ id: "plain" });
    const step = boardBoot({ id: "step", stepOnSystem: "X" });
    expect(matchBoardBoots(b, catalog({ boardBoots: [plain, step, wide] }), c).map((p) => p.productId)).toEqual(["wide", "plain"]);
  });
});

// ───────────────────────── Reasons ─────────────────────────

describe("reasons", () => {
  const avg = { skillFlex: 0, conditions: 0, terrainStyle: 0, review: 0, brand: 0, demographic: 0 };

  function reasonsFor(p: ReturnType<typeof ski>, over = {}) {
    const r = rider(over);
    const t = deriveTargets(r);
    const size = sizeSki(p, t);
    return buildReasons(p, r, t, scorePrimary(p, r, t, size, 72), size, avg);
  }

  it("ties metal construction to the rider's weight and charging style (in lb by default)", () => {
    const rs = reasonsFor(ski({ laminate: "FULL_METAL", flex: 8 }), { weightKg: 84, style: "CHARGING" });
    expect(rs[0]!.text).toBe("Your 185 lb weight + charging style → its metal laminate keeps it stable at speed");
  });

  it("uses kg for metric riders", () => {
    const rs = reasonsFor(ski({ laminate: "FULL_METAL", flex: 8 }), { weightKg: 84, style: "CHARGING", units: "metric" });
    expect(rs[0]!.text).toContain("84 kg");
  });

  it("puts My Kit reasons first", () => {
    const kit = [{ kind: "SKI", label: "old Brahma", intent: "REPLACE", condition: "WORN", likes: [], dislikes: ["TOO_STIFF"] } as KitItem];
    const rs = reasonsFor(ski({ flex: 4 }), { kit });
    expect(rs[0]!.component).toBe("kit");
    expect(rs[0]!.text).toMatch(/old Brahma.*softer \(flex 4\/10\)/);
  });

  it("never presents placeholder scores as reviews", () => {
    const real = reasonsFor(ski({ reviewScore: 92 }));
    const fake = reasonsFor(ski({ reviewScore: 92, reviewsArePlaceholder: true }));
    expect(real.some((x) => x.component === "review")).toBe(true);
    expect(fake.some((x) => x.component === "review")).toBe(false);
  });

  it("returns strongest first, and at least 2 even for an average product", () => {
    const rs = reasonsFor(ski());
    for (let i = 1; i < rs.length; i++) expect(rs[i - 1]!.impact).toBeGreaterThanOrEqual(rs[i]!.impact);
    expect(rs.length).toBeGreaterThanOrEqual(2);
  });

  it("drops below-average reasons once there are enough strong ones", () => {
    const rs = reasonsFor(ski({ laminate: "FULL_METAL", flex: 8, reviewScore: 92 }), { weightKg: 84, style: "CHARGING" });
    const positives = rs.filter((x) => x.impact > 0).length;
    if (positives >= 2) expect(rs.every((x) => x.impact > 0)).toBe(true);
  });
});

// ───────────────────────── Why not ─────────────────────────

describe("why not this one?", () => {
  const t = deriveTargets(rider());
  const bd = (pts: number): ScoreBreakdown => ({
    skillFlex: { score: 0, points: pts },
    conditions: { score: 0, points: 10 },
    terrainStyle: { score: 0, points: 10 },
    review: { score: 0, points: 30, limited: false },
    brand: { score: 0, points: 8 },
    demographic: { score: 0, points: 0, skipped: true, rules: [] },
    sizeFit: 1,
  });

  it("explains filtered-out popular models", () => {
    const p = ski({ isPopular: true });
    const out = explainWhyNot([{ product: p, rank: null, exclusion: { kind: "SIZE", text: "Closest length is 191 cm" } }], undefined, t, undefined);
    expect(out[0]).toMatchObject({ headline: "No size that fits you", rank: null });
  });

  it("flags over-budget models", () => {
    const p = ski({ isPopular: true });
    const out = explainWhyNot([{ product: p, rank: 14, breakdown: bd(10), priceCents: 100000 }], bd(12), t, 70000);
    expect(out[0]!.headline).toBe("Over your budget");
    expect(out[0]!.details[0]).toBe("$1,000 is $300 over your $700 budget");
  });

  it("names the biggest losing component", () => {
    const stiff = ski({ isPopular: true, flex: 9.5 });
    const out = explainWhyNot([{ product: stiff, rank: 12, breakdown: bd(4), priceCents: 50000 }], bd(13), t, undefined);
    expect(out[0]!.headline).toBe("Too much ski for your level");
  });

  it("ignores non-popular models and popular models already in the top 10", () => {
    const out = explainWhyNot(
      [
        { product: ski({ isPopular: false }), rank: 14, breakdown: bd(4) },
        { product: ski({ isPopular: true }), rank: 3, breakdown: bd(4) },
      ],
      bd(13),
      t,
      undefined,
    );
    expect(out).toEqual([]);
  });
});
