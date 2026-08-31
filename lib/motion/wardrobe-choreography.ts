import { animate, utils } from "animejs";
import { prefersReducedMotion } from "@/lib/motion/animate-element";

/**
 * Choreography for the Wardrobe room.
 *
 * Every function here is decoration and nothing more: state has already moved
 * by the time one is called, so a throttled tab that never runs a frame still
 * ends up with a correct room. Under reduced motion each one snaps to its end
 * state and returns null.
 *
 * The travelling piece is always a throwaway clone rather than the real node,
 * because the real one is a React-owned button that may re-render, move, or
 * unmount while the flight is still in the air.
 */

const GHOST_CLASS = "wd-ghost";

export interface FlightOptions {
  readonly duration?: number;
  readonly onSettled?: () => void;
}

export interface WardrobeFlight {
  cancel: () => void;
}

/**
 * Sends a copy of `source` across the screen to where `target` sits.
 *
 * Both boxes are measured at call time, so the same call works in the desktop
 * row layout and in the stacked mobile one without knowing which is on screen.
 */
export function flyBetween(
  source: HTMLElement | null,
  target: HTMLElement | null,
  { duration = 460, onSettled }: FlightOptions = {},
): WardrobeFlight | null {
  if (!source || !target) return null;
  if (prefersReducedMotion()) {
    onSettled?.();
    return null;
  }

  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  if (!from.width || !to.width) {
    onSettled?.();
    return null;
  }

  const ghost = source.cloneNode(true) as HTMLElement;
  ghost.classList.add(GHOST_CLASS);
  ghost.setAttribute("aria-hidden", "true");
  ghost.style.left = `${from.left}px`;
  ghost.style.top = `${from.top}px`;
  ghost.style.width = `${from.width}px`;
  ghost.style.height = `${from.height}px`;
  document.body.append(ghost);

  let done = false;
  let fallback: number | null = null;
  let animation: ReturnType<typeof animate> | null = null;

  const clearFallback = () => {
    if (fallback === null) return;
    window.clearTimeout(fallback);
    fallback = null;
  };

  const finish = () => {
    if (done) return;
    done = true;
    clearFallback();
    ghost.remove();
    onSettled?.();
  };

  const cancel = () => {
    if (done) return;
    done = true;
    clearFallback();
    animation?.pause();
    ghost.remove();
  };

  // A timer as well as the callback: anime.js runs on requestAnimationFrame,
  // which stops entirely in a backgrounded tab, and a ghost left pinned over
  // the room would be worse than a flight that never plays.
  fallback = window.setTimeout(finish, duration + 400);

  animation = animate(ghost, {
    left: to.left + (to.width - from.width) / 2,
    top: to.top + (to.height - from.height) / 2,
    scale: [1, Math.max(0.4, Math.min(1, to.width / from.width))],
    opacity: [1, 0.85],
    duration,
    ease: "inOutQuad",
    onComplete: finish,
  });

  return { cancel };
}

/** A shelf tile or table card arriving where it was sent. */
export function landIn(target: HTMLElement | null, duration = 260) {
  if (!target) return null;
  if (prefersReducedMotion()) {
    utils.set(target, { opacity: 1, scale: 1 });
    return null;
  }
  return animate(target, {
    opacity: [0, 1],
    scale: [0.86, 1],
    duration,
    ease: "outBack",
  });
}

/** The mannequin taking the weight of a garment it has just been given. */
export function settleOutfit(figure: HTMLElement | null) {
  if (!figure) return null;
  if (prefersReducedMotion()) {
    utils.set(figure, { translateY: 0 });
    return null;
  }
  return animate(figure, {
    translateY: [0, -5, 0],
    duration: 420,
    ease: "outQuad",
  });
}

/** The look landing in the frame on the wall, and the frame acknowledging it. */
export function confirmSave(frame: HTMLElement | null) {
  if (!frame) return null;
  if (prefersReducedMotion()) {
    utils.set(frame, { opacity: 1, scale: 1 });
    return null;
  }
  return animate(frame, {
    scale: [0.9, 1.04, 1],
    opacity: [0.5, 1],
    duration: 520,
    ease: "outQuad",
  });
}
