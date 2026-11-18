/**
 * Idempotent catalog upserts shared by the seed and the seasonal refresh.
 * Products are keyed by slug (brand-model-year); sizes are replaced wholesale.
 */
import type { Db } from "../../src/lib/db";
import type { ProductKind } from "../../src/generated/prisma/enums";
import type {
  BaseSeed,
  BoardBindingSeed,
  BoardBootSeed,
  BoardSeed,
  BrandSeed,
  SkiBindingSeed,
  SkiBootSeed,
  SkiSeed,
} from "../../prisma/seed/types";

export const PLACEHOLDER_SOURCE = {
  name: "Seed placeholder (not a real review)",
  homepage: "seed://placeholder",
  url: "seed://placeholder",
};

export function slugify(...parts: (string | number)[]) {
  return parts
    .join("-")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const productSlug = (s: BaseSeed) => slugify(s.brand, s.model, s.modelYear);

export async function upsertBrands(db: Db, brands: BrandSeed[], now: Date) {
  for (const b of brands) {
    const data = {
      name: b.name,
      website: b.website,
      durabilityScore: b.durability,
      warrantyScore: b.warranty,
      reviewConsensusScore: b.consensus,
      reputationScore: 0, // recomputed by recompute.ts
      warrantyYears: b.warrantyYears ?? null,
      reputationReviewedAt: now,
    };
    await db.brand.upsert({ where: { slug: b.slug }, create: { slug: b.slug, ...data }, update: data });
  }
}

export interface UpsertContext {
  db: Db;
  brandIds: Map<string, string>;
  placeholderSourceId: string;
  specsSource: string;
  now: Date;
}

export async function makeContext(db: Db, specsSource: string, now: Date): Promise<UpsertContext> {
  const brands = await db.brand.findMany({ select: { id: true, slug: true } });
  const src = await db.reviewSource.upsert({
    where: { name: PLACEHOLDER_SOURCE.name },
    create: { name: PLACEHOLDER_SOURCE.name, homepage: PLACEHOLDER_SOURCE.homepage, credibility: 1, isPlaceholder: true },
    update: { isPlaceholder: true },
  });
  return { db, brandIds: new Map(brands.map((b) => [b.slug, b.id])), placeholderSourceId: src.id, specsSource, now };
}

function shared(ctx: UpsertContext, kind: ProductKind, s: BaseSeed) {
  const brandId = ctx.brandIds.get(s.brand);
  if (!brandId) throw new Error(`Unknown brand slug "${s.brand}" for ${s.model}`);
  return {
    kind,
    brandId,
    model: s.model,
    modelYear: s.modelYear,
    lineageKey: s.lineageKey ?? null,
    msrpCents: Math.round(s.msrp * 100),
    womensSpecific: !!s.womens,
    abilityMin: s.ability[0],
    abilityMax: s.ability[1],
    overview: s.overview,
    isPopular: !!s.popular,
    specsSource: ctx.specsSource,
  };
}

async function upsertPlaceholderReview(ctx: UpsertContext, productId: string, s: BaseSeed) {
  const data = {
    url: PLACEHOLDER_SOURCE.url,
    rawScore: String(s.review.score),
    score: s.review.score,
    reviewedAt: ctx.now,
    pros: s.review.pros,
    cons: s.review.cons,
  };
  await ctx.db.reviewScore.upsert({
    where: {
      productId_sourceId_modelYearReviewed: {
        productId,
        sourceId: ctx.placeholderSourceId,
        modelYearReviewed: s.modelYear,
      },
    },
    create: { productId, sourceId: ctx.placeholderSourceId, modelYearReviewed: s.modelYear, ...data },
    update: data,
  });
}

export async function upsertSki(ctx: UpsertContext, s: SkiSeed) {
  const slug = productSlug(s);
  const spec = {
    category: s.category,
    rocker: s.rocker,
    flex: s.flex,
    core: s.core,
    laminate: s.laminate,
    twinTip: s.twinTip,
    mountPointCm: s.mountPointCm ?? null,
    mountStyle: s.mountStyle,
    refTipMm: s.ref.tip,
    refWaistMm: s.ref.waist,
    refTailMm: s.ref.tail,
    refRadiusM: s.ref.radius,
    refLengthCm: s.ref.length,
  };
  // Only the reference length has full dims; other lengths carry the waist.
  const sizes = [...new Set(s.lengths)].sort((a, b) => a - b).map((len) =>
    len === s.ref.length
      ? { lengthCm: len, tipMm: s.ref.tip, waistMm: s.ref.waist, tailMm: s.ref.tail, radiusM: s.ref.radius, weightG: s.ref.weightG ?? null }
      : { lengthCm: len, waistMm: s.ref.waist },
  );
  const base = shared(ctx, "SKI", s);
  const p = await ctx.db.product.upsert({
    where: { slug },
    create: { slug, ...base, ski: { create: { ...spec, sizes: { create: sizes } } } },
    update: {
      ...base,
      ski: {
        upsert: {
          create: { ...spec, sizes: { create: sizes } },
          update: { ...spec, sizes: { deleteMany: {}, create: sizes } },
        },
      },
    },
  });
  await upsertPlaceholderReview(ctx, p.id, s);
  return p.id;
}

export async function upsertBoard(ctx: UpsertContext, s: BoardSeed) {
  const slug = productSlug(s);
  const spec = {
    category: s.category,
    profile: s.profile,
    shape: s.shape,
    flex: s.flex,
    core: s.core,
    laminate: s.laminate,
    setbackMm: s.setbackMm,
    taperMm: s.taperMm,
    insertPattern: s.insertPattern,
    baseType: s.baseType,
  };
  const sizes = s.sizes.map((z) => ({
    label: z.label,
    lengthCm: z.lengthCm,
    waistWidthMm: z.waist,
    isWide: !!z.wide,
    riderWeightMinKg: z.weightKg?.[0] ?? null,
    riderWeightMaxKg: z.weightKg?.[1] ?? null,
  }));
  const base = shared(ctx, "SNOWBOARD", s);
  const p = await ctx.db.product.upsert({
    where: { slug },
    create: { slug, ...base, snowboard: { create: { ...spec, sizes: { create: sizes } } } },
    update: {
      ...base,
      snowboard: {
        upsert: {
          create: { ...spec, sizes: { create: sizes } },
          update: { ...spec, sizes: { deleteMany: {}, create: sizes } },
        },
      },
    },
  });
  await upsertPlaceholderReview(ctx, p.id, s);
  return p.id;
}

export async function upsertSkiBinding(ctx: UpsertContext, s: SkiBindingSeed) {
  const slug = productSlug(s);
  const spec = {
    type: s.type,
    dinMin: s.din[0],
    dinMax: s.din[1],
    brakeWidthsMm: s.brakeWidthsMm,
    soleCompat: s.soleCompat,
    hasWalkMode: !!s.hasWalkMode,
    stackHeightMm: s.stackHeightMm ?? null,
    weightG: s.weightG ?? null,
  };
  const base = shared(ctx, "SKI_BINDING", s);
  const p = await ctx.db.product.upsert({
    where: { slug },
    create: { slug, ...base, skiBinding: { create: spec } },
    update: { ...base, skiBinding: { upsert: { create: spec, update: spec } } },
  });
  await upsertPlaceholderReview(ctx, p.id, s);
  return p.id;
}

export async function upsertBoardBinding(ctx: UpsertContext, s: BoardBindingSeed) {
  const slug = productSlug(s);
  const spec = {
    flex: s.flex,
    responsiveness: s.responsiveness,
    entry: s.entry,
    mountCompat: s.mountCompat,
    sizeRanges: s.sizeRanges,
    stepOnSystem: s.stepOnSystem ?? null,
  };
  const base = shared(ctx, "SNOWBOARD_BINDING", s);
  const p = await ctx.db.product.upsert({
    where: { slug },
    create: { slug, ...base, boardBinding: { create: spec } },
    update: { ...base, boardBinding: { upsert: { create: spec, update: spec } } },
  });
  await upsertPlaceholderReview(ctx, p.id, s);
  return p.id;
}

export async function upsertSkiBoot(ctx: UpsertContext, s: SkiBootSeed) {
  const slug = productSlug(s);
  const spec = {
    flex: s.flex,
    lastWidthMm: s.lastWidthMm,
    soleNorm: s.soleNorm,
    mondoMin: s.mondo[0],
    mondoMax: s.mondo[1],
    hasWalkMode: !!s.hasWalkMode,
    weightG: s.weightG ?? null,
  };
  const base = shared(ctx, "SKI_BOOT", s);
  const p = await ctx.db.product.upsert({
    where: { slug },
    create: { slug, ...base, skiBoot: { create: spec } },
    update: { ...base, skiBoot: { upsert: { create: spec, update: spec } } },
  });
  await upsertPlaceholderReview(ctx, p.id, s);
  return p.id;
}

export async function upsertBoardBoot(ctx: UpsertContext, s: BoardBootSeed) {
  const slug = productSlug(s);
  const spec = {
    flex: s.flex,
    lacing: s.lacing,
    usSizeMin: s.usSize[0],
    usSizeMax: s.usSize[1],
    wideAvailable: !!s.wideAvailable,
    stepOnSystem: s.stepOnSystem ?? null,
    reducedFootprint: !!s.reducedFootprint,
  };
  const base = shared(ctx, "SNOWBOARD_BOOT", s);
  const p = await ctx.db.product.upsert({
    where: { slug },
    create: { slug, ...base, boardBoot: { create: spec } },
    update: { ...base, boardBoot: { upsert: { create: spec, update: spec } } },
  });
  await upsertPlaceholderReview(ctx, p.id, s);
  return p.id;
}
