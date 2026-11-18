import { BRAND } from "@/lib/brand";

/** Original mark: a peak with an orange carved line sweeping down it. */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="#1E3A5F" />
      <path d="M6 38 L20 14 L27 25 L32 18 L42 38 Z" fill="#EAF3FB" />
      <path d="M20 14 L23.5 20 L21 19.2 L19 21 L17.4 18.8 Z" fill="#fff" />
      <path
        d="M21 17 C 15 23, 29 24, 22 30 S 26 36, 30 38"
        fill="none"
        stroke="#FF6B2C"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark />
      <span className="font-display text-2xl font-bold tracking-tight text-night">{BRAND.name}</span>
    </span>
  );
}
