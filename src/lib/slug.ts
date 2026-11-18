/** URL/DB slugs: "Völkl Mantra 102 2025" → "volkl-mantra-102-2025". */
export function slugify(...parts: (string | number)[]) {
  return parts
    .join("-")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const productSlug = (s: { brand: string; model: string; modelYear: number }) => slugify(s.brand, s.model, s.modelYear);
