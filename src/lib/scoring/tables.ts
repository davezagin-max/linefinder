/**
 * Lookup tables used by the scoring functions. Weights live in weights.ts;
 * these are the "what is this product good at" judgments, kept in one place
 * so they can be tuned without touching logic.
 */
import type {
  Ability,
  BoardCategory,
  BoardProfile,
  BoardShape,
  Laminate,
  SkiCategory,
  SkiRocker,
  SnowType,
  Terrain,
} from "./types";

export const ABILITY_INDEX: Record<Ability, number> = { BEGINNER: 1, INTERMEDIATE: 2, ADVANCED: 3, EXPERT: 4 };
export const ABILITY_LABEL: Record<Ability, string> = {
  BEGINNER: "beginner",
  INTERMEDIATE: "intermediate",
  ADVANCED: "advanced",
  EXPERT: "expert",
};

type TerrainRow = Record<Terrain, number>;
const row = (groomers: number, trees: number, moguls: number, park: number, steeps: number, backcountry: number): TerrainRow => ({
  groomers, trees, moguls, park, steeps, backcountry,
});

/** 0–1: how well a category suits each terrain (before spec modifiers). */
export const SKI_TERRAIN: Record<SkiCategory, TerrainRow> = {
  FRONTSIDE: row(1, 0.4, 0.7, 0.2, 0.6, 0.1),
  ALL_MOUNTAIN: row(0.85, 0.75, 0.75, 0.4, 0.8, 0.4),
  ALL_MOUNTAIN_WIDE: row(0.65, 0.9, 0.6, 0.45, 0.85, 0.6),
  POWDER: row(0.35, 0.9, 0.35, 0.35, 0.8, 0.7),
  FREESTYLE_PARK: row(0.6, 0.6, 0.6, 1, 0.4, 0.2),
  FREERIDE_BIG_MOUNTAIN: row(0.6, 0.7, 0.4, 0.3, 1, 0.6),
  TOURING: row(0.5, 0.7, 0.5, 0.1, 0.7, 1),
};

export const BOARD_TERRAIN: Record<BoardCategory, TerrainRow> = {
  ALL_MOUNTAIN: row(0.9, 0.7, 0.6, 0.6, 0.7, 0.4),
  FREESTYLE_PARK: row(0.65, 0.55, 0.6, 1, 0.35, 0.2),
  FREERIDE: row(0.7, 0.85, 0.45, 0.3, 1, 0.6),
  POWDER_SURF: row(0.45, 0.95, 0.4, 0.25, 0.7, 0.65),
  SPLITBOARD: row(0.4, 0.7, 0.3, 0.1, 0.8, 1),
};

type SnowRow<K extends string> = Record<SnowType, Record<K, number>>;

/** 0–1: how well a ski rocker profile suits each snow type. */
export const SKI_ROCKER_BY_SNOW: SnowRow<SkiRocker> = {
  powder: { FULL_ROCKER: 1, TIP_TAIL_ROCKER_CAMBER: 0.9, FLAT_ROCKER: 0.8, TIP_ROCKER_CAMBER: 0.6, FULL_CAMBER: 0.2 },
  packed: { TIP_ROCKER_CAMBER: 1, FULL_CAMBER: 0.9, TIP_TAIL_ROCKER_CAMBER: 0.85, FLAT_ROCKER: 0.6, FULL_ROCKER: 0.4 },
  hardpack_ice: { FULL_CAMBER: 1, TIP_ROCKER_CAMBER: 0.95, TIP_TAIL_ROCKER_CAMBER: 0.7, FLAT_ROCKER: 0.4, FULL_ROCKER: 0.2 },
  spring_variable: { TIP_TAIL_ROCKER_CAMBER: 0.9, TIP_ROCKER_CAMBER: 0.8, FLAT_ROCKER: 0.8, FULL_ROCKER: 0.7, FULL_CAMBER: 0.6 },
};

export const BOARD_PROFILE_BY_SNOW: SnowRow<BoardProfile> = {
  powder: { FULL_ROCKER: 1, HYBRID_ROCKER: 0.9, FLAT_ROCKER: 0.85, HYBRID_CAMBER: 0.75, FLAT: 0.6, CAMBER: 0.4 },
  packed: { CAMBER: 1, HYBRID_CAMBER: 0.95, HYBRID_ROCKER: 0.75, FLAT: 0.7, FLAT_ROCKER: 0.65, FULL_ROCKER: 0.5 },
  hardpack_ice: { CAMBER: 1, HYBRID_CAMBER: 0.9, FLAT: 0.6, HYBRID_ROCKER: 0.55, FLAT_ROCKER: 0.45, FULL_ROCKER: 0.3 },
  spring_variable: { HYBRID_CAMBER: 0.9, HYBRID_ROCKER: 0.9, FLAT_ROCKER: 0.85, FLAT: 0.8, FULL_ROCKER: 0.8, CAMBER: 0.75 },
};

