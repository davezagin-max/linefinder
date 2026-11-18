import type { Ability } from "@/lib/scoring/types";

/**
 * Trail-sign skill marks: ● green circle, ■ blue square, ◆ black diamond,
 * ◆◆ double black. Shape + label always travel together, so color is
 * never the only signal.
 */
export const TRAIL: Record<Ability, { label: string; short: string; color: string; textClass: string }> = {
  BEGINNER: { label: "Beginner", short: "Green", color: "#2E9E4F", textClass: "text-trail-green-ink" },
  INTERMEDIATE: { label: "Intermediate", short: "Blue", color: "#1F6FD1", textClass: "text-trail-blue-ink" },
  ADVANCED: { label: "Advanced", short: "Black", color: "#111111", textClass: "text-trail-black" },
  EXPERT: { label: "Expert", short: "Double black", color: "#111111", textClass: "text-trail-black" },
};

export function TrailShape({ level, size = 20 }: { level: Ability; size?: number }) {
  const c = TRAIL[level].color;
  switch (level) {
    case "BEGINNER":
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="10" cy="10" r="8.5" fill={c} />
        </svg>
      );
    case "INTERMEDIATE":
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
          <rect x="2" y="2" width="16" height="16" rx="1.5" fill={c} />
        </svg>
      );
    case "ADVANCED":
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
          <rect x="4" y="4" width="12" height="12" rx="1" transform="rotate(45 10 10)" fill={c} />
        </svg>
      );
    case "EXPERT":
      return (
        <svg width={size * 1.7} height={size} viewBox="0 0 34 20" aria-hidden="true">
          <rect x="4" y="4" width="12" height="12" rx="1" transform="rotate(45 10 10)" fill={c} />
          <rect x="18" y="4" width="12" height="12" rx="1" transform="rotate(45 24 10)" fill={c} />
        </svg>
      );
  }
}

/** Shape + visible label, e.g. "◆ Advanced". */
export function TrailSign({ level, size = 18, showLabel = true }: { level: Ability; size?: number; showLabel?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <TrailShape level={level} size={size} />
      {showLabel ? <span className={`font-semibold ${TRAIL[level].textClass}`}>{TRAIL[level].label}</span> : <span className="sr-only">{TRAIL[level].label}</span>}
    </span>
  );
}
