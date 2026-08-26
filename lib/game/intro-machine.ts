import { INTRO_STAGES, type IntroStage, type TimedIntroStage } from "@/types/intro";

export const INTRO_STAGE_TIMINGS: Readonly<Record<TimedIntroStage, number>> = {
  APPROACH: 700,
  STOP: 350,
  GLYPH_REVEAL: 650,
  EDWARD_FORMATION: 700,
  DOOR_UNLOCK: 450,
  DOOR_OPEN: 650,
};

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
