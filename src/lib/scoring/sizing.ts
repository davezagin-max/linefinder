/** Step 1 (size part) + Step 5: pick a size, decide if it fits at all. */
import type { EngineBoard, EngineSki, RiderTargets } from "./types";
import { BOARD_SIZE, SIZE_FIT, SKI_LENGTH } from "./weights";

export interface SizeResult {
  eligible: boolean;
  label: string;
  lengthCm: number;
  targetCm: number;
  delta: number; // chosen size − target
  sizeFit: number; // 0.85–1 multiplier on the fit block
  note?: string;
  /** Why it was excluded (for "Why not this one?"). */
  reason?: string;
}

function sizeFitFor(absDelta: number, ideal: number, hard: number) {
  if (absDelta <= ideal) return 1;
  const t = Math.min(1, (absDelta - ideal) / (hard - ideal));
  return 1 - (1 - SIZE_FIT.minMultiplier) * t;
}

const round = (x: number) => Math.round(x);

export function skiTargetCm(ski: Pick<EngineSki, "category">, targets: RiderTargets) {
  return targets.lengthTargetCm + SKI_LENGTH.categoryAdjCm[ski.category];
}

export function sizeSki(ski: EngineSki, targets: RiderTargets, relaxed = false): SizeResult {
  const target = skiTargetCm(ski, targets);
  const hard = relaxed ? SKI_LENGTH.relaxedHardToleranceCm : SKI_LENGTH.hardToleranceCm;
  const lengths = [...ski.sizes].map((s) => s.lengthCm).sort((a, b) => a - b);
  if (!lengths.length) {
    return { eligible: false, label: "", lengthCm: 0, targetCm: round(target), delta: Infinity, sizeFit: 0, reason: "No sizes listed" };
  }
  const nearest = lengths.reduce((best, l) => (Math.abs(l - target) < Math.abs(best - target) ? l : best));
  const delta = nearest - target;
  const abs = Math.abs(delta);
  const result: SizeResult = {
    eligible: abs <= hard,
    label: `${nearest} cm`,
    lengthCm: nearest,
    targetCm: round(target),
    delta,
    sizeFit: abs <= hard ? sizeFitFor(abs, SKI_LENGTH.idealToleranceCm, hard) : 0,
  };
  if (!result.eligible) {
    result.reason = `Closest length is ${nearest} cm, ${round(abs)} cm ${delta > 0 ? "longer" : "shorter"} than your ~${round(target)} cm target`;
    return result;
  }
  // Two sizes close to target → explain the trade-off.
  const close = lengths.filter((l) => Math.abs(l - target) <= SKI_LENGTH.idealToleranceCm);
  if (close.length >= 2) {
    const [short, long] = [close[0]!, close[close.length - 1]!];
    result.note = `Between ${short} and ${long} cm: go ${short} for quicker turns, ${long} for more stability and float.`;
  }
  return result;
}

export function boardTargetCm(board: Pick<EngineBoard, "category">, targets: RiderTargets) {
  return targets.lengthTargetCm + BOARD_SIZE.categoryAdjCm[board.category];
}

export function sizeBoard(board: EngineBoard, targets: RiderTargets, weightKg: number, relaxed = false): SizeResult {
  const target = boardTargetCm(board, targets);
  const hard = relaxed ? BOARD_SIZE.hardToleranceCm * 1.5 : BOARD_SIZE.hardToleranceCm;
  const minWide = BOARD_SIZE.wide.minWideWaistMm;
  const fail = (reason: string): SizeResult => ({
    eligible: false, label: "", lengthCm: 0, targetCm: round(target), delta: Infinity, sizeFit: 0, reason,
  });
  if (!board.sizes.length) return fail("No sizes listed");

  let candidates = board.sizes;
  if (targets.needsWideBoard) {
    candidates = candidates.filter((s) => s.waistWidthMm >= minWide);
    if (!candidates.length) return fail(`No wide size (your boots need a ${minWide}mm+ waist to avoid toe and heel drag)`);
  } else {
    // Wide boards feel sluggish under smaller feet: use them only if nothing else exists.
    const regular = candidates.filter((s) => !s.isWide);
    if (regular.length) candidates = regular;
  }

  const slack = BOARD_SIZE.riderWeightSlack;
  const scored = candidates.map((s) => {
    const hasRange = !relaxed && s.riderWeightMinKg !== null && s.riderWeightMaxKg !== null;
    const inRange = hasRange && weightKg >= s.riderWeightMinKg! * (1 - slack) && weightKg <= s.riderWeightMaxKg! * (1 + slack);
    const delta = s.lengthCm - target;
    const eligible = hasRange ? inRange : Math.abs(delta) <= hard;
    return { s, delta, inRange, eligible };
  });
  const eligible = scored.filter((x) => x.eligible);
  if (!eligible.length) {
    const nearest = scored.reduce((a, b) => (Math.abs(b.delta) < Math.abs(a.delta) ? b : a));
    return fail(
      nearest.s.riderWeightMinKg !== null && !relaxed
        ? `Your weight is outside every size's recommended rider-weight range`
        : `Closest size is ${nearest.s.label}, ${round(Math.abs(nearest.delta))} cm off your ~${round(target)} cm target`,
    );
  }
  // Prefer sizes inside the manufacturer weight range, then the closest length.
  eligible.sort((a, b) => Number(b.inRange) - Number(a.inRange) || Math.abs(a.delta) - Math.abs(b.delta));
  const best = eligible[0]!;
  let sizeFit = sizeFitFor(Math.abs(best.delta), BOARD_SIZE.idealToleranceCm, hard);
  if (best.inRange) sizeFit = Math.max(sizeFit, SIZE_FIT.inManufacturerRangeFloor);
  if (targets.wideBoardPreferred && !targets.needsWideBoard && best.s.waistWidthMm < 255) sizeFit *= 0.95;

  const note = targets.needsWideBoard
    ? `Wide size: ${best.s.waistWidthMm}mm waist keeps your toes and heels from dragging.`
    : undefined;
  return {
    eligible: true,
    label: best.s.label,
    lengthCm: best.s.lengthCm,
    targetCm: round(target),
    delta: best.delta,
    sizeFit,
    note,
  };
}
