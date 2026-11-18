"use client";

/**
 * Interim results (Stage 4): proves the survey → engine round trip.
 * Stage 5 replaces this with the full retail-style results page.
 */
import { ArrowLeft, Info } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BoarderFigure, SkierFigure } from "@/components/survey/RiderIcons";
import { ANSWERS_KEY } from "@/lib/survey/storage";
import { Snowfall } from "@/components/ui/Snowfall";
import type { RecommendationResult } from "@/lib/scoring/types";
import type { SurveyAnswers } from "@/lib/survey/schema";
import { formatPrice } from "@/lib/pricing/display";
import type { ProductSummary } from "../api/recommend/route";

type State =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error"; message: string }
  | { status: "ready"; result: RecommendationResult; products: Record<string, ProductSummary>; sport: SurveyAnswers["sport"] };

function readAnswers(): SurveyAnswers | null {
  for (const store of [() => sessionStorage, () => localStorage]) {
    try {
      const raw = store().getItem(ANSWERS_KEY);
      if (raw) return JSON.parse(raw) as SurveyAnswers;
    } catch {
      /* storage blocked */
    }
  }
  return null;
}

function DroppingIn({ sport }: { sport?: SurveyAnswers["sport"] }) {
  const reduce = useReducedMotion();
  return (
    <div className="relative grid min-h-[60vh] place-items-center overflow-hidden" role="status" aria-live="polite">
      <Snowfall count={30} />
      <div className="text-center">
        <motion.div
          className="mx-auto w-fit"
          initial={reduce ? false : { x: -120, y: -60, rotate: -12 }}
          animate={reduce ? undefined : { x: [-120, 0, 120], y: [-60, 0, 60], rotate: [-12, 8, -12] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          {sport === "SNOWBOARD" ? <BoarderFigure size={72} /> : <SkierFigure size={72} />}
        </motion.div>
        <p className="mt-6 font-display text-3xl font-bold text-night">Dropping in…</p>
        <p className="mt-1 text-ink-soft">Matching you against every model in the catalog</p>
      </div>
    </div>
  );
}

export function InterimResults() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [sport, setSport] = useState<SurveyAnswers["sport"]>();

  useEffect(() => {
    const answers = readAnswers();
    if (!answers) {
      setState({ status: "missing" });
      return;
    }
    setSport(answers.sport);
    const started = Date.now();
    fetch("/api/recommend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(answers) })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        // Let the drop-in animation play for a moment.
        const wait = Math.max(0, 1200 - (Date.now() - started));
        setTimeout(() => setState({ status: "ready", result: json.result, products: json.products, sport: answers.sport }), wait);
      })
      .catch((e: Error) => setState({ status: "error", message: e.message }));
  }, []);

  if (state.status === "loading") return <DroppingIn sport={sport} />;
  if (state.status === "missing" || state.status === "error") {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-3xl font-bold text-night">{state.status === "missing" ? "No fresh tracks here yet" : "We wiped out"}</h1>
        <p className="mt-2 text-ink-soft">
          {state.status === "missing" ? "Answer a few quick questions and we'll find your setup." : `Something went wrong getting your picks (${state.message}).`}
        </p>
        <Link href="/survey" className="btn-primary mt-6">
          {state.status === "missing" ? "Strap in" : "Back to the survey"}
        </Link>
      </div>
    );
  }

  const { result, products } = state;
  const name = (id: string) => (products[id] ? `${products[id]!.brand} ${products[id]!.model}` : id);
  const gear = state.sport === "SNOWBOARD" ? "boards" : "skis";

  return (
    <div className="relative mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/survey" className="inline-flex items-center gap-1 text-sm font-semibold text-trail-blue-ink hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" /> Edit my answers
      </Link>
      <h1 className="mt-3 text-4xl font-bold text-night">Your top {gear}</h1>
      <p className="mt-1 text-ink-soft">
        {result.picks.length} picks ranked for you{result.relaxed ? ` (we loosened the ${result.relaxed === "BUDGET" ? "budget" : "filters"} to find these)` : ""}.
      </p>

      {result.targets.conflicts.map((c) => (
        <p key={c.code} className="mt-4 rounded-2xl border-2 border-summit/50 bg-summit-soft p-4 text-sm">
          {c.message}
        </p>
      ))}

      <ol className="mt-6 space-y-4">
        {result.picks.slice(0, 5).map((p, i) => (
          <motion.li
            key={p.productId}
            className="card flex flex-wrap items-start gap-4 p-5"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-night font-display text-lg font-bold text-white">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-night">{name(p.productId)}</h2>
                <span className="inline-flex items-center gap-1 rounded-md bg-ink px-2 py-0.5 font-display text-sm font-semibold text-white">
                  ◆ {Math.round(p.total)}% Fit
                </span>
                {p.tags.includes("STRETCH") && <span className="rounded-full bg-summit-soft px-2 py-0.5 text-xs font-semibold text-summit-ink">Stretch Pick</span>}
                {p.tags.includes("BEST_VALUE") && <span className="rounded-full bg-trail-green/10 px-2 py-0.5 text-xs font-semibold text-trail-green-ink">Best Value</span>}
                {p.tags.includes("OVERLAPS_KIT") && <span className="rounded-full bg-glacier px-2 py-0.5 text-xs font-semibold text-ink-soft">Like one you own</span>}
              </div>
              <p className="mt-0.5 text-sm text-ink-soft">
                Your size: <strong className="text-ink">{p.recommendedSize.label}</strong> · {formatPrice(p.price.cents)}
                {p.price.isMsrp ? " MSRP" : ` at ${p.price.retailer}`}
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {p.reasons.slice(0, 3).map((r) => (
                  <li key={r.text} className="flex gap-2">
                    <span className="text-trail-green-ink" aria-hidden="true">✓</span>
                    {r.text}
                  </li>
                ))}
              </ul>
            </div>
          </motion.li>
        ))}
      </ol>

      <div className="mt-8 flex gap-3 rounded-2xl bg-glacier p-4 text-sm text-ink-soft">
        <Info className="size-5 shrink-0 text-trail-blue" aria-hidden="true" />
        <div className="space-y-1">
          <p>
            <strong className="text-ink">Preview.</strong> The full results page (filters, compare, quiver builder, bindings & boots, score breakdown) arrives in the next stage.
          </p>
          {result.disclaimers.map((d) => (
            <p key={d}>{d}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
