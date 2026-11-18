/** Step 0: turn survey answers + kit into numeric targets. */
import { estimateDin } from "./din";
import { kitEffects } from "./kit";
import { REGIONS } from "./regions";
import { ABILITY_INDEX, SKI_BOOT_FLEX, SKI_BOOT_LAST } from "./tables";
import type { ConflictNote, RiderInput, RiderTargets, SnowType, Terrain } from "./types";
import { clamp, usMensToMondo } from "./units";
import { BOARD_SIZE, CONDITIONS, FLEX, SETUP, SKI_LENGTH } from "./weights";

const SNOW_TYPES: SnowType[] = ["powder", "packed", "hardpack_ice", "spring_variable"];
const BALANCED_SNOW: Record<SnowType, number> = { powder: 0.25, packed: 0.35, hardpack_ice: 0.2, spring_variable: 0.2 };

export function resolveSnowMix(input: Pick<RiderInput, "regionKey" | "snowPreference">): Record<SnowType, number> {
  const pref = input.snowPreference;
  const prefSum = pref ? SNOW_TYPES.reduce((a, s) => a + (pref[s] ?? 0), 0) : 0;
  if (pref && prefSum > 0) {
    return Object.fromEntries(SNOW_TYPES.map((s) => [s, (pref[s] ?? 0) / prefSum])) as Record<SnowType, number>;
  }
  return { ...(REGIONS[input.regionKey]?.snow ?? BALANCED_SNOW) };
}

export function detectConflicts(input: RiderInput, snowMix: Record<SnowType, number>): ConflictNote[] {
  const out: ConflictNote[] = [];
  const beginner = input.ability === "BEGINNER";
  if (beginner && input.terrain.some((t) => t === "steeps" || t === "backcountry")) {
    out.push({
      code: "BEGINNER_STEEP_TERRAIN",
      message:
        "Steeps and backcountry are great goals! For now we've weighted your current skill level higher, so your gear helps you progress there safely.",
    });
  }
  if (beginner && input.style === "CHARGING") {
    out.push({
      code: "BEGINNER_CHARGING",
      message: "You like to go fast. Since you're newer to this, we favored forgiving gear that's still stable rather than stiff, race-style picks.",
    });
  }
  if (input.terrain.length > 0 && input.terrain.every((t) => t === "park") && snowMix.powder >= 0.45) {
    out.push({
      code: "PARK_ONLY_POWDER_REGION",
      message: "Your region gets a lot of powder. Check the quiver builder for a wider option for storm days.",
    });
  }
  return out;
}

/** Share of the rider's terrain list taken by `t` (0 if not selected). */
const terrainShare = (terrain: Terrain[], t: Terrain) => (terrain.includes(t) ? 1 / terrain.length : 0);

