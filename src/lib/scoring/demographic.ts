/**
 * Step 4: demographic adjustment (5%). Uses age and gender only; weight and
 * style already shape the flex target inside Fit. If age and gender are both
 * missing, the component is skipped and its weight redistributed.
 */
import { flexMatch } from "./fit";
import type { EnginePrimary, RiderInput, RiderTargets } from "./types";
import { clamp01 } from "./units";
import { DEMOGRAPHIC_NEUTRAL } from "./weights";

export interface DemographicResult {
  score: number;
  skipped: boolean;
  rules: string[];
}

const YOUNG = new Set(["UNDER_18", "18_24"]);
const OLDER = new Set(["55_64", "65_PLUS"]);

export function demographicsMissing(input: Pick<RiderInput, "ageRange" | "gender">) {
  const noGender = !input.gender || input.gender === "PREFER_NOT";
  return !input.ageRange && noGender;
}

export function demographicScore(p: EnginePrimary, input: RiderInput, t: RiderTargets): DemographicResult {
  if (demographicsMissing(input)) return { score: 0, skipped: true, rules: [] };
  const scores: number[] = [];
  const rules: string[] = [];
  const advanced = input.ability === "ADVANCED" || input.ability === "EXPERT";

  // Young + advanced/expert + playful or park → softer, twin, centered.
  if (input.ageRange && YOUNG.has(input.ageRange) && advanced && (input.style === "PLAYFUL" || input.terrain.includes("park"))) {
    const soft = p.flex <= t.flexTarget ? 1 : clamp01(1 - (p.flex - t.flexTarget) / 4);
    const twin =
      p.kind === "SKI"
        ? { FULL_TWIN: 1, EARLY_RISE_TAIL: 0.6, NONE: 0.2 }[p.twinTip]
        : { TRUE_TWIN: 1, DIRECTIONAL_TWIN: 0.7, DIRECTIONAL: 0.3, TAPERED_DIRECTIONAL: 0.2 }[p.shape];
    const mount = p.kind === "SKI" ? { CENTERED: 1, PROGRESSIVE: 0.7, TRADITIONAL: 0.3 }[p.mountStyle] : twin;
    scores.push((soft + twin + mount) / 3);
    rules.push("YOUNG_PLAYFUL");
  }

  // Older riders → lighter, more forgiving.
  if (input.ageRange && OLDER.has(input.ageRange)) {
    const light = p.laminate === "FULL_METAL" ? 0.4 : p.laminate === "PARTIAL_METAL" ? 0.7 : 1;
    const forgiving = p.flex <= t.flexTarget ? 1 : clamp01(1 - (p.flex - t.flexTarget) / 3);
    scores.push((light + forgiving) / 2);
    rules.push("OLDER_FORGIVING");
  }

  // Beginners → forgiving flex + easy turn initiation, regardless of age.
  if (input.ability === "BEGINNER") {
    const easyTurn =
      p.kind === "SKI"
        ? p.rocker === "FULL_CAMBER" ? 0.3 : 1
        : p.profile === "CAMBER" ? 0.3 : 1;
    scores.push((flexMatch(p.flex, Math.min(t.flexTarget, 4)) + easyTurn) / 2);
    rules.push("BEGINNER_FORGIVING");
  }

  // Women's-specific models get a small nudge for women, and a small
  // nudge down for men (they're built lighter/softer). Never a filter.
  if (input.gender === "FEMALE") {
    scores.push(p.womensSpecific ? 1 : 0.7);
    rules.push("WOMENS_MODEL");
  } else if (input.gender === "MALE") {
    scores.push(p.womensSpecific ? 0.4 : 1);
    rules.push("MENS_UNISEX_MODEL");
  }

  if (!scores.length) return { score: DEMOGRAPHIC_NEUTRAL, skipped: false, rules: [] };
  return { score: scores.reduce((a, b) => a + b, 0) / scores.length, skipped: false, rules };
}
