"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

/**
 * Tracks the visitor's reduced-motion preference reactively.
 *
 * Read as an external store rather than mirrored into state, so there is no
 * render pass where the component believes motion is wanted when it is not.
 * Components that need the answer inside an imperative callback should use
 * `prefersReducedMotion()` from the motion layer instead.
 */
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
