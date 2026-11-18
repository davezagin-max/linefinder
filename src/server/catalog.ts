/**
 * Load the engine catalog (products + fresh prices) from Postgres.
 * Server-only. Mock-feed prices are excluded in production.
 */
import type { Db } from "../lib/db";
import type { EngineCatalog, EnginePrice, EngineProductBase } from "../lib/scoring/types";
import { BUDGET } from "../lib/scoring/weights";

const DAY = 86_400_000;

export async function loadEngineCatalog(
  db: Db,
  opts: { now?: Date; includeMockPrices?: boolean } = {},
): Promise<EngineCatalog> {
  const now = opts.now ?? new Date();
  const includeMock = opts.includeMockPrices ?? process.env.NODE_ENV !== "production";
  const freshSince = new Date(now.getTime() - BUDGET.priceMaxAgeDays * DAY);

  const rows = await db.product.findMany({
    where: { discontinued: false },
    include: {
      brand: true,
      ski: { include: { sizes: { orderBy: { lengthCm: "asc" } } } },
      snowboard: { include: { sizes: { orderBy: { lengthCm: "asc" } } } },
      skiBinding: true,
      boardBinding: true,
      skiBoot: true,
      boardBoot: true,
      reviews: { select: { source: { select: { isPlaceholder: true } } } },
      prices: {
        where: {
          checkedAt: { gte: freshSince },
          retailer: { active: true, ...(includeMock ? {} : { network: { not: "MOCK" } }) },
        },
        include: { retailer: true },
      },
    },
    orderBy: { slug: "asc" },
  });

  const cat: EngineCatalog = { skis: [], boards: [], skiBindings: [], boardBindings: [], skiBoots: [], boardBoots: [] };
  for (const p of rows) {
    const prices: EnginePrice[] = p.prices.map((x) => ({
      retailer: x.retailer.name,
      priceCents: x.priceCents,
      inStock: x.inStock,
      checkedAt: x.checkedAt,
      affiliateUrl: x.affiliateUrl,
    }));
    const base: EngineProductBase = {
      id: p.id,
      slug: p.slug,
      brand: { name: p.brand.name, reputationScore: p.brand.reputationScore },
      model: p.model,
      modelYear: p.modelYear,
      msrpCents: p.msrpCents,
      womensSpecific: p.womensSpecific,
      abilityMin: p.abilityMin,
      abilityMax: p.abilityMax,
      isPopular: p.isPopular,
      reviewScore: p.reviewScoreAgg,
      reviewsArePlaceholder: p.reviews.length > 0 && p.reviews.every((r) => r.source.isPlaceholder),
      prices,
    };
    if (p.ski) {
      cat.skis.push({
        ...base, kind: "SKI", category: p.ski.category, rocker: p.ski.rocker, flex: p.ski.flex, laminate: p.ski.laminate,
        twinTip: p.ski.twinTip, mountPointCm: p.ski.mountPointCm, mountStyle: p.ski.mountStyle, waistMm: p.ski.refWaistMm,
        radiusM: p.ski.refRadiusM, sizes: p.ski.sizes.map((s) => ({ lengthCm: s.lengthCm, waistMm: s.waistMm })),
      });
    } else if (p.snowboard) {
      cat.boards.push({
        ...base, kind: "SNOWBOARD", category: p.snowboard.category, profile: p.snowboard.profile, shape: p.snowboard.shape,
        flex: p.snowboard.flex, laminate: p.snowboard.laminate, setbackMm: p.snowboard.setbackMm, taperMm: p.snowboard.taperMm,
        insertPattern: p.snowboard.insertPattern,
        sizes: p.snowboard.sizes.map((s) => ({
          label: s.label, lengthCm: s.lengthCm, waistWidthMm: s.waistWidthMm, isWide: s.isWide,
          riderWeightMinKg: s.riderWeightMinKg, riderWeightMaxKg: s.riderWeightMaxKg,
        })),
      });
    } else if (p.skiBinding) {
      cat.skiBindings.push({
        ...base, kind: "SKI_BINDING", type: p.skiBinding.type, dinMin: p.skiBinding.dinMin, dinMax: p.skiBinding.dinMax,
        brakeWidthsMm: p.skiBinding.brakeWidthsMm, soleCompat: p.skiBinding.soleCompat, hasWalkMode: p.skiBinding.hasWalkMode,
      });
    } else if (p.boardBinding) {
      cat.boardBindings.push({
        ...base, kind: "SNOWBOARD_BINDING", flex: p.boardBinding.flex, entry: p.boardBinding.entry,
        mountCompat: p.boardBinding.mountCompat,
        sizeRanges: p.boardBinding.sizeRanges as { label: string; usMin: number; usMax: number }[],
        stepOnSystem: p.boardBinding.stepOnSystem,
      });
    } else if (p.skiBoot) {
      cat.skiBoots.push({
        ...base, kind: "SKI_BOOT", flex: p.skiBoot.flex, lastWidthMm: p.skiBoot.lastWidthMm, soleNorm: p.skiBoot.soleNorm,
        mondoMin: p.skiBoot.mondoMin, mondoMax: p.skiBoot.mondoMax, hasWalkMode: p.skiBoot.hasWalkMode,
      });
    } else if (p.boardBoot) {
      cat.boardBoots.push({
        ...base, kind: "SNOWBOARD_BOOT", flex: p.boardBoot.flex, usSizeMin: p.boardBoot.usSizeMin, usSizeMax: p.boardBoot.usSizeMax,
        wideAvailable: p.boardBoot.wideAvailable, stepOnSystem: p.boardBoot.stepOnSystem, reducedFootprint: p.boardBoot.reducedFootprint,
      });
    }
  }
  return cat;
}
