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
