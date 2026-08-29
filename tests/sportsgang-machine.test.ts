import { describe, expect, it } from "vitest";
import { getProjectById } from "@/data/projects";
import {
  getSportsgangStageDuration,
  isGatedSportsgangStage,
  isTimedSportsgangStage,
  nextSportsgangStage,
  REDUCED_MOTION_STAGE_CEILING,
  SPORTSGANG_STAGE_TIMINGS,
} from "@/lib/game/sportsgang-machine";
import {
  DEFAULT_SPORT,
  SPORT_BLURBS,
  SPORTSGANG_SPORTS,
  SPORTSGANG_STAGES,
  type SportsgangStage,
} from "@/types/sportsgang";

describe("sportsgang stage machine", () => {
  it("advances through the declared sequence and stops at COMPLETE", () => {
    for (let index = 0; index < SPORTSGANG_STAGES.length - 1; index += 1) {
      expect(nextSportsgangStage(SPORTSGANG_STAGES[index])).toBe(
        SPORTSGANG_STAGES[index + 1],
      );
    }
    expect(nextSportsgangStage("COMPLETE")).toBe("COMPLETE");
  });

  it("reaches COMPLETE from the start without looping", () => {
    let stage: SportsgangStage = SPORTSGANG_STAGES[0];
    const visited = new Set<SportsgangStage>([stage]);
    for (let step = 0; step < SPORTSGANG_STAGES.length * 2; step += 1) {
      const next = nextSportsgangStage(stage);
      if (next === stage) break;
      expect(visited.has(next)).toBe(false);
      visited.add(next);
      stage = next;
    }
    expect(stage).toBe("COMPLETE");
    expect(visited.size).toBe(SPORTSGANG_STAGES.length);
  });

  it("splits every stage into timed, visitor-gated, or the terminal stage", () => {
    for (const stage of SPORTSGANG_STAGES) {
      const timed = isTimedSportsgangStage(stage);
      const gated = isGatedSportsgangStage(stage);
      expect(timed && gated).toBe(false);
      if (stage === "COMPLETE") {
        expect(timed || gated).toBe(false);
      } else {
        expect(timed || gated).toBe(true);
      }
    }
  });

  it("gives every timed stage a positive centralized duration", () => {
    const timed = [...SPORTSGANG_STAGES].filter(isTimedSportsgangStage);
    expect(timed).toHaveLength(5);
    for (const stage of timed) {
      expect(SPORTSGANG_STAGE_TIMINGS[stage]).toBeGreaterThan(0);
    }
  });

  it("waits for the visitor at every stage that is theirs to finish", () => {
    expect([...SPORTSGANG_STAGES].filter(isGatedSportsgangStage)).toEqual([
      "SPORT_SELECT",
      "MATCH_FOUND",
      "MEET",
      "PLAY",
      "RANK",
    ]);
  });

  it("gives the standings no timer either — they are there to be read", () => {
    expect(isTimedSportsgangStage("RANK")).toBe(false);
    expect(isGatedSportsgangStage("RANK")).toBe(true);
  });

  it("puts RANK between the result and the project summary", () => {
    expect(nextSportsgangStage("RESULT")).toBe("RANK");
    expect(nextSportsgangStage("RANK")).toBe("COMPLETE");
  });

  it("never puts a timer on play, which lasts as long as the player takes", () => {
    expect(isTimedSportsgangStage("PLAY")).toBe(false);
    expect(isGatedSportsgangStage("PLAY")).toBe(true);
  });

  it("shortens but never collapses stage dwell under reduced motion", () => {
    for (const stage of [...SPORTSGANG_STAGES].filter(isTimedSportsgangStage)) {
      const reduced = getSportsgangStageDuration(stage, true);
      const full = getSportsgangStageDuration(stage, false);
      expect(full).toBe(SPORTSGANG_STAGE_TIMINGS[stage]);
      expect(reduced).toBeLessThanOrEqual(REDUCED_MOTION_STAGE_CEILING);
      // Still long enough to read — this is the point of diverging from the
      // intro machine, which collapses to 1ms.
      expect(reduced).toBeGreaterThan(1);
      expect(reduced).toBeLessThanOrEqual(full);
    }
  });
});

describe("sportsgang content sources", () => {
  it("offers four playable sports, each with a description", () => {
    expect(SPORTSGANG_SPORTS).toEqual([
      "TENNIS",
      "BASKETBALL",
      "RUNNING",
      "GOLF",
    ]);
    expect(SPORTSGANG_SPORTS).toContain(DEFAULT_SPORT);
    for (const sport of SPORTSGANG_SPORTS) {
      expect(SPORT_BLURBS[sport]?.length).toBeGreaterThan(0);
    }
  });

  it("keeps the tech stack in the canonical project data", () => {
    const sportsgang = getProjectById("sportsgang");
    expect(sportsgang?.techStack?.length).toBeGreaterThan(0);
    expect(sportsgang?.githubUrl).toBeTruthy();
    expect(sportsgang?.caseStudyUrl).toBe("/case-studies/sportsgang");
  });
});