/** Boards: shape stands in for "width" in the conditions score. */
export const BOARD_SHAPE_BY_SNOW: SnowRow<BoardShape> = {
  powder: { TAPERED_DIRECTIONAL: 1, DIRECTIONAL: 0.85, DIRECTIONAL_TWIN: 0.6, TRUE_TWIN: 0.4 },
  packed: { DIRECTIONAL_TWIN: 1, TRUE_TWIN: 0.9, DIRECTIONAL: 0.85, TAPERED_DIRECTIONAL: 0.6 },
  hardpack_ice: { DIRECTIONAL_TWIN: 1, DIRECTIONAL: 0.95, TRUE_TWIN: 0.85, TAPERED_DIRECTIONAL: 0.6 },
  spring_variable: { DIRECTIONAL: 0.9, DIRECTIONAL_TWIN: 0.9, TRUE_TWIN: 0.8, TAPERED_DIRECTIONAL: 0.8 },
};

/** Contributions to a product's style axis (−1 playful … +1 charging). */
export const STYLE_TERMS = {
  laminate: { FULL_METAL: 0.35, PARTIAL_METAL: 0.15, CARBON_FIBERGLASS: 0, FIBERGLASS: -0.1, NONE: -0.1 } as Record<Laminate, number>,
  skiMount: { TRADITIONAL: 0.15, PROGRESSIVE: -0.05, CENTERED: -0.25 },
  skiTwin: { NONE: 0.05, EARLY_RISE_TAIL: 0, FULL_TWIN: -0.15 },
  skiRocker: { FULL_CAMBER: 0.1, TIP_ROCKER_CAMBER: 0.05, TIP_TAIL_ROCKER_CAMBER: 0, FLAT_ROCKER: -0.1, FULL_ROCKER: -0.15 } as Record<SkiRocker, number>,
  boardProfile: { CAMBER: 0.2, HYBRID_CAMBER: 0.05, FLAT: -0.05, HYBRID_ROCKER: -0.15, FLAT_ROCKER: -0.15, FULL_ROCKER: -0.25 } as Record<BoardProfile, number>,
  boardShape: { DIRECTIONAL: 0.1, TAPERED_DIRECTIONAL: 0.05, DIRECTIONAL_TWIN: 0, TRUE_TWIN: -0.15 } as Record<BoardShape, number>,
  /** (flex − 5.5) / 4.5 × this */
  flexScale: 0.5,
};

export const METAL: Laminate[] = ["FULL_METAL", "PARTIAL_METAL"];

// ───────────────────────────── DIN ─────────────────────────────
/**
 * ISO 11088-style release chart (approximation). It is ONLY used to show a
 * general-guidance range next to a "certified technician must set your DIN"
 * note, and must be checked against the current official chart before launch.
 */
export const DIN_WEIGHT_CODES: [maxKg: number, code: string][] = [
  [13, "A"], [17, "B"], [21, "C"], [25, "D"], [30, "E"], [35, "F"], [41, "G"],
  [48, "H"], [57, "I"], [66, "J"], [78, "K"], [94, "L"], [Infinity, "M"],
];
export const DIN_HEIGHT_CODES: [maxCm: number, code: string][] = [
  [148, "H"], [157, "I"], [166, "J"], [178, "K"], [194, "L"], [Infinity, "M"],
];
/** Boot sole length columns (mm): ≤250, 251–270, 271–290, 291–310, 311–330, ≥331 */
export const DIN_BSL_COLUMNS = [250, 270, 290, 310, 330, Infinity];
export const DIN_CHART: Record<string, (number | null)[]> = {
  A: [0.75, 0.75, null, null, null, null],
  B: [1, 0.75, 0.75, null, null, null],
  C: [1.5, 1.25, 1.25, 1, null, null],
  D: [2, 1.75, 1.5, 1.5, 1.25, null],
  E: [2.5, 2.25, 2, 1.75, 1.5, 1.5],
  F: [3, 2.75, 2.5, 2.25, 2, 1.75],
  G: [3.5, 3, 3, 2.75, 2.5, 2.25],
  H: [3.5, 3.5, 3.5, 3, 3, 2.75],
  I: [4.5, 4.5, 4, 3.5, 3.5, 3],
  J: [5.5, 5, 5, 4.5, 4, 3.5],
  K: [6.5, 6, 5.5, 5, 5, 4.5],
  L: [7.5, 7, 6.5, 6, 5.5, 5],
  M: [8.5, 8, 7.5, 7, 6.5, 6],
  N: [10, 9.5, 9, 8.5, 8, 7.5],
  O: [11.5, 11, 10.5, 10, 9.5, 9],
  P: [12, 11.5, 11, 10.5, 10, 9.5],
};
export const DIN_CODE_ORDER = "ABCDEFGHIJKLMNOP";

// ───────────────────────────── Boots ─────────────────────────────

/** Ski boot flex index ranges by ability. */
export const SKI_BOOT_FLEX: Record<"MENS" | "WOMENS", Record<Ability, [number, number]>> = {
  MENS: { BEGINNER: [70, 90], INTERMEDIATE: [90, 110], ADVANCED: [110, 130], EXPERT: [120, 140] },
  WOMENS: { BEGINNER: [60, 75], INTERMEDIATE: [75, 95], ADVANCED: [95, 115], EXPERT: [110, 130] },
};
export const SKI_BOOT_LAST: Record<"NARROW" | "MEDIUM" | "WIDE", [number, number]> = {
  NARROW: [96, 98],
  MEDIUM: [99, 101],
  WIDE: [102, 106],
};
