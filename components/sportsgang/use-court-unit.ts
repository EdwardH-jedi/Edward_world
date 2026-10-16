"use client";

import { useFitPixelUnit } from "@/lib/motion/use-pixel-unit";
import { COURT_ART_SIZE } from "@/lib/pixel/sportsgang";

/** The court has always had 92vw; half the height leaves the HUD above it room. */
const COURT_SHARE = { width: 0.92, height: 0.5 } as const;

/** Whole CSS pixels per court art pixel, for the court and every sprite on it. */
export function useCourtUnit() {
  return useFitPixelUnit(COURT_ART_SIZE, COURT_SHARE);
}

/**
 * The court unit as CSS. Where not even two whole pixels fit (a portrait
 * phone), the court keeps its old fluid 92vw rather than shrink to 225px.
 */
export function courtUnitCss(courtUnit: number) {
  return courtUnit > 1 ? `${courtUnit}px` : `calc(92vw / ${COURT_ART_SIZE.width})`;
}
