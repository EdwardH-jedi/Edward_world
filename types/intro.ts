/**
 * The default way in: title → pan → world. Only the pan runs on a timer; the
 * title waits for ENTER.
 */
export const INTRO_STAGES = ["TITLE", "PAN", "WORLD"] as const;

export type IntroStage = (typeof INTRO_STAGES)[number];

/** Stages that advance themselves after a fixed beat. */
export type TimedIntroStage = Extract<IntroStage, "PAN">;

/**
 * The name-gate ritual, kept as an easter egg on THE MONOLITH in Edward's
 * House. Five of these run on a timer; TYPING waits for the visitor, because
 * the gate is the one beat the world does not perform on its own.
 */
export const SHRINE_STAGES = [
  "SHRINE",
  "SELECTION",
  "NAME",
  "ASK",
  "TYPING",
  "UNLOCK",
] as const;

export type ShrineStage = (typeof SHRINE_STAGES)[number];

/** Shrine stages that advance themselves after a fixed beat. */
export type TimedShrineStage = Exclude<ShrineStage, "TYPING">;
