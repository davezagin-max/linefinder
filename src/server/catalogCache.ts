/**
 * Short-lived in-memory caches for the catalog (small: a few hundred
 * products). Prices refresh daily, so 10 minutes is plenty fresh.
 */
import { normalize } from "../lib/feeds/match";
import type { EngineCatalog } from "../lib/scoring/types";
import { loadEngineCatalog } from "./catalog";
import { db } from "./db";

const TTL_MS = 10 * 60 * 1000;
let engineCache: { at: number; catalog: Promise<EngineCatalog> } | null = null;

export function getEngineCatalog(): Promise<EngineCatalog> {
  if (!engineCache || Date.now() - engineCache.at > TTL_MS) {
    const catalog = loadEngineCatalog(db);
    engineCache = { at: Date.now(), catalog };
    catalog.catch(() => (engineCache = null));
  }
  return engineCache.catalog;
}

export interface SearchEntry {
  id: string;
  slug: string;
  kind: string;
  label: string; // "Völkl Mantra 102"
  modelYear: number;
  waistMm?: number;
  flex?: number;
  haystack: string;
}

let searchCache: { at: number; entries: Promise<SearchEntry[]> } | null = null;

export function getSearchIndex(): Promise<SearchEntry[]> {
  if (!searchCache || Date.now() - searchCache.at > TTL_MS) {
    const entries = db.product
      .findMany({ include: { brand: true, ski: true, snowboard: true }, orderBy: [{ brand: { name: "asc" } }, { model: "asc" }] })
      .then((rows) =>
        rows.map((p) => {
          const label = `${p.brand.name} ${p.model}`;
          return {
            id: p.id,
            slug: p.slug,
            kind: p.kind,
            label,
            modelYear: p.modelYear,
            waistMm: p.ski?.refWaistMm,
            flex: p.ski?.flex ?? p.snowboard?.flex,
            haystack: normalize(`${label} ${p.brand.slug}`),
          };
        }),
      );
    searchCache = { at: Date.now(), entries };
    entries.catch(() => (searchCache = null));
  }
  return searchCache.entries;
}

/** Every query word must appear (accent- and case-insensitive). */
export async function searchProducts(q: string, kinds?: string[], limit = 8) {
  const words = normalize(q).split(" ").filter(Boolean);
  if (!words.length) return [];
  const index = await getSearchIndex();
  return index
    .filter((e) => (!kinds?.length || kinds.includes(e.kind)) && words.every((w) => e.haystack.includes(w)))
    .slice(0, limit)
    .map(({ haystack: _h, ...rest }) => rest);
}
