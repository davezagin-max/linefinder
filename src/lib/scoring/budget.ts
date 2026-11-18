/** Step 2: prices, budget split, in-budget ranking, stretch picks, best value. */
import type { EngineProductBase, ResolvedPrice, RiderInput } from "./types";
import { BUDGET, RESULTS } from "./weights";

const DAY = 86_400_000;

/** Lowest fresh (≤7 days) price, in-stock first; else MSRP. */
export function resolvePrice(p: Pick<EngineProductBase, "prices" | "msrpCents">, now: Date): ResolvedPrice {
  const fresh = p.prices.filter((x) => (now.getTime() - x.checkedAt.getTime()) / DAY <= BUDGET.priceMaxAgeDays);
  const pool = fresh.some((x) => x.inStock) ? fresh.filter((x) => x.inStock) : fresh;
  if (!pool.length) return { cents: p.msrpCents, isMsrp: true };
  const best = pool.reduce((a, b) => (b.priceCents < a.priceCents ? b : a));
  return { cents: best.priceCents, isMsrp: false, retailer: best.retailer, inStock: best.inStock, checkedAt: best.checkedAt };
}

export interface Budgets {
  primary?: number;
  binding?: number;
  boot?: number;
}

/**
 * TOTAL budgets are split by sport (ski 50/20/30, board 50/25/25). Shares
 * for bindings/boots the rider is keeping (My Kit) go to the other items.
 */
export function splitBudget(input: Pick<RiderInput, "budget" | "sport" | "kit">): Budgets {
  if (input.budget.mode === "SEPARATE") {
    const { primaryCents, bindingCents, bootCents } = input.budget;
    return { primary: primaryCents, binding: bindingCents, boot: bootCents };
  }
  const split = { ...BUDGET.totalSplit[input.sport] };
  const bindingKind = input.sport === "SKI" ? "SKI_BINDING" : "SNOWBOARD_BINDING";
  const bootKind = input.sport === "SKI" ? "SKI_BOOT" : "SNOWBOARD_BOOT";
  const keeps = (kind: string) => input.kit.some((k) => k.kind === kind && k.intent === "KEEP");
  const shares: Record<keyof typeof split, number> = { ...split };
  if (keeps(bootKind)) shares.boot = 0;
  if (keeps(bindingKind)) shares.binding = 0;
  const sum = shares.primary + shares.binding + shares.boot;
  const total = input.budget.totalCents;
  return {
    primary: Math.round((total * shares.primary) / sum),
    binding: shares.binding ? Math.round((total * shares.binding) / sum) : undefined,
    boot: shares.boot ? Math.round((total * shares.boot) / sum) : undefined,
  };
}

export interface Priced {
  total: number;
  price: ResolvedPrice;
}

/**
 * In-budget items first (by score). Up to 2 stretch picks (≤ 115% of budget)
 * that outscore the #10 in-budget pick are shown right after the top 3.
 * If nothing is within reach, budget is dropped (relaxedBudget = true).
 */
export function rankWithBudget<T extends Priced>(
  scored: T[],
  budgetCents: number | undefined,
): { list: (T & { stretch: boolean })[]; relaxedBudget: boolean } {
  const byScore = [...scored].sort((a, b) => b.total - a.total);
  const plain = (xs: T[]) => xs.map((x) => ({ ...x, stretch: false }));
  if (budgetCents === undefined) return { list: plain(byScore).slice(0, RESULTS.listSize), relaxedBudget: false };

  const inBudget = byScore.filter((x) => x.price.cents <= budgetCents);
  const stretchCap = budgetCents * (1 + BUDGET.stretchMaxOver);
  const threshold = inBudget[9]?.total ?? inBudget.at(-1)?.total ?? -Infinity;
  const stretch = byScore
    .filter((x) => x.price.cents > budgetCents && x.price.cents <= stretchCap && x.total > threshold)
    .slice(0, BUDGET.maxStretchPicks)
    .map((x) => ({ ...x, stretch: true }));

  if (!inBudget.length && !stretch.length) {
    return { list: plain(byScore).slice(0, RESULTS.listSize), relaxedBudget: true };
  }
  const n = RESULTS.stretchInsertAfter;
  const ib = plain(inBudget);
  return { list: [...ib.slice(0, n), ...stretch, ...ib.slice(n)].slice(0, RESULTS.listSize), relaxedBudget: false };
}

/** Index of the best score-per-dollar among picks scoring ≥ 75, or -1. */
export function bestValueIndex(list: Priced[]): number {
  let best = -1;
  let bestRatio = 0;
  list.forEach((x, i) => {
    if (x.total < RESULTS.bestValueMinScore || x.price.cents <= 0) return;
    const ratio = x.total / x.price.cents;
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = i;
    }
  });
  return best;
}
