/**
 * Build an EngineCatalog straight from the seed files (no database).
 * Used by tests, `npm run engine:try`, and the GitHub Pages demo (in the browser).
 */
import { SKI_BINDINGS, SNOWBOARD_BINDINGS } from "../../../prisma/seed/data/bindings";
import { SKI_BOOTS, SNOWBOARD_BOOTS } from "../../../prisma/seed/data/boots";
import { BRANDS } from "../../../prisma/seed/data/brands";
import { SKIS } from "../../../prisma/seed/data/skis";
import { SNOWBOARDS } from "../../../prisma/seed/data/snowboards";
import type { BaseSeed } from "../../../prisma/seed/types";
import { brandReputation } from "../scoring/reviews";
import type { EngineCatalog, EngineProductBase } from "../scoring/types";
import { productSlug } from "../slug";

const brandBySlug = new Map(BRANDS.map((b) => [b.slug, b]));

function base(s: BaseSeed): EngineProductBase {
  const b = brandBySlug.get(s.brand)!;
  const slug = productSlug(s);
  return {
    id: slug,
    slug,
    brand: { name: b.name, reputationScore: brandReputation({ durability: b.durability, warranty: b.warranty, reviewConsensus: b.consensus }) },
    model: s.model,
    modelYear: s.modelYear,
    msrpCents: s.msrp * 100,
    womensSpecific: !!s.womens,
    abilityMin: s.ability[0],
    abilityMax: s.ability[1],
    isPopular: !!s.popular,
    reviewScore: s.review.score,
    reviewsArePlaceholder: true,
    prices: [],
  };
}

export function seedCatalog(): EngineCatalog {
  return {
    skis: SKIS.map((s) => ({
      ...base(s),
      kind: "SKI",
      category: s.category,
      rocker: s.rocker,
      flex: s.flex,
      laminate: s.laminate,
      twinTip: s.twinTip,
      mountPointCm: s.mountPointCm ?? null,
      mountStyle: s.mountStyle,
      waistMm: s.ref.waist,
      radiusM: s.ref.radius,
      sizes: s.lengths.map((lengthCm) => ({ lengthCm, waistMm: s.ref.waist })),
    })),
    boards: SNOWBOARDS.map((s) => ({
      ...base(s),
      kind: "SNOWBOARD",
      category: s.category,
      profile: s.profile,
      shape: s.shape,
      flex: s.flex,
      laminate: s.laminate,
      setbackMm: s.setbackMm,
      taperMm: s.taperMm,
      insertPattern: s.insertPattern,
      sizes: s.sizes.map((z) => ({
        label: z.label,
        lengthCm: z.lengthCm,
        waistWidthMm: z.waist,
        isWide: !!z.wide,
        riderWeightMinKg: z.weightKg?.[0] ?? null,
        riderWeightMaxKg: z.weightKg?.[1] ?? null,
      })),
    })),
    skiBindings: SKI_BINDINGS.map((s) => ({
      ...base(s),
      kind: "SKI_BINDING",
      type: s.type,
      dinMin: s.din[0],
      dinMax: s.din[1],
      brakeWidthsMm: s.brakeWidthsMm,
      soleCompat: s.soleCompat,
      hasWalkMode: !!s.hasWalkMode,
    })),
    boardBindings: SNOWBOARD_BINDINGS.map((s) => ({
      ...base(s),
      kind: "SNOWBOARD_BINDING",
      flex: s.flex,
      entry: s.entry,
      mountCompat: s.mountCompat,
      sizeRanges: s.sizeRanges,
      stepOnSystem: s.stepOnSystem ?? null,
    })),
    skiBoots: SKI_BOOTS.map((s) => ({
      ...base(s),
      kind: "SKI_BOOT",
      flex: s.flex,
      lastWidthMm: s.lastWidthMm,
      soleNorm: s.soleNorm,
      mondoMin: s.mondo[0],
      mondoMax: s.mondo[1],
      hasWalkMode: !!s.hasWalkMode,
    })),
    boardBoots: SNOWBOARD_BOOTS.map((s) => ({
      ...base(s),
      kind: "SNOWBOARD_BOOT",
      flex: s.flex,
      usSizeMin: s.usSize[0],
      usSizeMax: s.usSize[1],
      wideAvailable: !!s.wideAvailable,
      stepOnSystem: s.stepOnSystem ?? null,
      reducedFootprint: !!s.reducedFootprint,
    })),
  };
}
