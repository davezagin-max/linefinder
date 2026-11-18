/**
 * Data-quality report.
 *   npm run data:check              → report; exit 1 on ERROR
 *   npm run data:check -- --strict  → launch mode: placeholders, unverified
 *                                     specs and missing images become errors
 */
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDb } from "../src/lib/db";
import { runChecks } from "../src/lib/data-quality/checks";
import { loadSnapshot } from "./lib/snapshot";

export async function dataQuality(opts: { strict: boolean; now?: Date; quiet?: boolean }) {
  const db = createDb();
  try {
    const now = opts.now ?? new Date();
    const { products, brands } = await loadSnapshot(db);
    const { issues, summary } = runChecks(products, brands, { now, strict: opts.strict });

    await mkdir("reports", { recursive: true });
    await writeFile(
      "reports/data-quality.json",
      JSON.stringify({ generatedAt: now.toISOString(), strict: opts.strict, products: products.length, brands: brands.length, summary, issues }, null, 2),
    );

    if (!opts.quiet) {
      const byCode = new Map<string, typeof issues>();
      for (const i of issues) byCode.set(`${i.severity}|${i.code}`, [...(byCode.get(`${i.severity}|${i.code}`) ?? []), i]);
      const order = { ERROR: 0, WARN: 1, INFO: 2 } as const;
      const rows = [...byCode.entries()]
        .map(([k, xs]) => {
          const [severity, code] = k.split("|") as [keyof typeof order, string];
          const examples = [...new Set(xs.map((x) => x.subject))].slice(0, 3).join(", ");
          return { severity, code, count: xs.length, examples };
        })
        .sort((a, b) => order[a.severity] - order[b.severity] || b.count - a.count);
      console.log(`\nData quality — ${products.length} products, ${brands.length} brands${opts.strict ? " (strict)" : ""}`);
      console.table(rows);
      for (const e of issues.filter((i) => i.severity === "ERROR").slice(0, 25)) console.log(`  ✖ ${e.subject}: ${e.message}`);
      console.log(`Summary: ${summary.ERROR} errors, ${summary.WARN} warnings, ${summary.INFO} info → reports/data-quality.json\n`);
    }
    return summary;
  } finally {
    await db.$disconnect();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const summary = await dataQuality({ strict: process.argv.includes("--strict") });
  process.exit(summary.ERROR > 0 ? 1 : 0);
}
