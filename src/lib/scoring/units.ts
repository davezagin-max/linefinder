/** Unit helpers. The engine works in cm / kg / US men's shoe size. */

export const lbsToKg = (lbs: number) => lbs * 0.45359237;
export const kgToLbs = (kg: number) => kg / 0.45359237;
export const ftInToCm = (ft: number, inches: number) => (ft * 12 + inches) * 2.54;
export const cmToIn = (cm: number) => cm / 2.54;

/** US women's → US men's (≈ −1.5). */
export const usWomensToMens = (w: number) => w - 1.5;
/** US men's shoe → Mondopoint (cm), common chart approximation: US 10 ≈ 28.0. */
export const usMensToMondo = (us: number) => us + 18;
/** EU shoe size → US men's (approximation used by most size charts). */
export const euToUsMens = (eu: number) => Math.round((eu - 33) * 2) / 2;

export function fmtWeight(kg: number, units: "imperial" | "metric" = "imperial") {
  return units === "metric" ? `${Math.round(kg)} kg` : `${Math.round(kgToLbs(kg))} lb`;
}

export function fmtHeight(cm: number, units: "imperial" | "metric" = "imperial") {
  if (units === "metric") return `${Math.round(cm)} cm`;
  const total = Math.round(cmToIn(cm));
  return `${Math.floor(total / 12)}'${total % 12}"`;
}

export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
export const clamp01 = (x: number) => clamp(x, 0, 1);
