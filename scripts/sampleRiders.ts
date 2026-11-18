/** Sample riders shared by `npm run engine:try` and the engine integration tests. */
import type { RiderInput } from "../src/lib/scoring/types";
import { ftInToCm, lbsToKg } from "../src/lib/scoring/units";

const base = {
  kit: [],
  kitMode: "FRESH_START",
  daysPerSeason: 20,
  boots: { usMensSize: 10, width: "MEDIUM", fitIssues: [] },
} as const satisfies Partial<RiderInput>;

export const SAMPLE_RIDERS = {
  wasatch: {
    ...base, sport: "SKI", ability: "ADVANCED", heightCm: ftInToCm(5, 11), weightKg: lbsToKg(185), ageRange: "35_44", gender: "MALE",
    regionKey: "wasatch", terrain: ["trees", "steeps", "groomers"], style: "CHARGING",
    budget: { mode: "TOTAL", totalCents: 180000 },
  },
  "ne-beginner": {
    ...base, sport: "SKI", ability: "BEGINNER", heightCm: ftInToCm(5, 5), weightKg: lbsToKg(130), gender: "FEMALE",
    regionKey: "northeast", terrain: ["groomers"], style: "BALANCED",
    budget: { mode: "SEPARATE", primaryCents: 70000 }, boots: { usMensSize: 7, width: "WIDE", fitIssues: ["FOREFOOT_PINCH"] },
  },
  "park-kid": {
    ...base, sport: "SNOWBOARD", ability: "EXPERT", heightCm: 178, weightKg: 70, ageRange: "18_24",
    regionKey: "colorado", terrain: ["park", "groomers"], style: "PLAYFUL",
    budget: { mode: "SEPARATE", primaryCents: 55000 }, snowboard: { stance: "GOOFY" },
  },
  "big-feet": {
    ...base, sport: "SNOWBOARD", ability: "INTERMEDIATE", heightCm: 190, weightKg: 95,
    regionKey: "pnw", terrain: ["trees", "groomers"], style: "BALANCED",
    budget: { mode: "TOTAL", totalCents: 120000 }, boots: { usMensSize: 12, width: "WIDE", fitIssues: [] },
  },
  "kit-replace": {
    ...base, sport: "SKI", ability: "INTERMEDIATE", heightCm: 175, weightKg: 80, regionKey: "colorado",
    terrain: ["groomers", "trees"], style: "BALANCED", budget: { mode: "SEPARATE", primaryCents: 90000 },
    kitMode: "REPLACE",
    kit: [
      { kind: "SKI", label: "old Brahma 88", approxWaistMm: 88, approxFlex: 8.5, intent: "REPLACE", condition: "WORN", likes: [], dislikes: ["TOO_STIFF", "SINKS_IN_POWDER"] },
    ],
  },
  "quiver-add": {
    ...base, sport: "SKI", ability: "EXPERT", heightCm: 183, weightKg: 82, ageRange: "25_34", regionKey: "wasatch",
    terrain: ["trees", "steeps", "park", "groomers"], style: "BALANCED", budget: { mode: "SEPARATE", primaryCents: 100000 },
    kitMode: "ADD_TO_QUIVER",
    kit: [
      { kind: "SKI", label: "my Kendo 92", productId: "volkl-kendo-92-2025", intent: "KEEP", condition: "GOOD", likes: ["STABLE"], dislikes: [] },
      { kind: "SKI_BOOT", label: "my Mach1 boots", soleNorm: "GRIPWALK", intent: "KEEP", condition: "GOOD", likes: [], dislikes: [] },
    ],
  },
} satisfies Record<string, RiderInput>;
