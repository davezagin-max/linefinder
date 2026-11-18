/**
 * Run the engine against the seed catalog for the sample riders.
 *   npm run engine:try            → all sample riders
 *   npm run engine:try -- wasatch → just one
 */
import { recommend } from "../src/lib/scoring/engine";
import type { RiderInput } from "../src/lib/scoring/types";
import { seedCatalog } from "./lib/seedCatalog";
import { SAMPLE_RIDERS } from "./sampleRiders";

const catalog = seedCatalog();
const all = [...catalog.skis, ...catalog.boards, ...catalog.skiBindings, ...catalog.boardBindings, ...catalog.skiBoots, ...catalog.boardBoots];
const nameOf = (id?: string) => {
  const p = all.find((x) => x.id === id);
  return p ? `${p.brand.name} ${p.model}` : (id ?? "");
};
const usd = (c: number) => "$" + Math.round(c / 100);

const which = process.argv[2];
for (const [key, rider] of Object.entries(SAMPLE_RIDERS) as [string, RiderInput][]) {
  if (which && key !== which) continue;
  const r = recommend(rider, catalog, new Date("2026-11-17"));
  const t = r.targets;
  const din = t.dinEstimate ? `, DIN ~${t.dinEstimate.low}–${t.dinEstimate.high}` : "";
  console.log(`\n━━━ ${key} ━━━  flex target ${t.flexTarget.toFixed(1)}, length target ${Math.round(t.lengthTargetCm)} cm${din}${r.relaxed ? `, relaxed: ${r.relaxed}` : ""}`);
  for (const c of t.conflicts) console.log(`  ⚠ ${c.message}`);
  r.picks.slice(0, 5).forEach((p, i) => {
    const tags = p.tags.length ? `  [${p.tags.join(", ")}]` : "";
    console.log(`  ${i + 1}. ${nameOf(p.productId)}  ${p.total.toFixed(1)}%  ${p.recommendedSize.label}  ${usd(p.price.cents)}${tags}`);
    for (const reason of p.reasons.slice(0, 3)) console.log(`       · ${reason.text}`);
  });
  const top = r.picks[0];
  if (top) {
    const s = r.setups[top.productId]!;
    const b = s.bindings.map((x) => nameOf(x.productId)).join(", ") || "(keeping own)";
    const bt = s.boots.map((x) => nameOf(x.productId)).join(", ") || "(keeping own)";
    console.log(`  Setup for #1 → bindings: ${b}; boots: ${bt}`);
  }
  const q = r.quivers.three[0] ?? r.quivers.two[0];
  if (q) console.log(`  Best quiver (${q.score}): ` + q.pieces.map((p) => `${p.runName}: ${p.ownedLabel ?? nameOf(p.productId)}`).join(" | "));
  for (const w of r.whyNot.slice(0, 3)) console.log(`  Why not ${nameOf(w.productId)}? ${w.headline} (${w.details.join("; ")})`);
}
