"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

interface Flake {
  left: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  opacity: number;
}

/**
 * Light falling snow. Flakes are generated after mount (no hydration
 * mismatch) and nothing renders when the user prefers reduced motion.
 */
export function Snowfall({ count = 40, className = "" }: { count?: number; className?: string }) {
  const reduce = useReducedMotion();
  const [flakes, setFlakes] = useState<Flake[]>([]);

  useEffect(() => {
    setFlakes(
      Array.from({ length: count }, () => ({
        left: Math.random() * 100,
        size: 3 + Math.random() * 5,
        duration: 9 + Math.random() * 10,
        delay: -Math.random() * 18,
        drift: (Math.random() - 0.5) * 60,
        opacity: 0.45 + Math.random() * 0.45,
      })),
    );
  }, [count]);

  if (reduce) return null;
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {flakes.map((f, i) => (
        <span
          key={i}
          className="snowflake absolute -top-4 rounded-full bg-white"
          style={
            {
              left: `${f.left}%`,
              width: f.size,
              height: f.size,
              opacity: f.opacity,
              animationDuration: `${f.duration}s`,
              animationDelay: `${f.delay}s`,
              "--drift": `${f.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
      <style>{`
        @keyframes snowfall {
          0% { transform: translate3d(0, -10px, 0); }
          100% { transform: translate3d(var(--drift), 110vh, 0); }
        }
        .snowflake { animation: snowfall linear infinite; filter: drop-shadow(0 0 2px rgb(30 58 95 / .15)); }
      `}</style>
    </div>
  );
}
