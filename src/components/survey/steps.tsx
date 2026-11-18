"use client";

import {
  Backpack,
  CalendarDays,
  Footprints,
  MountainSnow,
  Rocket,
  Route,
  Scale,
  Sparkles,
  Trees,
  Waves,
  Zap,
} from "lucide-react";
import { TrailShape } from "@/components/ui/TrailSign";
import { REGIONS } from "@/lib/scoring/regions";
import type { Ability, SnowType, Terrain } from "@/lib/scoring/types";
import { cmToIn, kgToLbs } from "@/lib/scoring/units";
import { BUDGET } from "@/lib/scoring/weights";
import { heightCmOf, usMensSizeOf, weightKgOf, type ShoeSystem, type SurveyDraft } from "@/lib/survey/schema";
import { liveNotes, words } from "@/lib/survey/steps";
import { Callout, ChipToggle, NumberField, OptionCard, Segmented, StepHeader } from "./controls";
import { SportIllustration } from "./RiderIcons";

export interface StepProps {
  draft: SurveyDraft;
  update: (patch: Partial<SurveyDraft> | ((d: SurveyDraft) => Partial<SurveyDraft>)) => void;
  /** Single-choice steps call this after a tap to move on automatically. */
  autoAdvance: () => void;
  headingRef: React.Ref<HTMLHeadingElement>;
}

const toggle = <T,>(list: T[], v: T, on: boolean) => (on ? [...new Set([...list, v])] : list.filter((x) => x !== v));

// ───────────────────────────── The Chairlift ─────────────────────────────

export function SportStep({ draft, update, autoAdvance, headingRef }: StepProps) {
  return (
    <>
      <StepHeader headingRef={headingRef} title="Two planks or one?" subtitle="Pick your sport. You can always come back and run it for the other one." />
      <div role="radiogroup" aria-label="Sport" className="grid gap-4 sm:grid-cols-2">
        {(["SKI", "SNOWBOARD"] as const).map((s) => (
          <OptionCard
            key={s}
            name="sport"
            value={s}
            checked={draft.sport === s}
            onPick={(ptr) => {
              update({ sport: s });
              if (ptr) autoAdvance();
            }}
            icon={<SportIllustration sport={s} />}
            title={s === "SKI" ? "Skiing" : "Snowboarding"}
            description={s === "SKI" ? "Skis, bindings and boots" : "Board, bindings and boots"}
          />
        ))}
      </div>
    </>
  );
}

const SKILL: Record<Ability, { ski: string; board: string; terrain: string }> = {
  BEGINNER: {
    ski: "Learning to link turns. Pizza is a friend.",
    board: "Learning to link heel- and toe-side turns.",
    terrain: "Bunny hill, green runs, easy cat tracks",
  },
  INTERMEDIATE: {
    ski: "Parallel turns on most blues. Careful when it's steep or icy.",
    board: "Linked turns on blues. Working on speed control on steeper stuff.",
    terrain: "Groomed blues, easy blacks in good snow",
  },
  ADVANCED: {
    ski: "Confident on blacks, bumps and trees. Adapts to most snow.",
    board: "Confident on blacks, trees and side hits. Rides switch.",
    terrain: "Black runs, mogul fields, tree runs",
  },
  EXPERT: {
    ski: "Any run, any snow, in control at speed.",
    board: "Any run, any snow, in control at speed.",
    terrain: "Double blacks, chutes, steeps, backcountry",
  },
};

export function SkillStep({ draft, update, autoAdvance, headingRef }: StepProps) {
  const w = words(draft.sport);
  return (
    <>
      <StepHeader
        headingRef={headingRef}
        title={`How do you ${w.ride}?`}
        subtitle="Be honest! The right level gets you gear you'll love, not gear that fights you."
      />
      <div role="radiogroup" aria-label="Skill level" className="grid gap-3 sm:grid-cols-2">
        {(Object.keys(SKILL) as Ability[]).map((a) => (
          <OptionCard
            key={a}
            name="ability"
            value={a}
            checked={draft.ability === a}
            onPick={(ptr) => {
              update({ ability: a });
              if (ptr) autoAdvance();
            }}
            icon={
              <span className="grid h-12 w-14 place-items-center rounded-xl bg-white ring-1 ring-line">
                <TrailShape level={a} size={22} />
              </span>
            }
            title={{ BEGINNER: "Beginner", INTERMEDIATE: "Intermediate", ADVANCED: "Advanced", EXPERT: "Expert" }[a]}
            description={draft.sport === "SNOWBOARD" ? SKILL[a].board : SKILL[a].ski}
            footer={<span className="text-xs font-medium text-ink-soft">Happy on: {SKILL[a].terrain}</span>}
          />
        ))}
      </div>
    </>
  );
}

