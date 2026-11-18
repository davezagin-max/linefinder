/** Step 6: bindings and boots that match a chosen ski/board, the rider and their kit. */
import { abilityRangeMatch } from "./fit";
import { resolvePrice } from "./budget";
import type { SizeResult } from "./sizing";
import type {
  EngineBoard,
  EngineCatalog,
  EnginePrimary,
  EngineProductBase,
  EngineSki,
  RiderInput,
  RiderTargets,
  SetupPick,
} from "./types";
import { clamp01 } from "./units";
import { SETUP } from "./weights";

interface SetupContext {
  input: RiderInput;
  t: RiderTargets;
  now: Date;
  bindingBudget?: number;
  bootBudget?: number;
}

const keeps = (input: RiderInput, kind: string) => input.kit.filter((k) => k.kind === kind && k.intent === "KEEP");

type Candidate = SetupPick & { fit: number };

function finish(
  p: EngineProductBase,
  fit: number,
  ctx: SetupContext,
  budget: number | undefined,
  reasons: string[],
  sizeLabel?: string,
): Candidate {
  const w = SETUP.weights;
  const review = (p.reviewScore ?? 72) / 100;
  const total = 100 * (w.fit * fit + w.review * review + w.brand * (p.brand.reputationScore / 100));
  const price = resolvePrice(p, ctx.now);
  return { productId: p.id, total, fit, sizeLabel, price, inBudget: budget === undefined || price.cents <= budget, reasons };
}

/**
 * Good fits within budget first, then by score; top N. A cheap item that
 * fits poorly never jumps ahead of a well-fitting one just for being cheap.
 */
function topPicks(xs: Candidate[]): SetupPick[] {
  const preferred = (c: Candidate) => c.inBudget && c.fit >= SETUP.goodFit;
  return xs
    .sort((a, b) => Number(preferred(b)) - Number(preferred(a)) || b.total - a.total)
    .slice(0, SETUP.perPick)
    .map(({ fit: _fit, ...pick }) => pick);
}

function waistAtSize(ski: EngineSki, size: SizeResult) {
  return ski.sizes.find((s) => s.lengthCm === size.lengthCm)?.waistMm ?? ski.waistMm;
}

export function matchSkiBindings(ski: EngineSki, size: SizeResult, catalog: EngineCatalog, ctx: SetupContext): SetupPick[] {
  if (keeps(ctx.input, "SKI_BINDING").length) return [];
  const din = ctx.t.dinEstimate!;
  const waist = waistAtSize(ski, size);
  const keptSole = keeps(ctx.input, "SKI_BOOT").find((k) => k.soleNorm)?.soleNorm;
  const sole = keptSole ?? "GRIPWALK"; // recommended boots ship with GripWalk soles
  const backcountry = ctx.input.terrain.includes("backcountry");
  const out: Candidate[] = [];
  for (const b of catalog.skiBindings) {
    const brake = [...b.brakeWidthsMm].sort((x, y) => x - y).find((w) => w >= waist && w <= waist + SETUP.brakeMaxOverWaistMm);
    if (brake === undefined) continue;
    if (!b.soleCompat.includes(sole)) continue;
    if (din.value < b.dinMin || din.value > b.dinMax) continue;
    if (abilityRangeMatch(ctx.t.abilityIndex, b) === 0) continue;
    const dinFit = b.dinMax - din.value >= SETUP.dinHeadroom ? 1 : 0.6;
    const touring = backcountry ? (b.hasWalkMode ? 1 : 0.3) : b.type === "ALPINE" ? 1 : 0.6;
    const fit = 0.4 * dinFit + 0.3 * abilityRangeMatch(ctx.t.abilityIndex, b) + 0.3 * touring;
    const reasons = [
      `${brake}mm brake fits the ${waist}mm waist`,
      `DIN ${b.dinMin}–${b.dinMax} covers your estimated ${din.low}–${din.high}`,
    ];
    if (keptSole) reasons.push(`Works with the boots you're keeping`);
    if (backcountry && b.hasWalkMode) reasons.push(`Walk mode for skinning uphill`);
    out.push(finish(b, fit, ctx, ctx.bindingBudget, reasons, `${brake}mm brake`));
  }
  return topPicks(out);
}

export function matchBoardBindings(board: EngineBoard, catalog: EngineCatalog, ctx: SetupContext): SetupPick[] {
  if (keeps(ctx.input, "SNOWBOARD_BINDING").length) return [];
  const us = ctx.input.boots.usMensSize;
  const out: Candidate[] = [];
  for (const b of catalog.boardBindings) {
    if (b.entry === "STEP_ON") continue; // step-on needs matching boots; not auto-paired
    if (!b.mountCompat.includes(board.insertPattern)) continue;
    const size = b.sizeRanges.find((r) => us >= r.usMin && us <= r.usMax);
    if (!size) continue;
    const d = Math.abs(b.flex - board.flex);
    if (d > SETUP.boardBindingFlexHardLimit || abilityRangeMatch(ctx.t.abilityIndex, b) === 0) continue;
    const flexFit = d <= SETUP.boardBindingFlexTolerance ? 1 : 1 - ((d - SETUP.boardBindingFlexTolerance) / 1.5) * 0.5;
    const fit = 0.6 * flexFit + 0.4 * abilityRangeMatch(ctx.t.abilityIndex, b);
    const reasons = [`Flex ${b.flex}/10 pairs with the board's ${board.flex}/10`, `Size ${size.label} fits US ${us} boots`];
    if (board.insertPattern === "CHANNEL") reasons.push(`Mounts on the Channel insert system`);
    out.push(finish(b, fit, ctx, ctx.bindingBudget, reasons, size.label));
  }
  return topPicks(out);
}

