"use client";

import { Check } from "lucide-react";
import { useRef } from "react";

/**
 * Big tappable option card backed by a real radio/checkbox, so keyboard
 * (Tab, arrows, Space) and screen readers work natively.
 * `onPick(viaPointer)` lets single-choice steps auto-advance on a tap
 * without jumping ahead while a keyboard user arrows through options.
 */
export function OptionCard({
  type = "radio",
  name,
  value,
  checked,
  onPick,
  title,
  description,
  icon,
  footer,
  compact = false,
}: {
  type?: "radio" | "checkbox";
  name: string;
  value: string;
  checked: boolean;
  onPick: (viaPointer: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  footer?: React.ReactNode;
  compact?: boolean;
}) {
  const pointerAt = useRef(0);
  return (
    <label
      onPointerDown={() => (pointerAt.current = Date.now())}
      className={`group relative flex cursor-pointer gap-3.5 rounded-[var(--radius-card)] border-2 bg-white text-left transition-all
        has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-trail-blue
        hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)] motion-reduce:hover:translate-y-0
        ${compact ? "items-center p-3.5" : "items-start p-4 sm:p-5"}
        ${checked ? "border-trail-blue bg-glacier/70 shadow-[var(--shadow-card)]" : "border-line"}`}
    >
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        onChange={() => onPick(Date.now() - pointerAt.current < 800)}
        className="sr-only"
      />
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className={`block font-display font-semibold text-night ${compact ? "text-base" : "text-lg"}`}>{title}</span>
        {description && <span className="mt-0.5 block text-sm text-ink-soft">{description}</span>}
        {footer && <span className="mt-2 block">{footer}</span>}
      </span>
      <span
        aria-hidden="true"
        className={`grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors ${
          checked ? "border-trail-blue bg-trail-blue text-white" : "border-line bg-white text-transparent"
        } ${type === "checkbox" ? "rounded-md" : ""}`}
      >
        <Check className="size-4" strokeWidth={3} />
      </span>
    </label>
  );
}

/** Small multi-select chip backed by a checkbox. */
export function ChipToggle({
  checked,
  onChange,
  children,
  name,
  value,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
  name: string;
  value: string;
}) {
  return (
    <label
      className={`chip cursor-pointer has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-trail-blue ${
        checked ? "border-trail-blue bg-trail-blue text-white hover:border-trail-blue" : ""
      }`}
    >
      <input type="checkbox" name={name} value={value} checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
      {checked && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}
      {children}
    </label>
  );
}

/** Two- or three-way segmented control (radio group). */
export function Segmented<T extends string>({
  name,
  value,
  options,
  onChange,
  label,
}: {
  name: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <fieldset className="inline-flex rounded-full border-2 border-line bg-white p-1">
      <legend className="sr-only">{label}</legend>
      {options.map((o) => (
        <label
          key={o.value}
          className={`cursor-pointer rounded-full px-4 py-1.5 font-display text-sm font-semibold transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-trail-blue ${
            value === o.value ? "bg-night text-white" : "text-ink-soft hover:text-ink"
          }`}
        >
          <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
          {o.label}
        </label>
      ))}
    </fieldset>
  );
}

/** Numeric input that keeps "empty" distinct from 0. */
export function NumberField({
  id,
  label,
  value,
  onChange,
  suffix,
  prefix,
  min,
  max,
  step = 1,
  placeholder,
  className = "",
  hint,
}: {
  id: string;
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  suffix?: string;
  prefix?: string;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  className?: string;
  hint?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-night">
        {label}
      </label>
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-ink-soft">{prefix}</span>}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          className={`field text-lg ${prefix ? "pl-8" : ""} ${suffix ? "pr-12" : ""}`}
          aria-describedby={hint ? `${id}-hint` : undefined}
        />
        {suffix && <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-soft">{suffix}</span>}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-ink-soft">
          {hint}
        </p>
      )}
    </div>
  );
}

export function StepHeader({ title, subtitle, headingRef }: { title: React.ReactNode; subtitle?: React.ReactNode; headingRef?: React.Ref<HTMLHeadingElement> }) {
  return (
    <div className="mb-6">
      <h2 ref={headingRef} tabIndex={-1} className="text-3xl font-bold leading-tight text-night outline-none sm:text-4xl">
        {title}
      </h2>
      {subtitle && <p className="mt-2 text-base text-ink-soft sm:text-lg">{subtitle}</p>}
    </div>
  );
}

export function Callout({ tone = "info", children }: { tone?: "info" | "warn"; children: React.ReactNode }) {
  return (
    <div
      role="note"
      className={`mt-5 flex gap-3 rounded-2xl border-2 p-4 text-sm ${
        tone === "warn" ? "border-summit/50 bg-summit-soft text-ink" : "border-trail-blue/30 bg-glacier text-ink"
      }`}
    >
      {children}
    </div>
  );
}
