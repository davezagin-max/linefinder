/**
 * Mock price feed: deterministic, fictional retailers so the whole price
 * pipeline and UI work before affiliate approval.
 *
 * - Retailer names end in "(Mock)" and links go to example.com (reserved
 *   for documentation), so mock data can never be mistaken for real offers.
 * - Same product + retailer + day → same price, so runs are reproducible.
 * - Product names vary by retailer (accents, season formats, women's tags)
 *   to exercise the matcher, and a few junk offers must stay unmatched.
 * - One retailer's feed is 9 days old, to exercise the 7-day hide rule.
 */
import type { FeedAdapter, FeedOffer } from "./types";

export interface MockCatalogProduct {
  slug: string;
  kind: "SKI" | "SNOWBOARD" | "SKI_BINDING" | "SNOWBOARD_BINDING" | "SKI_BOOT" | "SNOWBOARD_BOOT";
  brand: string;
  model: string;
  modelYear: number;
  msrpCents: number;
  womensSpecific: boolean;
}

export const MOCK_RETAILERS = [
  { advertiserId: "mock-1", name: "Summit Supply (Mock)", slug: "summit-supply-mock", staleDays: 0 },
  { advertiserId: "mock-2", name: "Powder Day Outfitters (Mock)", slug: "powder-day-outfitters-mock", staleDays: 0 },
  { advertiserId: "mock-3", name: "Bluebird Board & Ski (Mock)", slug: "bluebird-board-ski-mock", staleDays: 0 },
  { advertiserId: "mock-4", name: "Corduroy Co. (Mock)", slug: "corduroy-co-mock", staleDays: 0 },
  { advertiserId: "mock-5", name: "Last Chair Gear (Mock)", slug: "last-chair-gear-mock", staleDays: 9 },
] as const;

const NOUN: Record<MockCatalogProduct["kind"], string> = {
  SKI: "Skis",
  SNOWBOARD: "Snowboard",
  SKI_BINDING: "Ski Bindings",
  SNOWBOARD_BINDING: "Snowboard Bindings",
  SKI_BOOT: "Ski Boots",
  SNOWBOARD_BOOT: "Snowboard Boots",
};

/** FNV-1a → 0..1, deterministic per key. */
export function hash01(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 0xffffffff;
}

const ascii = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "");
const yy = (y: number) => String(y % 100).padStart(2, "0");

/** Retailer-specific naming styles, like real feeds. */
function offerName(p: MockCatalogProduct, style: number): { name: string; brand?: string } {
  const noun = NOUN[p.kind];
  const y = p.modelYear;
  const womens = p.womensSpecific && !/\bW\b/.test(p.model) ? " - Women's" : "";
  switch (style) {
    case 0:
      return { name: `${p.brand} ${p.model} ${noun} ${y + 1}${womens}`, brand: p.brand };
    case 1:
      return { name: `${ascii(p.brand)} ${p.model} ${noun} - ${yy(y)}/${yy(y + 1)}`, brand: ascii(p.brand) };
    case 2:
      return { name: `${p.model} ${noun}${womens}`, brand: p.brand };
    case 3:
      return { name: `${p.brand.toUpperCase()} ${p.model.toUpperCase()}`, brand: p.brand.toUpperCase() };
    default:
      return { name: `${p.brand} ${p.model} ${noun} ${y}/${y + 1}`, brand: p.brand };
  }
}

/** Price: ~50% full price, ~30% 10–20% off, ~20% 25–35% off; ends in .95. */
function mockPrice(msrpCents: number, r: number, r2: number) {
  const factor = r < 0.5 ? 1 : r < 0.8 ? 0.8 + 0.1 * r2 : 0.65 + 0.1 * r2;
  return Math.max(995, Math.round((msrpCents * factor) / 100) * 100 - 5);
}

const JUNK = (y: number) => [
  { name: `K2 Mindbender 108Ti Skis ${y + 1}`, brand: "K2" }, // not in catalog: must not match 99Ti
  { name: `Smith Squad MAG Goggles`, brand: "Smith" }, // not our category
  { name: `Völkl Mantra 102 Skis 2021`, brand: "Völkl" }, // old model year
];

export function mockOffers(catalog: MockCatalogProduct[], now: Date): FeedOffer[] {
  const day = now.toISOString().slice(0, 10);
  const offers: FeedOffer[] = [];
  MOCK_RETAILERS.forEach((r, style) => {
    const updatedAt = new Date(now.getTime() - r.staleDays * 86_400_000 - Math.floor(hash01(r.slug + day) * 20) * 3_600_000);
    for (const p of catalog) {
      if (hash01(`carry:${r.slug}:${p.slug}`) > 0.75) continue; // each retailer carries ~75%
      const { name, brand } = offerName(p, style);
      offers.push({
        network: "MOCK",
        advertiserId: r.advertiserId,
        retailerName: r.name,
        sku: `${r.slug}-${p.slug}`,
        brand,
        name,
        priceCents: mockPrice(p.msrpCents, hash01(`price:${r.slug}:${p.slug}:${day}`), hash01(`depth:${r.slug}:${p.slug}:${day}`)),
        listPriceCents: p.msrpCents,
        currency: "USD",
        inStock: hash01(`stock:${r.slug}:${p.slug}:${day}`) < 0.85,
        affiliateUrl: `https://example.com/mock/${r.slug}/${p.slug}?aff=mock`,
        imageUrls: [], // no licensed images in the mock feed → UI shows silhouettes
        updatedAt,
      });
    }
    JUNK(catalog[0]?.modelYear ?? 2025).forEach((j, i) => {
      offers.push({
        network: "MOCK", advertiserId: r.advertiserId, retailerName: r.name, sku: `${r.slug}-junk-${i}`,
        brand: j.brand, name: j.name, priceCents: 49995, currency: "USD", inStock: true,
        affiliateUrl: `https://example.com/mock/${r.slug}/junk-${i}?aff=mock`, imageUrls: [], updatedAt,
      });
    });
  });
  return offers;
}

export class MockFeedAdapter implements FeedAdapter {
  id = "mock";
  network = "MOCK" as const;
  constructor(private readonly loadCatalog: () => Promise<MockCatalogProduct[]>) {}
  isConfigured() {
    return true;
  }
  async *fetchOffers(now: Date) {
    yield* mockOffers(await this.loadCatalog(), now);
  }
}
