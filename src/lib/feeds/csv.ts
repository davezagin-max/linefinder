/**
 * Generic affiliate DATAFEED adapter (CSV/TSV, optionally gzipped).
 *
 * AvantLink, CJ, Impact and Rakuten all let approved publishers download
 * product datafeeds for each advertiser. Header names differ by network and
 * advertiser, so each feed is configured in config/feeds.json with its own
 * column mapping (see config/feeds.example.json). Feed URLs usually embed
 * credentials, so the config names an ENV VAR, never the URL itself.
 */
import { parse } from "csv-parse";
import { Readable } from "node:stream";
import { createGunzip } from "node:zlib";
import { z } from "zod";
import { parsePriceToCents, type FeedAdapter, type FeedOffer } from "./types";

export const csvFeedConfigSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  enabled: z.boolean().default(true),
  network: z.enum(["AVANTLINK", "CJ", "IMPACT", "RAKUTEN"]),
  advertiserId: z.string().min(1),
  retailerName: z.string().min(1),
  /** Name of the env var holding the feed URL. */
  urlEnv: z.string().regex(/^[A-Z0-9_]+$/),
  format: z.enum(["csv", "tsv"]).default("csv"),
  gzip: z.boolean().default(false),
  currency: z.string().length(3).default("USD"),
  columns: z.object({
    sku: z.string(),
    name: z.string(),
    price: z.string(),
    url: z.string(),
    brand: z.string().optional(),
    listPrice: z.string().optional(),
    image: z.string().optional(),
    inStock: z.string().optional(),
    size: z.string().optional(),
    gtin: z.string().optional(),
    category: z.string().optional(),
    updatedAt: z.string().optional(),
  }),
  /** Values (case-insensitive) meaning "in stock". Missing column → assume in stock. */
  inStockValues: z.array(z.string()).default(["yes", "y", "true", "1", "in stock", "instock", "in-stock"]),
  /** Separator when one cell lists several image URLs. */
  imageSeparator: z.string().default("|"),
  /** Keep rows whose category OR name contains any of these (case-insensitive). */
  keepIf: z.array(z.string()).default(["ski", "snowboard"]),
});
export type CsvFeedConfig = z.infer<typeof csvFeedConfigSchema>;

export const feedsFileSchema = z.object({ feeds: z.array(csvFeedConfigSchema) });

/** Map one feed row to an offer; null if the row is unusable or filtered out. */
export function rowToOffer(row: Record<string, string>, cfg: CsvFeedConfig, now: Date): FeedOffer | null {
  const c = cfg.columns;
  const get = (col?: string) => (col ? (row[col] ?? "").trim() : "");
  const name = get(c.name);
  const sku = get(c.sku);
  const url = get(c.url);
  const priceCents = parsePriceToCents(get(c.price));
  if (!name || !sku || !url || priceCents === null) return null;
  if (!/^https:\/\//i.test(url)) return null;

  const category = get(c.category);
  const haystack = `${category} ${name}`.toLowerCase();
  if (cfg.keepIf.length && !cfg.keepIf.some((k) => haystack.includes(k.toLowerCase()))) return null;

  const stockRaw = get(c.inStock).toLowerCase();
  const updatedRaw = get(c.updatedAt);
  const updated = updatedRaw ? new Date(updatedRaw) : now;
  const images = get(c.image)
    .split(cfg.imageSeparator)
    .map((s) => s.trim())
    .filter((s) => /^https:\/\//i.test(s));

  return {
    network: cfg.network,
    advertiserId: cfg.advertiserId,
    retailerName: cfg.retailerName,
    sku,
    brand: get(c.brand) || undefined,
    name,
    category: category || undefined,
    size: get(c.size) || undefined,
    gtin: get(c.gtin) || undefined,
    priceCents,
    listPriceCents: parsePriceToCents(get(c.listPrice)) ?? undefined,
    currency: cfg.currency,
    inStock: c.inStock ? cfg.inStockValues.includes(stockRaw) : true,
    affiliateUrl: url,
    imageUrls: images,
    // Never trust a feed timestamp from the future.
    updatedAt: Number.isNaN(updated.getTime()) || updated > now ? now : updated,
  };
}

export class CsvFeedAdapter implements FeedAdapter {
  readonly id: string;
  readonly network: CsvFeedConfig["network"];
  constructor(
    private readonly cfg: CsvFeedConfig,
    private readonly env: Record<string, string | undefined> = process.env,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.id = `csv:${cfg.id}`;
    this.network = cfg.network;
  }

  isConfigured() {
    return this.cfg.enabled && !!this.env[this.cfg.urlEnv];
  }

  async *fetchOffers(now: Date): AsyncIterable<FeedOffer> {
    const url = this.env[this.cfg.urlEnv];
    if (!url) throw new Error(`${this.id}: env var ${this.cfg.urlEnv} is not set`);
    const res = await this.fetchImpl(url);
    if (!res.ok || !res.body) throw new Error(`${this.id}: feed download failed (HTTP ${res.status})`);
    let stream: NodeJS.ReadableStream = Readable.fromWeb(res.body as never);
    if (this.cfg.gzip) stream = stream.pipe(createGunzip());
    const parser = stream.pipe(
      parse({
        columns: true,
        delimiter: this.cfg.format === "tsv" ? "\t" : ",",
        relax_column_count: true,
        relax_quotes: true,
        skip_empty_lines: true,
        bom: true,
      }),
    );
    for await (const row of parser as AsyncIterable<Record<string, string>>) {
      const offer = rowToOffer(row, this.cfg, now);
      if (offer) yield offer;
    }
  }
}
