/**
 * Survey answers: the in-progress draft the UI edits, the validated
 * SurveyAnswersV1 that gets saved to a rider profile (rider_profiles.answers),
 * and the conversion to the engine's RiderInput.
 */
import { z } from "zod";
import { GEAR_TRAITS } from "../scoring/kit";
import { REGIONS } from "../scoring/regions";
import type { RiderInput, SnowType } from "../scoring/types";
import { euToUsMens, ftInToCm, lbsToKg, usWomensToMens } from "../scoring/units";

export const SURVEY_VERSION = 1;

const ABILITY = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"] as const;
const TERRAIN = ["groomers", "trees", "moguls", "park", "steeps", "backcountry"] as const;
const SNOW = ["powder", "packed", "hardpack_ice", "spring_variable"] as const;
const FIT_ISSUES = ["HEEL_LIFT", "TOE_BANG", "FOREFOOT_PINCH", "INSTEP_PRESSURE", "SHIN_BANG", "COLD_FEET", "CALF_PRESSURE"] as const;
const KIT_KINDS = ["SKI", "SNOWBOARD", "SKI_BINDING", "SNOWBOARD_BINDING", "SKI_BOOT", "SNOWBOARD_BOOT"] as const;
const traitKeys = Object.keys(GEAR_TRAITS) as [string, ...string[]];

export const kitItemSchema = z.object({
  kind: z.enum(KIT_KINDS),
  productId: z.string().optional(),
  label: z.string().min(1).max(80),
  sizeLabel: z.string().max(12).optional(),
  approxWaistMm: z.number().int().min(60).max(150).optional(),
  approxFlex: z.number().min(1).max(10).optional(),
  soleNorm: z.string().optional(),
  brakeWidthMm: z.number().int().min(70).max(150).optional(),
  intent: z.enum(["KEEP", "REPLACE", "UNSURE"]),
  condition: z.enum(["LIKE_NEW", "GOOD", "WORN", "NEEDS_REPLACING"]),
  likes: z.array(z.enum(traitKeys)).max(8),
  dislikes: z.array(z.enum(traitKeys)).max(8),
  fitIssues: z.array(z.enum(FIT_ISSUES)).optional(),
});
export type KitItemAnswer = z.infer<typeof kitItemSchema>;

export const surveyAnswersSchema = z.object({
  version: z.literal(SURVEY_VERSION),
  sport: z.enum(["SKI", "SNOWBOARD"]),
  ability: z.enum(ABILITY),
  units: z.enum(["imperial", "metric"]),
  heightCm: z.number().min(100).max(230),
  weightKg: z.number().min(25).max(200),
  ageRange: z.enum(["UNDER_18", "18_24", "25_34", "35_44", "45_54", "55_64", "65_PLUS"]).optional(),
  gender: z.enum(["FEMALE", "MALE", "NONBINARY", "PREFER_NOT"]).optional(),
  regionKey: z.string().refine((k) => k in REGIONS, "Unknown region"),
  /** Empty = use the region's typical snow. */
  snowPreference: z.array(z.enum(SNOW)),
  terrain: z.array(z.enum(TERRAIN)).min(1),
  style: z.enum(["PLAYFUL", "BALANCED", "CHARGING"]),
  daysPerSeason: z.number().int().min(1).max(200),
  budget: z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("TOTAL"), totalCents: z.number().int().min(10000).max(2_000_000) }),
    z.object({
      mode: z.literal("SEPARATE"),
      primaryCents: z.number().int().min(5000).max(1_000_000).optional(),
      bindingCents: z.number().int().min(5000).max(1_000_000).optional(),
      bootCents: z.number().int().min(5000).max(1_000_000).optional(),
    }),
  ]),
  boots: z.object({
    usMensSize: z.number().min(1).max(17),
    width: z.enum(["NARROW", "MEDIUM", "WIDE"]),
    fitIssues: z.array(z.enum(FIT_ISSUES)),
  }),
  snowboard: z.object({ stance: z.enum(["REGULAR", "GOOFY"]), stanceWidthCm: z.number().min(35).max(75).optional() }).optional(),
  kit: z.array(kitItemSchema).max(12),
  kitMode: z.enum(["REPLACE", "ADD_TO_QUIVER", "FRESH_START"]),
});
export type SurveyAnswers = z.infer<typeof surveyAnswersSchema>;

// ───────────────────────────── Draft (what the UI edits) ─────────────────────────────

export type ShoeSystem = "US_MENS" | "US_WOMENS" | "EU" | "MONDO";