export function RegionStep({ draft, update, autoAdvance, headingRef }: StepProps) {
  const w = words(draft.sport);
  return (
    <>
      <StepHeader headingRef={headingRef} title={`Where do you ${w.ride} most?`} subtitle="We'll figure out your typical snow from your home mountains." />
      <div role="radiogroup" aria-label="Home region" className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(REGIONS).map(([key, r]) => (
          <OptionCard
            key={key}
            compact
            name="region"
            value={key}
            checked={draft.regionKey === key}
            onPick={(ptr) => {
              update({ regionKey: key });
              if (ptr) autoAdvance();
            }}
            title={r.label}
            description={r.blurb}
          />
        ))}
      </div>
    </>
  );
}

const SNOW_LABEL: Record<SnowType, string> = {
  powder: "Powder",
  packed: "Packed & groomed",
  hardpack_ice: "Hardpack & ice",
  spring_variable: "Spring slush & crud",
};
const SNOW_COLOR: Record<SnowType, string> = { powder: "#9CC3EC", packed: "#1F6FD1", hardpack_ice: "#1E3A5F", spring_variable: "#FF9F5A" };

function SnowMixBar({ mix }: { mix: Record<SnowType, number> }) {
  return (
    <span className="block">
      <span className="flex h-2.5 overflow-hidden rounded-full" aria-hidden="true">
        {(Object.keys(mix) as SnowType[]).map((s) => (
          <span key={s} style={{ width: `${mix[s] * 100}%`, background: SNOW_COLOR[s] }} />
        ))}
      </span>
      <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-soft">
        {(Object.keys(mix) as SnowType[])
          .filter((s) => mix[s] > 0)
          .map((s) => (
            <span key={s} className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full" style={{ background: SNOW_COLOR[s] }} aria-hidden="true" />
              {SNOW_LABEL[s]} {Math.round(mix[s] * 100)}%
            </span>
          ))}
      </span>
    </span>
  );
}

export function SnowStep({ draft, update, headingRef }: StepProps) {
  const region = REGIONS[draft.regionKey ?? ""];
  const w = words(draft.sport);
  const typical = draft.snowPreference.length === 0;
  return (
    <>
      <StepHeader
        headingRef={headingRef}
        title={`What snow should your ${w.gear} love?`}
        subtitle={region ? `${region.label} usually means ${region.blurb.toLowerCase()}. Keep that, or pick the snow you chase.` : "Keep your region's typical snow, or pick the snow you chase."}
      />
      <OptionCard
        name="snow-mode"
        value="typical"
        checked={typical}
        onPick={() => update({ snowPreference: [] })}
        title={`Typical for ${region?.label ?? "my region"}`}
        description={region && <SnowMixBar mix={region.snow} />}
      />
      <fieldset className="mt-5">
        <legend className="mb-2 font-display font-semibold text-night">Or tune it: the snow I want to rip</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SNOW_LABEL) as SnowType[]).map((s) => (
            <ChipToggle
              key={s}
              name="snow"
              value={s}
              checked={draft.snowPreference.includes(s)}
              onChange={(on) => update((d) => ({ snowPreference: toggle(d.snowPreference, s, on) }))}
            >
              {SNOW_LABEL[s]}
            </ChipToggle>
          ))}
        </div>
      </fieldset>
    </>
  );
}

const DAYS = [
  { v: 3, title: "1–5 days", d: "A trip or two" },
  { v: 10, title: "6–15 days", d: "Weekends, some months" },
  { v: 22, title: "16–30 days", d: "Regular" },
  { v: 45, title: "31–60 days", d: "Season pass hero" },
  { v: 80, title: "60+ days", d: "I basically live there" },
];

