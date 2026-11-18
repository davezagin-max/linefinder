import { describe, expect, it } from "vitest";
import { recommend } from "../scoring/engine";
import { demoCatalog, productSummaries, searchCatalog } from "./catalog";
import { referencedIds } from "../client/api";

const NOW = new Date("2026-11-17T12:00:00Z");

describe("browser demo catalog", () => {
  const cat = demoCatalog(NOW);

  it("attaches mock-feed prices to most products, including one stale retailer", () => {
    const all = [...cat.skis, ...cat.boards, ...cat.skiBindings, ...cat.boardBindings, ...cat.skiBoots, ...cat.boardBoots];
    expect(all.filter((p) => p.prices.length).length).toBeGreaterThan(all.length * 0.9);
    expect(all.flatMap((p) => p.prices).every((x) => x.retailer.endsWith("(Mock)") && x.affiliateUrl.startsWith("https://example.com/"))).toBe(true);
    expect(all.flatMap((p) => p.prices).some((x) => NOW.getTime() - x.checkedAt.getTime() > 7 * 86_400_000)).toBe(true);
  });

  it("is cached per day", () => {
    expect(demoCatalog(NOW)).toBe(cat);
  });

  it("searches like the server: accent-insensitive, every word must match, filtered by kind", () => {
    expect(searchCatalog(cat, "volkl kendo", ["SKI"]).map((h) => h.label)).toEqual(["Völkl Kendo 92"]);
    expect(searchCatalog(cat, "kendo", ["SNOWBOARD"])).toEqual([]);
    expect(searchCatalog(cat, "photon", ["SNOWBOARD_BOOT"]).map((h) => h.label)).toEqual(["Burton Photon BOA", "Burton Photon Step On"]);
    expect(searchCatalog(cat, " ", ["SKI"])).toEqual([]);
  });

  it("runs the engine and names every product the result mentions", () => {
    const result = recommend(
      {
        sport: "SKI", ability: "ADVANCED", heightCm: 180, weightKg: 84, regionKey: "wasatch", terrain: ["trees", "steeps"], style: "CHARGING",
        daysPerSeason: 25, budget: { mode: "TOTAL", totalCents: 180000 }, boots: { usMensSize: 10, width: "MEDIUM", fitIssues: [] }, kit: [], kitMode: "FRESH_START",
      },
      cat,
      NOW,
    );
    expect(result.picks.some((p) => !p.price.isMsrp)).toBe(true);
    const ids = referencedIds(result);
    const names = productSummaries(cat, ids);
    expect(Object.keys(names).length).toBe(ids.size);
  });
});
