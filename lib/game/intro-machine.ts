import type { MonolithPhase } from "@/lib/pixel/monolith";
import {
  INTRO_STAGES,
  type IntroStage,
  type ShrineStage,
  type TimedIntroStage,
} from "@/types/intro";

/**
 * The eight-frame storyboard's timed beats.
 *
 * V4 replaces the fixed six-second intro: the ritual now has a stage that
 * waits for the visitor, so a single total for the whole sequence stopped
 * meaning anything. What is still worth holding to a budget is the scripted
 * part — everything the world performs on its own — which totals 9.8 seconds.
 */
export const INTRO_STAGE_TIMINGS: Readonly<Record<TimedIntroStage, number>> = {
  PAN: 1_800,
  SHRINE: 900,
  // Thirteen letters have to leave the stone one at a time and be seen doing
  // it. Any quicker and the extraction reads as a wave rather than a choice.
  SELECTION: 2_600,
  // The hero beat. Held long enough to read three words, not just glimpse them.
  NAME: 1_800,
  ASK: 1_100,
  UNLOCK: 1_600,
};

/** What the world performs unprompted, ignoring however long typing takes. */
export const INTRO_SCRIPTED_MS = Object.values(INTRO_STAGE_TIMINGS).reduce(
  (total, value) => total + value,
  0,
);

/**
 * Which monolith phase each shrine beat draws.
 *
 * The art module numbers its phases 3–8 after the storyboard frames, so this
 * is the one place the two vocabularies meet.
 */
export const MONOLITH_PHASE: Readonly<Record<ShrineStage, MonolithPhase>> = {
  SHRINE: 3,
  SELECTION: 4,
  NAME: 5,
  ASK: 6,
  TYPING: 7,
  UNLOCK: 8,
};

/**
 * How far east the camera travels between the title and the clearing.
 *
 * The board draws frame F2 at exactly this offset — the monolith's crown just
 * entering the right edge — so the pan lands on the composition the design
 * illustrates rather than on a distance invented here.
 */
export const PAN_OFFSET = 60;

/** Eased camera position for a pan `progress` of 0…1, in art pixels. */
export function getPanOffset(progress: number) {
  const t = Math.min(1, Math.max(0, progress));
  const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
  return Math.round(PAN_OFFSET * eased);
}

export function nextIntroStage(stage: IntroStage): IntroStage {
  const index = INTRO_STAGES.indexOf(stage);
  return INTRO_STAGES[Math.min(index + 1, INTRO_STAGES.length - 1)];
}

export function isTimedIntroStage(stage: IntroStage): stage is TimedIntroStage {
  return stage !== "TITLE" && stage !== "TYPING" && stage !== "WORLD";
}

export function isShrineStage(stage: IntroStage): stage is ShrineStage {
  return stage !== "TITLE" && stage !== "PAN" && stage !== "WORLD";
}

export function getIntroStageDuration(
  stage: TimedIntroStage,
  prefersReducedMotion: boolean,
) {
  return prefersReducedMotion ? 1 : INTRO_STAGE_TIMINGS[stage];
}
