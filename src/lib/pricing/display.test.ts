import { describe, expect, it } from "vitest";
import { formatPrice, outboundLinkAttrs, priceComparison, timeAgo, type PriceRow } from "./display";

const NOW = new Date("2026-11-17T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000);
const row = (retailer: string, priceCents: number, over: Partial<PriceRow> = {}): PriceRow => ({
  retailer, priceCents, inStock: true, checkedAt: hoursAgo(3), affiliateUrl: `https://example.com/${retailer}`, ...over,
});

describe("priceComparison", () => {
  it("sorts lowest first and badges the cheapest in-stock offer", () => {
    const { rows, best } = priceComparison([row("B", 80000), row("A", 75000), row("C", 90000)], NOW);
    expect(rows.map((r) => r.retailer)).toEqual(["A", "B", "C"]);
    expect(rows.filter((r) => r.isBestPrice).map((r) => r.retailer)).toEqual(["A"]);
    expect(best?.retailer).toBe("A");
  });

  it("hides prices older than 7 days", () => {
    const { rows, hiddenStale } = priceComparison([row("A", 70000, { checkedAt: hoursAgo(24 * 8) }), row("B", 80000)], NOW);
    expect(rows.map((r) => r.retailer)).toEqual(["B"]);
    expect(hiddenStale).toBe(1);
  });

  it("puts out-of-stock offers after in-stock ones and never badges them", () => {
    const { rows } = priceComparison([row("Cheap", 50000, { inStock: false }), row("Pricier", 70000)], NOW);
    expect(rows.map((r) => [r.retailer, r.isBestPrice])).toEqual([["Pricier", true], ["Cheap", false]]);
  });

  it("has no Best Price when nothing is in stock", () => {
    const { rows, best } = priceComparison([row("A", 50000, { inStock: false })], NOW);
    expect(best).toBeUndefined();
    expect(rows[0]!.isBestPrice).toBe(false);
  });

  it("keeps one row per retailer and filters to the chosen size", () => {
    const { rows } = priceComparison(
      [row("A", 80000, { sizeLabel: "177" }), row("A", 70000, { sizeLabel: "184" }), row("B", 75000, { sizeLabel: "" })],
      NOW,
      { sizeLabel: "184" },
    );
    expect(rows.map((r) => [r.retailer, r.priceCents])).toEqual([["A", 70000], ["B", 75000]]);
  });

  it("computes savings and a 'last checked' label", () => {
    const { rows } = priceComparison([row("A", 75000, { listPriceCents: 95000 })], NOW);
    expect(rows[0]!.savingsCents).toBe(20000);
    expect(rows[0]!.lastChecked).toBe("3 hours ago");
  });
});

describe("affiliate links", () => {
  it("open in a new tab and are marked sponsored", () => {
    expect(outboundLinkAttrs("https://example.com/x?aff=1")).toEqual({
      href: "https://example.com/x?aff=1", target: "_blank", rel: "sponsored noopener", "data-affiliate": "true",
    });
  });

  it("refuses non-https and malformed URLs", () => {
    expect(outboundLinkAttrs("http://example.com")).toBeNull();
    expect(outboundLinkAttrs("javascript:alert(1)")).toBeNull();
    expect(outboundLinkAttrs("not a url")).toBeNull();
  });
});

describe("formatting", () => {
  it("formats prices", () => {
    expect(formatPrice(84995)).toBe("$849.95");
    expect(formatPrice(110000)).toBe("$1,100");
  });

  it("formats relative times", () => {
    expect(timeAgo(NOW, NOW)).toBe("just now");
    expect(timeAgo(hoursAgo(1), NOW)).toBe("1 hour ago");
    expect(timeAgo(hoursAgo(50), NOW)).toBe("2 days ago");
  });
});
