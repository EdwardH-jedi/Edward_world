import { INTRO_STAGES, type IntroStage, type TimedIntroStage } from "@/types/intro";

/**
 * Six seconds, exactly. The approved direction asks for restraint, so the
 * budget is spent on the two beats that carry meaning — the creatures arriving
 * and the word forming — rather than on the door.
 */
export const INTRO_STAGE_TIMINGS: Readonly<Record<TimedIntroStage, number>> = {
  APPROACH: 1_100,
  STOP: 500,
  GLYPH_REVEAL: 1_000,
  EDWARD_FORMATION: 1_300,
  DOOR_UNLOCK: 800,
  DOOR_OPEN: 1_300,
};

/** What the whole ritual costs, for anyone tuning it. */
export const INTRO_TOTAL_MS = Object.values(INTRO_STAGE_TIMINGS).reduce(
  (total, value) => total + value,
  0,
);

export function nextIntroStage(stage: IntroStage): IntroStage {
  const index = INTRO_STAGES.indexOf(stage);
  return INTRO_STAGES[Math.min(index + 1, INTRO_STAGES.length - 1)];
}

export function isTimedIntroStage(stage: IntroStage): stage is TimedIntroStage {
  return stage !== "TITLE" && stage !== "WORLD";
}

export function getIntroStageDuration(
  stage: TimedIntroStage,
  prefersReducedMotion: boolean,
) {
  return prefersReducedMotion ? 1 : INTRO_STAGE_TIMINGS[stage];
}
