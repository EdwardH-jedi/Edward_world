"use client";

import { useEffect, useState } from "react";

/**
 * Cadence of the world's ambient tick, in milliseconds.
 *
 * 450ms is the approved concept board's own cadence. Chunky and deliberate is
 * the point: smoke, water, CRT flicker and marquee bulbs are meant to read as
 * a hand-authored loop, not as smooth interpolation.
 */
export const AMBIENT_FRAME_MS = 450;

/**
 * Drives environmental animation from a single shared frame counter.
 *
 * Freezes entirely when the world is not the active surface — the approved
 * INDEX behaviour is "world audio/motion pauses underneath" — and when the
 * visitor has asked for reduced motion, in which case the world still renders
 * its full first frame and simply stops advancing.
 */
export function useAmbientFrame(active: boolean) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!active) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const interval = window.setInterval(() => {
      setFrame((current) => current + 1);
    }, AMBIENT_FRAME_MS);

    return () => window.clearInterval(interval);
  }, [active]);

  return frame;
}
