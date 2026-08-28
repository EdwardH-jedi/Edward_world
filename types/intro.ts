/**
 * The V4 intro, as an eight-frame storyboard: title → pan → ritual → type →
 * unlock. Six of these run on a timer; TYPING waits for the visitor, because
 * the gate is the one beat the world does not perform on its own.
 */
export const INTRO_STAGES = [
  "TITLE",
  "PAN",
  "SHRINE",
  "SELECTION",
  "NAME",
  "ASK",
  "TYPING",
  "UNLOCK",
  "WORLD",
] as const;

export type IntroStage = (typeof INTRO_STAGES)[number];

/** Stages that advance themselves after a fixed beat. */
export type TimedIntroStage = Exclude<IntroStage, "TITLE" | "TYPING" | "WORLD">;

/** Stages drawn as the shrine clearing, one per monolith phase. */
export type ShrineStage = Exclude<IntroStage, "TITLE" | "PAN" | "WORLD">;
