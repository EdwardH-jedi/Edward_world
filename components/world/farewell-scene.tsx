"use client";

import { useCallback, useEffect, useRef } from "react";
import { useDialogFocus } from "@/components/ui/accessible-dialog";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import {
  createFireworks,
  createStillFireworks,
  FIREWORK_COLORS,
  sparkAlpha,
  stepFireworks,
} from "@/lib/pixel/fireworks";

interface FarewellSceneProps {
  /** Go back to the world, near the gate. */
  onLookAround: () => void;
  /** Open the project index. */
  onOpenIndex: () => void;
}

/** The two lines the visit ends on. Exact, and not assembled from parts. */
export const FAREWELL_LINES = [
  "Bye bye!",
  "Hope to see you again, and have a great day!",
] as const;

/** Art-space size of the firework canvas. Scaled to fit by CSS. */
const ART_WIDTH = 240;
const ART_HEIGHT = 135;
/** Art pixels per drawn spark, so the sparks stay square and on the grid. */
const SPARK_UNIT = 2;

/**
 * The send-off at the world's right-hand gate.
 *
 * What it deliberately does not do: close the tab, navigate anywhere, play a
 * sound, flash the screen, shake anything, or loop. The fireworks are six
 * bursts over about five seconds and then they are finished. A visitor who
 * asked for reduced motion gets the same bursts as one still frame.
 *
 * The world underneath is inert while this is open — `portfolio-experience`
 * passes `disabled`, which is the same path every other overlay uses — so no
 * game or world key does anything during the goodbye.
 *
 * Nothing is counted, submitted or incremented here. Leaving is not an event.
 */
export function FarewellScene({ onLookAround, onOpenIndex }: FarewellSceneProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const lookAroundRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();

  // Escape leaves the farewell the same way the buttons do, and focus returns
  // to whatever opened it.
  const close = useCallback(() => onLookAround(), [onLookAround]);
  useDialogFocus({
    containerRef: dialogRef,
    initialFocusRef: lookAroundRef,
    onClose: close,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = ART_WIDTH;
    canvas.height = ART_HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.imageSmoothingEnabled = false;

    function paint(state: ReturnType<typeof createFireworks>) {
      const ctx = context;
      if (!ctx) return;
      ctx.clearRect(0, 0, ART_WIDTH, ART_HEIGHT);
      for (const burst of state.bursts) {
        for (const spark of burst.sparks) {
          ctx.globalAlpha = sparkAlpha(spark);
          ctx.fillStyle = FIREWORK_COLORS[spark.colorIndex];
          ctx.fillRect(
            Math.round(spark.x / SPARK_UNIT) * SPARK_UNIT,
            Math.round(spark.y / SPARK_UNIT) * SPARK_UNIT,
            SPARK_UNIT,
            SPARK_UNIT,
          );
        }
      }
      ctx.globalAlpha = 1;
    }

    // Reduced motion: the same six bursts, drawn once and left alone. No
    // animation frame is ever scheduled, so there is nothing to clean up.
    if (reducedMotion) {
      paint(createStillFireworks(ART_WIDTH, ART_HEIGHT));
      return;
    }

    const state = createFireworks();
    let frame = 0;
    let last = performance.now();
    let running = true;

    function tick(now: number) {
      if (!running) return;
      // Clamped, so a backgrounded tab returning does not jump the whole show.
      const dt = Math.min((now - last) / 1_000, 0.05);
      last = now;
      const alive = stepFireworks(state, dt, ART_WIDTH, ART_HEIGHT);
      paint(state);
      // The show is finite: when the last spark is gone the loop stops rather
      // than idling for as long as the panel is open.
      if (alive) frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(frame);
    };
  }, [reducedMotion]);

  return (
    <div className="overlay-backdrop sg-exit__backdrop" role="presentation">
      <canvas aria-hidden="true" className="sg-exit__sky" ref={canvasRef} />
      <div
        aria-labelledby="sg-exit-title"
        aria-modal="true"
        className="dialog sg-exit"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <p className="sg-exit__bye" id="sg-exit-title">
          {FAREWELL_LINES[0]}
        </p>
        <p className="sg-exit__line">{FAREWELL_LINES[1]}</p>

        <div className="sg-exit__actions">
          <button
            className="loc-button loc-button--primary"
            onClick={onLookAround}
            ref={lookAroundRef}
            type="button"
          >
            LOOK AROUND AGAIN
          </button>
          <button className="loc-button" onClick={onOpenIndex} type="button">
            PROJECT INDEX
          </button>
        </div>

        <p className="sg-exit__hint">ESC · BACK TO THE WORLD</p>
      </div>
    </div>
  );
}
