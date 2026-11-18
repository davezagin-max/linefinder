/**
 * Image pipeline.
 *
 *   npm run images:refresh             → import press-kit manifests (data/press-kits/*.json)
 *   npm run images:refresh -- --health → also health-check every stored image URL
 *
 * Feed images arrive with the price refresh. Press-kit images come from
 * manifests that state the kit's license terms and the hosts its images are
 * served from; anything off-host or unlicensed is rejected.
 */
import "dotenv/config";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { createDb } from "../src/lib/db";
import { checkImageUrl, mapLimit } from "../src/lib/images/health";
import { pressKitSchema, type ImageCandidate } from "../src/lib/images/policy";
import { refreshPrimaries, upsertImages } from "./lib/imageStore";

const DIR = "data/press-kits";

async function main() {
  const db = createDb();
  const now = new Date();
  try {
    // ── Press kits ──
    const files = existsSync(DIR) ? readdirSync(DIR).filter((f) => f.endsWith(".json") && !f.startsWith("_")) : [];
    const products = new Map((await db.product.findMany({ select: { id: true, slug: true } })).map((p) => [p.slug, p.id]));
    let upserted = 0;
    for (const f of files) {
      const kit = pressKitSchema.parse(JSON.parse(readFileSync(path.join(DIR, f), "utf8")));
      const candidates: ImageCandidate[] = [];
      for (const [i, img] of kit.images.entries()) {
        const productId = products.get(img.product);
        if (!productId) {
          console.warn(`  ${f}: unknown product slug "${img.product}"`);
          continue;
        }
        candidates.push({
          productId,
          url: img.url,
          view: img.view,
          isPrimary: img.primary,
          sortOrder: i,
          source: "MANUFACTURER_PRESS_KIT",
          sourceName: kit.kitName,
          licenseNote: kit.licenseUrl ? `${kit.licenseNote} (${kit.licenseUrl})` : kit.licenseNote,
        });
      }
      const s = await upsertImages(db, candidates, kit.allowedHosts);
      upserted += s.upserted;
      console.log(`${f}: ${s.upserted} images stored, ${s.rejected.length} rejected`);
      for (const r of s.rejected) console.log(`  ✖ ${r.reason}: ${r.url}`);
    }
    if (!files.length) console.log(`No press-kit manifests in ${DIR}/ yet (see ${DIR}/_example.json).`);

    // ── Health check ──
    if (process.argv.includes("--health")) {
      const images = await db.image.findMany({ select: { id: true, url: true, brokenSince: true } });
      const results = await mapLimit(images, 5, (i) => checkImageUrl(i.url));
      let broken = 0;
      for (const [k, i] of images.entries()) {
        const r = results[k]!;
        if (r.ok) await db.image.update({ where: { id: i.id }, data: { lastVerifiedAt: now, brokenSince: null } });
        else {
          broken++;
          await db.image.update({ where: { id: i.id }, data: { brokenSince: i.brokenSince ?? now } });
          console.log(`  ✖ ${r.reason}: ${i.url}`);
        }
      }
      console.log(`Health check: ${images.length - broken} OK, ${broken} broken (hidden from the site until they recover).`);
    }

    const changed = await refreshPrimaries(db);
    console.log(`Images: ${upserted} press-kit images stored; ${changed} primary flags updated.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
