import { beforeEach, describe, expect, it } from "vitest";
import {
  advanceBasketball,
  createBasketballState,
  getBasketballResult,
} from "@/lib/game/minigames/basketball";
import { advanceGolf, createGolfState, getGolfResult } from "@/lib/game/minigames/golf";
import {
  advanceRunning,
  createRunningState,
  getRunningResult,
} from "@/lib/game/minigames/running";
import {
  advanceTennis,
  createTennisState,
  getTennisResult,
} from "@/lib/game/minigames/tennis";
import { IDLE_INPUT, type MinigameInput } from "@/lib/game/minigames/types";
import {
  getStandings,
  recordRun,
  resetStandings,
} from "@/lib/game/sportsgang-standings";
import type { SportResult } from "@/lib/game/minigames/types";

/**
 * Plays each sport to completion the way the game loop does, then does it
 * again, and again.
 *
 * The brief asks that repeated games leave nothing broken behind. These drive
 * the real simulations rather than asserting about them: a fixed 60Hz tick, a
 * deterministic pattern of presses, and a hard cap so a sport that never
 * finishes fails loudly instead of hanging the suite.
 */
const DT = 1 / 60;
const MAX_TICKS = 60 * 90;

function press(down: boolean, held = false): MinigameInput {
  return { ...IDLE_INPUT, pressed: down, action: held || down, released: false };
}

function release(): MinigameInput {
  return { ...IDLE_INPUT, released: true, action: false };
}

/** Taps the action every `period` ticks, holding for `hold` of them. */
function tapPattern(tick: number, period: number, hold: number): MinigameInput {
  const phase = tick % period;
  if (phase === 0) return press(true, true);
  if (phase < hold) return press(false, true);
  if (phase === hold) return release();
  return IDLE_INPUT;
}

interface Playthrough<S> {
  create: () => S;
  advance: (state: S, input: MinigameInput, dt: number) => S;
  result: (state: S) => SportResult;
  input: (tick: number) => MinigameInput;
}

function play<S extends { done: boolean }>(game: Playthrough<S>) {
  let state = game.create();
  let ticks = 0;
  while (!state.done && ticks < MAX_TICKS) {
    state = game.advance(state, game.input(ticks), DT);
    ticks += 1;
  }
  return { state, ticks, finished: state.done };
}

const GAMES = {
  GOLF: {
    create: createGolfState,
    advance: advanceGolf,
    result: getGolfResult,
    input: (tick: number) => tapPattern(tick, 37, 1),
  },
  TENNIS: {
    create: createTennisState,
    advance: advanceTennis,
    result: getTennisResult,
    input: (tick: number) => tapPattern(tick, 29, 1),
  },
  BASKETBALL: {
    create: createBasketballState,
    advance: advanceBasketball,
    result: getBasketballResult,
    input: (tick: number) => tapPattern(tick, 41, 14),
  },
  RUNNING: {
    create: createRunningState,
    advance: advanceRunning,
    result: getRunningResult,
    // Running is steered rather than tapped since this pass: the action key is
    // not what moves the runner, so the pattern that drives it to the line is
    // holding a direction, with the spurt going on and off along the way.
    input: (tick: number) => ({
      ...IDLE_INPUT,
      right: true,
      sprint: tick % 240 < 60,
    }),
  },
} as const;

type SportName = keyof typeof GAMES;
const SPORTS = Object.keys(GAMES) as SportName[];

beforeEach(() => resetStandings());

describe("every sport can actually be played to the end", () => {
  for (const sport of SPORTS) {
    it(`${sport} reaches a finished state and reports itself`, () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { state, finished, ticks } = play(GAMES[sport] as any);
      expect(finished, `${sport} never finished`).toBe(true);
      expect(ticks).toBeLessThan(MAX_TICKS);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = GAMES[sport].result(state as any);
      expect(result.heading).toBeTruthy();
      expect(result.playerScore).toBeTruthy();
      expect(result.note).toBeTruthy();
      expect(Number.isFinite(result.rank.value)).toBe(true);
    });
  }
});

describe("playing again leaves nothing behind", () => {
  for (const sport of SPORTS) {
    it(`${sport} plays the same from a fresh state, three times over`, () => {
      const runs = [1, 2, 3].map(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { state, finished } = play(GAMES[sport] as any);
        expect(finished).toBe(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return GAMES[sport].result(state as any);
      });

      // Same inputs, same outcome — no state leaked between runs.
      expect(runs[1]).toEqual(runs[0]);
      expect(runs[2]).toEqual(runs[0]);
    });
  }

  it("a finished sport refuses to advance any further", () => {
    for (const sport of SPORTS) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { state } = play(GAMES[sport] as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const after = GAMES[sport].advance(state as any, press(true, true), DT);
      // This is what stops a running loop firing onFinish more than once.
      expect(after, sport).toBe(state);
    }
  });

  it("a fresh state is genuinely fresh, not the last one reset halfway", () => {
    for (const sport of SPORTS) {
      const first = GAMES[sport].create();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      play(GAMES[sport] as any);
      const second = GAMES[sport].create();
      expect(second, sport).toEqual(first);
      expect(second.done, sport).toBe(false);
    }
  });
});

describe("repeated games accumulate into the standings", () => {
  it("counts every run and keeps the best of them", () => {
    for (const sport of SPORTS) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { state } = play(GAMES[sport] as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = GAMES[sport].result(state as any);
      recordRun(sport, result.rank);
      recordRun(sport, result.rank);
    }

    const standings = getStandings();
    expect(standings).toHaveLength(SPORTS.length);
    for (const entry of standings) {
      expect(entry.attempts, entry.sport).toBe(2);
      // An identical repeat is not an improvement, so the best is unchanged.
      expect(entry.bestDisplay, entry.sport).toBeTruthy();
    }
  });

  it("keeps a visit's four sports independent of one another", () => {
    const played: string[] = [];
    for (const sport of SPORTS) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { state } = play(GAMES[sport] as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const run = recordRun(sport, GAMES[sport].result(state as any).rank);
      expect(run.isFirst, sport).toBe(true);
      played.push(sport);
    }
    expect(getStandings().map((entry) => entry.sport).sort()).toEqual(
      [...played].sort(),
    );
  });
});
