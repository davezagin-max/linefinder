import { describe, expect, it } from "vitest";
import { choosePrimary, orderImages, placeholderFor, primaryImage, productGallery, type StoredImage } from "./gallery";
import { checkImageUrl, mapLimit } from "./health";
import { feedLicenseNote, pressKitSchema, validateImage, type ImageCandidate } from "./policy";

const cand = (over: Partial<ImageCandidate> = {}): ImageCandidate => ({
  productId: "p1",
  url: "https://media.brand.com/kit/mantra-top.jpg",
  view: "TOPSHEET",
  source: "MANUFACTURER_PRESS_KIT",
  sourceName: "Brand 2026/27 media kit",
  licenseNote: "Retail and editorial use permitted per media kit terms.",
  ...over,
});

const img = (over: Partial<StoredImage> = {}): StoredImage => ({
  url: "https://cdn.example.com/a.jpg",
  view: "TOPSHEET",
  isPrimary: false,
  sortOrder: 0,
  source: "AFFILIATE_FEED",
  sourceName: "Retailer feed",
  brokenSince: null,
  ...over,
});

describe("licensing policy", () => {
  it("accepts a licensed https press-kit image from an allowed host", () => {
    expect(validateImage(cand(), ["brand.com"])).toBeNull();
  });

  it("rejects http, bad URLs, other hosts, missing licenses and non-image paths", () => {
    expect(validateImage(cand({ url: "http://media.brand.com/a.jpg" }))).toBe("NOT_HTTPS");
    expect(validateImage(cand({ url: "not a url" }))).toBe("BAD_URL");
    expect(validateImage(cand({ url: "https://some-retailer.com/a.jpg" }), ["brand.com"])).toBe("HOST_NOT_ALLOWED");
    expect(validateImage(cand({ licenseNote: "" }))).toBe("MISSING_LICENSE");
    expect(validateImage(cand({ sourceName: " " }))).toBe("MISSING_SOURCE_NAME");
    expect(validateImage(cand({ url: "https://media.brand.com/product.html" }))).toBe("NOT_AN_IMAGE_PATH");
  });

  it("feed images get an automatic license note", () => {
    expect(feedLicenseNote("AVANTLINK", "Example Retailer")).toMatch(/affiliate product feed/);
    expect(validateImage(cand({ source: "AFFILIATE_FEED", licenseNote: feedLicenseNote("CJ", "R") }))).toBeNull();
  });

  it("press kit manifests must declare license terms and allowed hosts", () => {
    expect(pressKitSchema.safeParse({ brand: "x", kitName: "Kit", licenseNote: "short", allowedHosts: [], images: [] }).success).toBe(false);
    expect(
      pressKitSchema.safeParse({
        brand: "volkl", kitName: "Völkl kit", licenseNote: "Retail use permitted.", allowedHosts: ["media.volkl.com"],
        images: [{ product: "volkl-mantra-102-2025", url: "https://media.volkl.com/a.jpg", view: "BASE" }],
      }).success,
    ).toBe(true);
  });
});

describe("gallery & fallbacks", () => {
  it("falls back to a category silhouette when there are no photos", () => {
    const g = productGallery("SNOWBOARD", "Jones Frontier", []);
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({ url: "/placeholders/snowboard.svg", isPlaceholder: true });
    expect(g[0]!.alt).toMatch(/Jones Frontier/);
  });

  it("never returns a broken image", () => {
    const g = productGallery("SKI", "X", [img({ brokenSince: new Date() })]);
    expect(g[0]!.isPlaceholder).toBe(true);
  });

  it("orders press-kit photos first, then top sheet → base → profile", () => {
    const ordered = orderImages([
      img({ url: "feed-top", view: "TOPSHEET" }),
      img({ url: "kit-profile", view: "PROFILE", source: "MANUFACTURER_PRESS_KIT" }),
      img({ url: "kit-base", view: "BASE", source: "MANUFACTURER_PRESS_KIT" }),
    ]);
    expect(ordered.map((i) => i.url)).toEqual(["kit-base", "kit-profile", "feed-top"]);
  });

  it("keeps one photo per view and credits the source", () => {
    const g = productGallery("SKI", "Völkl Mantra 102", [
      img({ url: "https://a/1.jpg", view: "TOPSHEET", source: "MANUFACTURER_PRESS_KIT", sourceName: "Völkl kit" }),
      img({ url: "https://a/2.jpg", view: "TOPSHEET" }),
      img({ url: "https://a/3.jpg", view: "BASE" }),
    ]);
    expect(g.map((x) => x.view)).toEqual(["TOPSHEET", "BASE"]);
    expect(g[0]!.credit).toBe("Image: Völkl kit");
    expect(g[0]!.alt).toBe("Völkl Mantra 102, top sheet view");
  });

  it("primaryImage respects the stored primary flag", () => {
    const p = primaryImage("SKI", "X", [img({ url: "a", view: "TOPSHEET" }), img({ url: "b", view: "LIFESTYLE", isPrimary: true })]);
    expect(p.url).toBe("b");
  });

  it("choosePrimary picks the best healthy image", () => {
    expect(choosePrimary([img({ url: "feed", view: "TOPSHEET" }), img({ url: "kit", view: "BASE", source: "MANUFACTURER_PRESS_KIT" })])).toBe(1);
    expect(choosePrimary([img({ brokenSince: new Date() })])).toBe(-1);
  });

  it("has a placeholder for every product kind", () => {
    for (const k of ["SKI", "SNOWBOARD", "SKI_BINDING", "SNOWBOARD_BINDING", "SKI_BOOT", "SNOWBOARD_BOOT"] as const) {
      expect(placeholderFor(k).url).toMatch(/^\/placeholders\/[a-z-]+\.svg$/);
    }
  });
});

describe("health check", () => {
  const fakeFetch = (status: number, type: string) =>
    (async () => new Response(null, { status, headers: { "content-type": type } })) as unknown as typeof fetch;

  it("passes a 200 image and fails 404s and non-images", async () => {
    expect((await checkImageUrl("https://x/a.jpg", fakeFetch(200, "image/jpeg"))).ok).toBe(true);
    expect(await checkImageUrl("https://x/a.jpg", fakeFetch(404, "text/html"))).toMatchObject({ ok: false, status: 404 });
    expect((await checkImageUrl("https://x/a.jpg", fakeFetch(200, "text/html"))).reason).toMatch(/Not an image/);
  });

  it("retries with GET when HEAD is refused", async () => {
    const calls: string[] = [];
    const f = (async (_u: string, init?: RequestInit) => {
      calls.push(init?.method ?? "GET");
      return init?.method === "HEAD"
        ? new Response(null, { status: 405 })
        : new Response(null, { status: 206, headers: { "content-type": "image/png" } });
    }) as unknown as typeof fetch;
    expect((await checkImageUrl("https://x/a.png", f)).ok).toBe(true);
    expect(calls).toEqual(["HEAD", "GET"]);
  });

  it("reports network errors instead of throwing", async () => {
    const f = (async () => {
      throw new Error("ECONNRESET");
    }) as unknown as typeof fetch;
    expect(await checkImageUrl("https://x/a.png", f)).toEqual({ ok: false, reason: "ECONNRESET" });
  });

  it("mapLimit keeps order and respects the limit", async () => {
    let active = 0;
    let peak = 0;
    const out = await mapLimit([1, 2, 3, 4, 5], 2, async (x) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return x * 2;
    });
    expect(out).toEqual([2, 4, 6, 8, 10]);
    expect(peak).toBe(2);
  });
});
