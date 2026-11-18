/** Store licensed images and keep one primary image per product. */
import type { Db } from "../../src/lib/db";
import { choosePrimary } from "../../src/lib/images/gallery";
import { validateImage, type ImageCandidate, type ImageRejection } from "../../src/lib/images/policy";

export interface ImageUpsertSummary {
  upserted: number;
  rejected: { url: string; reason: ImageRejection }[];
}

export async function upsertImages(db: Db, candidates: ImageCandidate[], allowedHosts?: string[]): Promise<ImageUpsertSummary> {
  const summary: ImageUpsertSummary = { upserted: 0, rejected: [] };
  for (const c of candidates) {
    const reason = validateImage(c, allowedHosts);
    if (reason) {
      summary.rejected.push({ url: c.url, reason });
      continue;
    }
    const data = {
      view: c.view,
      source: c.source,
      sourceName: c.sourceName,
      licenseNote: c.licenseNote,
      sortOrder: c.sortOrder ?? 0,
      ...(c.isPrimary ? { isPrimary: true } : {}),
    };
    await db.image.upsert({
      where: { productId_url: { productId: c.productId, url: c.url } },
      create: { productId: c.productId, url: c.url, ...data },
      update: data,
    });
    summary.upserted++;
  }
  return summary;
}

/**
 * Make sure each product has exactly one primary image, preferring a
 * manually flagged one that is still healthy.
 */
export async function refreshPrimaries(db: Db, productIds?: string[]) {
  const images = await db.image.findMany({ where: productIds ? { productId: { in: productIds } } : {} });
  const byProduct = new Map<string, typeof images>();
  for (const i of images) byProduct.set(i.productId, [...(byProduct.get(i.productId) ?? []), i]);
  let changed = 0;
  for (const [, list] of byProduct) {
    const flagged = list.find((i) => i.isPrimary && !i.brokenSince);
    const target = flagged ?? list[choosePrimary(list)];
    for (const i of list) {
      const should = !!target && i.id === target.id;
      if (i.isPrimary !== should) {
        await db.image.update({ where: { id: i.id }, data: { isPrimary: should } });
        changed++;
      }
    }
  }
  return changed;
}
