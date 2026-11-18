/**
 * Match feed offers to catalog products.
 *
 * Order: manual mapping (config/feed-mappings.json) → name match.
 * Name matching is deliberately strict: every token of the catalog model
 * name must appear in the offer ("Mindbender 108Ti" never matches
 * "Mindbender 99Ti"), the brand must match, the product type must agree,
 * and any season mentioned must be the model's season. Anything else stays
 * unmatched and is listed in the feed-run report for manual mapping.
 */
import type { FeedOffer } from "./types";

export type ProductKind = "SKI" | "SNOWBOARD" | "SKI_BINDING" | "SNOWBOARD_BINDING" | "SKI_BOOT" | "SNOWBOARD_BOOT";

export interface MatchableProduct {
  id: string;
  slug: string;
  kind: ProductKind;
  brandSlug: string;
  brandName: string;
  model: string;
  modelYear: number;
}

export interface MatchResult {
  productId: string;
  sizeLabel: string;
  method: "MAPPING" | "NAME";
}

/** Extra spellings retailers use. Brand name and slug are always aliases too. */
export const BRAND_ALIASES: Record<string, string[]> = {
  volkl: ["voelkl", "volkl"],
  "lib-tech": ["lib technologies", "libtech"],
  capita: ["capita snowboarding"],
  "black-crows": ["blackcrows"],
  thirtytwo: ["32", "thirty two"],
  dc: ["dc shoes"],
  line: ["line skis"],
  "never-summer": ["never summer industries"],
  yes: ["yes snowboards"],
  k2: ["k2 skis", "k2 snowboarding"],
};

const STOP = new Set([
  "ski", "skis", "snowboard", "snowboards", "board", "binding", "bindings", "boot", "boots",
  "men", "mens", "man", "unisex", "adult", "new", "the", "and", "with", "for", "s",
]);
const WOMENS = new Set(["women", "womens", "wmns", "ladies", "w"]);

