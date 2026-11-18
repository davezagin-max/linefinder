/**
 * Image licensing policy. Product photos may ONLY come from:
 *   - manufacturer press/media kits (with the kit's license terms), or
 *   - affiliate network product feeds (licensed for promoting the product).
 * Every stored image carries its source and a license note. Anything else
 * is rejected before it reaches the database.
 */
import { z } from "zod";

export const IMAGE_VIEWS = ["TOPSHEET", "BASE", "PROFILE", "DETAIL", "LIFESTYLE"] as const;
export type ImageView = (typeof IMAGE_VIEWS)[number];
export type ImageSource = "MANUFACTURER_PRESS_KIT" | "AFFILIATE_FEED";

export interface ImageCandidate {
  productId: string;
  url: string;
  view: ImageView;
  source: ImageSource;
  sourceName: string;
  licenseNote: string;
  isPrimary?: boolean;
  sortOrder?: number;
}

export type ImageRejection =
  | "NOT_HTTPS"
  | "BAD_URL"
  | "HOST_NOT_ALLOWED"
  | "MISSING_LICENSE"
  | "MISSING_SOURCE_NAME"
  | "NOT_AN_IMAGE_PATH";

/** Reject anything that isn't clearly a licensed, https image URL. */
export function validateImage(c: ImageCandidate, allowedHosts?: string[]): ImageRejection | null {
  let u: URL;
  try {
    u = new URL(c.url);
  } catch {
    return "BAD_URL";
  }
  if (u.protocol !== "https:") return "NOT_HTTPS";
  if (allowedHosts && !allowedHosts.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`))) return "HOST_NOT_ALLOWED";
  if (c.licenseNote.trim().length < 10) return "MISSING_LICENSE";
  if (!c.sourceName.trim()) return "MISSING_SOURCE_NAME";
  // Obvious non-images (HTML pages, scripts) are refused; extensionless CDN URLs are fine.
  if (/\.(html?|php|aspx?|js|css|json)$/i.test(u.pathname)) return "NOT_AN_IMAGE_PATH";
  return null;
}

/** License note attached to images that arrive in an affiliate feed. */
export function feedLicenseNote(network: string, retailer: string) {
  return `Supplied in ${retailer}'s ${network} affiliate product feed; licensed for promoting this product under the affiliate agreement.`;
}

// ───────────── Press kit manifests: data/press-kits/<brand>.json ─────────────

export const pressKitSchema = z.object({
  brand: z.string(),
  kitName: z.string().min(3), // "Völkl 2026/27 media kit"
  licenseNote: z.string().min(10), // summary of the kit's usage terms
  licenseUrl: z.url().optional(),
  /** Hosts the kit's images are served from; anything else is rejected. */
  allowedHosts: z.array(z.string().min(3)).min(1),
  images: z.array(
    z.object({
      product: z.string(), // product slug
      url: z.url(),
      view: z.enum(IMAGE_VIEWS),
      primary: z.boolean().optional(),
    }),
  ),
});
export type PressKit = z.infer<typeof pressKitSchema>;
