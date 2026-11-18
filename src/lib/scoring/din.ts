/**
 * DIN (release value) ESTIMATE — general guidance only. A certified shop
 * technician must set the actual value. Follows the ISO 11088 method:
 * skier code from weight/height → adjust for skier type and age → look up
 * by boot sole length.
 */
import { DIN_BSL_COLUMNS, DIN_CHART, DIN_CODE_ORDER, DIN_HEIGHT_CODES, DIN_WEIGHT_CODES } from "./tables";
import type { Ability, AgeRange, Style } from "./types";
import { SETUP } from "./weights";

export interface DinInput {
  weightKg: number;
  heightCm: number;
  ability: Ability;
  style: Style;
  ageRange?: AgeRange;
  mondo: number; // cm
}

export function skierType(ability: Ability, style: Style): { type: "I" | "II" | "III"; rowShift: number } {
  if (ability === "EXPERT") return { type: "III", rowShift: 3 }; // "III+"
  if (ability === "ADVANCED") return { type: "III", rowShift: 2 };
  if (ability === "INTERMEDIATE") return style === "CHARGING" ? { type: "III", rowShift: 2 } : { type: "II", rowShift: 1 };
  return style === "CHARGING" ? { type: "II", rowShift: 1 } : { type: "I", rowShift: 0 };
}

export function estimateDin(i: DinInput) {
  const codeFor = (table: [number, string][], x: number) => table.find(([max]) => x <= max)![1];
  const wIdx = DIN_CODE_ORDER.indexOf(codeFor(DIN_WEIGHT_CODES, i.weightKg));
  const hIdx = DIN_CODE_ORDER.indexOf(codeFor(DIN_HEIGHT_CODES, i.heightCm));
  const { type, rowShift } = skierType(i.ability, i.style);
  const ageShift = i.ageRange === "55_64" || i.ageRange === "65_PLUS" ? -1 : 0;
  const rowIdx = Math.max(0, Math.min(DIN_CODE_ORDER.length - 1, Math.min(wIdx, hIdx) + rowShift + ageShift));
  const code = DIN_CODE_ORDER[rowIdx]!;

  const bsl = i.mondo * 10 + SETUP.bslOverMondoMm;
  const col = DIN_BSL_COLUMNS.findIndex((max) => bsl <= max);
  const rowVals = DIN_CHART[code]!;
  // Small codes have no value for long soles: use the nearest defined column.
  let value = rowVals[col] ?? null;
  for (let d = 1; value === null && d < rowVals.length; d++) value = rowVals[col - d] ?? rowVals[col + d] ?? null;

  const v = value ?? 0.75;
  return { value: v, low: Math.max(0.75, v - 0.5), high: v + 0.5, skierType: type, code };
}
