"use client";

import { useSyncExternalStore } from "react";
import { getPixelUnit } from "@/lib/game/pixel-unit";
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
