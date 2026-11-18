// Named route.server.ts so the static demo build can leave it out (see next.config.ts).
import { NextResponse, type NextRequest } from "next/server";
import { searchProducts } from "@/server/catalogCache";

const KINDS = new Set(["SKI", "SNOWBOARD", "SKI_BINDING", "SNOWBOARD_BINDING", "SKI_BOOT", "SNOWBOARD_BOOT"]);

/** GET /api/products/search?q=mantra&kind=SKI → up to 8 catalog matches. */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 80);
  const kinds = req.nextUrl.searchParams.getAll("kind").filter((k) => KINDS.has(k));
  if (q.trim().length < 2) return NextResponse.json({ results: [] });
  const results = await searchProducts(q, kinds);
  return NextResponse.json({ results }, { headers: { "Cache-Control": "private, max-age=60" } });
}
