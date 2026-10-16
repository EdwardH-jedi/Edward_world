import type { MonolithPhase } from "@/lib/pixel/monolith";
import {
  INTRO_STAGES,
  SHRINE_STAGES,
  type IntroStage,
  type ShrineStage,
  type TimedIntroStage,
  type TimedShrineStage,
} from "@/types/intro";

/**
 * The default way in is title → pan → world, and the pan is the only timed
 * beat. It is held under a second: the camera still travels east, but nobody
 * waits on it to start walking.
 */
export const INTRO_STAGE_TIMINGS: Readonly<Record<TimedIntroStage, number>> = {
  PAN: 800,
};

/** test contract */
/** What the default entry performs unprompted. */
export const INTRO_SCRIPTED_MS = Object.values(INTRO_STAGE_TIMINGS).reduce(
  (total, value) => total + value,
  0,
);

/**
 * The name gate's timed beats, run by THE MONOLITH in Edward's House.
 *
 * What is held to a budget is the scripted part — everything the stone
 * performs on its own — which totals eight seconds.
 */
export const SHRINE_STAGE_TIMINGS: Readonly<Record<TimedShrineStage, number>> = {
  SHRINE: 900,
  // Thirteen letters have to leave the stone one at a time and be seen doing
  // it. Any quicker and the extraction reads as a wave rather than a choice.
  SELECTION: 2_600,
  // The hero beat. Held long enough to read three words, not just glimpse them.
  NAME: 1_800,
  ASK: 1_100,
  UNLOCK: 1_600,
};

/** test contract */
/** What the stone performs unprompted, ignoring however long typing takes. */
export const SHRINE_SCRIPTED_MS = Object.values(SHRINE_STAGE_TIMINGS).reduce(
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

export function nextIntroStage(stage: IntroStage): IntroStage {
  const index = INTRO_STAGES.indexOf(stage);
  return INTRO_STAGES[Math.min(index + 1, INTRO_STAGES.length - 1)];
}

/** The beat after `stage` in the gate, or `null` once the stone has opened. */
export function nextShrineStage(stage: ShrineStage): ShrineStage | null {
  return SHRINE_STAGES[SHRINE_STAGES.indexOf(stage) + 1] ?? null;
}

/** test contract */
export function isTimedIntroStage(stage: IntroStage): stage is TimedIntroStage {
  return stage === "PAN";
}

export function isTimedShrineStage(stage: ShrineStage): stage is TimedShrineStage {
  return stage !== "TYPING";
}

export function getIntroStageDuration(
  stage: TimedIntroStage,
  prefersReducedMotion: boolean,
) {
  return prefersReducedMotion ? 1 : INTRO_STAGE_TIMINGS[stage];
}

export function getShrineStageDuration(
  stage: TimedShrineStage,
  prefersReducedMotion: boolean,
) {
  return prefersReducedMotion ? 1 : SHRINE_STAGE_TIMINGS[stage];
}
