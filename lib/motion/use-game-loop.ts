"use client";

import { useEffect, useRef } from "react";

/** Longest frame a simulation will ever be asked to swallow, in seconds. */
const MAX_DELTA = 0.05;

/**
 * Drives a real-time simulation from `requestAnimationFrame`.
 *
 * This is the third timing regime in the app and the only one the player is
 * inside: stage progression runs on `setTimeout` and scripted choreography runs
 * on anime.js. Deltas are clamped so a stall cannot teleport a simulation, and
 * the loop stops entirely when it is not active or the window loses focus —
 * pausing player-controlled play in a backgrounded tab is correct, where
 * pausing a scripted stage would not be.
 *
 * `tick` is held in a ref, so callers may pass a fresh closure each render
 * without restarting the loop.
 */
export function useGameLoop(active: boolean, tick: (deltaSeconds: number) => void) {
  const tickRef = useRef(tick);

  // Kept current in an effect rather than during render; declared before the
  // loop effect so the first frame already has the latest callback.
  useEffect(() => {
    tickRef.current = tick;
  });

  useEffect(() => {
    if (!active) return;

    let frame = 0;
    let last = performance.now();
    let running = true;

    function step(now: number) {
      const delta = Math.min((now - last) / 1_000, MAX_DELTA);
      last = now;
      if (delta > 0) tickRef.current(delta);
      if (running) frame = requestAnimationFrame(step);
    }

    function resume() {
      last = performance.now();
    }

    frame = requestAnimationFrame(step);
    window.addEventListener("focus", resume);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      window.removeEventListener("focus", resume);
    };
  }, [active]);
}
