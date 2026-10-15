"use client";

import { useSyncExternalStore } from "react";
import { PIXEL_UNIT } from "@/lib/game/terrain";
import { BACKDROP_ART_SIZE } from "@/lib/pixel/backdrop";

export const MIN_PIXEL_UNIT = 2;
export const MAX_PIXEL_UNIT = 8;

/**
 * CSS pixels per art pixel for a viewport: the largest whole number whose
 * scaled world still fits the height, so the scene fills the screen without a
 * single fractional pixel. Falls back to the minimum on a viewport too short
 * for even that.
 */
export function getPixelUnit(
  viewportHeight: number,
  artHeight: number = BACKDROP_ART_SIZE.height,
) {
  const fit = Math.floor(viewportHeight / artHeight);
  return Math.min(MAX_PIXEL_UNIT, Math.max(MIN_PIXEL_UNIT, fit));
}

/**
 * World values are authored at `PIXEL_UNIT`; these two bring them to a live
 * unit. `toCss` is exact for anything already on the art grid (every authored
 * position and size). `snapToCss` floors first, for continuous values such as
 * the player and camera, so they always land on a whole art pixel.
 */
export function toCss(authored: number, unit: number) {
  return (authored / PIXEL_UNIT) * unit;
}

export function snapToCss(authored: number, unit: number) {
  return Math.floor(authored / PIXEL_UNIT) * unit;
}

function subscribe(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

const getSnapshot = () => getPixelUnit(window.innerHeight);
// Server and first hydration paint at the authored unit; the client then
// settles on the real one.
const getServerSnapshot = () => PIXEL_UNIT;

/** The live art-pixel unit for this viewport, re-chosen on resize. */
export function usePixelUnit() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
