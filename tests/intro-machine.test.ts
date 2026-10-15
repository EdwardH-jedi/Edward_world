import { describe, expect, it } from "vitest";
import {
  getIntroStageDuration,
  getPanOffset,
  getShrineStageDuration,
  INTRO_SCRIPTED_MS,
  INTRO_STAGE_TIMINGS,
  isTimedIntroStage,
  isTimedShrineStage,
  MONOLITH_PHASE,
  nextIntroStage,
  nextShrineStage,
  PAN_OFFSET,
  SHRINE_SCRIPTED_MS,
  SHRINE_STAGE_TIMINGS,
} from "@/lib/game/intro-machine";
import { INTRO_STAGES, SHRINE_STAGES, type ShrineStage } from "@/types/intro";

describe("the default path: title, pan, world", () => {
  it("is exactly TITLE -> PAN -> WORLD, with no shrine stage on it", () => {
    expect([...INTRO_STAGES]).toEqual(["TITLE", "PAN", "WORLD"]);
    const walked = ["TITLE"];
    let stage: (typeof INTRO_STAGES)[number] = "TITLE";
    while (stage !== "WORLD") {
      stage = nextIntroStage(stage);
      walked.push(stage);
    }
    expect(walked).toEqual(["TITLE", "PAN", "WORLD"]);
  });

  it("holds the pan to 900 ms or less, and that is all it performs", () => {
    expect(INTRO_STAGE_TIMINGS.PAN).toBeGreaterThan(0);
    expect(INTRO_STAGE_TIMINGS.PAN).toBeLessThanOrEqual(900);
    expect(INTRO_SCRIPTED_MS).toBe(INTRO_STAGE_TIMINGS.PAN);
  });

  it("times only the pan; the title waits for ENTER", () => {
    expect(INTRO_STAGES.filter(isTimedIntroStage)).toEqual(["PAN"]);
  });

  it("is idempotent at the end: WORLD cannot advance past itself", () => {
    let stage: (typeof INTRO_STAGES)[number] = "WORLD";
    for (let i = 0; i < 5; i += 1) stage = nextIntroStage(stage);
    expect(stage).toBe("WORLD");
  });

  it("collapses the pan when reduced motion is requested", () => {
    expect(getIntroStageDuration("PAN", true)).toBe(1);
    expect(getIntroStageDuration("PAN", false)).toBe(INTRO_STAGE_TIMINGS.PAN);
  });
});

describe("the house monolith path: the name gate, kept as an easter egg", () => {
  it("runs the whole ritual in order and then reports the stone open", () => {
    const walked: ShrineStage[] = [SHRINE_STAGES[0]];
    let stage: ShrineStage | null = nextShrineStage(SHRINE_STAGES[0]);
    while (stage !== null) {
      walked.push(stage);
      stage = nextShrineStage(stage);
    }
    expect(walked).toEqual([
      "SHRINE",
      "SELECTION",
      "NAME",
      "ASK",
      "TYPING",
      "UNLOCK",
    ]);
    // UNLOCK is the last beat: past it there is nothing but the caller's
    // completion, which is what the house turns into leaving for the world.
    expect(nextShrineStage("UNLOCK")).toBeNull();
  });

  it("gives the gate no timer at TYPING, so only a person can open it", () => {
    for (const stage of SHRINE_STAGES) {
      expect(isTimedShrineStage(stage), stage).toBe(stage !== "TYPING");
    }
    for (const stage of SHRINE_STAGES.filter(isTimedShrineStage)) {
      expect(SHRINE_STAGE_TIMINGS[stage]).toBeGreaterThan(0);
    }
    expect(SHRINE_SCRIPTED_MS).toBe(8_000);
  });

  it("collapses automatic waits under reduced motion", () => {
    expect(getShrineStageDuration("SELECTION", true)).toBe(1);
    expect(getShrineStageDuration("SELECTION", false)).toBe(
      SHRINE_STAGE_TIMINGS.SELECTION,
    );
  });

  it("maps each beat onto its monolith phase, in order", () => {
    expect(SHRINE_STAGES.map((stage) => MONOLITH_PHASE[stage])).toEqual([
      3, 4, 5, 6, 7, 8,
    ]);
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
