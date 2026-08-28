import { describe, expect, it } from "vitest";
import {
  getIntroStageDuration,
  getPanOffset,
  INTRO_SCRIPTED_MS,
  INTRO_STAGE_TIMINGS,
  isShrineStage,
  isTimedIntroStage,
  MONOLITH_PHASE,
  nextIntroStage,
  PAN_OFFSET,
} from "@/lib/game/intro-machine";
import { INTRO_STAGES } from "@/types/intro";

describe("intro state machine", () => {
  it("advances through the declared sequence and stops at WORLD", () => {
    for (let index = 0; index < INTRO_STAGES.length - 1; index += 1) {
      expect(nextIntroStage(INTRO_STAGES[index])).toBe(INTRO_STAGES[index + 1]);
    }
    expect(nextIntroStage("WORLD")).toBe("WORLD");
  });

  it("has a positive centralized timing for each automatic stage", () => {
    const timedStages = INTRO_STAGES.filter(isTimedIntroStage);
    expect(timedStages).toHaveLength(6);
    for (const stage of timedStages) {
      expect(INTRO_STAGE_TIMINGS[stage]).toBeGreaterThan(0);
    }
  });

  it("leaves the typing gate off the clock — it waits for a person", () => {
    expect(isTimedIntroStage("TYPING")).toBe(false);
    // Which is why V4 budgets only the part the world performs by itself.
    // The old fixed six-second total is superseded, deliberately.
    expect(INTRO_SCRIPTED_MS).toBe(8_000);
  });

  it("collapses automatic stage waits when reduced motion is requested", () => {
    expect(getIntroStageDuration("SELECTION", true)).toBe(1);
    expect(getIntroStageDuration("SELECTION", false)).toBe(
      INTRO_STAGE_TIMINGS.SELECTION,
    );
  });
});

describe("storyboard frames", () => {
  it("draws every stage after the pan as the shrine clearing", () => {
    const shrineStages = INTRO_STAGES.filter(isShrineStage);
    expect(shrineStages).toEqual([
      "SHRINE",
      "SELECTION",
      "NAME",
      "ASK",
      "TYPING",
      "UNLOCK",
    ]);
  });

  it("maps each shrine beat onto its monolith phase, in order", () => {
    const phases = INTRO_STAGES.filter(isShrineStage).map(
      (stage) => MONOLITH_PHASE[stage],
    );
    expect(phases).toEqual([3, 4, 5, 6, 7, 8]);
  });
});

describe("the camera east", () => {
  it("starts at the title composition and lands on the clearing", () => {
    expect(getPanOffset(0)).toBe(0);
    expect(getPanOffset(1)).toBe(PAN_OFFSET);
  });

  it("clamps outside the pan rather than overshooting", () => {
    expect(getPanOffset(-3)).toBe(0);
    expect(getPanOffset(4.5)).toBe(PAN_OFFSET);
  });

  it("eases, and never travels backwards", () => {
    let previous = -1;
    for (let step = 0; step <= 20; step += 1) {
      const offset = getPanOffset(step / 20);
      expect(offset).toBeGreaterThanOrEqual(previous);
      previous = offset;
    }
    // Eased in and out, so the midpoint sits at half the distance.
    expect(getPanOffset(0.5)).toBe(Math.round(PAN_OFFSET / 2));
    // ...and the first quarter covers less ground than the middle one.
    expect(getPanOffset(0.25)).toBeLessThan(getPanOffset(0.5) - getPanOffset(0.25));
  });
});
