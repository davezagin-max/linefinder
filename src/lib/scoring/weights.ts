/**
 * ALL scoring weights and tunable constants live here.
 * Change a number → re-run tests → bump WEIGHTS_VERSION.
 */
export const WEIGHTS_VERSION = "2026.11-draft1";

/** Top-level blend. Must sum to 1. */
export const COMPONENT_WEIGHTS = {
  fit: 0.45,
  review: 0.4,
  brand: 0.1,
  demographic: 0.05,
} as const;

/** Inside `fit` (fractions of the whole score; sum = COMPONENT_WEIGHTS.fit). */
export const FIT_WEIGHTS = {
  skillFlex: 0.15,
  conditions: 0.15, // width + rocker/profile vs snow
  terrainStyle: 0.15,
} as const;

/** Edge case: beginner + steeps/backcountry etc. Skill gets louder,
 *  terrain quieter; fit total stays 0.45. */
export const CONFLICT_FIT_WEIGHTS = {
  skillFlex: 0.225,
  conditions: 0.15,
  terrainStyle: 0.075,
} as const;

export const BRAND_REPUTATION_BLEND = {
  durability: 0.4,
  warranty: 0.3,
  reviewConsensus: 0.3,
} as const;

export const REVIEW_AGGREGATION = {
  /** Shrink toward category mean as if it had this many average reviews. */
  bayesPriorCount: 2,
  /** Reviews lose half their weight every N days. */
  recencyHalfLifeDays: 365,
  /** Prior-year review of an unchanged lineage counts at this factor. */
  priorYearSameLineageFactor: 0.7,
  /** Product with zero reviews scores category mean × this. */
  noReviewFactor: 0.9,
  /** Reviews older than this are "stale" in data-quality checks. */
  staleAfterDays: 400,
} as const;

export const BUDGET = {
  stretchMaxOver: 0.15, // stretch picks ≤ 115% of budget
  maxStretchPicks: 2,
  /** Default split when the user gives one total. */
  totalSplit: {
    SKI: { primary: 0.5, binding: 0.2, boot: 0.3 },
    SNOWBOARD: { primary: 0.5, binding: 0.25, boot: 0.25 },
  },
  /** Price rows older than this are ignored (fall back to MSRP). */
  priceMaxAgeDays: 7,
} as const;

export const SKI_LENGTH = {
  /** Base target = height (cm) + offset by ability. */
  heightOffsetByAbility: { BEGINNER: -15, INTERMEDIATE: -8, ADVANCED: -2, EXPERT: 3 },
  /** Weight vs. "typical for height" (BMI 23): cm per kg, capped. */
  cmPerKgOverTypical: 0.25,
  weightAdjCapCm: 5,
  styleAdjCm: { PLAYFUL: -4, BALANCED: 0, CHARGING: 4 },
  /** Applied per product (rockered powder skis ski short; park skis go short). */
  categoryAdjCm: {
    FRONTSIDE: -2,
    ALL_MOUNTAIN: 0,
    ALL_MOUNTAIN_WIDE: 2,
    POWDER: 5,
    FREESTYLE_PARK: -4,
    FREERIDE_BIG_MOUNTAIN: 4,
    TOURING: -2,
  },
  /** |nearest size − target| ≤ ideal → full size credit; > hard → excluded. */
  idealToleranceCm: 4,
  hardToleranceCm: 8,
  relaxedHardToleranceCm: 12,
} as const;

export const BOARD_SIZE = {
  /** Fallback when a size has no manufacturer rider-weight range. */
  weightBase: { interceptCm: 125, cmPerKg: 0.42 },
  heightFactor: 0.88, // height-based estimate = height × 0.88
  blend: { weight: 0.7, height: 0.3 },
  abilityAdjCm: { BEGINNER: -3, INTERMEDIATE: -1, ADVANCED: 0, EXPERT: 1 },
  styleAdjCm: { PLAYFUL: -2, BALANCED: 0, CHARGING: 2 },
  categoryAdjCm: { ALL_MOUNTAIN: 0, FREESTYLE_PARK: -3, FREERIDE: 3, POWDER_SURF: 2, SPLITBOARD: 2 },
  /** Manufacturer weight range is a hard filter with this slack. */
  riderWeightSlack: 0.1,
  idealToleranceCm: 3,
  hardToleranceCm: 6,
  /** Men's US boot size → width requirement (avoid toe/heel drag). */
  wide: { requiredAtUs: 11, preferredAtUs: 10.5, minWideWaistMm: 258 },
} as const;

