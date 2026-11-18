/**
 * Engine contract. The engine is pure: (RiderInput, EngineCatalog, now) → Result.
 * No DB or network access inside src/lib/scoring.
 */

export type Sport = "SKI" | "SNOWBOARD";
export type Ability = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
export type Style = "PLAYFUL" | "BALANCED" | "CHARGING";
export type Terrain = "groomers" | "trees" | "moguls" | "park" | "steeps" | "backcountry";
export type SnowType = "powder" | "packed" | "hardpack_ice" | "spring_variable";
export type FootWidth = "NARROW" | "MEDIUM" | "WIDE";
export type AgeRange = "UNDER_18" | "18_24" | "25_34" | "35_44" | "45_54" | "55_64" | "65_PLUS";
export type Gender = "FEMALE" | "MALE" | "NONBINARY" | "PREFER_NOT";

export type BootFitIssue =
  | "HEEL_LIFT"
  | "TOE_BANG"
  | "FOREFOOT_PINCH"
  | "INSTEP_PRESSURE"
  | "SHIN_BANG"
  | "COLD_FEET"
  | "CALF_PRESSURE";

export type KitKind = "SKI" | "SNOWBOARD" | "SKI_BINDING" | "SNOWBOARD_BINDING" | "SKI_BOOT" | "SNOWBOARD_BOOT";

export interface KitItem {
  kind: KitKind;
  productId?: string; // matched to catalog
  label: string; // "Völkl Mantra 102, 184cm"
  sizeLabel?: string;
  approxWaistMm?: number;
  approxFlex?: number; // 1–10
  soleNorm?: string;
  brakeWidthMm?: number;
  intent: "KEEP" | "REPLACE" | "UNSURE";
  condition: "LIKE_NEW" | "GOOD" | "WORN" | "NEEDS_REPLACING";
  likes: string[];
  dislikes: string[];
  fitIssues?: BootFitIssue[];
}

/** Normalized survey answers (UI converts ft/in & lbs before this point). */
export interface RiderInput {
  sport: Sport;
  ability: Ability;
  heightCm: number;
  weightKg: number;
  ageRange?: AgeRange;
  gender?: Gender;
  regionKey: string;
  /** If set, replaces the region's default snow mix (normalized by the engine). */
  snowPreference?: Partial<Record<SnowType, number>>;
  terrain: Terrain[];
  style: Style;
  daysPerSeason: number;
  budget:
    | { mode: "SEPARATE"; primaryCents?: number; bindingCents?: number; bootCents?: number }
    | { mode: "TOTAL"; totalCents: number };
  boots: {
    usMensSize: number; // UI converts women's/EU/mondo
    width: FootWidth;
    fitIssues: BootFitIssue[];
  };
  snowboard?: { stance: "REGULAR" | "GOOFY"; stanceWidthCm?: number };
  /** "My Kit" */
  kit: KitItem[];
  /** How results treat the kit: replace something, or add to a quiver. */
  kitMode: "REPLACE" | "ADD_TO_QUIVER" | "FRESH_START";
  /** Display units for "why" text. Default imperial. */
  units?: "imperial" | "metric";
}

// ───────────────────────────── Catalog ─────────────────────────────

export interface EnginePrice {
  retailer: string;
  priceCents: number;
  inStock: boolean;
  checkedAt: Date;
  affiliateUrl: string;
}

export interface EngineProductBase {
  id: string;
  slug: string;
  brand: { name: string; reputationScore: number };
  model: string;
  modelYear: number;
  msrpCents: number;
  womensSpecific: boolean;
  abilityMin: Ability;
  abilityMax: Ability;
  isPopular: boolean;
  /** Cached aggregate 0–100; null = no reviews. */
  reviewScore: number | null;
  reviewsArePlaceholder: boolean;
  prices: EnginePrice[];
}

export type SkiCategory =
  | "FRONTSIDE"
  | "ALL_MOUNTAIN"
  | "ALL_MOUNTAIN_WIDE"
  | "POWDER"
  | "FREESTYLE_PARK"
  | "FREERIDE_BIG_MOUNTAIN"
  | "TOURING";
