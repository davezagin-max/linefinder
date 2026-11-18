/**
 * Client data layer. The full app calls the Next.js API (Postgres catalog,
 * feed prices). The static GitHub Pages demo (NEXT_PUBLIC_DEMO=1) runs the
 * same engine in the browser against the built-in catalog + mock prices.
 */
import type { ProductSummary, SearchHit } from "../demo/catalog";
import type { RecommendationResult } from "../scoring/types";
import type { SurveyAnswers } from "../survey/schema";

export const IS_DEMO = process.env.NEXT_PUBLIC_DEMO === "1";

export interface RecommendResponse {
  result: RecommendationResult;
  products: Record<string, ProductSummary>;
}

/** Every product id the result mentions (picks, why-not, quivers, setups). */
export function referencedIds(result: RecommendationResult): Set<string> {
  const ids = new Set<string>();
  for (const p of result.picks) ids.add(p.productId);
  for (const w of result.whyNot) ids.add(w.productId);
  for (const q of [...result.quivers.two, ...result.quivers.three]) for (const piece of q.pieces) if (piece.productId) ids.add(piece.productId);
  for (const s of Object.values(result.setups)) for (const x of [...s.bindings, ...s.boots]) ids.add(x.productId);
  return ids;
}

export async function getRecommendations(answers: SurveyAnswers): Promise<RecommendResponse> {
  if (IS_DEMO) {
    // Loaded only when needed so the survey bundle stays small.
    const [{ demoCatalog, productSummaries }, { recommend }, { surveyAnswersSchema, toRiderInput }] = await Promise.all([
      import("../demo/catalog"),
      import("../scoring/engine"),
      import("../survey/schema"),
    ]);
    const catalog = demoCatalog();
    // JSON round trip matches what the API returns (dates become strings).
    const result = JSON.parse(JSON.stringify(recommend(toRiderInput(surveyAnswersSchema.parse(answers)), catalog))) as RecommendationResult;
    return { result, products: productSummaries(catalog, referencedIds(result)) };
  }
  const res = await fetch("/api/recommend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(answers) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json as RecommendResponse;
}

export async function searchGear(q: string, kind: string, signal?: AbortSignal): Promise<SearchHit[]> {
  if (IS_DEMO) {
    const { demoCatalog, searchCatalog } = await import("../demo/catalog");
    return searchCatalog(demoCatalog(), q, [kind]);
  }
  const res = await fetch(`/api/products/search?q=${encodeURIComponent(q)}&kind=${kind}`, { signal });
  return ((await res.json()) as { results: SearchHit[] }).results;
}
