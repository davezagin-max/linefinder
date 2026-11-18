"use client";

import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { emptyDraft, finalizeDraft, type SurveyDraft } from "@/lib/survey/schema";
import { STEPS, stepErrors, stepIndex, words, type StepId } from "@/lib/survey/steps";
import { ANSWERS_KEY, DRAFT_KEY } from "@/lib/survey/storage";
import { KitStep } from "./KitStep";
import { MountainBackdrop } from "./MountainBackdrop";
import { ReviewStep } from "./ReviewStep";
import {
  BodyStep,
  BudgetStep,
  DaysStep,
  FeetStep,
  RegionStep,
  SkillStep,
  SnowStep,
  SportStep,
  StyleStep,
  TerrainStep,
  type StepProps,
} from "./steps";
import { TrailProgress } from "./TrailProgress";


const SCREENS: Partial<Record<StepId, (p: StepProps) => React.ReactNode>> = {
  sport: SportStep,
  skill: SkillStep,
  region: RegionStep,
  snow: SnowStep,
  days: DaysStep,
  body: BodyStep,
  feet: FeetStep,
  budget: BudgetStep,
  terrain: TerrainStep,
  style: StyleStep,
  kit: KitStep,
};

/** localStorage can throw (private mode, blocked storage): never let that break the survey. */
function readJson<T>(storage: () => Storage, key: string): T | null {
  try {
    const raw = storage().getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function writeJson(storage: () => Storage, key: string, value: unknown) {
  try {
    storage().setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function Survey() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [draft, setDraft] = useState<SurveyDraft>(emptyDraft);
  const [index, setIndex] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [dir, setDir] = useState(1);
  const [showErrors, setShowErrors] = useState(false);
  const [restored, setRestored] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Until the saved draft is read, show nothing in the card (no flash of step 1).
  const [ready, setReady] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorsRef = useRef<HTMLDivElement>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const firstRender = useRef(true);

  // Restore a saved draft (answers stay on this device until sign-in arrives).
  useEffect(() => {
    const saved = readJson<{ draft: SurveyDraft; index: number; maxReached: number }>(() => localStorage, DRAFT_KEY);
    if (saved?.draft) {
      setDraft({ ...emptyDraft(), ...saved.draft });
      setIndex(Math.min(saved.index ?? 0, STEPS.length - 1));
      setMaxReached(Math.min(saved.maxReached ?? 0, STEPS.length - 1));
      setRestored(saved.index > 0);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return; // never overwrite a saved draft before it's been restored
    writeJson(() => localStorage, DRAFT_KEY, { draft, index, maxReached });
  }, [draft, index, maxReached, ready]);

  // Move focus to the new question so keyboard and screen-reader users land on it.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const t = setTimeout(() => headingRef.current?.focus({ preventScroll: true }), reduce ? 0 : 260);
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    return () => clearTimeout(t);
  }, [index, reduce]);

  useEffect(() => () => clearTimeout(advanceTimer.current), []);

  // Make sure "what's missing" is on screen when Next is blocked.
  useEffect(() => {
    if (showErrors) errorsRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  }, [showErrors, reduce]);

  const step = STEPS[index]!;
  const errors = stepErrors(step.id, draft);
  const update = useCallback((patch: Partial<SurveyDraft> | ((d: SurveyDraft) => Partial<SurveyDraft>)) => {
    setDraft((d) => ({ ...d, ...(typeof patch === "function" ? patch(d) : patch) }));
    setShowErrors(false);
  }, []);

  const goToIndex = useCallback(
    (i: number) => {
      clearTimeout(advanceTimer.current);
      setDir(i > index ? 1 : -1);
      setIndex(i);
      setMaxReached((m) => Math.max(m, i));
      setShowErrors(false);
    },
    [index],
  );

  const next = () => {
    if (errors.length) {
      setShowErrors(true);
      return;
    }
    if (index < STEPS.length - 1) goToIndex(index + 1);
  };

  // Tap-to-answer steps move on by themselves after a beat.
  const autoAdvance = () => {
    clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => {
      setIndex((i) => {
        const n = Math.min(i + 1, STEPS.length - 1);
        setMaxReached((m) => Math.max(m, n));
        return n;
      });
      setDir(1);
    }, reduce ? 120 : 380);
  };

  const submit = () => {
    try {
      const answers = finalizeDraft(draft);
      setSubmitting(true);
      writeJson(() => sessionStorage, ANSWERS_KEY, answers);
      writeJson(() => localStorage, ANSWERS_KEY, answers);
      router.push("/results");
    } catch {
      // Something required is missing: jump to the first step that needs it.
      const missing = STEPS.find((s) => stepErrors(s.id, draft).length);
      if (missing) goToIndex(stepIndex(missing.id));
    }
  };

  const startOver = () => {
    setDraft(emptyDraft());
    setMaxReached(0);
    setRestored(false);
    goToIndex(0);
  };

  const Screen = SCREENS[step.id];
  const w = words(draft.sport);
  const isReview = step.id === "review";

  return (
    <div className="relative min-h-[calc(100dvh-4rem)] pb-36">
      <MountainBackdrop step={index} />

      <div className="mx-auto max-w-4xl px-4 pt-5 sm:px-6 sm:pt-8">
        <TrailProgress index={index} maxReached={maxReached} sport={draft.sport} onJump={goToIndex} />

        {restored && index > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-full bg-white/80 px-4 py-2 text-sm text-ink-soft shadow-sm">
            <span>Welcome back! We saved your answers.</span>
            <button type="button" onClick={startOver} className="inline-flex items-center gap-1 font-semibold text-trail-blue-ink hover:underline">
              <RotateCcw className="size-3.5" aria-hidden="true" /> Start over
            </button>
          </div>
        )}

        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (isReview) submit();
            else next();
          }}
          className="mt-6"
        >
          {!ready ? (
            <div className="h-80 rounded-[1.75rem] border border-line bg-white/60" aria-busy="true" />
          ) : (
          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <motion.div
              key={step.id}
              custom={dir}
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: dir * 48 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: dir * -48 }}
              transition={{ duration: reduce ? 0.12 : 0.24, ease: "easeOut" }}
              className="rounded-[1.75rem] border border-line bg-white/85 p-5 shadow-[var(--shadow-card)] backdrop-blur-sm sm:p-8"
            >
              {Screen ? (
                <Screen draft={draft} update={update} autoAdvance={autoAdvance} headingRef={headingRef} />
              ) : (
                <ReviewStep draft={draft} goTo={(id) => goToIndex(stepIndex(id))} headingRef={headingRef} />
              )}

              <div ref={errorsRef} aria-live="assertive">
                {showErrors && errors.length > 0 && (
                  <ul className="mt-5 space-y-1 rounded-2xl bg-summit-soft p-4 text-sm font-medium text-summit-ink">
                    {errors.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
          )}

          {/* Sticky footer navigation */}
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-snow/90 backdrop-blur">
            <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
              <button type="button" onClick={() => goToIndex(Math.max(0, index - 1))} disabled={index === 0} className="btn-ghost px-3 sm:px-5">
                <ArrowLeft className="size-5" aria-hidden="true" /> Back
              </button>
              <div className="flex items-center gap-3">
                {step.optional && !isReview && (
                  <button type="button" className="btn-ghost hidden px-3 sm:inline-flex" onClick={() => goToIndex(index + 1)}>
                    Skip
                  </button>
                )}
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {isReview ? (
                    <>
                      Send it! See my {w.gear} <ArrowRight className="size-5" aria-hidden="true" />
                    </>
                  ) : (
                    <>
                      {index === 0 ? "Strap in" : "Next"} <ArrowRight className="size-5" aria-hidden="true" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
