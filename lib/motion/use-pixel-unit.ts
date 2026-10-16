"use client";

import { useSyncExternalStore } from "react";
import { fitPixelUnit, getPixelUnit } from "@/lib/game/pixel-unit";
import { PIXEL_UNIT } from "@/lib/game/terrain";

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

/**
 * The live unit for a scene that must fit a share of the viewport, e.g.
 * `{ width: 0.98, height: 0.66 }`. See `fitPixelUnit`.
 */
export function useFitPixelUnit(
  art: { width: number; height: number },
  share: { width: number; height: number },
) {
  return useSyncExternalStore(
    subscribe,
    () =>
      fitPixelUnit(
        getSnapshot(),
        {
          width: window.innerWidth * share.width,
          height: window.innerHeight * share.height,
        },
        art,
      ),
    getServerSnapshot,
  );
}
