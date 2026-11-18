/** Little rider figures for the progress run and the sport cards. */

export function SkierFigure({ size = 32, color = "#1E3A5F", accent = "#FF6B2C" }: { size?: number; color?: string; accent?: string }) {
  return (
    <svg width={size} height={size} viewBox="-20 -24 40 44" aria-hidden="true">
      <path d="M-17 15 L17 9" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <circle cx="3" cy="-17" r="5" fill={accent} />
      <path d="M1 -11 L-3 2 L6 11 M-3 2 L-9 11 M0 -6 L11 -1 L14 10 M0 -6 L-9 -3 L-13 8" stroke={color} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function BoarderFigure({ size = 32, color = "#1E3A5F", accent = "#FF6B2C" }: { size?: number; color?: string; accent?: string }) {
  return (
    <svg width={size} height={size} viewBox="-20 -24 40 44" aria-hidden="true">
      <rect x="-17" y="10" width="34" height="5" rx="2.5" fill={color} transform="rotate(-8 0 12)" />
      <circle cx="0" cy="-17" r="5" fill={accent} />
      <path d="M0 -11 L0 0 L-7 10 M0 0 L7 9 M0 -7 L-11 -9 M0 -7 L11 -4" stroke={color} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

/** Bigger illustrations for the sport choice. */
export function SportIllustration({ sport }: { sport: "SKI" | "SNOWBOARD" }) {
  return (
    <span className="relative grid size-20 place-items-center rounded-2xl bg-glacier sm:size-24">
      <svg viewBox="0 0 96 96" className="absolute inset-0 size-full" aria-hidden="true">
        <path d="M0 74 L26 46 L40 60 L62 34 L96 70 V96 H0Z" fill="#D7E7F6" />
        <path d="M62 34 L70 43 L65 42 L62 46 L58 42 L54 43Z" fill="#fff" />
      </svg>
      <span className="relative">{sport === "SKI" ? <SkierFigure size={54} /> : <BoarderFigure size={54} />}</span>
    </span>
  );
}
