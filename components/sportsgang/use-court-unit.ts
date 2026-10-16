"use client";

import { courtUnit } from "@/lib/game/pixel-unit";
import { useDerivedUnit } from "@/lib/motion/use-pixel-unit";

/** Whole CSS pixels per court art pixel, for the court and every sprite on it. */
export function useCourtUnit() {
  return useDerivedUnit(({ width }, liveUnit) => courtUnit(width, liveUnit));
}

/** The court unit as CSS: always a whole number of pixels, never a fluid calc. */
export function courtUnitCss(unit: number) {
  return `${unit}px`;
}
