/**
 * Run a sample rider against the DATABASE catalog (with feed prices), to
 * check the full Stage 1–3 pipeline end to end.
 *   npm run engine:try-db -- wasatch
 */
import "dotenv/config";
import { createDb } from "../src/lib/db";
import { priceComparison, formatPrice } from "../src/lib/pricing/display";
import { primaryImage } from "../src/lib/images/gallery";
import { recommend } from "../src/lib/scoring/engine";
import type { RiderInput } from "../src/lib/scoring/types";
import { loadEngineCatalog } from "../src/server/catalog";
import { SAMPLE_RIDERS } from "./sampleRiders";

async function main() {
  const db = createDb();
  try {
    const now = new Date();
    const key = (process.argv[2] ?? "wasatch") as keyof typeof SAMPLE_RIDERS;
    const catalog = await loadEngineCatalog(db, { now });
    const r = recommend(SAMPLE_RIDERS[key] as RiderInput, catalog, now);
    const all = [...catalog.skis, ...catalog.boards];
    const images = await db.image.findMany({ where: { productId: { in: r.picks.map((p) => p.productId) } } });

    console.log(`\n${key}: top picks with live feed prices\n`);
    for (const [i, p] of r.picks.slice(0, 3).entries()) {
      const prod = all.find((x) => x.id === p.productId)!;
      const name = `${prod.brand.name} ${prod.model}`;
      const img = primaryImage(prod.kind, name, images.filter((x) => x.productId === p.productId));
      const table = priceComparison(prod.prices, now);
      console.log(`${i + 1}. ${name}  ◆ ${Math.round(p.total)}% Fit  ${p.recommendedSize.label}`);
      console.log(`   image: ${img.url}${img.isPlaceholder ? "  (placeholder)" : ""}`);
      console.log(`   card price: ${formatPrice(p.price.cents)}${p.price.isMsrp ? " (MSRP)" : ` at ${p.price.retailer}`}`);
      for (const row of table.rows)
        console.log(`     ${row.isBestPrice ? "★ Best Price " : "             "}${row.retailer.padEnd(30)} ${formatPrice(row.priceCents).padStart(9)}  ${row.inStock ? "in stock" : "out of stock"}  · checked ${row.lastChecked}  ${row.link?.rel}`);
      if (table.hiddenStale) console.log(`     (${table.hiddenStale} price${table.hiddenStale > 1 ? "s" : ""} older than 7 days hidden)`);
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
