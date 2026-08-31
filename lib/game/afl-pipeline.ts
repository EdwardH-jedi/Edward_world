import { TEAM_A, TEAM_B, type TeamPick } from "@/types/afl";

/**
 * A small, real pipeline over openly fake data.
 *
 * The honesty problem this solves: a prediction lab has to show numbers, and
 * inventing them would be a lie about a project whose own repository says
 * *paper-trading research, no live betting*. So the fixture is demonstration
 * data — clearly labelled, generated from a seed, no real clubs, no real
 * results — and every number downstream is genuinely computed from it. What
 * the visitor sees is the **shape** of the pipeline working, which is the part
 * worth understanding.
 *
 * Pure and deterministic: the same seed always produces the same lab run.
 */

/** Deterministic PRNG. `Math.random` would make the run unrepeatable. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface TeamForm {
  /** Margins from the five most recent demonstration matches. */
  readonly margins: readonly number[];
  readonly restDays: number;
  readonly travelKm: number;
}

export interface Fixture {
  readonly seed: number;
  readonly home: TeamForm;
  readonly away: TeamForm;
}

export interface Features {
  /** Difference in average margin, home minus away. */
  readonly formDiff: number;
  /** Difference in most recent margin, home minus away. */
  readonly recentDiff: number;
  /** Days of rest, home minus away. */
  readonly restDiff: number;
  /** Kilometres travelled, away minus home: positive favours the home side. */
  readonly travelDiff: number;
}

export interface ModelOutputs {
  /** Log-odds from the feature model. */
  readonly formModel: number;
  /** Log-odds from the recent-form-only model. */
  readonly recentModel: number;
  /** Weighted blend of the two. */
  readonly ensemble: number;
}

export interface PipelineRun {
  readonly fixture: Fixture;
  readonly features: Features;
  readonly models: ModelOutputs;
  /** Uncalibrated probability, straight off the ensemble. */
  readonly rawProbability: number;
  /** After temperature scaling, which is what calibration does here. */
  readonly calibratedProbability: number;
  readonly modelPick: TeamPick;
}

/**
 * Calibration temperature.
 *
 * Above 1 it shrinks confidence towards even. Overconfident raw scores are the
 * normal failure of an uncalibrated ensemble, and pulling them back is the
 * whole point of the calibration stage.
 */
export const CALIBRATION_TEMPERATURE = 1.9;

const FORM_WEIGHT = 0.055;
const REST_WEIGHT = 0.09;
const TRAVEL_WEIGHT = 0.0004;
const RECENT_WEIGHT = 0.045;
/**
 * How much of the ensemble is the form model, the rest being the recent-form
 * one. Exported because the MODELS panel shows the split: a weighting the
 * visitor reads should be the weighting that ran, not a number typed twice.
 */
export const ENSEMBLE_SPLIT = 0.65;

export function sigmoid(z: number) {
  return 1 / (1 + Math.exp(-z));
}

function mean(values: readonly number[]) {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

/** Generates one round of demonstration data. Not a real fixture. */
export function createFixture(seed: number): Fixture {
  const random = mulberry32(seed);
  const side = (): TeamForm => ({
    margins: Array.from({ length: 5 }, () => Math.round(random() * 96) - 48),
    restDays: 5 + Math.floor(random() * 4),
    travelKm: Math.round(random() * 3200),
  });

  return { seed, home: side(), away: side() };
}

export function extractFeatures(fixture: Fixture): Features {
  const { home, away } = fixture;
  return {
    formDiff: +(mean(home.margins) - mean(away.margins)).toFixed(2),
    recentDiff:
      (home.margins.at(-1) ?? 0) - (away.margins.at(-1) ?? 0),
    restDiff: home.restDays - away.restDays,
    travelDiff: away.travelKm - home.travelKm,
  };
}

export function runModels(features: Features): ModelOutputs {
  const formModel =
    FORM_WEIGHT * features.formDiff +
    REST_WEIGHT * features.restDiff +
    TRAVEL_WEIGHT * features.travelDiff;
  const recentModel = RECENT_WEIGHT * features.recentDiff;

  return {
    formModel: +formModel.toFixed(3),
    recentModel: +recentModel.toFixed(3),
    ensemble: +(
      ENSEMBLE_SPLIT * formModel +
      (1 - ENSEMBLE_SPLIT) * recentModel
    ).toFixed(3),
  };
}

export function calibrate(ensemble: number) {
  return sigmoid(ensemble / CALIBRATION_TEMPERATURE);
}

export function runPipeline(seed: number): PipelineRun {
  const fixture = createFixture(seed);
  const features = extractFeatures(fixture);
  const models = runModels(features);
  const rawProbability = sigmoid(models.ensemble);
  const calibratedProbability = calibrate(models.ensemble);

  return {
    fixture,
    features,
    models,
    rawProbability,
    calibratedProbability,
    modelPick: calibratedProbability >= 0.5 ? TEAM_A : TEAM_B,
  };
}

export function formatProbability(probability: number) {
  return `${(probability * 100).toFixed(1)}%`;
}

export function formatSigned(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}

/**
 * How the run reads once it is done.
 *
 * Deliberately says nothing about whether the model is any good: one run over
 * demonstration data cannot support a claim like that, and the repository does
 * not publish accuracy figures for this to borrow.
 */
export function describeAgreement(pick: TeamPick, run: PipelineRun) {
  return pick === run.modelPick
    ? "YOUR CALL AND THE MODEL AGREE"
    : "YOUR CALL AND THE MODEL DISAGREE";
}
