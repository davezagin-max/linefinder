import { NextResponse, type NextRequest } from "next/server";
import { recommend } from "@/lib/scoring/engine";
import type { EngineCatalog } from "@/lib/scoring/types";
import { surveyAnswersSchema, toRiderInput } from "@/lib/survey/schema";
import { getEngineCatalog } from "@/server/catalogCache";

export interface ProductSummary {
  id: string;
  slug: string;
  kind: string;
  brand: string;
  model: string;
  modelYear: number;
}

function summaries(catalog: EngineCatalog, ids: Set<string>): Record<string, ProductSummary> {
  const all = [...catalog.skis, ...catalog.boards, ...catalog.skiBindings, ...catalog.boardBindings, ...catalog.skiBoots, ...catalog.boardBoots];
  return Object.fromEntries(
    all.filter((p) => ids.has(p.id)).map((p) => [p.id, { id: p.id, slug: p.slug, kind: p.kind, brand: p.brand.name, model: p.model, modelYear: p.modelYear }]),
  );
}

/** POST /api/recommend with SurveyAnswersV1 → engine result + names of every product it mentions. */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = surveyAnswersSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid answers", issues: parsed.error.issues.slice(0, 10) }, { status: 400 });
  }

  const catalog = await getEngineCatalog();
  const result = recommend(toRiderInput(parsed.data), catalog);

  const ids = new Set<string>();
  for (const p of result.picks) ids.add(p.productId);
  for (const w of result.whyNot) ids.add(w.productId);
  for (const q of [...result.quivers.two, ...result.quivers.three]) for (const piece of q.pieces) if (piece.productId) ids.add(piece.productId);
  for (const s of Object.values(result.setups)) for (const x of [...s.bindings, ...s.boots]) ids.add(x.productId);

  return NextResponse.json({ result, products: summaries(catalog, ids) });
}
