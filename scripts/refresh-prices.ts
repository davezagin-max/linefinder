/**
 * Daily price refresh from affiliate feeds.
 *
 *   npm run prices:refresh                 → mock feed (dev) + configured real feeds
 *   npm run prices:refresh -- --no-mock    → real feeds only (what the scheduled job runs)
 *   npm run prices:refresh -- --only mock  → one adapter by id
 *   npm run prices:refresh -- --dry-run    → fetch + match, write nothing
 *   npm run prices:refresh -- --purge-mock → remove mock prices and deactivate mock retailers
 *
 * Real feeds are configured in config/feeds.json (see config/feeds.example.json).
 * The mock feed never runs when NODE_ENV=production.
 */
import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import { createDb } from "../src/lib/db";
import { CsvFeedAdapter, feedsFileSchema } from "../src/lib/feeds/csv";
import { MockFeedAdapter } from "../src/lib/feeds/mock";
import type { FeedAdapter } from "../src/lib/feeds/types";
import { loadMockCatalog, runPriceFeed } from "./lib/priceJob";

const args = process.argv.slice(2);
const flag = (f: string) => args.includes(f);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : undefined;

function loadMappings(): Record<string, string> {
  const path = "config/feed-mappings.json";
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")).mappings ?? {}) : {};
}

async function main() {
  const db = createDb();
  const now = new Date();
  try {
    if (flag("--purge-mock")) {
      const mock = await db.retailer.findMany({ where: { network: "MOCK" }, select: { id: true } });
      const ids = mock.map((r) => r.id);
      const del = await db.retailerPrice.deleteMany({ where: { retailerId: { in: ids } } });
      await db.retailer.updateMany({ where: { id: { in: ids } }, data: { active: false } });
      console.log(`Removed ${del.count} mock prices and deactivated ${ids.length} mock retailers.`);
      return;
    }

    const adapters: FeedAdapter[] = [];
    const production = process.env.NODE_ENV === "production";
    if (!flag("--no-mock") && !production) adapters.push(new MockFeedAdapter(() => loadMockCatalog(db)));

    if (existsSync("config/feeds.json")) {
      const cfg = feedsFileSchema.parse(JSON.parse(readFileSync("config/feeds.json", "utf8")));
      for (const f of cfg.feeds) {
        const a = new CsvFeedAdapter(f);
        if (a.isConfigured()) adapters.push(a);
        else if (f.enabled) console.warn(`Skipping ${a.id}: set ${f.urlEnv} to enable it.`);
      }
    } else {
      console.log("No config/feeds.json yet: only the mock feed will run (see config/feeds.example.json).");
    }

    const selected = only ? adapters.filter((a) => a.id === only) : adapters;
    if (!selected.length) {
      console.log("No feeds to run.");
      return;
    }

    const mappings = loadMappings();
    let failed = false;
    const rows = [];
    for (const a of selected) {
      const s = await runPriceFeed(db, a, { now, mappings, dryRun: flag("--dry-run") });
      if (s.error) failed = true;
      rows.push({
        feed: s.adapter,
        offers: s.offers,
        matched: s.matched,
        unmatched: s.unmatched,
        prices: s.prices,
        images: s.images,
        error: s.error ?? "",
      });
      if (s.unmatchedSample.length) {
        console.log(`\nUnmatched offers from ${s.adapter} (add to config/feed-mappings.json if they're ours):`);
        for (const u of s.unmatchedSample.slice(0, 10)) console.log(`  · ${u}`);
      }
    }
    console.log(`\nPrice refresh ${flag("--dry-run") ? "(dry run) " : ""}finished:`);
    console.table(rows);
    process.exitCode = failed ? 1 : 0;
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
