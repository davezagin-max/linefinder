/**
 * Runtime validation for seed records and seasonal-refresh JSON drops.
 * Typed against ./types so the two can't drift apart.
 */
import { z } from "zod";
import {
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
import type {
  BoardBindingSeed,
  BoardBootSeed,
  BoardSeed,
  BrandSeed,
  SkiBindingSeed,
  SkiBootSeed,
  SkiSeed,
} from "./types";

const score = z.number().min(0).max(100);
const shortPhrase = z.string().min(2).max(60);
const year = z.number().int().min(2018).max(2035);

export const brandSchema: z.ZodType<BrandSeed> = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  website: z.url(),
  durability: score,
  warranty: score,
  consensus: score,
  warrantyYears: z.number().int().positive().optional(),
});

const base = {
  brand: z.string().regex(/^[a-z0-9-]+$/),
  model: z.string().min(1),
  modelYear: year,
  lineageKey: z.string().optional(),
  msrp: z.number().int().min(50).max(3000),
  womens: z.boolean().optional(),
  ability: z.tuple([z.enum(Ability), z.enum(Ability)]),
  overview: z.string().min(20).max(400),
  popular: z.boolean().optional(),
  review: z.object({
    score,
    pros: z.array(shortPhrase).min(1).max(4),
    cons: z.array(shortPhrase).min(1).max(3),
  }),
};

export const skiSchema: z.ZodType<SkiSeed> = z.object({
  ...base,
  category: z.enum(SkiCategory),
  rocker: z.enum(SkiRocker),
  flex: z.number().min(1).max(10),
  core: z.string().min(2),
  laminate: z.enum(Laminate),
  twinTip: z.enum(TwinTip),
  mountPointCm: z.number().min(-20).max(2).optional(),
  mountStyle: z.enum(MountStyle),
  ref: z.object({
    length: z.number().int().min(100).max(200),
    tip: z.number().int().min(90).max(170),
    waist: z.number().int().min(60).max(140),
    tail: z.number().int().min(80).max(160),
    radius: z.number().min(5).max(40),
    weightG: z.number().int().min(800).max(3000).optional(),
  }),
  lengths: z.array(z.number().int().min(100).max(200)).min(1),
});

export const boardSchema: z.ZodType<BoardSeed> = z.object({
  ...base,
  category: z.enum(SnowboardCategory),
  profile: z.enum(BoardProfile),
  shape: z.enum(BoardShape),
  flex: z.number().min(1).max(10),
  core: z.string().min(2),
  laminate: z.enum(Laminate),
  setbackMm: z.number().int().min(0).max(150),
  taperMm: z.number().int().min(0).max(40),
  insertPattern: z.enum(InsertPattern),
  baseType: z.enum(["sintered", "extruded"]),
  sizes: z
    .array(
      z.object({
        label: z.string().regex(/^\d{3}(\.\d)?[A-Z]*$/),
        lengthCm: z.number().min(120).max(175),
        waist: z.number().int().min(220).max(290),
        wide: z.boolean().optional(),
        weightKg: z.tuple([z.number().min(20), z.number().max(160)]).optional(),
      }),
    )
    .min(1),
});

export const skiBindingSchema: z.ZodType<SkiBindingSeed> = z.object({
  ...base,
  type: z.enum(SkiBindingType),
  din: z.tuple([z.number().min(0.5), z.number().max(20)]),
  brakeWidthsMm: z.array(z.number().int().min(70).max(150)).min(1),
  soleCompat: z.array(z.enum(SoleNorm)).min(1),
  hasWalkMode: z.boolean().optional(),
  stackHeightMm: z.number().int().optional(),
  weightG: z.number().int().optional(),
});

export const boardBindingSchema: z.ZodType<BoardBindingSeed> = z.object({
  ...base,
  flex: z.number().min(1).max(10),
  responsiveness: z.number().min(1).max(10),
  entry: z.enum(BoardBindingEntry),
  mountCompat: z.array(z.enum(InsertPattern)).min(1),
  sizeRanges: z.array(z.object({ label: z.string(), usMin: z.number(), usMax: z.number() })).min(1),
  stepOnSystem: z.string().optional(),
});

export const skiBootSchema: z.ZodType<SkiBootSeed> = z.object({
  ...base,
  flex: z.number().int().min(40).max(150),
  lastWidthMm: z.number().int().min(95).max(106),
  soleNorm: z.enum(SoleNorm),
  mondo: z.tuple([z.number().min(15), z.number().max(35)]),
  hasWalkMode: z.boolean().optional(),
  weightG: z.number().int().optional(),
});

export const boardBootSchema: z.ZodType<BoardBootSeed> = z.object({
  ...base,
  flex: z.number().min(1).max(10),
  lacing: z.enum(BootLacing),
  usSize: z.tuple([z.number().min(1), z.number().max(16)]),
  wideAvailable: z.boolean().optional(),
  stepOnSystem: z.string().optional(),
  reducedFootprint: z.boolean().optional(),
});

/** Shape of a seasonal refresh drop file: data/incoming/<anything>.json */
export const refreshDropSchema = z.object({
  season: year,
  brands: z.array(brandSchema).default([]),
  skis: z.array(skiSchema).default([]),
  snowboards: z.array(boardSchema).default([]),
  skiBindings: z.array(skiBindingSchema).default([]),
  snowboardBindings: z.array(boardBindingSchema).default([]),
  skiBoots: z.array(skiBootSchema).default([]),
  snowboardBoots: z.array(boardBootSchema).default([]),
  /** Products to mark discontinued, by slug. */
  discontinue: z.array(z.string()).default([]),
});
export type RefreshDrop = z.infer<typeof refreshDropSchema>;