export type SkiRocker = "FULL_CAMBER" | "TIP_ROCKER_CAMBER" | "TIP_TAIL_ROCKER_CAMBER" | "FULL_ROCKER" | "FLAT_ROCKER";
export type Laminate = "NONE" | "PARTIAL_METAL" | "FULL_METAL" | "CARBON_FIBERGLASS" | "FIBERGLASS";
export type BoardCategory = "ALL_MOUNTAIN" | "FREESTYLE_PARK" | "FREERIDE" | "POWDER_SURF" | "SPLITBOARD";
export type BoardProfile = "CAMBER" | "HYBRID_CAMBER" | "HYBRID_ROCKER" | "FLAT_ROCKER" | "FULL_ROCKER" | "FLAT";
export type BoardShape = "TRUE_TWIN" | "DIRECTIONAL_TWIN" | "DIRECTIONAL" | "TAPERED_DIRECTIONAL";
export type InsertPattern = "FOUR_X_FOUR" | "TWO_X_FOUR" | "CHANNEL";

export interface EngineSki extends EngineProductBase {
  kind: "SKI";
  category: SkiCategory;
  rocker: SkiRocker;
  flex: number;
  laminate: Laminate;
  twinTip: "NONE" | "EARLY_RISE_TAIL" | "FULL_TWIN";
  mountPointCm: number | null;
  mountStyle: "TRADITIONAL" | "PROGRESSIVE" | "CENTERED";
  waistMm: number;
  radiusM: number;
  sizes: { lengthCm: number; waistMm: number }[];
}

export interface EngineBoard extends EngineProductBase {
  kind: "SNOWBOARD";
  category: BoardCategory;
  profile: BoardProfile;
  shape: BoardShape;
  flex: number;
  laminate: Laminate;
  setbackMm: number;
  taperMm: number;
  insertPattern: InsertPattern;
  sizes: {
    label: string;
    lengthCm: number;
    waistWidthMm: number;
    isWide: boolean;
    riderWeightMinKg: number | null;
    riderWeightMaxKg: number | null;
  }[];
}

export interface EngineSkiBinding extends EngineProductBase {
  kind: "SKI_BINDING";
  type: "ALPINE" | "HYBRID_TOURING" | "TECH" | "FRAME";
  dinMin: number;
  dinMax: number;
  brakeWidthsMm: number[];
  soleCompat: string[];
  hasWalkMode: boolean;
}

export interface EngineBoardBinding extends EngineProductBase {
  kind: "SNOWBOARD_BINDING";
  flex: number;
  entry: "STRAP" | "REAR_ENTRY" | "STEP_ON";
  mountCompat: InsertPattern[];
  sizeRanges: { label: string; usMin: number; usMax: number }[];
  stepOnSystem: string | null;
}

export interface EngineSkiBoot extends EngineProductBase {
  kind: "SKI_BOOT";
  flex: number;
  lastWidthMm: number;
  soleNorm: string;
  mondoMin: number;
  mondoMax: number;
  hasWalkMode: boolean;
}

export interface EngineBoardBoot extends EngineProductBase {
  kind: "SNOWBOARD_BOOT";
  flex: number;
  usSizeMin: number;
  usSizeMax: number;
  wideAvailable: boolean;
  stepOnSystem: string | null;
  reducedFootprint: boolean;
}

export type EnginePrimary = EngineSki | EngineBoard;
export type EngineProduct =
  | EngineSki
  | EngineBoard
  | EngineSkiBinding
  | EngineBoardBinding
  | EngineSkiBoot
  | EngineBoardBoot;

export interface EngineCatalog {
  skis: EngineSki[];
  boards: EngineBoard[];
  skiBindings: EngineSkiBinding[];
  boardBindings: EngineBoardBinding[];
  skiBoots: EngineSkiBoot[];
  boardBoots: EngineBoardBoot[];
}

// ───────────────────────────── Derived ─────────────────────────────

/** Kit-driven preferences, each −1..+1. */
export interface KitPrefs {
  metal: number;
  light: number;
  camber: number;
  tipRocker: number;
}

