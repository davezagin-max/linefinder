/** Step 7: 2- and 3-piece quivers that cover different jobs with little overlap. */
import { terrainSuitability } from "./fit";
import { JOBS, RUN_NAMES, type Job } from "./kit";
import { BOARD_PROFILE_BY_SNOW, BOARD_SHAPE_BY_SNOW, SKI_ROCKER_BY_SNOW } from "./tables";
import type { EnginePrimary, EngineSki, QuiverSuggestion, RiderInput, RiderTargets } from "./types";
import { clamp01 } from "./units";
import { QUIVER } from "./weights";

export type JobVector = Record<Job, number>;

const BOARD_ALL_MOUNTAIN = { ALL_MOUNTAIN: 1, FREERIDE: 0.7, FREESTYLE_PARK: 0.6, POWDER_SURF: 0.4, SPLITBOARD: 0.4 } as const;

/** 0–1: how well a product does each quiver job. Touring gear trades resort performance for weight. */
export function jobCoverage(p: EnginePrimary): JobVector {
  const v = rawJobCoverage(p);
  const touring = (p.kind === "SKI" && p.category === "TOURING") || (p.kind === "SNOWBOARD" && p.category === "SPLITBOARD");
  if (touring) for (const j of JOBS) if (j !== "backcountry" && j !== "powder") v[j] *= QUIVER.touringResortFactor;
  return v;
}

function rawJobCoverage(p: EnginePrimary): JobVector {
  const suit = terrainSuitability(p);
  const shared = {
    park: suit.park,
    trees_moguls: (suit.trees + suit.moguls) / 2,
    backcountry: suit.backcountry,
  };
  if (p.kind === "SKI") {
    return {
      powder: 0.6 * clamp01((p.waistMm - 88) / 24) + 0.4 * SKI_ROCKER_BY_SNOW.powder[p.rocker],
      groomer_hardpack: 0.6 * clamp01((104 - p.waistMm) / 22) + 0.4 * SKI_ROCKER_BY_SNOW.hardpack_ice[p.rocker],
      all_mountain: clamp01(1 - Math.abs(p.waistMm - 97) / 18),
      ...shared,
    };
  }
  return {
    powder: 0.5 * BOARD_SHAPE_BY_SNOW.powder[p.shape] + 0.5 * BOARD_PROFILE_BY_SNOW.powder[p.profile],
    groomer_hardpack: 0.5 * BOARD_SHAPE_BY_SNOW.hardpack_ice[p.shape] + 0.5 * BOARD_PROFILE_BY_SNOW.hardpack_ice[p.profile],
    all_mountain: BOARD_ALL_MOUNTAIN[p.category],
    ...shared,
  };
}

/** Coverage for a kit ski that isn't in the catalog, from its waist alone. */
export function approxSkiCoverage(waistMm: number, flex = 6): JobVector {
  const category: EngineSki["category"] =
    waistMm < 88 ? "FRONTSIDE" : waistMm <= 100 ? "ALL_MOUNTAIN" : waistMm <= 108 ? "ALL_MOUNTAIN_WIDE" : "POWDER";
  const synthetic = {
    kind: "SKI", category, rocker: "TIP_TAIL_ROCKER_CAMBER", flex, laminate: "FIBERGLASS",
    twinTip: "NONE", mountStyle: "TRADITIONAL", waistMm,
  } as EngineSki;
  return jobCoverage(synthetic);
}

/** What the rider needs covered: half snow mix, half terrain picks. */
export function needVector(input: Pick<RiderInput, "terrain">, t: Pick<RiderTargets, "snowMix">): JobVector {
  const zero = (): JobVector => ({ powder: 0, all_mountain: 0, groomer_hardpack: 0, park: 0, trees_moguls: 0, backcountry: 0 });
  const m = t.snowMix;
  const snow = zero();
  snow.powder = m.powder;
  snow.groomer_hardpack = m.hardpack_ice + 0.3 * m.packed;
  snow.all_mountain = 0.7 * m.packed + m.spring_variable;

  const terr = zero();
  const ts = input.terrain.length ? input.terrain : (["groomers"] as const);
  for (const x of ts) {
    const w = 1 / ts.length;
    if (x === "groomers") terr.groomer_hardpack += w;
    if (x === "trees" || x === "moguls") terr.trees_moguls += w;
    if (x === "park") terr.park += w;
    if (x === "backcountry") terr.backcountry += w;
    if (x === "steeps") {
      terr.all_mountain += w / 2;
      terr.powder += w / 2;
    }
  }
  const need = zero();
  let sum = 0;
  for (const j of JOBS) sum += need[j] = 0.5 * snow[j] + 0.5 * terr[j];
  for (const j of JOBS) need[j] /= sum || 1;
  return need;
}

