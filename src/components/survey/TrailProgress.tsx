"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SECTIONS, STEPS, type SectionId } from "@/lib/survey/steps";
import { BoarderFigure, SkierFigure } from "./RiderIcons";

/** Section → trail-sign marker (shape + color), like the run signs on a trail map. */
const MARKER: Record<SectionId, { shape: "circle" | "square" | "diamond" | "double"; color: string }> = {
  chairlift: { shape: "circle", color: "#2E9E4F" },
  basecamp: { shape: "square", color: "#1F6FD1" },
  summit: { shape: "diamond", color: "#111111" },
  firstchair: { shape: "double", color: "#FF6B2C" },
};

// A run winding down the mountain, left (top) to right (bottom).
const RUN = "M24 18 C 120 14, 150 64, 250 58 S 380 14, 470 30 S 600 92, 700 78 S 860 34, 976 96";

function Marker({ x, y, section, done, current, k }: { x: number; y: number; section: SectionId; done: boolean; current: boolean; k: number }) {
  const m = MARKER[section];
  const s = (current ? 8 : 6) * k;
  const fill = done || current ? m.color : "#FFFFFF";
  const stroke = m.color;
  const common = { fill, stroke, strokeWidth: 2.5 * k };
  return (
    <g transform={`translate(${x} ${y})`}>
      {m.shape === "circle" && <circle r={s} {...common} />}
      {m.shape === "square" && <rect x={-s} y={-s} width={s * 2} height={s * 2} rx={1.5} {...common} />}
      {m.shape === "diamond" && <rect x={-s * 0.8} y={-s * 0.8} width={s * 1.6} height={s * 1.6} rx={1} transform="rotate(45)" {...common} />}
      {m.shape === "double" && (
        <>
          <rect x={-s * 1.6} y={-s * 0.7} width={s * 1.4} height={s * 1.4} rx={1} transform={`rotate(45 ${-s * 0.9} 0)`} {...common} />
          <rect x={s * 0.2} y={-s * 0.7} width={s * 1.4} height={s * 1.4} rx={1} transform={`rotate(45 ${s * 0.9} 0)`} {...common} />
        </>
      )}
    </g>
  );
}

export function TrailProgress({
  index,
  maxReached,
  sport,
  onJump,
}: {
  index: number;
  maxReached: number;
  sport?: "SKI" | "SNOWBOARD";
  onJump: (i: number) => void;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [len, setLen] = useState(0);
  // Narrow screens shrink the SVG; scale markers, strokes and rider back up so they stay visible.
  const [k, setK] = useState(1);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [t, setT] = useState(index / (STEPS.length - 1));
  const reduce = useReducedMotion();

  useLayoutEffect(() => {
    const p = pathRef.current;
    if (!p) return;
    const L = p.getTotalLength();
    setLen(L);
    setPoints(STEPS.map((_, i) => {
      const pt = p.getPointAtLength((i / (STEPS.length - 1)) * L);
      return { x: pt.x, y: pt.y };
    }));
  }, []);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const w = e?.contentRect.width ?? 1000;
      setK(Math.min(2.8, Math.max(1, (1000 / w) * 0.85)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Glide the rider down the run to the current step.
  useEffect(() => {
    const target = index / (STEPS.length - 1);
    if (reduce) {
      setT(target);
      return;
    }
    const controls = animate(t, target, { type: "spring", stiffness: 70, damping: 16, onUpdate: setT });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, reduce]);

  const rider = len && pathRef.current ? pathRef.current.getPointAtLength(Math.max(0, Math.min(1, t)) * len) : { x: 24, y: 18 };
  const section = STEPS[index]!.section;

  return (
    <div className="w-full">
      <div className="mb-1 flex items-baseline justify-between gap-3 px-1">
        <p className="font-display text-lg font-semibold text-night">
          {SECTIONS[section].name}
          <span className="ml-2 text-sm font-medium text-ink-soft">{SECTIONS[section].blurb}</span>
        </p>
        <p className="text-sm font-medium text-ink-soft">
          Step {index + 1} of {STEPS.length}
        </p>
      </div>
      <div
        ref={boxRef}
        role="progressbar"
        aria-label="Survey progress"
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-valuenow={index + 1}
        aria-valuetext={`Step ${index + 1} of ${STEPS.length}: ${SECTIONS[section].name}`}
      >
        <svg viewBox={`0 ${-30 * (k - 1)} 1000 ${116 + 30 * (k - 1)}`} className="h-auto w-full overflow-visible">
          {/* The run: wide snow track, dashed edge, and the part already skied in orange */}
          <path d={RUN} fill="none" stroke="#FFFFFF" strokeWidth={18 * k} strokeLinecap="round" />
          <path ref={pathRef} d={RUN} fill="none" stroke="#C4DAEF" strokeWidth={3 * k} strokeDasharray={`${2 * k} ${9 * k}`} strokeLinecap="round" />
          {len > 0 && (
            <path
              d={RUN}
              fill="none"
              stroke="#FF6B2C"
              strokeWidth={5 * k}
              strokeLinecap="round"
              strokeDasharray={len}
              strokeDashoffset={len * (1 - t)}
            />
          )}
          {points.map((p, i) => (
            <Marker key={i} x={p.x} y={p.y} section={STEPS[i]!.section} done={i < index} current={i === index} k={k} />
          ))}
          <g transform={`translate(${rider.x - 24 * k} ${rider.y - 44 * k}) scale(${k})`}>
            {sport === "SNOWBOARD" ? <BoarderFigure size={48} /> : <SkierFigure size={48} />}
          </g>
        </svg>
      </div>
      {/* Jump back to any step already reached (keyboard + screen reader friendly). */}
      <nav aria-label="Jump to a step" className="sr-only focus-within:not-sr-only focus-within:mt-2 focus-within:flex focus-within:flex-wrap focus-within:gap-1">
        {STEPS.map((s, i) =>
          i <= maxReached ? (
            <button key={s.id} type="button" onClick={() => onJump(i)} className="chip" aria-current={i === index ? "step" : undefined}>
              {i + 1}. {s.label}
            </button>
          ) : null,
        )}
      </nav>
    </div>
  );
}