export function DaysStep({ draft, update, autoAdvance, headingRef }: StepProps) {
  return (
    <>
      <StepHeader headingRef={headingRef} title="How many days a season?" subtitle="More days means durability matters more, and a quiver starts to make sense." />
      <div role="radiogroup" aria-label="Days per season" className="grid gap-2.5 sm:grid-cols-2">
        {DAYS.map((o) => (
          <OptionCard
            key={o.v}
            compact
            name="days"
            value={String(o.v)}
            checked={draft.daysPerSeason === o.v}
            onPick={(ptr) => {
              update({ daysPerSeason: o.v });
              if (ptr) autoAdvance();
            }}
            icon={<CalendarDays className="size-6 text-trail-blue" aria-hidden="true" />}
            title={o.title}
            description={o.d}
          />
        ))}
      </div>
    </>
  );
}

// ───────────────────────────── Base Camp ─────────────────────────────

const AGES = [
  ["UNDER_18", "Under 18"], ["18_24", "18–24"], ["25_34", "25–34"], ["35_44", "35–44"], ["45_54", "45–54"], ["55_64", "55–64"], ["65_PLUS", "65+"],
] as const;
const GENDERS = [["FEMALE", "Woman"], ["MALE", "Man"], ["NONBINARY", "Non-binary"], ["PREFER_NOT", "Prefer not to say"]] as const;

