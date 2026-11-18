/**
 * What to show for a product: its healthy licensed photos in a sensible
 * order, or a category silhouette. The UI never renders a broken image:
 * this resolver skips images the health check marked broken, and the image
 * component falls back to `placeholderFor()` on a load error.
 */
import type { ImageSource, ImageView } from "./policy";

export type ProductKind = "SKI" | "SNOWBOARD" | "SKI_BINDING" | "SNOWBOARD_BINDING" | "SKI_BOOT" | "SNOWBOARD_BOOT";

export interface StoredImage {
  url: string;
  view: ImageView;
  isPrimary: boolean;
  sortOrder: number;
  source: ImageSource;
  sourceName: string;
  brokenSince: Date | null;
}

export interface GalleryImage {
  url: string;
  alt: string;
  view: ImageView | "PLACEHOLDER";
  credit?: string; // "Image: Völkl 2026/27 media kit"
  isPlaceholder: boolean;
}

const VIEW_ORDER: Record<ImageView, number> = { TOPSHEET: 0, BASE: 1, PROFILE: 2, DETAIL: 3, LIFESTYLE: 4 };
const VIEW_LABEL: Record<ImageView, string> = {
  TOPSHEET: "top sheet",
  BASE: "base",
  PROFILE: "profile",
  DETAIL: "detail",
  LIFESTYLE: "on snow",
};

const PLACEHOLDER: Record<ProductKind, { file: string; noun: string }> = {
  SKI: { file: "ski", noun: "a pair of skis" },
  SNOWBOARD: { file: "snowboard", noun: "a snowboard" },
  SKI_BINDING: { file: "ski-binding", noun: "a ski binding" },
  SNOWBOARD_BINDING: { file: "snowboard-binding", noun: "a snowboard binding" },
  SKI_BOOT: { file: "ski-boot", noun: "a ski boot" },
  SNOWBOARD_BOOT: { file: "snowboard-boot", noun: "a snowboard boot" },
};

export function placeholderFor(kind: ProductKind, productName?: string): GalleryImage {
  const p = PLACEHOLDER[kind];
  return {
    url: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/placeholders/${p.file}.svg`,
    alt: `Illustration of ${p.noun}${productName ? ` (photo of the ${productName} coming soon)` : ""}`,
    view: "PLACEHOLDER",
    isPlaceholder: true,
  };
}

/** Press-kit photos beat feed photos; then primary, view order, sort order. */
export function orderImages(images: StoredImage[]): StoredImage[] {
  const srcRank = (s: ImageSource) => (s === "MANUFACTURER_PRESS_KIT" ? 0 : 1);
  return images
    .filter((i) => !i.brokenSince)
    .sort(
      (a, b) =>
        Number(b.isPrimary) - Number(a.isPrimary) ||
        srcRank(a.source) - srcRank(b.source) ||
        VIEW_ORDER[a.view] - VIEW_ORDER[b.view] ||
        a.sortOrder - b.sortOrder,
    );
}

/** Full gallery (detail page). Always returns at least one image. */
export function productGallery(kind: ProductKind, productName: string, images: StoredImage[]): GalleryImage[] {
  const ordered = orderImages(images);
  // Collapse duplicate views from different sources: keep the first of each view.
  const seen = new Set<ImageView>();
  const unique = ordered.filter((i) => (seen.has(i.view) ? false : (seen.add(i.view), true)));
  if (!unique.length) return [placeholderFor(kind, productName)];
  return unique.map((i) => ({
    url: i.url,
    alt: `${productName}, ${VIEW_LABEL[i.view]} view`,
    view: i.view,
    credit: `Image: ${i.sourceName}`,
    isPlaceholder: false,
  }));
}

/** Single image for cards, compare rows and setup tiles. */
export function primaryImage(kind: ProductKind, productName: string, images: StoredImage[]): GalleryImage {
  return productGallery(kind, productName, images)[0]!;
}

/** Which stored image should carry isPrimary (index into `images`), or -1. */
export function choosePrimary(images: StoredImage[]): number {
  const best = orderImages(images.map((i) => ({ ...i, isPrimary: false })))[0];
  return best ? images.findIndex((i) => i.url === best.url) : -1;
}
