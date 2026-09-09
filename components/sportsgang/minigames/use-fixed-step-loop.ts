"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  createFixedStepper,
  type FixedStepper,
  type FixedStepperOptions,
} from "@/lib/game/minigames/fixed-step";
import type { MinigameInput } from "@/lib/game/minigames/types";

/**
 * Runs a SportsGang simulation on the fixed clock.
 *
 * The variable-delta `useGameLoop` in `lib/motion/` still drives the house,
 * the intro and the arcade platformer; this wrapper is the SportsGang-only
 * adapter over it, so a change here cannot reach the rest of the world.
 *
 * `active` going false suspends: the accumulator and any latched edge are
 * dropped, so returning to a game does not replay the tap that preceded
 * leaving it, and does not simulate the time spent away.
 */
export function useFixedStepGameLoop(
  active: boolean,
  readInput: () => MinigameInput,
  step: (dtSeconds: number, input: MinigameInput) => void,
  options: FixedStepperOptions & {
    /**
     * Called whenever play suspends, so the input source can drop its holds
     * and any latched edge at the same moment the clock does.
     *
     * Pass `clear` from `useMinigameInput`. Without it the two halves suspend
     * independently: the stepper forgets its latched edge and the input source
     * does not, so a tap made just before tabbing away fires on return.
     */
    onSuspend?: () => void;
  } = {},
): { stepper: FixedStepper } {
  const stepMs = options.stepMs;
  const maxSubsteps = options.maxSubsteps;
  const onSuspend = options.onSuspend;

  const stepper = useMemo(
    () => createFixedStepper({ stepMs, maxSubsteps }),
    [stepMs, maxSubsteps],
  );

  const readInputRef = useRef(readInput);
  const stepRef = useRef(step);
  const suspendRef = useRef(onSuspend);
  useEffect(() => {
    readInputRef.current = readInput;
    stepRef.current = step;
    suspendRef.current = onSuspend;
  });

  /** One suspension path, so the clock and the input source cannot disagree. */
  const suspend = useCallback(() => {
    stepper.reset();
    suspendRef.current?.();
  }, [stepper]);

  useEffect(() => {
    if (!active) {
      suspend();
      return;
    }

    let frame = 0;
    let last = performance.now();
    let running = true;

    function onFrame(now: number) {
      const frameDeltaMs = now - last;
      last = now;
      stepper.advance(frameDeltaMs, readInputRef.current(), (dt, input) =>
        stepRef.current(dt, input),
      );
      if (running) frame = requestAnimationFrame(onFrame);
    }

    /** Coming back from a blurred window or a hidden tab restarts the clock. */
    function resume() {
      last = performance.now();
      suspend();
    }

    function onVisibility() {
      if (document.visibilityState === "visible") resume();
      else suspend();
    }

    frame = requestAnimationFrame(onFrame);
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", onVisibility);
      suspend();
    };
  }, [active, stepper, suspend]);

  return { stepper };
}
