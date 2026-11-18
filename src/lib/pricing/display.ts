/**
 * Price comparison + affiliate link rules shared by result cards and the
 * product detail page. Pure functions; the UI just renders the output.
 */
import { BUDGET } from "../scoring/weights";

export const AFFILIATE_DISCLOSURE =
  "We may earn a commission when you buy through retailer links. It never changes our rankings or your price.";

/** Every outbound retailer link: new tab, marked sponsored. */
export interface OutboundLinkAttrs {
  href: string;
  target: "_blank";
  rel: "sponsored noopener";
  "data-affiliate": "true";
}

/** Returns null for anything that isn't an https URL, so we never render a bad link. */
export function outboundLinkAttrs(url: string): OutboundLinkAttrs | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return null;
    return { href: u.toString(), target: "_blank", rel: "sponsored noopener", "data-affiliate": "true" };
  } catch {
    return null;
  }
}

export interface PriceRow {
  retailer: string;
  priceCents: number;
  listPriceCents?: number | null;
  inStock: boolean;
  checkedAt: Date;
  affiliateUrl: string;
  sizeLabel?: string; // "" = all sizes
}

export interface ComparisonRow extends PriceRow {
  isBestPrice: boolean;
  savingsCents: number | null;
  lastChecked: string; // "3 hours ago"
  link: OutboundLinkAttrs | null;
}

const DAY = 86_400_000;

export function formatPrice(cents: number): string {
  const dollars = cents / 100;
  return dollars % 1 === 0
    ? `$${dollars.toLocaleString("en-US")}`
    : `$${dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function timeAgo(then: Date, now: Date): string {
  const mins = Math.max(0, Math.round((now.getTime() - then.getTime()) / 60_000));
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export const isFresh = (checkedAt: Date, now: Date) => (now.getTime() - checkedAt.getTime()) / DAY <= BUDGET.priceMaxAgeDays;

/**
 * Build the price comparison table:
 * - hides rows older than 7 days
 * - if a size is given, keeps rows for that size or "all sizes"
 * - one row per retailer (its best offer)
 * - in-stock rows first, lowest price first; "Best Price" = cheapest in stock
 */
export function priceComparison(rows: PriceRow[], now: Date, opts: { sizeLabel?: string } = {}) {
  const fresh = rows.filter((r) => isFresh(r.checkedAt, now));
  const hiddenStale = rows.length - fresh.length;
  const sized = opts.sizeLabel ? fresh.filter((r) => !r.sizeLabel || r.sizeLabel === opts.sizeLabel) : fresh;

  const better = (a: PriceRow, b: PriceRow) =>
    a.inStock !== b.inStock ? (a.inStock ? -1 : 1) : a.priceCents - b.priceCents;
  const perRetailer = new Map<string, PriceRow>();
  for (const r of sized) {
    const cur = perRetailer.get(r.retailer);
    if (!cur || better(r, cur) < 0) perRetailer.set(r.retailer, r);
  }

  const sorted = [...perRetailer.values()].sort(better);
  const bestIdx = sorted.findIndex((r) => r.inStock);
  const out: ComparisonRow[] = sorted.map((r, i) => ({
    ...r,
    isBestPrice: i === bestIdx,
    savingsCents: r.listPriceCents && r.listPriceCents > r.priceCents ? r.listPriceCents - r.priceCents : null,
    lastChecked: timeAgo(r.checkedAt, now),
    link: outboundLinkAttrs(r.affiliateUrl),
  }));
  return { rows: out, best: bestIdx >= 0 ? out[bestIdx] : undefined, hiddenStale };
}