export function cosine(a: JobVector, b: JobVector) {
  let dot = 0, na = 0, nb = 0;
  for (const j of JOBS) {
    dot += a[j] * b[j];
    na += a[j] ** 2;
    nb += b[j] ** 2;
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

export interface QuiverPiece {
  productId?: string;
  ownedLabel?: string;
  coverage: JobVector;
  itemScore: number; // 0–1
  priceCents: number; // 0 for owned
  waistMm?: number;
}

export function overlapPenalty(pieces: QuiverPiece[]) {
  let pen = 0;
  for (let i = 0; i < pieces.length; i++) {
    for (let k = i + 1; k < pieces.length; k++) {
      const a = pieces[i]!, b = pieces[k]!;
      const cos = cosine(a.coverage, b.coverage);
      pen += QUIVER.overlapPenalty * clamp01((cos - QUIVER.overlapCosineThreshold) / (1 - QUIVER.overlapCosineThreshold));
      if (a.waistMm !== undefined && b.waistMm !== undefined && Math.abs(a.waistMm - b.waistMm) < QUIVER.minWaistGapMm) pen += 0.1;
    }
  }
  return pen;
}

/** For each job the rider needs, the index of the piece that covers it best. */
function assignJobs(pieces: QuiverPiece[], need: JobVector): Job[][] {
  const covers: Job[][] = pieces.map(() => []);
  for (const j of JOBS) {
    if (need[j] < QUIVER.minJobNeed) continue;
    let best = 0;
    pieces.forEach((p, i) => {
      if (p.coverage[j] > pieces[best]!.coverage[j]) best = i;
    });
    covers[best]!.push(j);
  }
  return covers;
}

export function scoreQuiver(pieces: QuiverPiece[], need: JobVector) {
  let coverage = 0;
  for (const j of JOBS) coverage += need[j] * Math.max(...pieces.map((p) => p.coverage[j]));
  const meanItem = pieces.reduce((a, p) => a + p.itemScore, 0) / pieces.length;
  // A piece that isn't the best at any needed job just duplicates the others.
  const idle = assignJobs(pieces, need).filter((c) => c.length === 0).length;
  const pen = overlapPenalty(pieces) + idle * QUIVER.idlePiecePenalty;
  return { score: QUIVER.coverageWeight * coverage + QUIVER.meanItemScoreWeight * meanItem - pen, coverage, penalty: pen };
}

/**
 * Each needed job goes to the piece that covers it best. Each piece is named
 * after its most important job; a piece with no job of its own is named after
 * what it's strongest at. Run names never repeat.
 */
export function labelQuiver(pieces: QuiverPiece[], need: JobVector): QuiverSuggestion["pieces"] {
  const covers = assignJobs(pieces, need);
  const used = new Set<Job>();
  const order = pieces.map((_, i) => i).sort((a, b) => covers[b]!.length - covers[a]!.length);
  const names: Job[] = [];
  for (const i of order) {
    const p = pieces[i]!;
    const byImportance = (js: readonly Job[]) =>
      [...js].filter((j) => !used.has(j)).sort((a, b) => need[b] * p.coverage[b] - need[a] * p.coverage[a] || p.coverage[b] - p.coverage[a]);
    const strongest = [...JOBS].filter((j) => !used.has(j)).sort((a, b) => p.coverage[b] - p.coverage[a]);
    const pick = byImportance(covers[i]!)[0] ?? strongest[0] ?? JOBS[0];
    used.add(pick);
    names[i] = pick;
  }
  return pieces.map((p, i) => ({
    productId: p.productId,
    ownedLabel: p.ownedLabel,
    runName: RUN_NAMES[names[i]!],
    covers: covers[i]!.map((j) => RUN_NAMES[j]),
  }));
}

function* combinations<T>(xs: T[], k: number, start = 0, acc: T[] = []): Generator<T[]> {
  if (acc.length === k) {
    yield acc;
    return;
  }
  for (let i = start; i <= xs.length - (k - acc.length); i++) yield* combinations(xs, k, i + 1, [...acc, xs[i]!]);
}

/** Best quivers of `size` pieces. Owned KEEP items are always included. */
export function buildQuivers(pool: QuiverPiece[], owned: QuiverPiece[], need: JobVector, size: 2 | 3, top = 3): QuiverSuggestion[] {
  const k = size - owned.length;
  if (k < 1) return [];
  const candidates = pool.slice(0, QUIVER.candidatePool);
  const results: QuiverSuggestion[] = [];
  for (const combo of combinations(candidates, k)) {
    const pieces = [...owned, ...combo];
    const s = scoreQuiver(pieces, need);
    results.push({
      pieces: labelQuiver(pieces, need),
      score: Math.round(s.score * 1000) / 10,
      coverage: s.coverage,
      totalPriceCents: combo.reduce((a, p) => a + p.priceCents, 0),
      overlapPenalty: s.penalty,
    });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, top);
}
