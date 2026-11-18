"use client";

import { Check, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { GEAR_TRAITS, type GearTraitKey } from "@/lib/scoring/kit";
import type { KitItemAnswer } from "@/lib/survey/schema";
import { words } from "@/lib/survey/steps";
import { ChipToggle, OptionCard, Segmented, StepHeader } from "./controls";
import type { StepProps } from "./steps";

type Kind = KitItemAnswer["kind"];

const KIND_LABEL: Record<Kind, string> = {
  SKI: "Skis",
  SNOWBOARD: "Snowboard",
  SKI_BINDING: "Ski bindings",
  SNOWBOARD_BINDING: "Snowboard bindings",
  SKI_BOOT: "Ski boots",
  SNOWBOARD_BOOT: "Snowboard boots",
};
const SIZE_HINT: Record<Kind, string> = {
  SKI: "e.g. 177",
  SNOWBOARD: "e.g. 158W",
  SKI_BINDING: "e.g. S/M",
  SNOWBOARD_BINDING: "e.g. M",
  SKI_BOOT: "e.g. 27.5",
  SNOWBOARD_BOOT: "e.g. US 10",
};
const INTENT_LABEL = { KEEP: "Keeping it", REPLACE: "Replacing it", UNSURE: "Not sure yet" } as const;

const LIKE_TRAITS = (Object.keys(GEAR_TRAITS) as GearTraitKey[]).filter((k) => "like" in GEAR_TRAITS[k]);
const DISLIKE_TRAITS = (Object.keys(GEAR_TRAITS) as GearTraitKey[]).filter((k) => "dislike" in GEAR_TRAITS[k]);
const FIT = [
  ["HEEL_LIFT", "Heel lifts"], ["TOE_BANG", "Toes jam"], ["FOREFOOT_PINCH", "Pinches at the sides"], ["INSTEP_PRESSURE", "Pressure on top"],
  ["SHIN_BANG", "Shin bang"], ["COLD_FEET", "Cold feet"], ["CALF_PRESSURE", "Tight on calves"],
] as const;

interface SearchResult {
  id: string;
  label: string;
  kind: Kind;
  modelYear: number;
  waistMm?: number;
  flex?: number;
}

/** Type-ahead over the catalog; free text is fine too. */
function ProductCombobox({
  kind,
  value,
  productId,
  onChange,
}: {
  kind: Kind;
  value: string;
  productId?: string;
  onChange: (label: string, picked?: SearchResult) => void;
}) {
  const id = useId();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    if (productId || value.trim().length < 2) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(value)}&kind=${kind}`, { signal: ctrl.signal });
        const json = (await res.json()) as { results: SearchResult[] };
        setResults(json.results);
        setOpen(true);
        setActive(-1);
      } catch {
        /* aborted or offline: free text still works */
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [value, kind, productId]);

  const pick = (r: SearchResult) => {
    onChange(r.label, r);
    setOpen(false);
  };

  return (
    <div className="relative">
      <label htmlFor={`${id}-input`} className="mb-1.5 block text-sm font-semibold text-night">
        Which {KIND_LABEL[kind].toLowerCase()}?
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
        <input
          id={`${id}-input`}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && results.length > 0}
          aria-controls={`${id}-list`}
          aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
          autoComplete="off"
          className="field pl-10"
          placeholder="Start typing a brand or model, e.g. Mantra"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (!open || !results.length) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(results.length - 1, a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === "Enter" && active >= 0) {
              e.preventDefault();
              pick(results[active]!);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
      </div>
      {productId ? (
        <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-trail-green-ink">
          <Check className="size-3.5" aria-hidden="true" /> Matched to our catalog, so we know its specs
        </p>
      ) : value.trim().length >= 2 ? (
        <p className="mt-1.5 text-xs text-ink-soft">Not in the list? No problem, we'll use what you tell us below.</p>
      ) : null}
      {open && results.length > 0 && (
        <ul id={`${id}-list`} role="listbox" className="card absolute z-20 mt-1 max-h-64 w-full overflow-auto p-1">
          {results.map((r, i) => (
            <li
              key={r.id}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(r);
              }}
              className={`cursor-pointer rounded-lg px-3 py-2 ${i === active ? "bg-glacier" : "hover:bg-glacier/60"}`}
            >
              <span className="font-semibold text-night">{r.label}</span>
              <span className="ml-2 text-xs text-ink-soft">
                {r.modelYear}/{String((r.modelYear + 1) % 100).padStart(2, "0")}
                {r.waistMm ? ` · ${r.waistMm}mm waist` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function newItem(kind: Kind): KitItemAnswer {
  return { kind, label: "", intent: "REPLACE", condition: "GOOD", likes: [], dislikes: [] };
}

function KitItemEditor({ initial, onSave, onCancel }: { initial: KitItemAnswer; onSave: (i: KitItemAnswer) => void; onCancel: () => void }) {
  const [item, setItem] = useState<KitItemAnswer>(initial);
  const set = (patch: Partial<KitItemAnswer>) => setItem((i) => ({ ...i, ...patch }));
  const primary = item.kind === "SKI" || item.kind === "SNOWBOARD";
  const boot = item.kind === "SKI_BOOT" || item.kind === "SNOWBOARD_BOOT";
  const flipTrait = (list: "likes" | "dislikes", k: GearTraitKey, on: boolean) =>
    set({ [list]: on ? [...item[list], k] : item[list].filter((x) => x !== k) } as Partial<KitItemAnswer>);
  const firstField = useRef<HTMLDivElement>(null);
  useEffect(() => firstField.current?.querySelector("input")?.focus(), []);

  return (
    <div
      className="card mt-4 space-y-5 border-2 border-trail-blue p-4 sm:p-5"
      // Enter inside the editor shouldn't submit the whole survey step.
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") e.preventDefault();
      }}
    >
      <p className="font-display text-lg font-semibold text-night">{KIND_LABEL[item.kind]}</p>
      <div ref={firstField} className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <ProductCombobox
          kind={item.kind}
          value={item.label}
          productId={item.productId}
          onChange={(label, picked) =>
            set({ label, productId: picked?.id, approxWaistMm: picked?.waistMm ?? item.approxWaistMm, approxFlex: picked?.flex ?? item.approxFlex })
          }
        />
        <div>
          <label htmlFor="kit-size" className="mb-1.5 block text-sm font-semibold text-night">
            Size (optional)
          </label>
          <input id="kit-size" className="field" placeholder={SIZE_HINT[item.kind]} value={item.sizeLabel ?? ""} onChange={(e) => set({ sizeLabel: e.target.value || undefined })} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div>
          <p className="mb-1.5 text-sm font-semibold text-night">What's the plan for it?</p>
          <Segmented
            name="kit-intent"
            label="What's the plan for it?"
            value={item.intent}
            onChange={(v) => set({ intent: v })}
            options={[
              { value: "KEEP", label: "Keep it" },
              { value: "REPLACE", label: "Replace it" },
              { value: "UNSURE", label: "Not sure" },
            ]}
          />
        </div>
        <div>
          <label htmlFor="kit-condition" className="mb-1.5 block text-sm font-semibold text-night">
            Condition
          </label>
          <select id="kit-condition" className="field py-2" value={item.condition} onChange={(e) => set({ condition: e.target.value as KitItemAnswer["condition"] })}>
            <option value="LIKE_NEW">Like new</option>
            <option value="GOOD">Good</option>
            <option value="WORN">Worn</option>
            <option value="NEEDS_REPLACING">Needs replacing</option>
          </select>
        </div>
      </div>

      {primary && (
        <>
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-night">What do you like about it?</legend>
            <div className="flex flex-wrap gap-2">
              {LIKE_TRAITS.map((k) => (
                <ChipToggle key={k} name="likes" value={k} checked={item.likes.includes(k)} onChange={(on) => flipTrait("likes", k, on)}>
                  {GEAR_TRAITS[k].label}
                </ChipToggle>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-night">What bugs you about it?</legend>
            <div className="flex flex-wrap gap-2">
              {DISLIKE_TRAITS.map((k) => (
                <ChipToggle key={k} name="dislikes" value={k} checked={item.dislikes.includes(k)} onChange={(on) => flipTrait("dislikes", k, on)}>
                  {GEAR_TRAITS[k].label}
                </ChipToggle>
              ))}
            </div>
          </fieldset>
          {!item.productId && (
            <div className="grid gap-4 sm:grid-cols-2">
              {item.kind === "SKI" && (
                <div>
                  <label htmlFor="kit-waist" className="mb-1.5 block text-sm font-semibold text-night">
                    Waist width, if you know it (optional)
                  </label>
                  <input
                    id="kit-waist"
                    type="number"
                    inputMode="numeric"
                    className="field"
                    placeholder="e.g. 96"
                    value={item.approxWaistMm ?? ""}
                    onChange={(e) => set({ approxWaistMm: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </div>
              )}
              <div>
                <p className="mb-1.5 text-sm font-semibold text-night">How stiff does it feel?</p>
                <Segmented
                  name="kit-flex"
                  label="How stiff does it feel?"
                  value={item.approxFlex === undefined ? "?" : item.approxFlex <= 4 ? "soft" : item.approxFlex <= 6.5 ? "medium" : "stiff"}
                  onChange={(v) => set({ approxFlex: { soft: 3.5, medium: 6, stiff: 8.5, "?": undefined }[v] })}
                  options={[
                    { value: "soft", label: "Soft" },
                    { value: "medium", label: "Medium" },
                    { value: "stiff", label: "Stiff" },
                    { value: "?", label: "No idea" },
                  ]}
                />
              </div>
            </div>
          )}
        </>
      )}

      {item.kind === "SKI_BINDING" && (
        <div className="max-w-xs">
          <label htmlFor="kit-brake" className="mb-1.5 block text-sm font-semibold text-night">
            Brake width (optional)
          </label>
          <input
            id="kit-brake"
            type="number"
            inputMode="numeric"
            className="field"
            placeholder="e.g. 100"
            value={item.brakeWidthMm ?? ""}
            onChange={(e) => set({ brakeWidthMm: e.target.value ? Number(e.target.value) : undefined })}
          />
          <p className="mt-1 text-xs text-ink-soft">If you're keeping these, we'll only suggest skis their brakes fit.</p>
        </div>
      )}

      {item.kind === "SKI_BOOT" && (
        <div className="max-w-xs">
          <label htmlFor="kit-sole" className="mb-1.5 block text-sm font-semibold text-night">
            Boot sole (optional)
          </label>
          <select id="kit-sole" className="field" value={item.soleNorm ?? ""} onChange={(e) => set({ soleNorm: e.target.value || undefined })}>
            <option value="">Not sure</option>
            <option value="ALPINE_ISO5355">Standard alpine</option>
            <option value="GRIPWALK">GripWalk (rubber, rockered)</option>
            <option value="TOURING_ISO9523">Touring (with tech inserts)</option>
          </select>
        </div>
      )}

      {boot && (
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold text-night">How do they fit?</legend>
          <div className="flex flex-wrap gap-2">
            {FIT.map(([v, l]) => (
              <ChipToggle
                key={v}
                name="kit-fit"
                value={v}
                checked={(item.fitIssues ?? []).includes(v)}
                onChange={(on) => set({ fitIssues: on ? [...(item.fitIssues ?? []), v] : (item.fitIssues ?? []).filter((x) => x !== v) })}
              >
                {l}
              </ChipToggle>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex flex-wrap gap-3 pt-1">
        <button type="button" className="btn-primary py-2 text-base" disabled={!item.label.trim()} onClick={() => onSave({ ...item, label: item.label.trim() })}>
          <Check className="size-4" aria-hidden="true" /> Save to my kit
        </button>
        <button type="button" className="btn-ghost py-2 text-base" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export function KitStep({ draft, update, headingRef }: StepProps) {
  const board = draft.sport === "SNOWBOARD";
  const w = words(draft.sport);
  const kinds: Kind[] = board ? ["SNOWBOARD", "SNOWBOARD_BINDING", "SNOWBOARD_BOOT"] : ["SKI", "SKI_BINDING", "SKI_BOOT"];
  const [editing, setEditing] = useState<{ index: number | null; item: KitItemAnswer } | null>(null);
  const visible = draft.kit.map((k, i) => ({ k, i })).filter(({ k }) => kinds.includes(k.kind));

  const save = (item: KitItemAnswer) => {
    const kit = [...draft.kit];
    if (editing?.index !== null && editing?.index !== undefined) kit[editing.index] = item;
    else kit.push(item);
    // First item added: a kept item means adding to the quiver; otherwise replacing.
    const firstMode = item.intent === "KEEP" ? "ADD_TO_QUIVER" : "REPLACE";
    update({ kit, kitMode: draft.kit.length === 0 && draft.kitMode === "FRESH_START" ? firstMode : draft.kitMode });
    setEditing(null);
  };

  return (
    <>
      <StepHeader
        headingRef={headingRef}
        title="What's in your quiver now?"
        subtitle={`Optional, but it helps. Tell us what you ${w.ride} today and we'll replace what you're done with, or find what you're missing.`}
      />

      {visible.length > 0 && (
        <ul className="space-y-3" aria-label="Your current gear">
          {visible.map(({ k, i }) => (
            <li key={i} className="card flex flex-wrap items-start gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-semibold text-night">
                  {k.label}
                  {k.sizeLabel ? <span className="ml-2 text-sm font-medium text-ink-soft">{k.sizeLabel}</span> : null}
                </p>
                <p className="text-sm text-ink-soft">
                  {KIND_LABEL[k.kind]} · {INTENT_LABEL[k.intent]}
                  {k.productId ? " · in our catalog" : ""}
                </p>
                {(k.likes.length > 0 || k.dislikes.length > 0 || (k.fitIssues?.length ?? 0) > 0) && (
                  <p className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
                    {k.likes.map((t) => (
                      <span key={t} className="rounded-full bg-trail-green/10 px-2 py-0.5 font-medium text-trail-green-ink">
                        + {GEAR_TRAITS[t as GearTraitKey].label}
                      </span>
                    ))}
                    {k.dislikes.map((t) => (
                      <span key={t} className="rounded-full bg-summit-soft px-2 py-0.5 font-medium text-summit-ink">
                        − {GEAR_TRAITS[t as GearTraitKey].label}
                      </span>
                    ))}
                    {(k.fitIssues ?? []).map((t) => (
                      <span key={t} className="rounded-full bg-glacier px-2 py-0.5 font-medium text-ink-soft">
                        {FIT.find(([v]) => v === t)?.[1]}
                      </span>
                    ))}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                <button type="button" className="rounded-full p-2 text-ink-soft hover:bg-glacier hover:text-ink" aria-label={`Edit ${k.label}`} onClick={() => setEditing({ index: i, item: k })}>
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  className="rounded-full p-2 text-ink-soft hover:bg-summit-soft hover:text-summit-ink"
                  aria-label={`Remove ${k.label}`}
                  onClick={() => update((d) => ({ kit: d.kit.filter((_, j) => j !== i) }))}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing ? (
        <KitItemEditor key={editing.index ?? `new-${editing.item.kind}`} initial={editing.item} onSave={save} onCancel={() => setEditing(null)} />
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {kinds.map((k) => (
            <button key={k} type="button" className="btn-secondary py-2 text-base" onClick={() => setEditing({ index: null, item: newItem(k) })}>
              <Plus className="size-4" aria-hidden="true" /> Add {KIND_LABEL[k].toLowerCase()}
            </button>
          ))}
        </div>
      )}

      {visible.length > 0 && !editing && (
        <fieldset className="mt-8">
          <legend className="mb-2 font-display text-lg font-semibold text-night">So what are we shopping for?</legend>
          <div role="radiogroup" className="grid gap-2.5 sm:grid-cols-3">
            <OptionCard compact name="kit-mode" value="REPLACE" checked={draft.kitMode === "REPLACE"} onPick={() => update({ kitMode: "REPLACE" })} title="A replacement" description="Fix what I don't love about my current gear" />
            <OptionCard compact name="kit-mode" value="ADD_TO_QUIVER" checked={draft.kitMode === "ADD_TO_QUIVER"} onPick={() => update({ kitMode: "ADD_TO_QUIVER" })} title="Something to add" description="Fill the gaps in my quiver" />
            <OptionCard compact name="kit-mode" value="FRESH_START" checked={draft.kitMode === "FRESH_START"} onPick={() => update({ kitMode: "FRESH_START" })} title="A fresh start" description="Ignore my current gear" />
          </div>
        </fieldset>
      )}

      {visible.length === 0 && !editing && <p className="mt-6 text-sm text-ink-soft">Starting fresh? Just hit Next.</p>}
    </>
  );
}