export interface ConflictNote {
  code: "BEGINNER_STEEP_TERRAIN" | "BEGINNER_CHARGING" | "PARK_ONLY_POWDER_REGION" | "LOW_BUDGET";
  message: string;
}

/** Derived once per run from RiderInput + region + kit. */
export interface RiderTargets {
  abilityIndex: number; // 1–4
  snowMix: Record<SnowType, number>;
  flexTarget: number; // 1–10
  /** Ski waist the snow mix points to (kit-adjusted). */
  waistTargetMm: number;
  /** Shift applied to every snow type's ideal waist (kit). */
  waistShiftMm: number;
  /** Ski length or board length, before per-category adjustment. */
  lengthTargetCm: number;
  needsWideBoard: boolean;
  wideBoardPreferred: boolean;
  styleAxis: number; // −1 playful … +1 charging
  prefs: KitPrefs;
  conflicts: ConflictNote[];
  /** True when skill is weighted up (beginner + steeps/backcountry/charging). */
  conflictMode: boolean;
  dinEstimate?: { value: number; low: number; high: number; skierType: "I" | "II" | "III"; code: string };
  bootFlexRange: [number, number];
  bootLastRangeMm: [number, number];
  mondo: number;
  /** Kit-derived nudges, kept for "why" text. */
  kitAdjustments: { field: string; delta: number; because: string }[];
}

/** Each component 0–1; `points` = score × effective weight × 100 (sums to total). */
export interface ScoreBreakdown {
  skillFlex: { score: number; points: number };
  conditions: { score: number; points: number };
  terrainStyle: { score: number; points: number };
  review: { score: number; points: number; limited: boolean };
  brand: { score: number; points: number };
  demographic: { score: number; points: number; skipped: boolean; rules: string[] };
  sizeFit: number; // multiplier 0.85–1 applied to the fit block
}

export type ComponentKey = keyof Omit<ScoreBreakdown, "sizeFit">;

export type PickTag = "STRETCH" | "BEST_VALUE" | "LIMITED_REVIEWS" | "OVERLAPS_KIT" | "CLOSEST_MATCH";

export interface Reason {
  text: string; // "Your 185 lb weight + charging style → metal keeps it calm at speed"
  component: ComponentKey | "size" | "kit";
  impact: number; // used to rank reasons
}

export interface ResolvedPrice {
  cents: number;
  isMsrp: boolean;
  retailer?: string;
  inStock?: boolean;
  checkedAt?: Date;
}

export interface ScoredProduct {
  productId: string;
  total: number; // 0–100, shown as "◆ 94% Fit"
  breakdown: ScoreBreakdown;
  recommendedSize: { label: string; deltaFromTargetCm: number; targetCm: number; note?: string };
  price: ResolvedPrice;
  tags: PickTag[];
  reasons: Reason[];
  warnings: string[];
}

export interface SetupPick {
  productId: string;
  total: number; // 0–100
  sizeLabel?: string;
  price: ResolvedPrice;
  inBudget: boolean;
  reasons: string[];
}

export interface QuiverSuggestion {
  pieces: { productId?: string; ownedLabel?: string; runName: string; covers: string[] }[];
  score: number; // 0–100
  coverage: number; // 0–1
  totalPriceCents: number;
  overlapPenalty: number;
}

export interface WhyNot {
  productId: string;
  rank: number | null; // null = filtered out
  headline: string; // "Too much ski for your level"
  details: string[];
}

export interface RecommendationResult {
  engineVersion: string;
  weightsVersion: string;
  targets: RiderTargets;
  picks: ScoredProduct[]; // top 15 incl. ≤2 stretch
  relaxed: null | "BUDGET" | "SIZE_TOLERANCE" | "CLOSEST";
  whyNot: WhyNot[];
  quivers: { two: QuiverSuggestion[]; three: QuiverSuggestion[] };
  /** keyed by primary productId */
  setups: Record<string, { bindings: SetupPick[]; boots: SetupPick[] }>;
  disclaimers: string[];
}
