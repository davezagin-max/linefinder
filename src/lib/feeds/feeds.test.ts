import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { seedCatalog } from "../../../scripts/lib/seedCatalog";
import { CsvFeedAdapter, csvFeedConfigSchema, rowToOffer, type CsvFeedConfig } from "./csv";
import { createMatcher, type MatchableProduct } from "./match";
import { MOCK_RETAILERS, mockOffers, type MockCatalogProduct } from "./mock";
import { parsePriceToCents } from "./types";

const NOW = new Date("2026-11-17T12:00:00Z");

// Seed catalog → the shapes the mock feed and matcher need.
const seed = seedCatalog();
const all = [...seed.skis, ...seed.boards, ...seed.skiBindings, ...seed.boardBindings, ...seed.skiBoots, ...seed.boardBoots];
const mockCatalog: MockCatalogProduct[] = all.map((p) => ({
  slug: p.slug, kind: p.kind, brand: p.brand.name, model: p.model, modelYear: p.modelYear, msrpCents: p.msrpCents, womensSpecific: p.womensSpecific,
}));
const matchables: MatchableProduct[] = all.map((p) => ({
  id: p.id, slug: p.slug, kind: p.kind, brandSlug: p.slug.split("-").slice(0, p.brand.name.split(" ").length).join("-"),
  brandName: p.brand.name, model: p.model, modelYear: p.modelYear,
}));

describe("parsePriceToCents", () => {
  it("parses common price formats", () => {
    expect(parsePriceToCents("$1,099.95")).toBe(109995);
    expect(parsePriceToCents("849.95 USD")).toBe(84995);
    expect(parsePriceToCents("649,95")).toBe(64995);
    expect(parsePriceToCents(499)).toBe(49900);
    expect(parsePriceToCents("call for price")).toBeNull();
    expect(parsePriceToCents("0")).toBeNull();
  });
});

describe("mock feed", () => {
  const offers = mockOffers(mockCatalog, NOW);

  it("is deterministic for the same day and changes day to day", () => {
    expect(mockOffers(mockCatalog, NOW)).toEqual(offers);
    const tomorrow = mockOffers(mockCatalog, new Date(NOW.getTime() + 86_400_000));
    expect(tomorrow.map((o) => o.priceCents)).not.toEqual(offers.map((o) => o.priceCents));
  });

  it("only uses fictional retailers and example.com links, and no images", () => {
    for (const o of offers) {
      expect(o.network).toBe("MOCK");
      expect(o.retailerName).toMatch(/\(Mock\)$/);
      expect(new URL(o.affiliateUrl).hostname).toBe("example.com");
      expect(o.imageUrls).toEqual([]);
    }
  });

  it("prices are at or below MSRP, never absurd", () => {
    const msrp = new Map(mockCatalog.map((p) => [p.slug, p.msrpCents]));
    for (const o of offers.filter((x) => !x.sku.includes("junk"))) {
      const m = msrp.get(o.sku.replace(/^.*?-mock-/, ""))!;
      expect(o.priceCents).toBeLessThanOrEqual(m);
      expect(o.priceCents).toBeGreaterThanOrEqual(m * 0.6);
    }
  });

  it("one retailer's feed is 9+ days old (exercises the 7-day hide rule)", () => {
    const stale = MOCK_RETAILERS.find((r) => r.staleDays > 0)!;
    const o = offers.find((x) => x.retailerName === stale.name)!;
    expect((NOW.getTime() - o.updatedAt.getTime()) / 86_400_000).toBeGreaterThan(7);
  });

  it("every real mock offer matches the right product; the junk offers don't", () => {
    const match = createMatcher(matchables);
    for (const o of offers) {
      const m = match(o);
      if (o.sku.includes("junk")) expect(m).toBeNull();
      else expect(m?.productId).toBe(o.sku.replace(/^.*?-mock-/, ""));
    }
  });
});

