/** "Why this fits you": reasons tied to the rider's own answers. */
import { REGIONS } from "./regions";
import type { PrimaryScore } from "./score";
import type { SizeResult } from "./sizing";
import { ABILITY_LABEL, METAL } from "./tables";
import type { ComponentKey, EnginePrimary, Reason, RiderInput, RiderTargets, Terrain } from "./types";
import { fmtWeight } from "./units";
import { REASONS } from "./weights";

export type AveragePoints = Record<ComponentKey, number>;

const TERRAIN_LABEL: Record<Terrain, string> = {
  groomers: "groomers",
  trees: "trees",
  moguls: "bumps",
  park: "the park",
  steeps: "steeps",
  backcountry: "the backcountry",
};

const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);
const r1 = (x: number) => Math.round(x * 10) / 10;
const aOrAn = (word: string) => (/^[aeiou]/i.test(word) ? `an ${word}` : `a ${word}`);

function snowPlace(input: RiderInput) {
  return input.snowPreference ? "your preferred snow" : `${REGIONS[input.regionKey]?.label ?? "your region"} snow`;
}

export function buildReasons(
  p: EnginePrimary,
  input: RiderInput,
  t: RiderTargets,
  s: PrimaryScore,
  size: SizeResult,
  avg: AveragePoints,
): Reason[] {
  const out: Reason[] = [];
  const b = s.breakdown;
  const impact = (k: ComponentKey, bonus = 0) => b[k].points - avg[k] + bonus;
  const weight = fmtWeight(input.weightKg, input.units);
  const gear = p.kind === "SKI" ? "ski" : "board";
  const flexGap = p.flex - t.flexTarget;
  const metal = METAL.includes(p.laminate);

  // ── My Kit: these rank first when the product actually delivers the change ──
  for (const adj of t.kitAdjustments) {
    let text: string | null = null;
    if (adj.field === "flex" && adj.delta < 0 && flexGap <= 0.5) text = `${adj.because} → this ${gear} is softer (flex ${p.flex}/10)`;
    if (adj.field === "flex" && adj.delta > 0 && p.flex >= t.flexTarget - 0.5) text = `${adj.because} → this ${gear} is stiffer (flex ${p.flex}/10)`;
    if (adj.field === "waistMm" && adj.delta > 0 && p.kind === "SKI" && p.waistMm >= t.waistTargetMm - 3)
      text = `${adj.because} → its ${p.waistMm}mm waist floats better`;
    if (adj.field === "waistMm" && adj.delta < 0 && p.kind === "SKI" && p.waistMm <= t.waistTargetMm + 3)
      text = `${adj.because} → its ${p.waistMm}mm waist grips better on firm snow`;
    if (adj.field === "preferMetal" && adj.delta > 0 && metal) text = `${adj.because} → its metal laminate damps out the chatter`;
    if (text && !out.some((o) => o.text === text)) out.push({ text, component: "kit", impact: 100 });
  }

  // ── Skill ↔ flex ──
  if (metal && (input.style === "CHARGING" || input.weightKg >= 90)) {
    const who = input.style === "CHARGING" ? `Your ${weight} weight + charging style` : `At ${weight}`;
    out.push({ text: `${who} → its metal laminate keeps it stable at speed`, component: "skillFlex", impact: impact("skillFlex", 3) });
  } else if (input.weightKg <= 60 && p.flex <= t.flexTarget + 0.5) {
    out.push({ text: `At ${weight}, a ${p.flex}/10 flex is easy to bend into turns`, component: "skillFlex", impact: impact("skillFlex", 1) });
  } else if (Math.abs(flexGap) <= 1) {
    out.push({
      text: `Flex ${p.flex}/10 suits ${aOrAn(ABILITY_LABEL[input.ability])} rider at ${weight} (we aimed for ~${r1(t.flexTarget)})`,
      component: "skillFlex",
      impact: impact("skillFlex"),
    });
  }

  // ── Conditions ──
  const c = s.detail.conditions;
  const powderPct = Math.round(t.snowMix.powder * 100);
  const firmPct = Math.round(t.snowMix.hardpack_ice * 100);
  if (p.kind === "SKI" && c.width >= 0.8) {
    const detail = powderPct >= 40 ? `${powderPct}% powder` : firmPct >= 30 ? `${firmPct}% hardpack and ice` : "mixed conditions";
    out.push({ text: `${p.waistMm}mm waist suits ${snowPlace(input)} (${detail})`, component: "conditions", impact: impact("conditions") });
  }
  if (p.kind === "SNOWBOARD" && c.width >= 0.8) {
    const text =
      powderPct >= 40 && p.shape !== "TRUE_TWIN"
        ? `Directional shape${p.setbackMm >= 20 ? " with setback" : ""} floats in ${snowPlace(input)} (${powderPct}% powder)`
        : `Its shape suits ${snowPlace(input)}`;
    out.push({ text, component: "conditions", impact: impact("conditions") });
  }
  if (c.rocker >= 0.85) {
    const camber = p.kind === "SKI" ? p.rocker === "FULL_CAMBER" || p.rocker === "TIP_ROCKER_CAMBER" : p.profile === "CAMBER" || p.profile === "HYBRID_CAMBER";
    const text =
      camber && firmPct >= 25
        ? `Camber underfoot holds an edge on firm, icy days`
        : !camber && powderPct >= 35
          ? `Rocker helps it float and turn easily in soft snow`
          : `Its profile matches the snow you ride most`;
    out.push({ text, component: "conditions", impact: impact("conditions", -1) });
  }

  // ── Terrain & style ──
  const ts = s.detail.terrainStyle;
  if (ts.bestTerrains.length) {
    out.push({
      text: `Built for ${list(ts.bestTerrains.map((x) => TERRAIN_LABEL[x]))}, right where you like to ride`,
      component: "terrainStyle",
      impact: impact("terrainStyle"),
    });
  }
  if (Math.abs(ts.productAxis - t.styleAxis) <= 0.35) {
    const text =
      input.style === "PLAYFUL"
        ? `Loose, playful feel matches your surfy style`
        : input.style === "CHARGING"
          ? `Damp, stable build matches your charging style`
          : `Balanced feel: lively without getting nervous at speed`;
    out.push({ text, component: "terrainStyle", impact: impact("terrainStyle", -0.5) });
  }
  const twin = p.kind === "SKI" ? p.twinTip === "FULL_TWIN" : p.shape === "TRUE_TWIN";
  if (twin && input.terrain.includes("park")) {
    out.push({ text: `True twin shape for riding and landing switch in the park`, component: "terrainStyle", impact: impact("terrainStyle", 0.5) });
  }

  // ── Reviews & brand (never claim placeholder scores are reviews) ──
  if (!p.reviewsArePlaceholder && p.reviewScore !== null && p.reviewScore >= 85) {
    out.push({ text: `Reviewers rate it ${Math.round(p.reviewScore)}/100 across sources`, component: "review", impact: impact("review") });
  }
  if (p.brand.reputationScore >= 85) {
    out.push({ text: `${p.brand.name} has a strong durability and warranty record`, component: "brand", impact: impact("brand", -1) });
  }

  // ── Size ──
  if (Math.abs(size.delta) <= 2) {
    out.push({ text: `Comes in ${size.label}, right on your ~${size.targetCm} cm target`, component: "size", impact: 0.5 });
  }

  // Every candidate above is a true statement about this product. Prefer the
  // ones where it beats the average pick; top up so every card shows ≥ 2.
  const sorted = out.sort((a, b) => b.impact - a.impact);
  const positive = sorted.filter((r) => r.impact > 0);
  return positive.length >= REASONS.minPerPick ? positive : sorted.slice(0, Math.max(positive.length, REASONS.minPerPick));
}
