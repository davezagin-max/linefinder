/**
 * Seasonal catalog refresh.
 *
 *   npm run data:refresh                       → import drops, recompute, check
 *   npm run data:refresh -- --dry-run          → validate drops only
 *   npm run data:refresh -- --strict           → fail on launch blockers
 *   npm run data:refresh -- --no-placeholders  → exclude placeholder reviews
 *                                                from aggregates (production)
 *
 * Input: JSON files in data/incoming/*.json matching `refreshDropSchema`
 * (prisma/seed/schemas.ts) — new model years, spec corrections, new brands,
 * and slugs to discontinue. Each file is moved to data/imported/ on success.
 *
 * Specs imported here are still unverified (specsVerifiedAt stays null) until
 * a human checks them against the manufacturer. Prices and images are NOT
 * handled here; they come from the affiliate-feed jobs (Stage 3).
 */
import "dotenv/config";
import { mkdir, readdir, readFile, rename } from "node:fs/promises";
import path from "node:path";
import { refreshDropSchema, type RefreshDrop } from "../prisma/seed/schemas";
import { createDb } from "../src/lib/db";
import { dataQuality } from "./data-quality";
import { recomputeScores } from "./lib/recompute";
import {
  makeContext,
  upsertBoard,
  upsertBoardBinding,
  upsertBoardBoot,
  upsertBrands,
  upsertSki,
  upsertSkiBinding,
  upsertSkiBoot,
} from "./lib/upsert";

const INCOMING = "data/incoming";
const IMPORTED = "data/imported";

async function readDrops(): Promise<{ file: string; drop: RefreshDrop }[]> {
  await mkdir(INCOMING, { recursive: true });
  const files = (await readdir(INCOMING)).filter((f) => f.endsWith(".json")).sort();
  const out: { file: string; drop: RefreshDrop }[] = [];
  const errors: string[] = [];
  for (const f of files) {
    const parsed = refreshDropSchema.safeParse(JSON.parse(await readFile(path.join(INCOMING, f), "utf8")));
    if (parsed.success) out.push({ file: f, drop: parsed.data });
    else errors.push(`${f}: ${parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
  }
  if (errors.length) throw new Error(`Invalid refresh drop(s):\n  ${errors.join("\n  ")}`);
  return out;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const now = new Date();
  const drops = await readDrops();
  console.log(`Found ${drops.length} drop file(s) in ${INCOMING}/`);
  if (args.has("--dry-run")) return;

  const db = createDb();
  try {
    for (const { file, drop } of drops) {
      await upsertBrands(db, drop.brands, now);
      const ctx = await makeContext(db, `refresh:${file}`, now);
      for (const s of drop.skis) await upsertSki(ctx, s);
      for (const s of drop.snowboards) await upsertBoard(ctx, s);
      for (const s of drop.skiBindings) await upsertSkiBinding(ctx, s);
      for (const s of drop.snowboardBindings) await upsertBoardBinding(ctx, s);
      for (const s of drop.skiBoots) await upsertSkiBoot(ctx, s);
      for (const s of drop.snowboardBoots) await upsertBoardBoot(ctx, s);
      if (drop.discontinue.length) {
        await db.product.updateMany({ where: { slug: { in: drop.discontinue } }, data: { discontinued: true } });
      }
      await mkdir(IMPORTED, { recursive: true });
      await rename(path.join(INCOMING, file), path.join(IMPORTED, `${now.toISOString().slice(0, 10)}-${file}`));
      console.log(`Imported ${file} (season ${drop.season})`);
    }
    const r = await recomputeScores(db, { now, allowPlaceholders: !args.has("--no-placeholders") });
    console.log(`Recomputed scores for ${r.brands} brands, ${r.products} products.`);
  } finally {
    await db.$disconnect();
  }
  const summary = await dataQuality({ strict: args.has("--strict"), now });
  process.exit(summary.ERROR > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
