import { animate } from "animejs";
import { prefersReducedMotion } from "@/lib/motion/animate-element";

/**
 * Scripted choreography for the monument intro.
 *
 * Nothing here advances application state. Each function starts an animation
 * and hands back a handle the caller cancels on cleanup; the stage machine
 * keeps its own time on `setTimeout`. That separation is deliberate and is not
 * a style preference: anime.js runs on `requestAnimationFrame`, which browsers
 * throttle hard in a backgrounded tab, so a sequence that advanced a stage
 * from `onComplete` would stall the whole intro behind a hidden tab.
 *
 * Under reduced motion each function jumps straight to its end value and
 * returns a handle with nothing to cancel — the beat still happens, it simply
 * does not travel.
 */

export interface ScriptedValue {
  cancel(): void;
}

const INERT: ScriptedValue = { cancel() {} };

/**
 * Drives one number from `from` to `to` and reports every step.
 *
 * The intro's moving parts — the camera offset, how many letters have pulled
 * free — are arguments to a pixel-art routine rather than styles on an
 * element, so they are animated as plain values and re-drawn, not tweened as
 * CSS. anime.js still owns the easing and the clock.
 */
export function driveValue(
  onUpdate: (value: number) => void,
  options: {
    from?: number;
    to: number;
    duration: number;
    ease?: string;
  },
): ScriptedValue {
  const { from = 0, to, duration, ease = "inOutSine" } = options;

  if (prefersReducedMotion()) {
    onUpdate(to);
    return INERT;
  }

  const carrier = { value: from };
  const animation = animate(carrier, {
    value: to,
    duration,
    ease,
    onUpdate: () => onUpdate(carrier.value),
    onComplete: () => onUpdate(to),
  });

  return {
    cancel() {
      animation.pause();
    },
  };
}
