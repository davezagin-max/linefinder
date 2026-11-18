"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Layered mountain silhouettes behind every survey screen. Each layer
 * drifts a different amount as the rider advances (parallax). Static when
 * the user prefers reduced motion.
 */
const LAYERS = [
  { d: "M0 260 L140 150 L260 220 L420 110 L560 210 L700 140 L880 230 L1040 120 L1200 210 L1360 140 L1600 230 V400 H0Z", fill: "#E1ECF8", shift: 6 },
  { d: "M0 300 L180 190 L300 260 L470 160 L640 280 L800 200 L980 300 L1150 190 L1330 290 L1600 220 V400 H0Z", fill: "#D2E2F3", shift: 14 },
  { d: "M0 350 Q 220 290 460 320 T 920 310 T 1600 320 V400 H0Z", fill: "#C4DAEF", shift: 26 },
];

export function MountainBackdrop({ step }: { step: number }) {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 bottom-0 -z-10 h-[45vh] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-snow to-glacier" />
      {LAYERS.map((l, i) => (
        <motion.svg
          key={i}
          viewBox="0 0 1600 400"
          preserveAspectRatio="xMidYMax slice"
          className="absolute bottom-0 left-[-10%] h-full w-[120%]"
          animate={{ x: reduce ? 0 : -step * l.shift }}
          transition={{ type: "spring", stiffness: 50, damping: 18 }}
        >
          <path d={l.d} fill={l.fill} />
        </motion.svg>
      ))}
    </div>
  );
}
