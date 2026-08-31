/**
 * The AFL Lab pipeline.
 *
 * The stages are the ones the repository actually describes: ingestion,
 * temporal feature engineering, calibrated ensemble models, and evaluation.
 * The lab shows their shape running on demonstration data — it is not, and
 * must never present itself as, a live forecasting service.
 */
export const PIPELINE_STAGES = [
  "MATCH DATA",
  "FEATURES",
  "MODELS",
  "CALIBRATION",
  "PREDICTION",
  "EVALUATION",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

/** Neutral demonstration labels. These are not real clubs. */
export const TEAM_A = "TEAM A";
export const TEAM_B = "TEAM B";

export type TeamPick = typeof TEAM_A | typeof TEAM_B;

export type LabPhase = "PICK" | "RUNNING" | "RESULT";

/**
 * What each stage does, in one line.
 *
 * Read out on the console as the run passes through, and by the announcer, so
 * a visitor watching for ten seconds gets told what they are looking at rather
 * than having to infer it from six panels of numbers. Each line describes work
 * `lib/game/afl-pipeline.ts` genuinely performs — nothing here claims a
 * capability the pipeline does not have.
 */
export const STAGE_NOTES: Readonly<Record<PipelineStage, string>> = {
  "MATCH DATA": "Reading the round in: recent margins, days of rest, kilometres travelled.",
  FEATURES: "Turning those columns into differences between the two sides — the form the model can actually weigh.",
  MODELS: "Two scorers run over the features, one on overall form and one on the last result alone.",
  CALIBRATION: "Temperature scaling pulls an over-confident ensemble back towards even, which is the point of the stage.",
  PREDICTION: "The calibrated score becomes a probability for each side, and the higher one is the model's pick.",
  EVALUATION: "Setting the model's pick beside yours. Agreement only — one round cannot tell you which of you is right.",
};
