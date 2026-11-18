/**
 * Normalized affiliate feed offer. Every adapter (mock, CSV datafeeds, and
 * future network APIs) produces these. Prices come ONLY from affiliate
 * network feeds/APIs; we never scrape retailer sites.
 */
export type AffiliateNetwork = "AVANTLINK" | "CJ" | "IMPACT" | "RAKUTEN" | "MOCK";

export interface FeedOffer {
  network: AffiliateNetwork;
  /** Retailer/advertiser id inside the network. */
  advertiserId: string;
  retailerName: string;
  /** Retailer SKU (stable per product/variant within that retailer). */
  sku: string;
  brand?: string;
  name: string;
  category?: string;
  /** Variant size if the feed lists sizes separately ("184", "158W", "27.5"). */
  size?: string;
  gtin?: string;
  priceCents: number;
  listPriceCents?: number;
  currency: string;
  inStock: boolean;
  /** Affiliate deep link supplied by the network. */
  affiliateUrl: string;
  /** Product images supplied in the feed (licensed for promoting the product). */
  imageUrls: string[];
  /** When the feed says this offer was last updated. */
  updatedAt: Date;
}

export interface FeedAdapter {
  /** Stable id used in logs and FeedRun.source, e.g. "mock", "csv:avantlink-evo". */
  id: string;
  network: AffiliateNetwork;
  /** False when credentials/URLs are missing; the job skips it with a note. */
  isConfigured(): boolean;
  fetchOffers(now: Date): AsyncIterable<FeedOffer>;
}

/** "$1,099.95" | "1099.95" | "1099" → 109995. Returns null when unparseable. */
export function parsePriceToCents(raw: string | number | undefined | null): number | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? Math.round(raw * 100) : null;
  const cleaned = raw.replace(/[^0-9.,-]/g, "").replace(/,(?=\d{3}(\D|$))/g, "");
  const normalized = cleaned.includes(",") && !cleaned.includes(".") ? cleaned.replace(",", ".") : cleaned.replace(/,/g, "");
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}
