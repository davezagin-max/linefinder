import { ArrowRight, BadgeDollarSign, Mountain, Sparkles } from "lucide-react";
import Link from "next/link";
import { Snowfall } from "@/components/ui/Snowfall";
import { SunriseMountains } from "@/components/ui/SunriseMountains";
import { TrailShape } from "@/components/ui/TrailSign";
import { BRAND } from "@/lib/brand";

const HOW = [
  {
    icon: Mountain,
    title: "Tell us how you ride",
    body: "Height, weight, home mountain, terrain and style. About 2 minutes.",
  },
  {
    icon: Sparkles,
    title: "Get picks that fit you",
    body: "Ranked skis or boards with a fit score, your size, and why each one suits you.",
  },
  {
    icon: BadgeDollarSign,
    title: "Find the best price",
    body: "Prices from multiple retailers, plus matching bindings and boots.",
  },
];

export default function Home() {
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <SunriseMountains className="absolute inset-0 -z-10 h-full w-full" />
        <Snowfall count={45} />
        <div className="mx-auto flex min-h-[78svh] max-w-7xl flex-col items-start justify-start px-4 pb-48 pt-16 sm:px-6 sm:pt-24 md:pb-64">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-sm font-semibold text-night shadow-sm backdrop-blur">
            <TrailShape level="BEGINNER" size={12} />
            <TrailShape level="INTERMEDIATE" size={12} />
            <TrailShape level="ADVANCED" size={12} />
            <span>For every level, green to double black</span>
          </p>
          <h1 className="max-w-3xl text-5xl font-bold leading-[1.02] text-night sm:text-6xl md:text-7xl">
            Find Your Perfect Setup
          </h1>
          <p className="mt-5 max-w-xl text-lg font-medium text-night sm:text-xl">
            {BRAND.tagline}. Skis or snowboard, bindings and boots, sized for you and ranked by how well they fit the way you ride.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/survey" className="btn-primary text-xl">
              Strap in <ArrowRight className="size-5" aria-hidden="true" />
            </Link>
            <span className="rounded-full bg-white/70 px-3 py-1 text-sm font-medium text-ink-soft backdrop-blur">
              12 quick questions · about 2 minutes
            </span>
          </div>
        </div>
      </section>

      <section aria-labelledby="how" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 id="how" className="text-3xl font-bold text-night">
          How it works
        </h2>
        <ol className="mt-8 grid gap-5 md:grid-cols-3">
          {HOW.map((h, i) => (
            <li key={h.title} className="card relative p-6">
              <span className="absolute -top-3 left-6 rounded-full bg-night px-2.5 py-0.5 font-display text-sm font-semibold text-white">
                Step {i + 1}
              </span>
              <h.icon className="mb-3 mt-2 size-8 text-trail-blue" aria-hidden="true" />
              <h3 className="text-xl font-semibold text-night">{h.title}</h3>
              <p className="mt-1.5 text-ink-soft">{h.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
