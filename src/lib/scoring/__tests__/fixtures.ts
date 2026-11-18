/** Small, explicit fixtures for engine unit tests. */
import type {
  EngineBoard,
  EngineBoardBinding,
  EngineBoardBoot,
  EngineCatalog,
  EngineProductBase,
  EngineSki,
  EngineSkiBinding,
  EngineSkiBoot,
  RiderInput,
} from "../types";

export const NOW = new Date("2026-11-17T12:00:00Z");
export const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000);

let n = 0;
function base(over: Partial<EngineProductBase> = {}): EngineProductBase {
  n += 1;
  return {
    id: `p${n}`,
    slug: `p${n}`,
    brand: { name: "TestBrand", reputationScore: 80 },
    model: `Model ${n}`,
    modelYear: 2025,
    msrpCents: 80000,
    womensSpecific: false,
    abilityMin: "INTERMEDIATE",
    abilityMax: "EXPERT",
    isPopular: false,
    reviewScore: 80,
    reviewsArePlaceholder: false,
    prices: [],
    ...over,
  };
}

export function ski(over: Partial<EngineSki> = {}): EngineSki {
  const waist = over.waistMm ?? 96;
  return {
    ...base(over),
    kind: "SKI",
    category: "ALL_MOUNTAIN",
    rocker: "TIP_TAIL_ROCKER_CAMBER",
    flex: 7,
    laminate: "PARTIAL_METAL",
    twinTip: "NONE",
    mountPointCm: -10,
    mountStyle: "TRADITIONAL",
    waistMm: waist,
    radiusM: 18,
    sizes: [163, 170, 177, 184, 191].map((lengthCm) => ({ lengthCm, waistMm: waist })),
    ...over,
  };
}

export function board(over: Partial<EngineBoard> = {}): EngineBoard {
  return {
    ...base(over),
    kind: "SNOWBOARD",
    category: "ALL_MOUNTAIN",
    profile: "HYBRID_CAMBER",
    shape: "DIRECTIONAL_TWIN",
    flex: 6,
    laminate: "FIBERGLASS",
    setbackMm: 10,
    taperMm: 0,
    insertPattern: "FOUR_X_FOUR",
    sizes: [
      { label: "152", lengthCm: 152, waistWidthMm: 249, isWide: false, riderWeightMinKg: null, riderWeightMaxKg: null },
      { label: "156", lengthCm: 156, waistWidthMm: 252, isWide: false, riderWeightMinKg: null, riderWeightMaxKg: null },
      { label: "160", lengthCm: 160, waistWidthMm: 255, isWide: false, riderWeightMinKg: null, riderWeightMaxKg: null },
      { label: "160W", lengthCm: 160, waistWidthMm: 262, isWide: true, riderWeightMinKg: null, riderWeightMaxKg: null },
    ],
    ...over,
  };
}

export function skiBinding(over: Partial<EngineSkiBinding> = {}): EngineSkiBinding {
  return {
    ...base({ msrpCents: 35000, ...over }),
    kind: "SKI_BINDING",
    type: "ALPINE",
    dinMin: 4,
    dinMax: 13,
    brakeWidthsMm: [90, 100, 110],
    soleCompat: ["ALPINE_ISO5355", "GRIPWALK"],
    hasWalkMode: false,
    ...over,
  };
}

export function boardBinding(over: Partial<EngineBoardBinding> = {}): EngineBoardBinding {
  return {
    ...base({ msrpCents: 28000, ...over }),
    kind: "SNOWBOARD_BINDING",
    flex: 6,
    entry: "STRAP",
    mountCompat: ["FOUR_X_FOUR", "TWO_X_FOUR", "CHANNEL"],
    sizeRanges: [
      { label: "M", usMin: 7, usMax: 10.5 },
      { label: "L", usMin: 11, usMax: 14 },
    ],
    stepOnSystem: null,
    ...over,
  };
}

export function skiBoot(over: Partial<EngineSkiBoot> = {}): EngineSkiBoot {
  return {
    ...base({ msrpCents: 70000, ...over }),
    kind: "SKI_BOOT",
    flex: 110,
    lastWidthMm: 100,
    soleNorm: "GRIPWALK",
    mondoMin: 24.5,
    mondoMax: 32.5,
    hasWalkMode: false,
    ...over,
  };
}

export function boardBoot(over: Partial<EngineBoardBoot> = {}): EngineBoardBoot {
  return {
    ...base({ msrpCents: 35000, ...over }),
    kind: "SNOWBOARD_BOOT",
    flex: 6,
    usSizeMin: 7,
    usSizeMax: 14,
    wideAvailable: false,
    stepOnSystem: null,
    reducedFootprint: false,
    ...over,
  };
}

export function rider(over: Partial<RiderInput> = {}): RiderInput {
  return {
    sport: "SKI",
    ability: "INTERMEDIATE",
    heightCm: 178,
    weightKg: 75,
    regionKey: "colorado",
    terrain: ["groomers"],
    style: "BALANCED",
    daysPerSeason: 20,
    budget: { mode: "SEPARATE" },
    boots: { usMensSize: 10, width: "MEDIUM", fitIssues: [] },
    kit: [],
    kitMode: "FRESH_START",
    ...over,
  };
}

export function catalog(over: Partial<EngineCatalog> = {}): EngineCatalog {
  return { skis: [], boards: [], skiBindings: [], boardBindings: [], skiBoots: [], boardBoots: [], ...over };
}