export const FLEX = {
  baseByAbility: { BEGINNER: 3, INTERMEDIATE: 5, ADVANCED: 7, EXPERT: 8 },
  referenceWeightKg: 75,
  perTenKg: 0.5,
  weightCap: 1.5,
  styleAdj: { PLAYFUL: -1, BALANCED: 0, CHARGING: 1 },
  /** Applied when the terrain set is mostly/only that terrain. */
  terrainAdj: { park: -1.5, moguls: -0.5, steeps: 0.5, backcountry: 0.25 },
  /** score = max(0, 1 − (|Δ| / falloff)^1.5) */
  falloff: 4,
  /** skillFlex = flexMatch × 0.7 + abilityRangeMatch × 0.3 */
  flexShare: 0.7,
} as const;

export const CONDITIONS = {
  /** Ideal ski waist (mm) per snow type; score blends these by snow mix. */
  skiWaistIdeal: {
    powder: { center: 112, halfWidth: 12 },
    packed: { center: 94, halfWidth: 8 },
    hardpack_ice: { center: 84, halfWidth: 8 },
    spring_variable: { center: 98, halfWidth: 10 },
  },
  widthShare: 0.6, // vs rocker/profile 0.4
} as const;

export const TERRAIN_STYLE = {
  terrainShare: 0.6, // vs style 0.4
} as const;

export const DEMOGRAPHIC = {
  youngMaxAge: 25,
  olderMinAge: 55,
  lightMaxKg: 60,
  heavyMinKg: 95,
} as const;

export const QUIVER = {
  candidatePool: 25, // top-N singles considered for combos
  coverageWeight: 0.6,
  meanItemScoreWeight: 0.4,
  /** Penalize pairs whose job vectors are too similar. */
  overlapCosineThreshold: 0.85,
  overlapPenalty: 0.25,
  minWaistGapMm: 12, // two skis closer than this = likely same job
  /** Jobs the rider needs less than this aren't assigned to a piece. */
  minJobNeed: 0.05,
  /** Penalty for each piece that isn't the best at any needed job. */
  idlePiecePenalty: 0.1,
  /** Touring skis/splitboards: resort-job coverage multiplier. */
  touringResortFactor: 0.6,
} as const;

export const REASONS = { minPerPick: 2, maxPerPick: 3, detailPageMax: 5 } as const;

export const RESULTS = {
  listSize: 15,
  stretchInsertAfter: 3, // stretch picks appear right after the top in-budget picks
  bestValueMinScore: 75,
  whyNotOutsideTop: 10,
  whyNotMax: 5,
} as const;

export const SIZE_FIT = { minMultiplier: 0.85, inManufacturerRangeFloor: 0.92 } as const;

/** Kit preferences nudge a sub-score by up to this much. */
export const KIT_PREF_BONUS = 0.1;
/** UNSURE kit items count at this fraction of a REPLACE item. */
export const KIT_UNSURE_FACTOR = 0.5;

/** Demographic component when demographics are given but no rule applies. */
export const DEMOGRAPHIC_NEUTRAL = 0.75;

export const SETUP = {
  /** Bindings/boots: fit matters more than for skis. */
  weights: { fit: 0.6, review: 0.3, brand: 0.1 },
  perPick: 3,
  brakeMaxOverWaistMm: 15,
  dinHeadroom: 1,
  boardBindingFlexTolerance: 1.5,
  boardBindingFlexHardLimit: 3,
  /** Ski boot BSL ≈ mondo (mm) + this, for the DIN estimate. */
  bslOverMondoMm: 40,
  bootWeightFlexPer15Kg: 10,
  bootWeightFlexCap: 15,
  /** Ski boots more than this far outside the flex range are excluded. */
  bootFlexHardLimit: 20,
  /** Budget preference only applies to picks fitting at least this well. */
  goodFit: 0.7,
} as const;

/** Sanity check used by tests. */
export function assertWeightsSumToOne() {
  const top = Object.values(COMPONENT_WEIGHTS).reduce((a, b) => a + b, 0);
  const fit = Object.values(FIT_WEIGHTS).reduce((a, b) => a + b, 0);
  const conflict = Object.values(CONFLICT_FIT_WEIGHTS).reduce((a, b) => a + b, 0);
  const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;
  if (!close(top, 1)) throw new Error(`COMPONENT_WEIGHTS sum ${top}`);
  if (!close(fit, COMPONENT_WEIGHTS.fit)) throw new Error(`FIT_WEIGHTS sum ${fit}`);
  if (!close(conflict, COMPONENT_WEIGHTS.fit)) throw new Error(`CONFLICT_FIT_WEIGHTS sum ${conflict}`);
}
