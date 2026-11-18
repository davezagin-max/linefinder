/**
 * Survey flow: sections named like runs/lifts, one question per screen,
 * branching by sport. Pure so it can be unit-tested.
 */
import { detectConflicts, resolveSnowMix } from "../scoring/targets";
import type { ConflictNote, RiderInput, SnowType } from "../scoring/types";
import { heightCmOf, usMensSizeOf, weightKgOf, type SurveyDraft } from "./schema";

export type SectionId = "chairlift" | "basecamp" | "summit" | "firstchair";

export const SECTIONS: Record<SectionId, { name: string; blurb: string }> = {
  chairlift: { name: "The Chairlift", blurb: "About you" },
  basecamp: { name: "Base Camp", blurb: "Sizing" },
  summit: { name: "The Summit", blurb: "Terrain & style" },
  firstchair: { name: "First Chair", blurb: "Your results" },
};

export type StepId =
  | "sport" | "skill" | "region" | "snow" | "days"
  | "body" | "feet" | "budget"
  | "terrain" | "style" | "kit"
  | "review";

export interface StepDef {
  id: StepId;
  section: SectionId;
  label: string;
  optional?: boolean;
}

export const STEPS: StepDef[] = [
  { id: "sport", label: "Sport", section: "chairlift" },
  { id: "skill", label: "Skill", section: "chairlift" },
  { id: "region", label: "Home mountain", section: "chairlift" },
  { id: "snow", label: "Snow", section: "chairlift", optional: true },
  { id: "days", label: "Days", section: "chairlift" },
  { id: "body", label: "Height & weight", section: "basecamp" },
  { id: "feet", label: "Feet", section: "basecamp" },
  { id: "budget", label: "Budget", section: "basecamp" },
  { id: "terrain", label: "Terrain", section: "summit" },
  { id: "style", label: "Style", section: "summit" },
  { id: "kit", label: "Current gear", section: "summit", optional: true },
  { id: "review", label: "Review", section: "firstchair" },
];

export const stepIndex = (id: StepId) => STEPS.findIndex((s) => s.id === id);

/** Problems blocking "Next" on a step (empty = good to go). */
export function stepErrors(id: StepId, d: SurveyDraft): string[] {
  const e: string[] = [];
  switch (id) {
    case "sport":
      if (!d.sport) e.push("Pick skis or a snowboard.");
      break;
    case "skill":
      if (!d.ability) e.push("Pick the level that sounds most like you.");
      break;
    case "region":
      if (!d.regionKey) e.push("Pick where you ride most.");
      break;
    case "days":
      if (!d.daysPerSeason) e.push("Pick roughly how many days you get.");
      break;
    case "body": {
      const h = heightCmOf(d);
      const w = weightKgOf(d);
      if (h === undefined || Number.isNaN(h)) e.push("Add your height.");
      else if (h < 100 || h > 230) e.push("That height looks off. Double-check it?");
      if (w === undefined || Number.isNaN(w)) e.push("Add your weight.");
      else if (w < 25 || w > 200) e.push("That weight looks off. Double-check it?");
      break;
    }
    case "feet": {
      const us = usMensSizeOf(d);
      if (us === undefined || Number.isNaN(us)) e.push("Add your shoe size.");
      else if (us < 1 || us > 17) e.push("That shoe size looks off for the system you picked.");
      if (!d.footWidth) e.push("Pick your foot width.");
      if (d.sport === "SNOWBOARD" && !d.stance) e.push("Pick regular or goofy.");
      break;
    }
    case "budget":
      if (d.budgetMode === "TOTAL" && !(d.budgetTotal && d.budgetTotal >= 100)) e.push("Set a total budget of at least $100.");
      if (d.budgetMode === "SEPARATE" && !(d.budgetPrimary && d.budgetPrimary >= 50))
        e.push(`Set a budget for your ${d.sport === "SNOWBOARD" ? "board" : "skis"}.`);
      break;
    case "terrain":
      if (!d.terrain.length) e.push("Pick at least one kind of terrain.");
      break;
    case "style":
      if (!d.style) e.push("Pick a riding style.");
      break;
    case "snow":
    case "kit":
    case "review":
      break;
  }
  return e;
}

export const isStepComplete = (id: StepId, d: SurveyDraft) => stepErrors(id, d).length === 0;

/** First step that still needs an answer (for resuming a saved draft). */
export function firstIncompleteStep(d: SurveyDraft): StepId {
  return STEPS.find((s) => !s.optional && s.id !== "review" && !isStepComplete(s.id, d))?.id ?? "review";
}

/** Gentle notes for conflicting answers, shown live in the survey. */
export function liveNotes(d: SurveyDraft): ConflictNote[] {
  if (!d.ability) return [];
  const pref = d.snowPreference.length
    ? (Object.fromEntries(d.snowPreference.map((s) => [s, 1])) as Partial<Record<SnowType, number>>)
    : undefined;
  const mix = resolveSnowMix({ regionKey: d.regionKey ?? "", snowPreference: pref });
  return detectConflicts({ ability: d.ability, terrain: d.terrain, style: d.style ?? "BALANCED" } as RiderInput, mix);
}

/** Wording that adapts to the sport. */
export function words(sport: SurveyDraft["sport"]) {
  const board = sport === "SNOWBOARD";
  return {
    ride: board ? "ride" : "ski",
    rider: board ? "rider" : "skier",
    gear: board ? "board" : "skis",
    gearOne: board ? "board" : "ski",
  };
}