describe("CSV datafeed adapter", () => {
  const cfg: CsvFeedConfig = csvFeedConfigSchema.parse({
    id: "test-feed",
    network: "AVANTLINK",
    advertiserId: "123",
    retailerName: "Test Retailer",
    urlEnv: "FEED_URL_TEST",
    columns: { sku: "SKU", name: "Name", brand: "Brand", price: "Price", listPrice: "Retail", url: "Link", image: "Images", inStock: "Stock", size: "Size", category: "Cat", updatedAt: "Updated" },
  });
  const csv = [
    "SKU,Name,Brand,Price,Retail,Link,Images,Stock,Size,Cat,Updated",
    `A1,"Völkl Mantra 102 Skis, 2026",Völkl,$849.95,$949.95,https://aff.example.com/a1,https://img.example.com/a1.jpg|http://insecure/x.jpg,In Stock,184,Skis,2026-11-16T10:00:00Z`,
    `A2,Smith Goggles,Smith,$199.00,,https://aff.example.com/a2,,In Stock,,Goggles,`,
    `A3,Bad Row Ski,K2,not a price,,https://aff.example.com/a3,,In Stock,,Skis,`,
    `A4,Jones Frontier Snowboard,Jones,599.95,,http://aff.example.com/a4,,Out of stock,,Snowboards,2030-01-01`,
    `A5,Jones Frontier Snowboard,Jones,599.95,,https://aff.example.com/a5,,no,159W,Snowboards,2030-01-01`,
  ].join("\n");

  it("maps rows, filters to ski/snowboard gear, and drops unusable rows", () => {
    const rows = [
      { SKU: "A1", Name: "Völkl Mantra 102 Skis", Brand: "Völkl", Price: "$849.95", Retail: "$949.95", Link: "https://aff.example.com/a1", Images: "https://img.example.com/a1.jpg|http://x/y.jpg", Stock: "In Stock", Size: "184", Cat: "Skis", Updated: "2026-11-16T10:00:00Z" },
    ];
    const o = rowToOffer(rows[0]!, cfg, NOW)!;
    expect(o).toMatchObject({ sku: "A1", priceCents: 84995, listPriceCents: 94995, inStock: true, size: "184", imageUrls: ["https://img.example.com/a1.jpg"] });
    expect(rowToOffer({ ...rows[0]!, Cat: "Goggles", Name: "Smith Goggles" }, cfg, NOW)).toBeNull();
    expect(rowToOffer({ ...rows[0]!, Price: "n/a" }, cfg, NOW)).toBeNull();
    expect(rowToOffer({ ...rows[0]!, Link: "http://aff.example.com/a1" }, cfg, NOW)).toBeNull();
  });

  it("never trusts a feed timestamp from the future", () => {
    const o = rowToOffer({ SKU: "x", Name: "Jones Frontier Snowboard", Price: "1", Link: "https://a.example.com", Updated: "2030-01-01" } as Record<string, string>, cfg, NOW)!;
    expect(o.updatedAt).toEqual(NOW);
  });

  it("is only configured when its URL env var is set", () => {
    expect(new CsvFeedAdapter(cfg, {}).isConfigured()).toBe(false);
    expect(new CsvFeedAdapter(cfg, { FEED_URL_TEST: "https://feeds.example.com/x.csv" }).isConfigured()).toBe(true);
    expect(new CsvFeedAdapter({ ...cfg, enabled: false }, { FEED_URL_TEST: "x" }).isConfigured()).toBe(false);
  });

  async function collect(adapter: CsvFeedAdapter) {
    const out = [];
    for await (const o of adapter.fetchOffers(NOW)) out.push(o);
    return out;
  }

  it("downloads and parses a CSV feed (quoted commas, accents)", async () => {
    const fakeFetch = (async () => new Response(csv)) as unknown as typeof fetch;
    const offers = await collect(new CsvFeedAdapter(cfg, { FEED_URL_TEST: "https://feeds.example.com/x.csv" }, fakeFetch));
    expect(offers.map((o) => o.sku)).toEqual(["A1", "A5"]);
    expect(offers[0]!.name).toBe("Völkl Mantra 102 Skis, 2026");
    expect(offers[1]!.inStock).toBe(false);
  });

  it("handles gzipped TSV feeds", async () => {
    const tsv = csv.replace(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/g, "\t").replace(/"/g, "");
    const fakeFetch = (async () => new Response(gzipSync(Buffer.from(tsv)))) as unknown as typeof fetch;
    const adapter = new CsvFeedAdapter({ ...cfg, format: "tsv", gzip: true }, { FEED_URL_TEST: "https://feeds.example.com/x.tsv.gz" }, fakeFetch);
    expect((await collect(adapter)).map((o) => o.sku)).toEqual(["A1", "A5"]);
  });

  it("fails loudly on a bad download", async () => {
    const fakeFetch = (async () => new Response("nope", { status: 403 })) as unknown as typeof fetch;
    await expect(collect(new CsvFeedAdapter(cfg, { FEED_URL_TEST: "https://x" }, fakeFetch))).rejects.toThrow(/HTTP 403/);
  });
});
