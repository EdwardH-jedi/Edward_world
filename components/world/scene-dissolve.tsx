"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePixelUnit } from "@/lib/game/use-pixel-unit";
import { play } from "@/lib/audio/sfx";
import {
  DISSOLVE_STEPS,
  DISSOLVE_STEP_MS,
  isCovered,
} from "@/lib/motion/dissolve";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";

const COVER = "#14110D";

/**
 * Covers the cut between scenes and lifts in six hard steps.
 *
 * The scene underneath has already switched by the time this paints, so the
 * overlay starts fully closed and opens, which is why it is a layout effect
 * that draws the first frame. Reduced motion keeps the cut and keeps the sound.
 */
export function SceneDissolve({ sceneKey }: { sceneKey: string }) {
  const unit = usePixelUnit();
  const reduced = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playedFor = useRef(sceneKey);
  const [seen, setSeen] = useState(sceneKey);
  const [step, setStep] = useState(DISSOLVE_STEPS);

  if (seen !== sceneKey) {
    setSeen(sceneKey);
    setStep(reduced ? DISSOLVE_STEPS : 0);
  }

  useEffect(() => {
    if (playedFor.current === sceneKey) return;
    playedFor.current = sceneKey;
    play("enter");
  }, [sceneKey]);

  useEffect(() => {
    if (step >= DISSOLVE_STEPS) return;
    const timer = window.setTimeout(() => setStep(step + 1), DISSOLVE_STEP_MS);
    return () => window.clearTimeout(timer);
  }, [step]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const cols = Math.ceil(window.innerWidth / unit);
    const rows = Math.ceil(window.innerHeight / unit);
    canvas.width = cols * unit;
    canvas.height = rows * unit;
    context.fillStyle = COVER;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        if (isCovered(col, row, step)) context.fillRect(col * unit, row * unit, unit, unit);
      }
    }
  }, [step, unit]);

  if (step >= DISSOLVE_STEPS) return null;
  return <canvas aria-hidden="true" className="scene-dissolve" ref={canvasRef} />;
}
