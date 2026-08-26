export const INTRO_STAGES = [
  "TITLE",
  "APPROACH",
  "STOP",
  "GLYPH_REVEAL",
  "EDWARD_FORMATION",
  "DOOR_UNLOCK",
  "DOOR_OPEN",
  "WORLD",
] as const;

export type IntroStage = (typeof INTRO_STAGES)[number];
export type TimedIntroStage = Exclude<IntroStage, "TITLE" | "WORLD">;
