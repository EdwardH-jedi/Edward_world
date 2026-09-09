import { beforeEach, describe, expect, it } from "vitest";
import {
  getStandings,
  isBetter,
  recordRun,
  resetStandings,
  subscribeToStandings,
} from "@/lib/game/sportsgang-standings";
import {
  createBasketballState,
  getBasketballResult,
} from "@/lib/game/minigames/basketball";
import { createGolfState, getGolfResult } from "@/lib/game/minigames/golf";
import { createRunningState, getRunningResult } from "@/lib/game/minigames/running";
import { createTennisState, getTennisResult } from "@/lib/game/minigames/tennis";

beforeEach(() => resetStandings());

describe("what counts as better", () => {
  it("knows further and faster are opposite directions", () => {
    expect(isBetter(240, 190, "higher")).toBe(true);
    expect(isBetter(190, 240, "higher")).toBe(false);
    expect(isBetter(31.2, 44.8, "lower")).toBe(true);
    expect(isBetter(44.8, 31.2, "lower")).toBe(false);
  });

  it("does not count an equal result as an improvement", () => {
    expect(isBetter(200, 200, "higher")).toBe(false);
    expect(isBetter(200, 200, "lower")).toBe(false);
  });
});

describe("recording a visit", () => {
  it("reports a first run as a first run, with nothing to compare against", () => {
    const run = recordRun("GOLF", { value: 212, display: "212 M", better: "higher" });
    expect(run.isFirst).toBe(true);
    expect(run.isPersonalBest).toBe(true);
    expect(run.attempts).toBe(1);
    expect(run.previousBestDisplay).toBeNull();
  });

  it("keeps the better mark and remembers what it beat", () => {
    recordRun("GOLF", { value: 212, display: "212 M", better: "higher" });
    const better = recordRun("GOLF", { value: 248, display: "248 M", better: "higher" });
    expect(better.isPersonalBest).toBe(true);
    expect(better.previousBestDisplay).toBe("212 M");
    expect(getStandings()[0].bestDisplay).toBe("248 M");
    expect(getStandings()[0].attempts).toBe(2);
  });

  it("does not let a worse run overwrite the best", () => {
    recordRun("GOLF", { value: 248, display: "248 M", better: "higher" });
    const worse = recordRun("GOLF", { value: 170, display: "170 M", better: "higher" });
    expect(worse.isPersonalBest).toBe(false);
    expect(worse.previousBestDisplay).toBe("248 M");
    expect(getStandings()[0].bestDisplay).toBe("248 M");
    expect(getStandings()[0].attempts).toBe(3 - 1);
  });

  it("ranks a running time the other way round", () => {
    recordRun("RUNNING", { value: 44.8, display: "0:44.8", better: "lower" });
    const quicker = recordRun("RUNNING", { value: 31.2, display: "0:31.2", better: "lower" });
    expect(quicker.isPersonalBest).toBe(true);
    expect(getStandings()[0].bestDisplay).toBe("0:31.2");
  });

  it("keeps each sport's standings separate", () => {
    recordRun("GOLF", { value: 212, display: "212 M", better: "higher" });
    recordRun("TENNIS", { value: 2, display: "2 PT", better: "higher" });
    const sports = getStandings().map((entry) => entry.sport);
    expect(sports).toContain("GOLF");
    expect(sports).toContain("TENNIS");
    expect(getStandings()).toHaveLength(2);
  });
});

describe("the store React reads", () => {
  it("hands back the same array until something changes", () => {
    const first = getStandings();
    expect(getStandings()).toBe(first);
    recordRun("TENNIS", { value: 2, display: "2 PT", better: "higher" });
    const second = getStandings();
    expect(second).not.toBe(first);
    expect(getStandings()).toBe(second);
  });

  it("tells subscribers when a run lands, and stops when they leave", () => {
    let calls = 0;
    const unsubscribe = subscribeToStandings(() => {
      calls += 1;
    });
    recordRun("TENNIS", { value: 1, display: "1 PT", better: "higher" });
    expect(calls).toBe(1);
    unsubscribe();
    recordRun("TENNIS", { value: 2, display: "2 PT", better: "higher" });
    expect(calls).toBe(1);
  });
});

describe("every sport reports something rankable", () => {
  it("carries a comparable number out of each result builder", () => {
    // Built from the real factories and overridden, so these are states the
    // simulations could actually produce rather than hand-shaped objects.
    const results = [
      getGolfResult({
        ...createGolfState(),
        carry: 214,
        landing: "FAIRWAY",
        verdict: "FLUSHED",
        done: true,
      }),
      getTennisResult({
        ...createTennisState(),
        playerPoints: 5,
        alexPoints: 3,
        perfects: 4,
        longestRally: 11,
        matchWinner: "PLAYER",
        done: true,
      }),
      getBasketballResult({
        ...createBasketballState(),
        made: 2,
        history: ["SWISH", "SCORED", "SHORT"],
        done: true,
      }),
      getRunningResult({
        ...createRunningState(),
        elapsed: 31.24,
        stamina: 0.4,
        done: true,
      }),
    ];

    for (const result of results) {
      expect(Number.isFinite(result.rank.value)).toBe(true);
      expect(result.rank.display).toBeTruthy();
      expect(["higher", "lower"]).toContain(result.rank.better);
    }
    // Time is the only one where smaller wins.
    expect(results[3].rank.better).toBe("lower");
    expect(results[0].rank.better).toBe("higher");
  });

  it("no longer promises a ranking system that does not exist", () => {
    for (const result of [
      getBasketballResult({ ...createBasketballState(), made: 1, history: ["SCORED"] }),
      getRunningResult({ ...createRunningState(), elapsed: 30, stamina: 0.5 }),
    ]) {
      expect(result.note).not.toMatch(/RANKING/i);
    }
  });
});
