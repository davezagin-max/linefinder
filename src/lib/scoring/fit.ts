/** Step 3 "Fit to user" sub-scores (each 0–1). */
import {
  ABILITY_INDEX,
  BOARD_PROFILE_BY_SNOW,
  BOARD_SHAPE_BY_SNOW,
  BOARD_TERRAIN,
  METAL,
  SKI_ROCKER_BY_SNOW,
  SKI_TERRAIN,
  STYLE_TERMS,
} from "./tables";
import type { EnginePrimary, RiderInput, RiderTargets, SnowType, Terrain } from "./types";
import { clamp, clamp01 } from "./units";
import { CONDITIONS, FLEX, KIT_PREF_BONUS, TERRAIN_STYLE } from "./weights";

const SNOW_TYPES: SnowType[] = ["powder", "packed", "hardpack_ice", "spring_variable"];
const TERRAINS: Terrain[] = ["groomers", "trees", "moguls", "park", "steeps", "backcountry"];

// ───────────── Skill ↔ flex ─────────────

export function flexMatch(flex: number, target: number) {
  return Math.max(0, 1 - (Math.abs(flex - target) / FLEX.falloff) ** 1.5);
}

export function abilityRangeMatch(abilityIndex: number, p: Pick<EnginePrimary, "abilityMin" | "abilityMax">) {
  const lo = ABILITY_INDEX[p.abilityMin];
  const hi = ABILITY_INDEX[p.abilityMax];
  if (abilityIndex >= lo && abilityIndex <= hi) return 1;
  const off = abilityIndex < lo ? lo - abilityIndex : abilityIndex - hi;
  return off === 1 ? 0.5 : 0;
}

export function skillFlexScore(p: EnginePrimary, t: RiderTargets) {
  return FLEX.flexShare * flexMatch(p.flex, t.flexTarget) + (1 - FLEX.flexShare) * abilityRangeMatch(t.abilityIndex, p);
}

// ───────────── Conditions ↔ width / rocker ─────────────

/** 1 inside center ± halfWidth, linear to 0 over the next 20mm. */
export function waistBand(waist: number, center: number, halfWidth: number) {
  const out = Math.abs(waist - center) - halfWidth;
  return out <= 0 ? 1 : clamp01(1 - out / 20);
}

export function conditionsScore(p: EnginePrimary, t: RiderTargets) {
  const mix = t.snowMix;
  if (p.kind === "SKI") {
    const width = SNOW_TYPES.reduce((a, s) => {
      const ideal = CONDITIONS.skiWaistIdeal[s];
      return a + mix[s] * waistBand(p.waistMm, ideal.center + t.waistShiftMm, ideal.halfWidth);
    }, 0);
    let rocker = SNOW_TYPES.reduce((a, s) => a + mix[s] * SKI_ROCKER_BY_SNOW[s][p.rocker], 0);
    const camberish = p.rocker === "FULL_CAMBER" || p.rocker === "TIP_ROCKER_CAMBER";
    rocker += KIT_PREF_BONUS * (camberish ? t.prefs.camber : 0);
    rocker += KIT_PREF_BONUS * (p.rocker !== "FULL_CAMBER" ? t.prefs.tipRocker : -t.prefs.tipRocker);
    return { score: CONDITIONS.widthShare * width + (1 - CONDITIONS.widthShare) * clamp01(rocker), width, rocker: clamp01(rocker) };
  }
  let shape = SNOW_TYPES.reduce((a, s) => a + mix[s] * BOARD_SHAPE_BY_SNOW[s][p.shape], 0);
  if (p.setbackMm >= 20) shape += 0.1 * mix.powder; // setback floats the nose
  let profile = SNOW_TYPES.reduce((a, s) => a + mix[s] * BOARD_PROFILE_BY_SNOW[s][p.profile], 0);
  const camberish = p.profile === "CAMBER" || p.profile === "HYBRID_CAMBER";
  profile += KIT_PREF_BONUS * (camberish ? t.prefs.camber : -t.prefs.camber);
  return {
    score: CONDITIONS.widthShare * clamp01(shape) + (1 - CONDITIONS.widthShare) * clamp01(profile),
    width: clamp01(shape),
    rocker: clamp01(profile),
  };
}

// ───────────── Terrain & style ─────────────

const isLight = (p: EnginePrimary) =>
  p.laminate === "CARBON_FIBERGLASS" || (p.kind === "SKI" && p.category === "TOURING") || (p.kind === "SNOWBOARD" && p.category === "SPLITBOARD");

/** Category table + spec modifiers → 0–1 per terrain. */
export function terrainSuitability(p: EnginePrimary): Record<Terrain, number> {
  const base = { ...(p.kind === "SKI" ? SKI_TERRAIN[p.category] : BOARD_TERRAIN[p.category]) };
  if (p.kind === "SKI") {
    if (p.twinTip === "FULL_TWIN") base.park += 0.15;
    if (p.mountStyle === "CENTERED") base.park += 0.05;
  } else {
    if (p.shape === "TRUE_TWIN") base.park += 0.1;
    if (p.profile === "CAMBER" || p.profile === "HYBRID_CAMBER") base.groomers += 0.1;
  }
  if (p.laminate === "FULL_METAL") {
    base.groomers += 0.1;
    base.steeps += 0.1;
    base.moguls -= 0.1;
    base.trees -= 0.05;
  }
  if (isLight(p)) base.backcountry += 0.1;
  if (p.flex <= 5) {
    base.moguls += 0.1;
    base.trees += 0.05;
  }
  for (const k of TERRAINS) base[k] = clamp01(base[k]);
  return base;
}

/** −1 playful … +1 charging. */
export function productStyleAxis(p: EnginePrimary) {
  let s = ((p.flex - 5.5) / 4.5) * STYLE_TERMS.flexScale + STYLE_TERMS.laminate[p.laminate];
  if (p.kind === "SKI") {
    s += STYLE_TERMS.skiMount[p.mountStyle] + STYLE_TERMS.skiTwin[p.twinTip] + STYLE_TERMS.skiRocker[p.rocker];
  } else {
    s += STYLE_TERMS.boardProfile[p.profile] + STYLE_TERMS.boardShape[p.shape];
  }
  return clamp(s, -1, 1);
}

export function terrainStyleScore(p: EnginePrimary, input: Pick<RiderInput, "terrain">, t: RiderTargets) {
  const suit = terrainSuitability(p);
  const chosen: Terrain[] = input.terrain.length ? input.terrain : ["groomers"];
  // In conflict mode, aspirational steep/backcountry picks count half.
  const w = (x: Terrain) => (t.conflictMode && (x === "steeps" || x === "backcountry") ? 0.5 : 1);
  const totalW = chosen.reduce((a, x) => a + w(x), 0);
  const terrain = chosen.reduce((a, x) => a + w(x) * suit[x], 0) / totalW;

  const axis = productStyleAxis(p);
  let style = 1 - Math.abs(axis - t.styleAxis) / 2;
  style += KIT_PREF_BONUS * (METAL.includes(p.laminate) ? t.prefs.metal : -Math.max(0, t.prefs.metal) * 0.5);
  style += KIT_PREF_BONUS * (isLight(p) ? t.prefs.light : 0);
  style = clamp01(style);

  return {
    score: TERRAIN_STYLE.terrainShare * terrain + (1 - TERRAIN_STYLE.terrainShare) * style,
    terrain,
    style,
    productAxis: axis,
    bestTerrains: chosen.filter((x) => suit[x] >= 0.8),
  };
}
