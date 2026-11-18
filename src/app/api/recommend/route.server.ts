// File is named route.server.ts so the static GitHub Pages demo build can
// leave API routes out (see pageExtensions in next.config.ts).
import { NextResponse, type NextRequest } from "next/server";
import { referencedIds } from "@/lib/client/api";
import { productSummaries } from "@/lib/demo/catalog";
import { recommend } from "@/lib/scoring/engine";
import { surveyAnswersSchema, toRiderInput } from "@/lib/survey/schema";
import { getEngineCatalog } from "@/server/catalogCache";

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
  return NextResponse.json({ result, products: productSummaries(catalog, referencedIds(result)) });
}
