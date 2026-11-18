"use client";

import { Pencil } from "lucide-react";
import { TrailSign } from "@/components/ui/TrailSign";
import { REGIONS } from "@/lib/scoring/regions";
import { fmtHeight, fmtWeight } from "@/lib/scoring/units";
import { heightCmOf, weightKgOf, type SurveyDraft } from "@/lib/survey/schema";
import { liveNotes, SECTIONS, STEPS, type SectionId, type StepId } from "@/lib/survey/steps";
import { Callout, StepHeader } from "./controls";

const DAYS: Record<number, string> = { 3: "1–5 days", 10: "6–15 days", 22: "16–30 days", 45: "31–60 days", 80: "60+ days" };
const SNOW: Record<string, string> = { powder: "powder", packed: "packed & groomed", hardpack_ice: "hardpack & ice", spring_variable: "spring slush & crud" };
const STYLE = { PLAYFUL: "Playful & surfy", BALANCED: "Balanced", CHARGING: "Stable & charging" };
const usd = (n?: number) => (n ? `$${n.toLocaleString("en-US")}` : "none set");

function summary(id: StepId, d: SurveyDraft): React.ReactNode {
  switch (id) {
    case "sport":
      return d.sport === "SNOWBOARD" ? "Snowboarding" : "Skiing";
    case "skill":
      return d.ability ? <TrailSign level={d.ability} size={14} /> : "–";
    case "region":
      return d.regionKey ? `${REGIONS[d.regionKey]?.label} · ${REGIONS[d.regionKey]?.blurb.toLowerCase()}` : "–";
    case "snow":
      return d.snowPreference.length ? d.snowPreference.map((s) => SNOW[s]).join(", ") : "Typical for my region";
    case "days":
      return d.daysPerSeason ? DAYS[d.daysPerSeason] ?? `${d.daysPerSeason} days` : "–";
    case "body": {
      const h = heightCmOf(d);
      const w = weightKgOf(d);
      const extra = [d.ageRange?.replace("_", "–").replace("PLUS", "+").replace("UNDER–18", "under 18"), d.gender && d.gender !== "PREFER_NOT" ? d.gender.toLowerCase() : null].filter(Boolean);
      return `${h ? fmtHeight(h, d.units) : "–"} · ${w ? fmtWeight(w, d.units) : "–"}${extra.length ? ` · ${extra.join(", ")}` : ""}`;
    }
    case "feet": {
      const sys = { US_MENS: "US men's", US_WOMENS: "US women's", EU: "EU", MONDO: "Mondo" }[d.shoeSystem];
      const parts = [`${sys} ${d.shoeSize ?? "–"}`, d.footWidth?.toLowerCase() ?? "–"];
      if (d.sport === "SNOWBOARD" && d.stance) parts.push(d.stance === "GOOFY" ? "goofy" : "regular");
      if (d.fitIssues.length) parts.push(`${d.fitIssues.length} fit issue${d.fitIssues.length > 1 ? "s" : ""}`);
      return parts.join(" · ");
    }
    case "budget":
      return d.budgetMode === "TOTAL"
        ? `${usd(d.budgetTotal)} total`
        : `${d.sport === "SNOWBOARD" ? "Board" : "Skis"} ${usd(d.budgetPrimary)} · bindings ${usd(d.budgetBinding)} · boots ${usd(d.budgetBoot)}`;
    case "terrain":
      return d.terrain.length ? d.terrain.join(", ") : "–";
    case "style":
      return d.style ? STYLE[d.style] : "–";
    case "kit": {
      const n = d.kit.filter((k) => (d.sport === "SNOWBOARD" ? k.kind.startsWith("SNOWBOARD") : !k.kind.startsWith("SNOWBOARD"))).length;
      if (!n) return "Starting fresh";
      const mode = { REPLACE: "replacing something", ADD_TO_QUIVER: "adding to my quiver", FRESH_START: "fresh start" }[d.kitMode];
      return `${n} item${n > 1 ? "s" : ""} · ${mode}`;
    }
    default:
      return null;
  }
}

export function ReviewStep({ draft, goTo, headingRef }: { draft: SurveyDraft; goTo: (id: StepId) => void; headingRef: React.Ref<HTMLHeadingElement> }) {
  const sections: SectionId[] = ["chairlift", "basecamp", "summit"];
  const notes = liveNotes(draft);
  return (
    <>
      <StepHeader headingRef={headingRef} title="First Chair: ready to drop in?" subtitle="Here's what we heard. Tap any answer to change it." />
      <div className="grid gap-4 md:grid-cols-3">
        {sections.map((sec) => (
          <section key={sec} className="card p-4" aria-labelledby={`rev-${sec}`}>
            <h3 id={`rev-${sec}`} className="mb-2 font-display text-lg font-semibold text-night">
              {SECTIONS[sec].name}
            </h3>
            <dl className="space-y-1">
              {STEPS.filter((s) => s.section === sec).map((s) => (
                <div key={s.id}>
                  <dt className="sr-only">{s.label}</dt>
                  <dd>
                    <button
                      type="button"
                      onClick={() => goTo(s.id)}
                      className="group -mx-2 flex w-[calc(100%+1rem)] items-start justify-between gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-glacier"
                    >
                      <span>
                        <span className="block text-xs font-semibold uppercase tracking-wide text-ink-soft">{s.label}</span>
                        <span className="block text-sm text-ink">{summary(s.id, draft)}</span>
                      </span>
                      <Pencil className="mt-1 size-3.5 shrink-0 text-ink-soft opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
                      <span className="sr-only">Edit {s.label}</span>
                    </button>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      {notes.map((n) => (
        <Callout key={n.code} tone="warn">
          <span>{n.message}</span>
        </Callout>
      ))}
    </>
  );
}
