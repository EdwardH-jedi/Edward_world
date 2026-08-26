import { describe, expect, it } from "vitest";
import {
  INTRO_STAGE_TIMINGS,
  getIntroStageDuration,
  isTimedIntroStage,
  nextIntroStage,
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

  it("collapses automatic stage waits when reduced motion is requested", () => {
    expect(getIntroStageDuration("GLYPH_REVEAL", true)).toBe(1);
    expect(getIntroStageDuration("GLYPH_REVEAL", false)).toBe(
      INTRO_STAGE_TIMINGS.GLYPH_REVEAL,
    );
  });
});