export function deriveTargets(input: RiderInput): RiderTargets {
  const abilityIndex = ABILITY_INDEX[input.ability];
  const snowMix = resolveSnowMix(input);
  const kit = kitEffects(input.kit, input.sport);
  const conflicts = detectConflicts(input, snowMix);
  const conflictMode = conflicts.some((c) => c.code === "BEGINNER_STEEP_TERRAIN" || c.code === "BEGINNER_CHARGING");

  // ── Flex ──
  const weightAdj = clamp(((input.weightKg - FLEX.referenceWeightKg) / 10) * FLEX.perTenKg, -FLEX.weightCap, FLEX.weightCap);
  let styleAdj: number = FLEX.styleAdj[input.style];
  let terrainAdj = 0;
  for (const t of Object.keys(FLEX.terrainAdj) as (keyof typeof FLEX.terrainAdj)[]) {
    terrainAdj += FLEX.terrainAdj[t] * terrainShare(input.terrain, t);
  }
  if (conflictMode) {
    // Skill wins: don't let "charging" or steep terrain stiffen a beginner's gear.
    styleAdj = Math.min(0, styleAdj);
    terrainAdj = Math.min(0, terrainAdj);
  }
  const flexTarget = clamp(FLEX.baseByAbility[input.ability] + weightAdj + styleAdj + terrainAdj + kit.flex, 1, 10);

  // ── Ski waist ──
  const waistTargetMm =
    SNOW_TYPES.reduce((a, s) => a + snowMix[s] * CONDITIONS.skiWaistIdeal[s].center, 0) + kit.waistMm;

  // ── Length ──
  let lengthTargetCm: number;
  if (input.sport === "SKI") {
    const typicalKg = 23 * (input.heightCm / 100) ** 2;
    const wAdj = clamp((input.weightKg - typicalKg) * SKI_LENGTH.cmPerKgOverTypical, -SKI_LENGTH.weightAdjCapCm, SKI_LENGTH.weightAdjCapCm);
    const style = conflictMode ? Math.min(0, SKI_LENGTH.styleAdjCm[input.style]) : SKI_LENGTH.styleAdjCm[input.style];
    lengthTargetCm = input.heightCm + SKI_LENGTH.heightOffsetByAbility[input.ability] + wAdj + style + kit.lengthCm;
  } else {
    const byWeight = BOARD_SIZE.weightBase.interceptCm + BOARD_SIZE.weightBase.cmPerKg * input.weightKg;
    const byHeight = input.heightCm * BOARD_SIZE.heightFactor;
    const style = conflictMode ? Math.min(0, BOARD_SIZE.styleAdjCm[input.style]) : BOARD_SIZE.styleAdjCm[input.style];
    lengthTargetCm =
      BOARD_SIZE.blend.weight * byWeight + BOARD_SIZE.blend.height * byHeight + BOARD_SIZE.abilityAdjCm[input.ability] + style + kit.lengthCm;
  }

  // ── Style axis ──
  const baseAxis = { PLAYFUL: -1, BALANCED: 0, CHARGING: 1 }[input.style];
  const styleAxis = clamp((conflictMode ? Math.min(0.3, baseAxis) : baseAxis) + kit.styleAxis, -1, 1);

  // ── Boots ──
  const mondo = usMensToMondo(input.boots.usMensSize);
  let bootFlexRange: [number, number];
  if (input.sport === "SKI") {
    const table = input.gender === "FEMALE" ? SKI_BOOT_FLEX.WOMENS : SKI_BOOT_FLEX.MENS;
    const [lo, hi] = table[input.ability];
    const raw = ((input.weightKg - FLEX.referenceWeightKg) / 15) * SETUP.bootWeightFlexPer15Kg;
    const adj = Math.round(clamp(raw, -SETUP.bootWeightFlexCap, SETUP.bootWeightFlexCap) / 5) * 5;
    bootFlexRange = [lo + adj, hi + adj];
  } else {
    bootFlexRange = [clamp(flexTarget - 1.5, 1, 10), clamp(flexTarget + 1.5, 1, 10)];
  }
  const issues = new Set([
    ...input.boots.fitIssues,
    ...input.kit.filter((k) => k.kind === "SKI_BOOT" || k.kind === "SNOWBOARD_BOOT").flatMap((k) => k.fitIssues ?? []),
  ]);
  const lastShift = (issues.has("FOREFOOT_PINCH") ? 1 : 0) - (issues.has("HEEL_LIFT") ? 1 : 0);
  const [lastLo, lastHi] = SKI_BOOT_LAST[input.boots.width];
  const bootLastRangeMm: [number, number] = [lastLo + lastShift, lastHi + lastShift];

  return {
    abilityIndex,
    snowMix,
    flexTarget,
    waistTargetMm,
    waistShiftMm: kit.waistMm,
    lengthTargetCm,
    needsWideBoard: input.sport === "SNOWBOARD" && input.boots.usMensSize >= BOARD_SIZE.wide.requiredAtUs,
    wideBoardPreferred: input.sport === "SNOWBOARD" && input.boots.usMensSize >= BOARD_SIZE.wide.preferredAtUs,
    styleAxis,
    prefs: kit.prefs,
    conflicts,
    conflictMode,
    dinEstimate:
      input.sport === "SKI"
        ? estimateDin({ weightKg: input.weightKg, heightCm: input.heightCm, ability: input.ability, style: input.style, ageRange: input.ageRange, mondo })
        : undefined,
    bootFlexRange,
    bootLastRangeMm,
    mondo,
    kitAdjustments: kit.adjustments,
  };
}
