import { describe, expect, it } from "vitest";
import {
  calibrate,
  CALIBRATION_TEMPERATURE,
  createFixture,
  describeAgreement,
  extractFeatures,
  formatProbability,
  formatSigned,
  runModels,
  runPipeline,
  sigmoid,
} from "@/lib/game/afl-pipeline";
import { PIPELINE_STAGES, TEAM_A, TEAM_B } from "@/types/afl";

describe("demonstration fixture", () => {
  it("is fully determined by its seed", () => {
    expect(createFixture(7)).toEqual(createFixture(7));
    expect(runPipeline(7)).toEqual(runPipeline(7));
  });

  it("gives different seeds different rounds", () => {
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8].map(
      (seed) => runPipeline(seed).models.ensemble,
    );
    expect(new Set(seeds).size).toBeGreaterThan(1);
  });

  it("produces plausible demonstration shapes", () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const { home, away } = createFixture(seed);
      for (const side of [home, away]) {
        expect(side.margins).toHaveLength(5);
        for (const margin of side.margins) {
          expect(margin).toBeGreaterThanOrEqual(-48);
          expect(margin).toBeLessThanOrEqual(48);
        }
        expect(side.restDays).toBeGreaterThanOrEqual(5);
        expect(side.restDays).toBeLessThanOrEqual(8);
        expect(side.travelKm).toBeGreaterThanOrEqual(0);
        expect(side.travelKm).toBeLessThanOrEqual(3200);
      }
    }
  });
});

describe("features", () => {
  it("reads each difference in the direction it claims", () => {
    const fixture = {
      seed: 0,
      home: { margins: [10, 10, 10, 10, 20], restDays: 8, travelKm: 100 },
      away: { margins: [0, 0, 0, 0, 5], restDays: 5, travelKm: 2000 },
    };
    const features = extractFeatures(fixture);
    expect(features.formDiff).toBeGreaterThan(0);
    expect(features.recentDiff).toBe(15);
    expect(features.restDiff).toBe(3);
    // Positive travel difference means the away side travelled further.
    expect(features.travelDiff).toBe(1900);
  });

  it("is symmetric: swapping the sides flips every sign", () => {
    const home = { margins: [12, -4, 20, 3, 9], restDays: 7, travelKm: 300 };
    const away = { margins: [-2, 6, -11, 4, 1], restDays: 6, travelKm: 1800 };
    const forward = extractFeatures({ seed: 0, home, away });
    const reversed = extractFeatures({ seed: 0, home: away, away: home });
    expect(reversed.formDiff).toBeCloseTo(-forward.formDiff, 5);
    expect(reversed.recentDiff).toBe(-forward.recentDiff);
    expect(reversed.restDiff).toBe(-forward.restDiff);
    expect(reversed.travelDiff).toBe(-forward.travelDiff);
  });
});

describe("models and calibration", () => {
  it("blends the two models rather than following either alone", () => {
    const features = {
      formDiff: 20,
      recentDiff: -30,
      restDiff: 0,
      travelDiff: 0,
    };
    const models = runModels(features);
    expect(models.formModel).toBeGreaterThan(0);
    expect(models.recentModel).toBeLessThan(0);
    expect(models.ensemble).toBeLessThan(models.formModel);
    expect(models.ensemble).toBeGreaterThan(models.recentModel);
  });

  it("pulls confident scores back towards even, which is the point", () => {
    expect(CALIBRATION_TEMPERATURE).toBeGreaterThan(1);
    for (const z of [0.4, 1, 2, 5]) {
      const raw = sigmoid(z);
      const calibrated = calibrate(z);
      expect(calibrated).toBeLessThan(raw);
      expect(calibrated).toBeGreaterThan(0.5);
    }
    // An even score stays even.
    expect(calibrate(0)).toBeCloseTo(0.5, 10);
  });

  it("keeps every probability a probability, over many seeds", () => {
    for (let seed = 0; seed < 300; seed += 1) {
      const run = runPipeline(seed);
      for (const p of [run.rawProbability, run.calibratedProbability]) {
        expect(p).toBeGreaterThan(0);
        expect(p).toBeLessThan(1);
      }
      expect([TEAM_A, TEAM_B]).toContain(run.modelPick);
      // The pick has to follow the calibrated number it is shown beside.
      expect(run.modelPick).toBe(run.calibratedProbability >= 0.5 ? TEAM_A : TEAM_B);
    }
  });
});

describe("presentation", () => {
  it("names the six pipeline stages the repository describes", () => {
    expect(PIPELINE_STAGES).toEqual([
      "MATCH DATA",
      "FEATURES",
      "MODELS",
      "CALIBRATION",
      "PREDICTION",
      "EVALUATION",
    ]);
  });

  it("formats numbers for a CRT", () => {
    expect(formatProbability(0.5)).toBe("50.0%");
    expect(formatSigned(12)).toBe("+12");
    expect(formatSigned(-3)).toBe("-3");
    expect(formatSigned(0)).toBe("0");
  });

  it("reports only agreement, never a verdict on accuracy", () => {
    const run = runPipeline(3);
    const agree = describeAgreement(run.modelPick, run);
    const disagree = describeAgreement(
      run.modelPick === TEAM_A ? TEAM_B : TEAM_A,
      run,
    );
    expect(agree).toMatch(/AGREE/);
    expect(disagree).toMatch(/DISAGREE/);
    for (const text of [agree, disagree]) {
      expect(text).not.toMatch(/correct|right|wrong|accura/i);
    }
  });
});
