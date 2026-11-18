/**
 * Seed the catalog (idempotent — safe to re-run).
 *   npm run db:seed
 * Validates every record with zod, upserts, recomputes cached scores, then
 * prints the data-quality report.
 */
import "dotenv/config";
import type { z } from "zod";
import { createDb } from "../../src/lib/db";
import { dataQuality } from "../../scripts/data-quality";
import { recomputeScores } from "../../scripts/lib/recompute";
import {
  makeContext,
  productSlug,
  upsertBoard,
  upsertBoardBinding,
  upsertBoardBoot,
  upsertBrands,
  upsertSki,
  upsertSkiBinding,
  upsertSkiBoot,
} from "../../scripts/lib/upsert";
import { SKI_BINDINGS, SNOWBOARD_BINDINGS } from "./data/bindings";
import { SKI_BOOTS, SNOWBOARD_BOOTS } from "./data/boots";
import { BRANDS } from "./data/brands";
import { SKIS } from "./data/skis";
import { SNOWBOARDS } from "./data/snowboards";
import {
  boardBindingSchema,
  boardBootSchema,
  boardSchema,
  brandSchema,
  skiBindingSchema,
  skiBootSchema,
  skiSchema,
} from "./schemas";

function validate<T>(label: string, schema: z.ZodType<T>, rows: T[]): T[] {
  const errors: string[] = [];
  rows.forEach((row, i) => {
    const r = schema.safeParse(row);
    if (!r.success) {
      const name = (row as { model?: string; slug?: string }).model ?? (row as { slug?: string }).slug ?? `#${i}`;
      errors.push(`${label} ${name}: ${r.error.issues.map((x) => `${x.path.join(".")} ${x.message}`).join("; ")}`);
    }
  });
  if (errors.length) throw new Error(`Seed validation failed:\n  ${errors.join("\n  ")}`);
  return rows;
}

function assertUniqueSlugs(rows: { brand: string; model: string; modelYear: number }[]) {
  const seen = new Set<string>();
  for (const r of rows) {
    const s = productSlug(r as Parameters<typeof productSlug>[0]);
    if (seen.has(s)) throw new Error(`Duplicate product slug: ${s}`);
    seen.add(s);
  }
}

async function main() {
  const now = new Date();
  const brands = validate("brand", brandSchema, BRANDS);
  const brandSlugs = new Set(brands.map((b) => b.slug));
  const sets = {
    skis: validate("ski", skiSchema, SKIS),
    boards: validate("snowboard", boardSchema, SNOWBOARDS),
    skiBindings: validate("ski binding", skiBindingSchema, SKI_BINDINGS),
    boardBindings: validate("board binding", boardBindingSchema, SNOWBOARD_BINDINGS),
    skiBoots: validate("ski boot", skiBootSchema, SKI_BOOTS),
    boardBoots: validate("board boot", boardBootSchema, SNOWBOARD_BOOTS),
  };
  const all = Object.values(sets).flat();
  for (const r of all) if (!brandSlugs.has(r.brand)) throw new Error(`Unknown brand "${r.brand}" on ${r.model}`);
  assertUniqueSlugs(all);

  const db = createDb();
  try {
    await upsertBrands(db, brands, now);
    const ctx = await makeContext(db, "seed:unverified", now);
    for (const s of sets.skis) await upsertSki(ctx, s);
    for (const s of sets.boards) await upsertBoard(ctx, s);
    for (const s of sets.skiBindings) await upsertSkiBinding(ctx, s);
    for (const s of sets.boardBindings) await upsertBoardBinding(ctx, s);
    for (const s of sets.skiBoots) await upsertSkiBoot(ctx, s);
    for (const s of sets.boardBoots) await upsertBoardBoot(ctx, s);
    const r = await recomputeScores(db, { now, allowPlaceholders: true });
    console.log(
      `Seeded ${r.brands} brands and ${r.products} products ` +
        `(${sets.skis.length} skis, ${sets.boards.length} boards, ` +
        `${sets.skiBindings.length + sets.boardBindings.length} bindings, ${sets.skiBoots.length + sets.boardBoots.length} boots).`,
    );
  } finally {
    await db.$disconnect();
  }
  await dataQuality({ strict: false, now });
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