export function matchSkiBoots(catalog: EngineCatalog, ctx: SetupContext): SetupPick[] {
  if (keeps(ctx.input, "SKI_BOOT").length) return [];
  const { t, input } = ctx;
  const [fLo, fHi] = t.bootFlexRange;
  const [lLo, lHi] = t.bootLastRangeMm;
  const backcountry = input.terrain.includes("backcountry");
  const out: Candidate[] = [];
  for (const b of catalog.skiBoots) {
    if (t.mondo < b.mondoMin || t.mondo > b.mondoMax) continue;
    const flexDist = b.flex < fLo ? fLo - b.flex : b.flex > fHi ? b.flex - fHi : 0;
    if (flexDist > SETUP.bootFlexHardLimit || abilityRangeMatch(t.abilityIndex, b) === 0) continue;
    const lastDist = b.lastWidthMm < lLo ? lLo - b.lastWidthMm : b.lastWidthMm > lHi ? b.lastWidthMm - lHi : 0;
    const flexFit = clamp01(1 - flexDist / 20);
    const lastFit = clamp01(1 - lastDist / 3);
    const gender =
      input.gender === "FEMALE" ? (b.womensSpecific ? 1 : 0.8) : input.gender === "MALE" ? (b.womensSpecific ? 0.4 : 1) : 1;
    const walk = backcountry ? (b.hasWalkMode ? 1 : 0.5) : 1;
    const fit = 0.35 * flexFit + 0.35 * lastFit + 0.1 * gender + 0.1 * walk + 0.1 * abilityRangeMatch(t.abilityIndex, b);
    const reasons = [`Flex ${b.flex} is in your ${fLo}–${fHi} range`, `${b.lastWidthMm}mm last suits your ${input.boots.width.toLowerCase()} feet`];
    if (flexDist > 0) reasons[0] = `Flex ${b.flex} is close to your ${fLo}–${fHi} range`;
    if (lastDist > 0) reasons[1] = `${b.lastWidthMm}mm last is near your ideal ${lLo}–${lHi}mm`;
    if (backcountry && b.hasWalkMode) reasons.push(`Walk mode for touring`);
    out.push(finish(b, fit, ctx, ctx.bootBudget, reasons, `Mondo ${t.mondo}`));
  }
  return topPicks(out);
}

export function matchBoardBoots(board: EngineBoard, catalog: EngineCatalog, ctx: SetupContext): SetupPick[] {
  if (keeps(ctx.input, "SNOWBOARD_BOOT").length) return [];
  const { t, input } = ctx;
  const us = input.boots.usMensSize;
  const out: Candidate[] = [];
  for (const b of catalog.boardBoots) {
    if (b.stepOnSystem) continue; // step-on boots need step-on bindings; not auto-paired
    if (us < b.usSizeMin || us > b.usSizeMax) continue;
    const d = Math.abs(b.flex - board.flex);
    if (d > SETUP.boardBindingFlexHardLimit || abilityRangeMatch(t.abilityIndex, b) === 0) continue;
    const flexFit = d <= 1.5 ? 1 : clamp01(1 - (d - 1.5) / 3);
    const width = input.boots.width === "WIDE" ? (b.wideAvailable ? 1 : 0.6) : 1;
    const footprint = t.needsWideBoard ? (b.reducedFootprint ? 1 : 0.8) : 1;
    const gender =
      input.gender === "FEMALE" ? (b.womensSpecific ? 1 : 0.8) : input.gender === "MALE" ? (b.womensSpecific ? 0.4 : 1) : 1;
    const fit = 0.45 * flexFit + 0.15 * width + 0.1 * footprint + 0.15 * gender + 0.15 * abilityRangeMatch(t.abilityIndex, b);
    const reasons = [`Flex ${b.flex}/10 pairs with the board's ${board.flex}/10`];
    if (input.boots.width === "WIDE" && b.wideAvailable) reasons.push(`Comes in a wide fit`);
    if (t.needsWideBoard && b.reducedFootprint) reasons.push(`Trim footprint helps prevent toe drag`);
    out.push(finish(b, fit, ctx, ctx.bootBudget, reasons, `US ${us}`));
  }
  return topPicks(out);
}

export function matchSetup(primary: EnginePrimary, size: SizeResult, catalog: EngineCatalog, ctx: SetupContext) {
  if (primary.kind === "SKI") {
    return { bindings: matchSkiBindings(primary, size, catalog, ctx), boots: matchSkiBoots(catalog, ctx) };
  }
  return { bindings: matchBoardBindings(primary, catalog, ctx), boots: matchBoardBoots(primary, catalog, ctx) };
}
