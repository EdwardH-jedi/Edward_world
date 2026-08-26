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
};

type MotionPreset = (typeof motionPresets)[keyof typeof motionPresets];

export function getMotionDuration(duration: number, prefersReducedMotion: boolean) {
  return prefersReducedMotion ? 1 : duration;
}

export function animateElement(
  target: HTMLElement,
  preset: MotionPreset,
  options: { duration?: number; delay?: number; ease?: string } = {},
) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const duration = options.duration ?? MOTION_DEFAULTS.duration;

  return animate(target, {
    ...MOTION_DEFAULTS,
    ...preset,
    ...options,
    duration: getMotionDuration(duration, reduceMotion),
  });
}
