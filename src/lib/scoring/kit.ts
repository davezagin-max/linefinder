import type { KitItem, KitPrefs, Sport } from "./types";
import { KIT_UNSURE_FACTOR } from "./weights";

/**
 * "My Kit" vocabulary and how each trait nudges the rider targets.
 * Likes on a REPLACE item → "keep this quality"; dislikes → "move away".
 * Deltas are summed per field and capped so the kit can steer, not override.
 */

export const GEAR_TRAITS = {
  // feel
  TOO_STIFF: { label: "Too stiff / hard to bend", dislike: { flex: -1 } },
  TOO_SOFT: { label: "Too soft / folds up", dislike: { flex: +1 } },
  CHATTERY: { label: "Chattery at speed", dislike: { flex: +0.5, preferMetal: +1 } },
  HEAVY: { label: "Too heavy", dislike: { preferLight: +1 } },
  HOOKY: { label: "Hooky / grabby", dislike: { preferTipRocker: +1 } },
  HARD_TO_TURN: { label: "Hard to turn", dislike: { flex: -0.5, lengthCm: -3 } },
  // snow
  SINKS_IN_POWDER: { label: "Sinks in powder", dislike: { waistMm: +8 } },
  SKETCHY_ON_ICE: { label: "Sketchy on ice", dislike: { waistMm: -6, preferCamber: +1 } },
  // positive qualities (likes)
  STABLE: { label: "Stable at speed", like: { styleAxis: +0.3 } },
  PLAYFUL: { label: "Playful / poppy", like: { styleAxis: -0.3 } },
  EDGE_GRIP: { label: "Great edge grip", like: { preferCamber: +1 } },
  FLOAT: { label: "Floats in powder", like: { waistMm: +4 } },
  QUICK: { label: "Quick edge to edge", like: { waistMm: -3 } },
  LIGHT: { label: "Light / easy to carry", like: { preferLight: +1 } },
} as const;

export type GearTraitKey = keyof typeof GEAR_TRAITS;

export const KIT_CAPS = { flex: 1.5, waistMm: 10, lengthCm: 4, styleAxis: 0.5 } as const;

/** Board/ski "jobs" used by quiver coverage and kit-overlap detection. */
export const JOBS = ["powder", "all_mountain", "groomer_hardpack", "park", "trees_moguls", "backcountry"] as const;
export type Job = (typeof JOBS)[number];

/** Trail-map names for quiver pieces. */
export const RUN_NAMES: Record<Job, string> = {
  powder: "Powder Bowl",
  all_mountain: "All-Mountain Cruiser",
  groomer_hardpack: "Groomer Highway",
  park: "Terrain Park",
  trees_moguls: "Tree Glades",
  backcountry: "Skin Track",
};

// ───────────────────────────── Effects ─────────────────────────────

type Effect = Partial<{
  flex: number;
  waistMm: number;
  lengthCm: number;
  styleAxis: number;
  preferMetal: number;
  preferLight: number;
  preferTipRocker: number;
  preferCamber: number;
}>;

export interface KitEffects {
  flex: number;
  waistMm: number;
  lengthCm: number;
  styleAxis: number;
  prefs: KitPrefs;
  adjustments: { field: string; delta: number; because: string }[];
}

const capAbs = (x: number, cap: number) => Math.max(-cap, Math.min(cap, x));

/**
 * Sum like/dislike effects from REPLACE (full) and UNSURE (half) items of the
 * primary kind for this sport. KEEP items don't move targets; they shape the
 * quiver and compatibility filters instead.
 */
export function kitEffects(kit: KitItem[], sport: Sport): KitEffects {
  const primaryKind = sport === "SKI" ? "SKI" : "SNOWBOARD";
  const acc = { flex: 0, waistMm: 0, lengthCm: 0, styleAxis: 0, metal: 0, light: 0, camber: 0, tipRocker: 0 };
  const adjustments: KitEffects["adjustments"] = [];

  for (const item of kit) {
    if (item.kind !== primaryKind || item.intent === "KEEP") continue;
    const factor = item.intent === "UNSURE" ? KIT_UNSURE_FACTOR : 1;
    const apply = (traitKey: string, effect: Effect | undefined, verb: string) => {
      if (!effect) return;
      const trait = GEAR_TRAITS[traitKey as GearTraitKey];
      for (const [field, raw] of Object.entries(effect) as [keyof Effect, number][]) {
        // Snowboards are sized/scored without waist-for-snow; skip that nudge.
        if (sport === "SNOWBOARD" && field === "waistMm") continue;
        const delta = raw * factor;
        const key =
          field === "preferMetal" ? "metal"
          : field === "preferLight" ? "light"
          : field === "preferCamber" ? "camber"
          : field === "preferTipRocker" ? "tipRocker"
          : field;
        acc[key as keyof typeof acc] += delta;
        adjustments.push({ field, delta, because: `You ${verb} your ${item.label} as “${trait.label}”` });
      }
    };
    for (const d of item.dislikes) if (d in GEAR_TRAITS) apply(d, (GEAR_TRAITS[d as GearTraitKey] as { dislike?: Effect }).dislike, "flagged");
    for (const l of item.likes) if (l in GEAR_TRAITS) apply(l, (GEAR_TRAITS[l as GearTraitKey] as { like?: Effect }).like, "rated");
  }

  return {
    flex: capAbs(acc.flex, KIT_CAPS.flex),
    waistMm: capAbs(acc.waistMm, KIT_CAPS.waistMm),
    lengthCm: capAbs(acc.lengthCm, KIT_CAPS.lengthCm),
    styleAxis: capAbs(acc.styleAxis, KIT_CAPS.styleAxis),
    prefs: {
      metal: capAbs(acc.metal, 1),
      light: capAbs(acc.light, 1),
      camber: capAbs(acc.camber, 1),
      tipRocker: capAbs(acc.tipRocker, 1),
    },
    adjustments,
  };
}
