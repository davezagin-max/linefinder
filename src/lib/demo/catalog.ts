/**
 * Browser-side catalog for the static GitHub Pages demo: the seed catalog
 * plus today's mock-feed prices. No database, no server.
 */
import { normalize } from "../feeds/match";
import { mockOffers, type MockCatalogProduct } from "../feeds/mock";
import type { EngineCatalog, EngineProduct } from "../scoring/types";
import { seedCatalog } from "./seedCatalog";

const allProducts = (c: EngineCatalog): EngineProduct[] => [
  ...c.skis, ...c.boards, ...c.skiBindings, ...c.boardBindings, ...c.skiBoots, ...c.boardBoots,
];

let cache: { day: string; catalog: EngineCatalog } | null = null;

export function demoCatalog(now: Date = new Date()): EngineCatalog {
  const day = now.toISOString().slice(0, 10);
  if (cache?.day === day) return cache.catalog;

  const catalog = seedCatalog();
  const products = allProducts(catalog);
  const mockInput: MockCatalogProduct[] = products.map((p) => ({
    slug: p.slug, kind: p.kind, brand: p.brand.name, model: p.model, modelYear: p.modelYear, msrpCents: p.msrpCents, womensSpecific: p.womensSpecific,
  }));
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  // Mock offers carry the product slug in their SKU ("<retailer>-mock-<slug>"); junk offers have no product.
  for (const o of mockOffers(mockInput, now)) {
    const p = bySlug.get(o.sku.replace(/^.*?-mock-/, ""));
    if (!p) continue;
    p.prices.push({ retailer: o.retailerName, priceCents: o.priceCents, inStock: o.inStock, checkedAt: o.updatedAt, affiliateUrl: o.affiliateUrl });
  }
  cache = { day, catalog };
  return catalog;
}

export interface ProductSummary {
  id: string;
  slug: string;
  kind: string;
  brand: string;
  model: string;
  modelYear: number;
}

export function productSummaries(catalog: EngineCatalog, ids: Set<string>): Record<string, ProductSummary> {
  return Object.fromEntries(
    allProducts(catalog)
      .filter((p) => ids.has(p.id))
      .map((p) => [p.id, { id: p.id, slug: p.slug, kind: p.kind, brand: p.brand.name, model: p.model, modelYear: p.modelYear }]),
  );
}

export interface SearchHit {
  id: string;
  slug: string;
  kind: string;
  label: string;
  modelYear: number;
  waistMm?: number;
  flex?: number;
}

/** Same matching as the server search: every word must appear, accent-insensitive. */
export function searchCatalog(catalog: EngineCatalog, q: string, kinds: string[] = [], limit = 8): SearchHit[] {
  const words = normalize(q).split(" ").filter(Boolean);
  if (!words.length) return [];
  return allProducts(catalog)
    .filter((p) => !kinds.length || kinds.includes(p.kind))
    .filter((p) => {
      const hay = normalize(`${p.brand.name} ${p.model}`);
      return words.every((w) => hay.includes(w));
    })
    .sort((a, b) => `${a.brand.name} ${a.model}`.localeCompare(`${b.brand.name} ${b.model}`))
    .slice(0, limit)
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      kind: p.kind,
      label: `${p.brand.name} ${p.model}`,
      modelYear: p.modelYear,
      waistMm: p.kind === "SKI" ? p.waistMm : undefined,
      flex: p.kind === "SKI" || p.kind === "SNOWBOARD" ? p.flex : undefined,
    }));
}
