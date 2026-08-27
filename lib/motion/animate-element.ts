import { animate } from "animejs";

export const MOTION_DEFAULTS = {
  duration: 500,
  ease: "outQuad",
} as const;

export const motionPresets = {
  enter: {
    opacity: [0, 1],
    y: [12, 0],
  },
  glyphReveal: {
    opacity: [0, 1],
    scale: [0.8, 1],
  },
  doorOpen: {
    opacity: [1, 0.45],
    scaleX: [1, 0.2],
  },
  /** A pixel phone being raised into view. */
  phoneRaise: {
    opacity: [0, 1],
    y: [140, 0],
    scale: [0.72, 1],
  },
  /** A screen of phone UI replacing the one before it. */
  screenSwap: {
    opacity: [0, 1],
    y: [8, 0],
  },
  /** Something leaving the frame without drawing attention to itself. */
  settle: {
    opacity: [1, 0],
    y: [0, -10],
  },
};

type MotionPreset = (typeof motionPresets)[keyof typeof motionPresets];

export function getMotionDuration(duration: number, prefersReducedMotion: boolean) {
  return prefersReducedMotion ? 1 : duration;
}

/**
 * Whether the visitor has asked for reduced motion.
 *
 * Exported so scripted timelines can make the same call `animateElement` makes
 * internally, instead of each one re-querying the media query by hand.
 */
export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function animateElement(
  target: HTMLElement,
  preset: MotionPreset,
  options: { duration?: number; delay?: number; ease?: string } = {},
) {
  const reduceMotion = prefersReducedMotion();
  const duration = options.duration ?? MOTION_DEFAULTS.duration;

  return animate(target, {
    ...MOTION_DEFAULTS,
    ...preset,
    ...options,
    duration: getMotionDuration(duration, reduceMotion),
  });
}