export function normalize(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const tokens = (s: string) => normalize(s).split(" ").filter(Boolean);

/** Years mentioned in a name: "2026", "2025/2026", "25/26", "2025-26". */
export function extractYears(name: string): { years: Set<number>; rest: string } {
  const years = new Set<number>();
  let rest = name;
  const add = (y: number) => (y < 100 ? years.add(2000 + y) : years.add(y));
  rest = rest.replace(/\b(20\d{2})\s*[/-]\s*(\d{2}|20\d{2})\b/g, (_, a: string, b: string) => {
    add(+a);
    add(+b);
    return " ";
  });
  rest = rest.replace(/\b(\d{2})\s*\/\s*(\d{2})\b/g, (m, a: string, b: string) => {
    if (+b !== +a + 1) return m;
    add(+a);
    add(+b);
    return " ";
  });
  rest = rest.replace(/\b(20[1-3]\d)\b/g, (_, a: string) => {
    add(+a);
    return " ";
  });
  return { years, rest };
}

/** Which product kinds the wording allows. Empty set = no hint. */
export function kindHints(name: string, category = ""): Set<ProductKind> {
  const t = new Set(tokens(`${name} ${category}`));
  const has = (...w: string[]) => w.some((x) => t.has(x));
  const binding = has("binding", "bindings");
  const boot = has("boot", "boots");
  const board = has("snowboard", "snowboards", "snowboarding", "board");
  const ski = has("ski", "skis", "skiing");
  if (binding) return new Set(board && !ski ? ["SNOWBOARD_BINDING"] : ski && !board ? ["SKI_BINDING"] : ["SKI_BINDING", "SNOWBOARD_BINDING"]);
  if (boot) return new Set(board && !ski ? ["SNOWBOARD_BOOT"] : ski && !board ? ["SKI_BOOT"] : ["SKI_BOOT", "SNOWBOARD_BOOT"]);
  if (board) return new Set(["SNOWBOARD"]);
  if (ski) return new Set(["SKI"]);
  return new Set();
}

/** "184", "184cm" → "184"; "158W", "158 Wide" → "158W"; "27.5" stays. */
export function normalizeSize(size: string | undefined): string {
  if (!size) return "";
  const s = size.trim().toUpperCase();
  const wide = /\bW(IDE)?\b|\d W$|\dW$/.test(s);
  const num = s.match(/\d{2,3}(\.\d)?/)?.[0];
  if (!num) return s;
  return wide && Number(num) >= 120 ? `${num}W` : num;
}

interface Indexed extends MatchableProduct {
  modelTokens: string[];
  needsWomensMarker: boolean;
}

export function createMatcher(products: MatchableProduct[], mappings: Record<string, string> = {}) {
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const aliasToBrand: [string, string][] = [];
  for (const p of products) {
    for (const a of [p.brandName, p.brandSlug.replace(/-/g, " "), ...(BRAND_ALIASES[p.brandSlug] ?? [])]) {
      const n = normalize(a);
      if (n && !aliasToBrand.some(([x]) => x === n)) aliasToBrand.push([n, p.brandSlug]);
    }
  }
  aliasToBrand.sort((a, b) => b[0].length - a[0].length); // longest alias first

  const byBrand = new Map<string, Indexed[]>();
  for (const p of products) {
    const mt = tokens(p.model);
    const needsWomensMarker = mt.includes("w");
    const idx: Indexed = { ...p, modelTokens: mt.filter((t) => t !== "w"), needsWomensMarker };
    byBrand.set(p.brandSlug, [...(byBrand.get(p.brandSlug) ?? []), idx]);
  }

  function detectBrand(offer: FeedOffer): { brand: string; alias: string } | null {
    if (offer.brand) {
      const nb = normalize(offer.brand);
      const hit = aliasToBrand.find(([a]) => a === nb);
      if (hit) return { brand: hit[1], alias: hit[0] };
    }
    const nn = ` ${normalize(offer.name)} `;
    const hit = aliasToBrand.find(([a]) => nn.startsWith(` ${a} `));
    return hit ? { brand: hit[1], alias: hit[0] } : null;
  }

  return function match(offer: FeedOffer): MatchResult | null {
    const sizeLabel = normalizeSize(offer.size);
    const mapped = mappings[`${offer.network}:${offer.advertiserId}:${offer.sku}`];
    if (mapped) {
      const p = bySlug.get(mapped);
      return p ? { productId: p.id, sizeLabel, method: "MAPPING" } : null;
    }

    const brand = detectBrand(offer);
    if (!brand) return null;
    const { years, rest } = extractYears(offer.name);
    const hints = kindHints(offer.name, offer.category);
    const offerTokens = tokens(rest);
    const brandTokens = new Set(brand.alias.split(" "));
    const womensMarked = offerTokens.some((t) => WOMENS.has(t));
    const meaningful = offerTokens.filter((t) => !STOP.has(t) && !WOMENS.has(t) && !brandTokens.has(t));
    const tokenSet = new Set(offerTokens);

    const candidates = (byBrand.get(brand.brand) ?? []).filter((p) => {
      if (hints.size && !hints.has(p.kind)) return false;
      if (years.size && !years.has(p.modelYear) && !years.has(p.modelYear + 1)) return false;
      if (p.needsWomensMarker && !womensMarked) return false;
      if (!p.modelTokens.every((t) => tokenSet.has(t))) return false;
      // Allow a couple of extra words (colorway, "camber", etc.), not a different model.
      const extras = meaningful.filter((t) => !p.modelTokens.includes(t) && !/^\d{3}(cm|w)?$/.test(t));
      return extras.length <= 2;
    });
    if (!candidates.length) return null;

    candidates.sort(
      (a, b) =>
        b.modelTokens.length - a.modelTokens.length ||
        Number(years.has(b.modelYear + 1) || years.has(b.modelYear)) - Number(years.has(a.modelYear + 1) || years.has(a.modelYear)) ||
        b.modelYear - a.modelYear,
    );
    const [best, second] = candidates;
    // Two different models fit equally well → ambiguous, leave for manual mapping.
    if (second && second.modelTokens.length === best!.modelTokens.length && second.modelYear === best!.modelYear && second.id !== best!.id) {
      return null;
    }
    return { productId: best!.id, sizeLabel, method: "NAME" };
  };
}
