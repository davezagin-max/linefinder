/** "Why not this one?": explain why popular models ranked lower or dropped out. */
import type { ComponentKey, EnginePrimary, RiderTargets, ScoreBreakdown, WhyNot } from "./types";
import { BUDGET, RESULTS } from "./weights";

export interface Exclusion {
  kind: "SIZE" | "ABILITY" | "KIT" | "TERRAIN";
  text: string;
}

export interface WhyNotCandidate {
  product: EnginePrimary;
  rank: number | null; // 1-based position in the final list
  breakdown?: ScoreBreakdown;
  priceCents?: number;
  exclusion?: Exclusion;
}

const COMPONENTS: ComponentKey[] = ["skillFlex", "conditions", "terrainStyle", "review", "brand", "demographic"];
const dollars = (c: number) => `$${Math.round(c / 100).toLocaleString("en-US")}`;

function componentHeadline(k: ComponentKey, p: EnginePrimary, t: RiderTargets): { headline: string; detail: string } {
  const gear = p.kind === "SKI" ? "ski" : "board";
  switch (k) {
    case "skillFlex":
      if (p.flex > t.flexTarget + 1.5)
        return { headline: `Too much ${gear} for your level`, detail: `Flex ${p.flex}/10 vs. ~${t.flexTarget.toFixed(1)} that suits you` };
      if (p.flex < t.flexTarget - 1.5)
        return { headline: `Too soft for how you ride`, detail: `Flex ${p.flex}/10 vs. ~${t.flexTarget.toFixed(1)} that suits you` };
      return { headline: `Not matched to your level`, detail: `Built for ${p.abilityMin.toLowerCase()}–${p.abilityMax.toLowerCase()} riders` };
    case "conditions":
      if (p.kind === "SKI") {
        const dir = p.waistMm > t.waistTargetMm ? "wider" : "narrower";
        return { headline: `Built for different snow`, detail: `${p.waistMm}mm waist is ${dir} than ideal for your snow (~${Math.round(t.waistTargetMm)}mm)` };
      }
      return { headline: `Built for different snow`, detail: `Its shape and profile favor other conditions than yours` };
    case "terrainStyle":
      return { headline: `Built for a different style of riding`, detail: `Its strengths don't line up with your terrain and style picks` };
    case "review":
      return { headline: `Lower review scores`, detail: `Other picks score better with reviewers` };
    case "brand":
      return { headline: `Weaker brand track record`, detail: `Lower durability and warranty scores` };
    case "demographic":
      if (p.womensSpecific) return { headline: `A women's-specific model`, detail: `Built with a women's fit and flex in mind` };
      return { headline: `Less suited to riders like you`, detail: `Other picks match riders your age better` };
  }
}

export function explainWhyNot(
  candidates: WhyNotCandidate[],
  reference: ScoreBreakdown | undefined,
  t: RiderTargets,
  budgetCents: number | undefined,
): WhyNot[] {
  const out: WhyNot[] = [];
  for (const c of candidates) {
    if (!c.product.isPopular) continue;
    if (c.rank !== null && c.rank <= RESULTS.whyNotOutsideTop) continue;

    if (c.exclusion) {
      const headline =
        {
          SIZE: "No size that fits you",
          ABILITY: "Not built for your level",
          KIT: "Doesn't work with your current kit",
          TERRAIN: "Made for backcountry touring",
        }[c.exclusion.kind];
      out.push({ productId: c.product.id, rank: null, headline, details: [c.exclusion.text] });
      continue;
    }
    if (budgetCents !== undefined && c.priceCents !== undefined && c.priceCents > budgetCents * (1 + BUDGET.stretchMaxOver)) {
      out.push({
        productId: c.product.id,
        rank: c.rank,
        headline: "Over your budget",
        details: [`${dollars(c.priceCents)} is ${dollars(c.priceCents - budgetCents)} over your ${dollars(budgetCents)} budget`],
      });
      continue;
    }
    if (!c.breakdown || !reference) continue;
    const gaps = COMPONENTS.map((k) => ({ k, gap: reference[k].points - c.breakdown![k].points }))
      .filter((g) => g.gap > 0.25)
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 2);
    if (!gaps.length) continue;
    const first = componentHeadline(gaps[0]!.k, c.product, t);
    const details = gaps.map((g) => componentHeadline(g.k, c.product, t).detail);
    out.push({ productId: c.product.id, rank: c.rank, headline: first.headline, details });
  }
  return out.slice(0, RESULTS.whyNotMax);
}
