"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";

/**
 * Cadence of the world's ambient tick, in milliseconds.
 *
 * 450ms is the approved concept board's own cadence. Chunky and deliberate is
 * the point: smoke, water, CRT flicker and marquee bulbs are meant to read as
 * a hand-authored loop, not as smooth interpolation.
 */
export const AMBIENT_FRAME_MS = 450;

/** One ambient frame counter, read as an external store. */
export interface AmbientClock {
  subscribe: (onChange: () => void) => () => void;
  getSnapshot: () => number;
}

function createAmbientClock() {
  let frame = 0;
  const listeners = new Set<() => void>();
  return {
    subscribe(onChange: () => void) {
      listeners.add(onChange);
      return () => void listeners.delete(onChange);
    },
    getSnapshot: () => frame,
    tick() {
      frame += 1;
      listeners.forEach((listener) => listener());
    },
  };
}

const getServerFrame = () => 0;

/**
 * Drives environmental animation from a single shared frame counter.
 *
 * Freezes entirely when the world is not the active surface — the approved
 * INDEX behaviour is "world audio/motion pauses underneath" — and when the
 * visitor has asked for reduced motion, in which case the world still renders
 * its current frame and simply stops advancing. The preference is read
 * reactively, so turning it on mid-visit freezes the world and turning it off
 * resumes it.
 *
 * The clock is a store rather than state, so the component that owns it does
 * not re-render on every tick; only the leaves that read it with
 * `useAmbientClockFrame` do. One clock per owner, because surfaces with
 * different `active` answers can be mounted at once.
 */
export function useAmbientClock(active: boolean): AmbientClock {
  const [clock] = useState(createAmbientClock);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!active || reduced) return;
    const interval = window.setInterval(clock.tick, AMBIENT_FRAME_MS);
    return () => window.clearInterval(interval);
  }, [active, clock, reduced]);

  return clock;
}

/** The current frame of a clock; re-renders only the caller on each tick. */
export function useAmbientClockFrame(clock: AmbientClock) {
  return useSyncExternalStore(clock.subscribe, clock.getSnapshot, getServerFrame);
}

/** Owns a clock and reads it in the same component, for small scenes. */
export function useAmbientFrame(active: boolean) {
  return useAmbientClockFrame(useAmbientClock(active));
}
