/**
 * Compact seed record shapes. The loader (index.ts) expands these into the
 * Prisma tables. Everything here is SEED DATA: specs are recorded as
 * `specsSource: "seed:unverified"` and review scores come from a placeholder
 * source until real review sources are entered.
 */
import type {
  Ability,
  BoardBindingEntry,
  BoardProfile,
  BoardShape,
  BootLacing,
  InsertPattern,
  Laminate,
  MountStyle,
  SkiBindingType,
  SkiCategory,
  SkiRocker,
  SnowboardCategory,
  SoleNorm,
  TwinTip,
} from "../../src/generated/prisma/enums";

export interface BrandSeed {
  slug: string;
  name: string;
  website: string;
  durability: number; // 0–100
  warranty: number; // 0–100
  consensus: number; // 0–100
  warrantyYears?: number;
}

/** Placeholder review used only until real sources are entered. */
export interface PlaceholderReview {
  score: number; // 0–100
  pros: string[]; // our own short paraphrase, ≤ 8 words each
  cons: string[];
}

export interface BaseSeed {
  brand: string; // BrandSeed.slug
  model: string;
  modelYear: number; // season start year: 2025 = "2025/26"
  lineageKey?: string;
  msrp: number; // USD, whole dollars
  womens?: boolean;
  ability: [Ability, Ability]; // [min, max]
  overview: string; // original 1–2 sentences, never copied
  popular?: boolean;
  review: PlaceholderReview;
}

export interface SkiSeed extends BaseSeed {
  category: SkiCategory;
  rocker: SkiRocker;
  flex: number; // 1–10
  core: string;
  laminate: Laminate;
  twinTip: TwinTip;
  mountPointCm?: number; // from true center, negative = behind
  mountStyle: MountStyle;
  ref: { length: number; tip: number; waist: number; tail: number; radius: number; weightG?: number };
  lengths: number[];
}

export interface BoardSizeSeed {
  label: string; // "158", "158W"
  lengthCm: number;
  waist: number; // mm
  wide?: boolean;
  weightKg?: [number, number]; // manufacturer rider-weight range, if known
}

export interface BoardSeed extends BaseSeed {
  category: SnowboardCategory;
  profile: BoardProfile;
  shape: BoardShape;
  flex: number; // 1–10
  core: string;
  laminate: Laminate;
  setbackMm: number;
  taperMm: number;
  insertPattern: InsertPattern;
  baseType: "sintered" | "extruded";
  sizes: BoardSizeSeed[];
}

export interface SkiBindingSeed extends BaseSeed {
  type: SkiBindingType;
  din: [number, number];
  brakeWidthsMm: number[];
  soleCompat: SoleNorm[];
  hasWalkMode?: boolean;
  stackHeightMm?: number;
  weightG?: number;
}

export interface BoardBindingSeed extends BaseSeed {
  flex: number;
  responsiveness: number;
  entry: BoardBindingEntry;
  mountCompat: InsertPattern[];
  sizeRanges: { label: string; usMin: number; usMax: number }[];
  stepOnSystem?: string;
}

export interface SkiBootSeed extends BaseSeed {
  flex: number;
  lastWidthMm: number;
  soleNorm: SoleNorm;
  mondo: [number, number];
  hasWalkMode?: boolean;
  weightG?: number;
}

export interface BoardBootSeed extends BaseSeed {
  flex: number;
  lacing: BootLacing;
  usSize: [number, number];
  wideAvailable?: boolean;
  stepOnSystem?: string;
  reducedFootprint?: boolean;
}

export interface RetailerSeed {
  slug: string;
  name: string;
}