export interface SurveyDraft {
  sport?: "SKI" | "SNOWBOARD";
  ability?: (typeof ABILITY)[number];
  units: "imperial" | "metric";
  heightFt?: number;
  heightIn?: number;
  heightCmInput?: number;
  weightLbs?: number;
  weightKgInput?: number;
  ageRange?: SurveyAnswers["ageRange"];
  gender?: SurveyAnswers["gender"];
  regionKey?: string;
  snowPreference: SnowType[];
  terrain: (typeof TERRAIN)[number][];
  style?: SurveyAnswers["style"];
  daysPerSeason?: number;
  budgetMode: "TOTAL" | "SEPARATE";
  budgetTotal?: number; // dollars
  budgetPrimary?: number;
  budgetBinding?: number;
  budgetBoot?: number;
  shoeSystem: ShoeSystem;
  shoeSize?: number;
  footWidth?: "NARROW" | "MEDIUM" | "WIDE";
  fitIssues: (typeof FIT_ISSUES)[number][];
  stance?: "REGULAR" | "GOOFY";
  stanceWidthCm?: number;
  kit: KitItemAnswer[];
  kitMode: SurveyAnswers["kitMode"];
}

export const emptyDraft = (): SurveyDraft => ({
  units: "imperial",
  snowPreference: [],
  terrain: [],
  budgetMode: "TOTAL",
  shoeSystem: "US_MENS",
  fitIssues: [],
  kit: [],
  kitMode: "FRESH_START",
});

export function heightCmOf(d: SurveyDraft): number | undefined {
  if (d.units === "metric") return d.heightCmInput;
  if (d.heightFt === undefined) return undefined;
  return ftInToCm(d.heightFt, d.heightIn ?? 0);
}

export function weightKgOf(d: SurveyDraft): number | undefined {
  if (d.units === "metric") return d.weightKgInput;
  return d.weightLbs === undefined ? undefined : lbsToKg(d.weightLbs);
}

export function usMensSizeOf(d: SurveyDraft): number | undefined {
  if (d.shoeSize === undefined) return undefined;
  switch (d.shoeSystem) {
    case "US_MENS":
      return d.shoeSize;
    case "US_WOMENS":
      return usWomensToMens(d.shoeSize);
    case "EU":
      return euToUsMens(d.shoeSize);
    case "MONDO":
      return d.shoeSize - 18; // inverse of usMensToMondo
  }
}

const cents = (dollars?: number) => (dollars === undefined || Number.isNaN(dollars) ? undefined : Math.round(dollars * 100));

/** Draft → validated answers. Throws ZodError if anything required is missing. */
export function finalizeDraft(d: SurveyDraft): SurveyAnswers {
  return surveyAnswersSchema.parse({
    version: SURVEY_VERSION,
    sport: d.sport,
    ability: d.ability,
    units: d.units,
    heightCm: heightCmOf(d),
    weightKg: weightKgOf(d),
    ageRange: d.ageRange,
    gender: d.gender,
    regionKey: d.regionKey,
    snowPreference: d.snowPreference,
    terrain: d.terrain,
    style: d.style,
    daysPerSeason: d.daysPerSeason,
    budget:
      d.budgetMode === "TOTAL"
        ? { mode: "TOTAL", totalCents: cents(d.budgetTotal) }
        : { mode: "SEPARATE", primaryCents: cents(d.budgetPrimary), bindingCents: cents(d.budgetBinding), bootCents: cents(d.budgetBoot) },
    boots: { usMensSize: usMensSizeOf(d), width: d.footWidth, fitIssues: d.fitIssues },
    snowboard: d.sport === "SNOWBOARD" ? { stance: d.stance ?? "REGULAR", stanceWidthCm: d.stanceWidthCm } : undefined,
    // Kit of the other sport doesn't apply to this run.
    kit: d.kit.filter((k) => (d.sport === "SKI" ? !k.kind.startsWith("SNOWBOARD") : !k.kind.startsWith("SKI"))),
    kitMode: d.kit.length ? d.kitMode : "FRESH_START",
  });
}

/** Validated answers → engine input. */
export function toRiderInput(a: SurveyAnswers): RiderInput {
  const snowPreference = a.snowPreference.length
    ? (Object.fromEntries(a.snowPreference.map((s) => [s, 1 / a.snowPreference.length])) as Partial<Record<SnowType, number>>)
    : undefined;
  return {
    sport: a.sport,
    ability: a.ability,
    heightCm: a.heightCm,
    weightKg: a.weightKg,
    ageRange: a.ageRange,
    gender: a.gender,
    regionKey: a.regionKey,
    snowPreference,
    terrain: a.terrain,
    style: a.style,
    daysPerSeason: a.daysPerSeason,
    budget: a.budget,
    boots: a.boots,
    snowboard: a.snowboard,
    kit: a.kit,
    kitMode: a.kitMode,
    units: a.units,
  };
}
