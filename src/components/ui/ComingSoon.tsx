import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { TrailShape } from "./TrailSign";

/** Friendly empty state for pages that arrive in a later stage. */
export function ComingSoon({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <div className="mx-auto mb-5 flex w-fit items-center gap-2 rounded-full bg-glacier px-3 py-1.5">
        <TrailShape level="BEGINNER" size={12} />
        <TrailShape level="INTERMEDIATE" size={12} />
        <TrailShape level="ADVANCED" size={12} />
        <span className="text-sm font-semibold text-ink-soft">Trail opening soon</span>
      </div>
      <h1 className="text-4xl font-bold text-night">{title}</h1>
      <p className="mt-3 text-lg text-ink-soft">{body}</p>
      <Link href="/survey" className="btn-primary mt-8">
        Find my setup <ArrowRight className="size-5" aria-hidden="true" />
      </Link>
    </div>
  );
}
