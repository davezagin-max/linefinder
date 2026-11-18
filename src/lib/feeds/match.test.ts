import { describe, expect, it } from "vitest";
import { createMatcher, extractYears, kindHints, normalizeSize, type MatchableProduct } from "./match";
import type { FeedOffer } from "./types";

const P = (slug: string, kind: MatchableProduct["kind"], brandSlug: string, brandName: string, model: string, modelYear = 2025): MatchableProduct => ({
  id: slug, slug, kind, brandSlug, brandName, model, modelYear,
});

const products = [
  P("volkl-mantra-102-2025", "SKI", "volkl", "Völkl", "Mantra 102"),
  P("k2-mindbender-99ti-2025", "SKI", "k2", "K2", "Mindbender 99Ti"),
  P("blizzard-black-pearl-88-2025", "SKI", "blizzard", "Blizzard", "Black Pearl 88"),
  P("blizzard-black-pearl-82-2025", "SKI", "blizzard", "Blizzard", "Black Pearl 82"),
  P("elan-ripstick-96-2025", "SKI", "elan", "Elan", "Ripstick 96"),
  P("elan-ripstick-94-w-2025", "SKI", "elan", "Elan", "Ripstick 94 W"),
  P("nordica-enforcer-94-2025", "SKI", "nordica", "Nordica", "Enforcer 94"),
  P("nordica-enforcer-104-free-2025", "SKI", "nordica", "Nordica", "Enforcer 104 Free"),
  P("burton-photon-boa-2025", "SNOWBOARD_BOOT", "burton", "Burton", "Photon BOA"),
  P("burton-photon-step-on-2025", "SNOWBOARD_BOOT", "burton", "Burton", "Photon Step On"),
  P("salomon-assassin-2025", "SNOWBOARD", "salomon", "Salomon", "Assassin"),
  P("lib-tech-orca-2025", "SNOWBOARD", "lib-tech", "Lib Tech", "Orca"),
  P("salomon-s-pro-supra-boa-120-2025", "SKI_BOOT", "salomon", "Salomon", "S/Pro Supra BOA 120"),
];

const offer = (name: string, over: Partial<FeedOffer> = {}): FeedOffer => ({
  network: "MOCK", advertiserId: "a1", retailerName: "R", sku: name, name, priceCents: 1000, currency: "USD",
  inStock: true, affiliateUrl: "https://example.com", imageUrls: [], updatedAt: new Date(), ...over,
});

const match = createMatcher(products, { "MOCK:a1:weird-sku": "lib-tech-orca-2025" });
const id = (name: string, over?: Partial<FeedOffer>) => match(offer(name, over))?.productId ?? null;

describe("offer matching", () => {
  it("handles accents, casing and season formats", () => {
    expect(id("Völkl Mantra 102 Skis 2026")).toBe("volkl-mantra-102-2025");
    expect(id("Volkl Mantra 102 Skis - 25/26")).toBe("volkl-mantra-102-2025");
    expect(id("VÖLKL MANTRA 102")).toBe("volkl-mantra-102-2025");
    expect(id("Voelkl Mantra 102 Ski 2025/2026")).toBe("volkl-mantra-102-2025");
  });

  it("uses the feed's brand field when the name has no brand", () => {
    expect(id("Mantra 102 Skis", { brand: "Völkl" })).toBe("volkl-mantra-102-2025");
    expect(id("Orca Snowboard", { brand: "Lib Technologies" })).toBe("lib-tech-orca-2025");
  });

  it("never confuses models that differ by a number", () => {
    expect(id("K2 Mindbender 108Ti Skis 2026")).toBeNull();
    expect(id("Blizzard Black Pearl 82 Skis")).toBe("blizzard-black-pearl-82-2025");
    expect(id("Nordica Enforcer 104 Free Skis")).toBe("nordica-enforcer-104-free-2025");
  });

  it("maps women's markers to 'W' models and requires them", () => {
    expect(id("Elan Ripstick 94 Skis - Women's")).toBe("elan-ripstick-94-w-2025");
    expect(id("Elan Ripstick 94 W Skis")).toBe("elan-ripstick-94-w-2025");
    expect(id("Elan Ripstick 94 Skis")).toBeNull();
  });

  it("rejects other seasons and other product types", () => {
    expect(id("Völkl Mantra 102 Skis 2021")).toBeNull();
    expect(id("Salomon Assassin Snowboard Bindings")).toBeNull();
    expect(id("Salomon Assassin Snowboard 2026")).toBe("salomon-assassin-2025");
  });

  it("picks the right variant when one model name contains another's", () => {
    expect(id("Burton Photon Step On Snowboard Boots")).toBe("burton-photon-step-on-2025");
    expect(id("Burton Photon BOA Snowboard Boots")).toBe("burton-photon-boa-2025");
  });

  it("normalizes punctuation in model names", () => {
    expect(id("Salomon S/PRO SUPRA BOA 120 Ski Boots 2026")).toBe("salomon-s-pro-supra-boa-120-2025");
  });

  it("leaves unknown brands and other gear unmatched", () => {
    expect(id("Smith Squad MAG Goggles")).toBeNull();
    expect(id("Generic Mantra 102 Skis")).toBeNull();
    expect(id("Völkl Mantra 102 Skis Black Red Limited Edition Pro Model")).toBeNull();
  });

  it("manual mappings win", () => {
    expect(match(offer("Totally different name", { sku: "weird-sku" }))).toEqual({
      productId: "lib-tech-orca-2025", sizeLabel: "", method: "MAPPING",
    });
  });

  it("returns the variant size", () => {
    expect(match(offer("Völkl Mantra 102 Skis", { size: "184 cm" }))?.sizeLabel).toBe("184");
    expect(match(offer("Lib Tech Orca Snowboard", { size: "159 Wide" }))?.sizeLabel).toBe("159W");
  });
});

describe("helpers", () => {
  it("extractYears understands common season formats", () => {
    expect([...extractYears("Skis 2025/2026").years]).toEqual([2025, 2026]);
    expect([...extractYears("Skis - 25/26").years]).toEqual([2025, 2026]);
    expect([...extractYears("Skis 2025-26").years]).toEqual([2025, 2026]);
    expect([...extractYears("Skis 2026").years]).toEqual([2026]);
    expect([...extractYears("Ripstick 94/96 combo").years]).toEqual([]);
  });

  it("kindHints reads product type words", () => {
    expect([...kindHints("Burton Cartel Snowboard Bindings")]).toEqual(["SNOWBOARD_BINDING"]);
    expect([...kindHints("Look Pivot 15 Ski Bindings")]).toEqual(["SKI_BINDING"]);
    expect([...kindHints("Jones Frontier Snowboard")]).toEqual(["SNOWBOARD"]);
    expect([...kindHints("Mystery Thing")]).toEqual([]);
  });

  it("normalizeSize", () => {
    expect(normalizeSize("184cm")).toBe("184");
    expect(normalizeSize("158W")).toBe("158W");
    expect(normalizeSize("27.5")).toBe("27.5");
    expect(normalizeSize(undefined)).toBe("");
  });
});