export function BodyStep({ draft, update, headingRef }: StepProps) {
  const w = words(draft.sport);
  const switchUnits = (units: "imperial" | "metric") => {
    if (units === draft.units) return;
    const h = heightCmOf(draft);
    const kg = weightKgOf(draft);
    if (units === "metric") {
      update({ units, heightCmInput: h === undefined ? undefined : Math.round(h), weightKgInput: kg === undefined ? undefined : Math.round(kg) });
    } else {
      const inches = h === undefined ? undefined : Math.round(cmToIn(h));
      update({
        units,
        heightFt: inches === undefined ? undefined : Math.floor(inches / 12),
        heightIn: inches === undefined ? undefined : inches % 12,
        weightLbs: kg === undefined ? undefined : Math.round(kgToLbs(kg)),
      });
    }
  };
  return (
    <>
      <StepHeader
        headingRef={headingRef}
        title="Base Camp: let's size you up"
        subtitle={`Height and weight set your ${draft.sport === "SNOWBOARD" ? "board size" : "ski length"} and how stiff your gear should be.`}
      />
      <div className="mb-5">
        <Segmented
          name="units"
          label="Units"
          value={draft.units}
          onChange={switchUnits}
          options={[
            { value: "imperial", label: "ft · lb" },
            { value: "metric", label: "cm · kg" },
          ]}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {draft.units === "imperial" ? (
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-night">Height (required)</legend>
            <div className="grid grid-cols-2 gap-2">
              <NumberField id="h-ft" label="Feet" value={draft.heightFt} onChange={(v) => update({ heightFt: v })} suffix="ft" min={3} max={7} placeholder="e.g. 5" />
              <NumberField id="h-in" label="Inches" value={draft.heightIn} onChange={(v) => update({ heightIn: v })} suffix="in" min={0} max={11} placeholder="e.g. 10" />
            </div>
          </fieldset>
        ) : (
          <NumberField id="h-cm" label="Height (required)" value={draft.heightCmInput} onChange={(v) => update({ heightCmInput: v })} suffix="cm" min={100} max={230} placeholder="e.g. 178" />
        )}
        <div className="self-end">
          {draft.units === "imperial" ? (
            <NumberField id="w-lb" label="Weight (required)" value={draft.weightLbs} onChange={(v) => update({ weightLbs: v })} suffix="lb" min={55} max={440} placeholder="e.g. 165" />
          ) : (
            <NumberField id="w-kg" label="Weight (required)" value={draft.weightKgInput} onChange={(v) => update({ weightKgInput: v })} suffix="kg" min={25} max={200} placeholder="e.g. 75" />
          )}
        </div>
      </div>

      <div className="mt-7 rounded-2xl border-2 border-dashed border-line bg-white/70 p-4">
        <p className="font-display font-semibold text-night">Optional: fine-tune your picks</p>
        <p className="mb-3 text-sm text-ink-soft">Used for small adjustments like women's-specific models. Skip it and we'll balance things out.</p>
        <fieldset className="mb-3">
          <legend className="mb-1.5 text-sm font-semibold text-night">Age</legend>
          <div className="flex flex-wrap gap-2">
            {AGES.map(([v, l]) => (
              <ChipToggle key={v} name="age" value={v} checked={draft.ageRange === v} onChange={(on) => update({ ageRange: on ? v : undefined })}>
                {l}
              </ChipToggle>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold text-night">Gender</legend>
          <div className="flex flex-wrap gap-2">
            {GENDERS.map(([v, l]) => (
              <ChipToggle key={v} name="gender" value={v} checked={draft.gender === v} onChange={(on) => update({ gender: on ? v : undefined })}>
                {l}
              </ChipToggle>
            ))}
          </div>
        </fieldset>
      </div>
    </>
  );
}

const SHOE_SYSTEMS: { value: ShoeSystem; label: string }[] = [
  { value: "US_MENS", label: "US men's" },
  { value: "US_WOMENS", label: "US women's" },
  { value: "EU", label: "EU" },
  { value: "MONDO", label: "Mondo (cm)" },
];
const FIT = [
  ["HEEL_LIFT", "Heel lifts"], ["TOE_BANG", "Toes jam"], ["FOREFOOT_PINCH", "Pinches at the sides"], ["INSTEP_PRESSURE", "Pressure on top of foot"],
  ["SHIN_BANG", "Shin bang"], ["COLD_FEET", "Cold feet"], ["CALF_PRESSURE", "Tight on calves"],
] as const;

export function FeetStep({ draft, update, headingRef }: StepProps) {
  const board = draft.sport === "SNOWBOARD";
  const us = usMensSizeOf(draft);
  return (
    <>
      <StepHeader headingRef={headingRef} title="Now, your feet" subtitle="Boots matter more than anything. Help us get them close." />
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
        <div>
          <label htmlFor="shoe-system" className="mb-1.5 block text-sm font-semibold text-night">
            Shoe size system
          </label>
          <select
            id="shoe-system"
            className="field text-lg"
            value={draft.shoeSystem}
            onChange={(e) => update({ shoeSystem: e.target.value as ShoeSystem })}
          >
            {SHOE_SYSTEMS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <NumberField
          id="shoe-size"
          label="Your everyday shoe size (required)"
          value={draft.shoeSize}
          onChange={(v) => update({ shoeSize: v })}
          step={0.5}
          min={1}
          max={50}
          placeholder={draft.shoeSystem === "EU" ? "e.g. 43" : draft.shoeSystem === "MONDO" ? "e.g. 27.5" : "e.g. 10"}
        />
      </div>

      <fieldset className="mt-6">
        <legend className="mb-2 font-display font-semibold text-night">Foot width (required)</legend>
        <div role="radiogroup" className="grid gap-2.5 sm:grid-cols-3">
          {(["NARROW", "MEDIUM", "WIDE"] as const).map((v) => (
            <OptionCard
              key={v}
              compact
              name="width"
              value={v}
              checked={draft.footWidth === v}
              onPick={() => update({ footWidth: v })}
              icon={<Footprints className={`text-trail-blue ${v === "NARROW" ? "size-5" : v === "MEDIUM" ? "size-6" : "size-7"}`} aria-hidden="true" />}
              title={{ NARROW: "Narrow", MEDIUM: "Medium", WIDE: "Wide" }[v]}
              description={{ NARROW: "Shoes often feel roomy", MEDIUM: "Most shoes fit fine", WIDE: "I often size up for width" }[v]}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-6">
        <legend className="mb-2 font-display font-semibold text-night">Any boot problems now? (optional)</legend>
        <div className="flex flex-wrap gap-2">
          {FIT.map(([v, l]) => (
            <ChipToggle key={v} name="fit" value={v} checked={draft.fitIssues.includes(v)} onChange={(on) => update((d) => ({ fitIssues: toggle(d.fitIssues, v, on) }))}>
              {l}
            </ChipToggle>
          ))}
        </div>
      </fieldset>

      {board && (
        <fieldset className="mt-6">
          <legend className="mb-2 font-display font-semibold text-night">Stance (required)</legend>
          <div role="radiogroup" className="grid gap-2.5 sm:grid-cols-2">
            <OptionCard compact name="stance" value="REGULAR" checked={draft.stance === "REGULAR"} onPick={() => update({ stance: "REGULAR" })} title="Regular" description="Left foot forward" />
            <OptionCard compact name="stance" value="GOOFY" checked={draft.stance === "GOOFY"} onPick={() => update({ stance: "GOOFY" })} title="Goofy" description="Right foot forward" />
          </div>
          <p className="mt-2 text-sm text-ink-soft">Not sure? Imagine sliding across a kitchen floor in socks. The foot that leads is your front foot.</p>
          <NumberField
            id="stance-width"
            className="mt-3 max-w-xs"
            label="Stance width, if you know it (optional)"
            value={draft.stanceWidthCm}
            onChange={(v) => update({ stanceWidthCm: v })}
            suffix="cm"
            min={35}
            max={75}
            placeholder="e.g. 53"
          />
        </fieldset>
      )}

      {board && us !== undefined && us >= 11 && (
        <Callout>
          <Footprints className="size-5 shrink-0 text-trail-blue" aria-hidden="true" />
          <span>Big feet, no problem. We'll only show wide boards, so your toes and heels don't drag in turns.</span>
        </Callout>
      )}
    </>
  );
}

const PRESETS = [600, 900, 1200, 1800, 2500];

export function BudgetStep({ draft, update, headingRef }: StepProps) {
  const w = words(draft.sport);
  const split = BUDGET.totalSplit[draft.sport ?? "SKI"];
  const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
  return (
    <>
      <StepHeader headingRef={headingRef} title="What's the budget?" subtitle={`Give one total for the whole setup, or set ${w.gear}, bindings and boots separately.`} />
      <div className="mb-5">
        <Segmented
          name="budget-mode"
          label="Budget type"
          value={draft.budgetMode}
          onChange={(v) => update({ budgetMode: v })}
          options={[
            { value: "TOTAL", label: "One total" },
            { value: "SEPARATE", label: "Separate amounts" },
          ]}
        />
      </div>
      {draft.budgetMode === "TOTAL" ? (
        <>
          <NumberField id="budget-total" className="max-w-xs" label="Total budget" prefix="$" value={draft.budgetTotal} onChange={(v) => update({ budgetTotal: v })} min={100} step={50} placeholder="e.g. 1200" />
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Quick budget picks">
            {PRESETS.map((p) => (
              <button key={p} type="button" className={`chip ${draft.budgetTotal === p ? "border-trail-blue bg-trail-blue text-white" : ""}`} onClick={() => update({ budgetTotal: p })}>
                {usd(p)}
              </button>
            ))}
          </div>
          {draft.budgetTotal ? (
            <p className="mt-4 text-sm text-ink-soft">
              We'll aim for about <strong className="text-ink">{usd(draft.budgetTotal * split.primary)}</strong> on {w.gear},{" "}
              <strong className="text-ink">{usd(draft.budgetTotal * split.binding)}</strong> on bindings and{" "}
              <strong className="text-ink">{usd(draft.budgetTotal * split.boot)}</strong> on boots. Gear you're keeping frees up budget for the rest.
            </p>
          ) : null}
        </>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField id="budget-primary" label={`${w.gear === "skis" ? "Skis" : "Board"} (required)`} prefix="$" value={draft.budgetPrimary} onChange={(v) => update({ budgetPrimary: v })} min={50} step={25} placeholder="e.g. 700" />
          <NumberField id="budget-binding" label="Bindings (optional)" prefix="$" value={draft.budgetBinding} onChange={(v) => update({ budgetBinding: v })} min={50} step={25} placeholder="e.g. 300" />
          <NumberField id="budget-boot" label="Boots (optional)" prefix="$" value={draft.budgetBoot} onChange={(v) => update({ budgetBoot: v })} min={50} step={25} placeholder="e.g. 450" />
        </div>
      )}
      <Callout>
        <Sparkles className="size-5 shrink-0 text-summit-ink" aria-hidden="true" />
        <span>We rank in-budget picks first, and add up to two clearly labeled "stretch picks" that cost at most 15% more.</span>
      </Callout>
    </>
  );
}

// ───────────────────────────── The Summit ─────────────────────────────

const TERRAIN: { v: Terrain; title: string; d: string; icon: React.ElementType }[] = [
  { v: "groomers", title: "Groomers", d: "Corduroy cruising and carving", icon: Route },
  { v: "trees", title: "Trees", d: "Glades and tight turns", icon: Trees },
  { v: "moguls", title: "Moguls", d: "Bumps, bumps, bumps", icon: Waves },
  { v: "park", title: "Park", d: "Jumps, rails and side hits", icon: Zap },
  { v: "steeps", title: "Steeps", d: "Chutes and big faces", icon: MountainSnow },
  { v: "backcountry", title: "Backcountry", d: "Earn your turns", icon: Backpack },
];

export function TerrainStep({ draft, update, headingRef }: StepProps) {
  const w = words(draft.sport);
  const notes = liveNotes(draft);
  return (
    <>
      <StepHeader headingRef={headingRef} title={`The Summit: where do you like to ${w.ride}?`} subtitle="Pick everything you'd happily do on a good day." />
      <fieldset>
        <legend className="sr-only">Terrain</legend>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {TERRAIN.map((t) => (
            <OptionCard
              key={t.v}
              type="checkbox"
              compact
              name="terrain"
              value={t.v}
              checked={draft.terrain.includes(t.v)}
              onPick={() => update((d) => ({ terrain: toggle(d.terrain, t.v, !d.terrain.includes(t.v)) }))}
              icon={<t.icon className="size-6 text-trail-blue" aria-hidden="true" />}
              title={t.title}
              description={t.d}
            />
          ))}
        </div>
      </fieldset>
      <div aria-live="polite">
        {notes
          .filter((n) => n.code === "BEGINNER_STEEP_TERRAIN" || n.code === "PARK_ONLY_POWDER_REGION")
          .map((n) => (
            <Callout key={n.code} tone="warn">
              <TrailShape level="BEGINNER" size={16} />
              <span>{n.message}</span>
            </Callout>
          ))}
      </div>
    </>
  );
}

const STYLES = [
  { v: "PLAYFUL", title: "Playful & surfy", d: "Slashes, butters, pops off everything", icon: Sparkles },
  { v: "BALANCED", title: "Balanced", d: "A little of everything", icon: Scale },
  { v: "CHARGING", title: "Stable & charging", d: "Fast, hard turns, never backs down", icon: Rocket },
] as const;

export function StyleStep({ draft, update, autoAdvance, headingRef }: StepProps) {
  const notes = liveNotes(draft).filter((n) => n.code === "BEGINNER_CHARGING");
  return (
    <>
      <StepHeader headingRef={headingRef} title="What's your style?" subtitle="This shapes how lively or locked-in your gear feels." />
      <div role="radiogroup" aria-label="Riding style" className="grid gap-3 sm:grid-cols-3">
        {STYLES.map((s) => (
          <OptionCard
            key={s.v}
            name="style"
            value={s.v}
            checked={draft.style === s.v}
            onPick={(ptr) => {
              update({ style: s.v });
              // Don't rush past the gentle note if it's about to appear.
              if (ptr && !(draft.ability === "BEGINNER" && s.v === "CHARGING")) autoAdvance();
            }}
            icon={<s.icon className="size-7 text-trail-blue" aria-hidden="true" />}
            title={s.title}
            description={s.d}
          />
        ))}
      </div>
      <div aria-live="polite">
        {notes.map((n) => (
          <Callout key={n.code} tone="warn">
            <TrailShape level="BEGINNER" size={16} />
            <span>{n.message}</span>
          </Callout>
        ))}
      </div>
    </>
  );
}

