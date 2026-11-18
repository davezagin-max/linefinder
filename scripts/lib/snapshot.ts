import type { Db } from "../../src/lib/db";
import type { DQBrand, DQProduct } from "../../src/lib/data-quality/checks";

/** Load everything the data-quality checks need in two queries. */
export async function loadSnapshot(db: Db): Promise<{ products: DQProduct[]; brands: DQBrand[] }> {
  const products = await db.product.findMany({
    include: {
      ski: { include: { sizes: true } },
      snowboard: { include: { sizes: true } },
      skiBinding: true,
      boardBinding: true,
      skiBoot: true,
      boardBoot: true,
      images: true,
      reviews: { include: { source: true } },
      prices: { select: { checkedAt: true, retailer: { select: { network: true } } } },
    },
    orderBy: { slug: "asc" },
  });
  const brands = await db.brand.findMany({ orderBy: { slug: "asc" } });
  return { products, brands };
}
