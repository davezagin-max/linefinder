/**
 * Run one affiliate feed: fetch offers → match to products → upsert
 * retailers, prices and feed images → log a FeedRun.
 */
import type { Db } from "../../src/lib/db";
import { createMatcher, type MatchableProduct } from "../../src/lib/feeds/match";
import type { MockCatalogProduct } from "../../src/lib/feeds/mock";
import type { FeedAdapter, FeedOffer } from "../../src/lib/feeds/types";
import { feedLicenseNote, type ImageCandidate } from "../../src/lib/images/policy";
import { upsertImages, refreshPrimaries } from "./imageStore";
import { slugify } from "./upsert";

export async function loadMatchables(db: Db): Promise<MatchableProduct[]> {
  const rows = await db.product.findMany({ where: { discontinued: false }, include: { brand: true } });
  return rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    kind: p.kind,
    brandSlug: p.brand.slug,
    brandName: p.brand.name,
    model: p.model,
    modelYear: p.modelYear,
  }));
}

export async function loadMockCatalog(db: Db): Promise<MockCatalogProduct[]> {
  const rows = await db.product.findMany({ where: { discontinued: false }, include: { brand: true }, orderBy: { slug: "asc" } });
  return rows.map((p) => ({
    slug: p.slug,
    kind: p.kind,
    brand: p.brand.name,
    model: p.model,
    modelYear: p.modelYear,
    msrpCents: p.msrpCents,
    womensSpecific: p.womensSpecific,
  }));
}

export interface FeedRunSummary {
  adapter: string;
  offers: number;
  matched: number;
  unmatched: number;
  prices: number;
  images: number;
  imagesRejected: number;
  unmatchedSample: string[];
  error?: string;
}

/** Better offer for the same product/retailer/size: in stock first, then cheaper. */
const better = (a: FeedOffer, b: FeedOffer) => (a.inStock !== b.inStock ? a.inStock : a.priceCents < b.priceCents);

export async function runPriceFeed(
  db: Db,
  adapter: FeedAdapter,
  opts: { now: Date; mappings: Record<string, string>; dryRun?: boolean },
): Promise<FeedRunSummary> {
  const summary: FeedRunSummary = { adapter: adapter.id, offers: 0, matched: 0, unmatched: 0, prices: 0, images: 0, imagesRejected: 0, unmatchedSample: [] };
  const run = opts.dryRun ? null : await db.feedRun.create({ data: { network: adapter.network, source: adapter.id, unmatchedSample: [] } });
  try {
    const match = createMatcher(await loadMatchables(db), opts.mappings);
    const best = new Map<string, { offer: FeedOffer; productId: string; size: string }>();
    const images: (ImageCandidate & { retailerKey: string })[] = [];

    for await (const offer of adapter.fetchOffers(opts.now)) {
      summary.offers++;
      const m = match(offer);
      if (!m) {
        summary.unmatched++;
        if (summary.unmatchedSample.length < 50) summary.unmatchedSample.push(`${offer.retailerName}: ${offer.name} [${offer.sku}]`);
        continue;
      }
      summary.matched++;
      const retailerKey = `${offer.network}:${offer.advertiserId}`;
      const key = `${m.productId}|${retailerKey}|${m.sizeLabel}`;
      const cur = best.get(key);
      if (!cur || better(offer, cur.offer)) best.set(key, { offer, productId: m.productId, size: m.sizeLabel });
      offer.imageUrls.forEach((url, i) =>
        images.push({
          retailerKey,
          productId: m.productId,
          url,
          view: i === 0 ? "TOPSHEET" : "DETAIL",
          sortOrder: i,
          source: "AFFILIATE_FEED",
          sourceName: `${offer.retailerName} (${offer.network} feed)`,
          licenseNote: feedLicenseNote(offer.network, offer.retailerName),
        }),
      );
    }
    if (opts.dryRun) return summary;

    // Retailers
    const retailerIds = new Map<string, string>();
    for (const { offer } of best.values()) {
      const key = `${offer.network}:${offer.advertiserId}`;
      if (retailerIds.has(key)) continue;
      let slug = slugify(offer.retailerName);
      const clash = await db.retailer.findUnique({ where: { slug } });
      if (clash && !(clash.network === offer.network && clash.advertiserId === offer.advertiserId)) slug = slugify(offer.retailerName, offer.advertiserId);
      const r = await db.retailer.upsert({
        where: { network_advertiserId: { network: offer.network, advertiserId: offer.advertiserId } },
        create: { slug, name: offer.retailerName, network: offer.network, advertiserId: offer.advertiserId },
        update: { name: offer.retailerName, active: true },
      });
      retailerIds.set(key, r.id);
    }

    // Prices
    for (const { offer, productId, size } of best.values()) {
      const retailerId = retailerIds.get(`${offer.network}:${offer.advertiserId}`)!;
      const data = {
        feedSku: offer.sku,
        priceCents: offer.priceCents,
        listPriceCents: offer.listPriceCents ?? null,
        currency: offer.currency,
        inStock: offer.inStock,
        affiliateUrl: offer.affiliateUrl,
        checkedAt: offer.updatedAt,
      };
      await db.retailerPrice.upsert({
        where: { productId_retailerId_sizeLabel: { productId, retailerId, sizeLabel: size } },
        create: { productId, retailerId, sizeLabel: size, ...data },
        update: data,
      });
      summary.prices++;
    }

    // Feed images (licensed via the affiliate agreement)
    const img = await upsertImages(db, images);
    summary.images = img.upserted;
    summary.imagesRejected = img.rejected.length;
    if (img.upserted) await refreshPrimaries(db, [...new Set(images.map((i) => i.productId))]);
    return summary;
  } catch (e) {
    summary.error = e instanceof Error ? e.message : String(e);
    return summary;
  } finally {
    if (run) {
      await db.feedRun.update({
        where: { id: run.id },
        data: {
          finishedAt: new Date(),
          offers: summary.offers,
          matched: summary.matched,
          unmatched: summary.unmatched,
          pricesUpserted: summary.prices,
          imagesUpserted: summary.images,
          unmatchedSample: summary.unmatchedSample,
          error: summary.error ?? null,
        },
      });
    }
  }
}
