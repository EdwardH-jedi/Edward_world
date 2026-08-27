import { describe, expect, it } from "vitest";
import {
  advanceBasketball,
  BASKETBALL_SHOTS,
  createBasketballState,
  getBasketballResult,
  getShotReach,
  IDEAL_RELEASE,
  isMade,
  judgeRelease,
  type BasketballState,
} from "@/lib/game/minigames/basketball";
import {
  advanceGolf,
  createGolfState,
  getCarryMetres,
  getGolfResult,
  getLateralMetres,
  type GolfState,
} from "@/lib/game/minigames/golf";
import {
  advanceRunning,
  createRunningState,
  CRUISE_PACE,
  formatRaceTime,
  getRunningResult,
  getStaminaRate,
  RACE_METRES,
  type RunningState,
} from "@/lib/game/minigames/running";
import {
  advanceTennis,
  createTennisState,
  getTennisResult,
  judgeTiming,
  TENNIS_POINTS,
  type TennisState,
} from "@/lib/game/minigames/tennis";
import { IDLE_INPUT, sweepMeter, type MinigameInput } from "@/lib/game/minigames/types";

const press: MinigameInput = { ...IDLE_INPUT, pressed: true, action: true };
const hold: MinigameInput = { ...IDLE_INPUT, action: true };
const release: MinigameInput = { ...IDLE_INPUT, released: true };

const TICK = 1 / 60;

/** Runs a simulation forward, feeding input only on the requested ticks. */
function run<S>(
  initial: S,
  advance: (state: S, input: MinigameInput, dt: number) => S,
  ticks: number,
  inputAt: (tick: number, state: S) => MinigameInput = () => IDLE_INPUT,
) {
  let state = initial;
  for (let tick = 0; tick < ticks; tick += 1) {
    state = advance(state, inputAt(tick, state), TICK);
  }
  return state;
}

describe("sweep meter", () => {
  it("stays inside 0..1 and reverses at both ends", () => {
    let value = 0;
    let direction: 1 | -1 = 1;
    const seen: number[] = [];
    for (let tick = 0; tick < 600; tick += 1) {
      const next = sweepMeter(value, direction, 1.4, TICK);
      value = next.value;
      direction = next.direction;
      seen.push(value);
    }
    expect(Math.min(...seen)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...seen)).toBeLessThanOrEqual(1);
    // It genuinely sweeps rather than sticking at an end.
    expect(Math.max(...seen)).toBeGreaterThan(0.9);
    expect(Math.min(...seen)).toBeLessThan(0.1);
  });
});

describe("golf", () => {
  it("derives carry from power and contact, never at random", () => {
    expect(getCarryMetres(1, 0)).toBe(280);
    expect(getCarryMetres(0.5, 0)).toBe(140);
    expect(getCarryMetres(0, 0)).toBe(0);
    // A mis-hit always costs distance.
    expect(getCarryMetres(1, 0.5)).toBeLessThan(getCarryMetres(1, 0));
    expect(getCarryMetres(1, -0.5)).toBe(getCarryMetres(1, 0.5));
  });

  it("is monotonic in power for a fixed contact", () => {
    let previous = -1;
    for (let power = 0; power <= 1.0001; power += 0.05) {
      const carry = getCarryMetres(power, 0.2);
      expect(carry).toBeGreaterThanOrEqual(previous);
      previous = carry;
    }
  });

  it("puts the ball left or right according to the sign of the contact", () => {
    expect(getLateralMetres(0)).toBe(0);
    expect(getLateralMetres(0.5)).toBeGreaterThan(0);
    expect(getLateralMetres(-0.5)).toBeLessThan(0);
  });

  it("produces an identical drive from identical presses", () => {
    const play = () =>
      run<GolfState>(createGolfState(), advanceGolf, 400, (tick) =>
        tick === 37 || tick === 96 ? press : IDLE_INPUT,
      );
    const first = play();
    const second = play();
    expect(first.carry).toBe(second.carry);
    expect(first.lateral).toBe(second.lateral);
    expect(first.verdict).toBe(second.verdict);
    expect(first.done).toBe(true);
  });

  it("moves through every phase and finishes with a reportable result", () => {
    const state = run<GolfState>(createGolfState(), advanceGolf, 400, (tick) =>
      tick === 30 || tick === 80 ? press : IDLE_INPUT,
    );
    expect(state.phase).toBe("DONE");
    expect(state.height).toBe(0);
    const result = getGolfResult(state);
    expect(result.playerScore).toMatch(/^\d+ M$/);
    expect(["FAIRWAY", "ROUGH"]).toContain(result.opponentScore);
  });
});

describe("tennis", () => {
  it("grades timing strictly by distance from contact", () => {
    expect(judgeTiming(1)).toBe("PERFECT");
    expect(judgeTiming(1.05)).toBe("PERFECT");
    expect(judgeTiming(0.88)).toBe("GOOD");
    expect(judgeTiming(0.5)).toBe("MISS");
  });

  it("nests the perfect window inside the good window", () => {
    for (let t = 0; t <= 1.4; t += 0.01) {
      if (judgeTiming(t) === "PERFECT") {
        // Anything perfect would also have passed the wider test.
        expect(Math.abs(t - 1)).toBeLessThanOrEqual(0.18);
      }
    }
  });

  it("loses the point when the player never swings", () => {
    const state = run<TennisState>(createTennisState(), advanceTennis, 900);
    expect(state.done).toBe(true);
    expect(state.opponentPoints).toBe(TENNIS_POINTS);
    expect(state.playerPoints).toBe(0);
    expect(state.history).toEqual(["MISS", "MISS", "MISS"]);
  });

  it("awards the point on a well timed return", () => {
    const state = run<TennisState>(
      createTennisState(),
      advanceTennis,
      900,
      (_tick, current) =>
        current.phase === "INCOMING" && current.ballT >= 0.98 ? press : IDLE_INPUT,
    );
    expect(state.done).toBe(true);
    expect(state.playerPoints + state.opponentPoints).toBe(TENNIS_POINTS);
    expect(state.playerPoints).toBe(TENNIS_POINTS);
    const result = getTennisResult(state);
    expect(result.playerScore).toBe(String(TENNIS_POINTS));
  });

  it("always plays exactly three points", () => {
    const state = run<TennisState>(
      createTennisState(),
      advanceTennis,
      1200,
      (_tick, current) =>
        current.phase === "INCOMING" && current.ballT >= 0.6 ? press : IDLE_INPUT,
    );
    expect(state.history).toHaveLength(TENNIS_POINTS);
    expect(state.playerPoints + state.opponentPoints).toBe(TENNIS_POINTS);
  });
});

describe("basketball", () => {
  it("judges the shot only from where the player released", () => {
    expect(judgeRelease(IDEAL_RELEASE)).toBe("SWISH");
    expect(judgeRelease(IDEAL_RELEASE - 0.06)).toBe("SCORED");
    expect(judgeRelease(IDEAL_RELEASE - 0.3)).toBe("SHORT");
    expect(judgeRelease(IDEAL_RELEASE + 0.3)).toBe("LONG");
    expect(isMade("SWISH")).toBe(true);
    expect(isMade("SHORT")).toBe(false);
  });

  it("reaches further the harder the shot is released", () => {
    expect(getShotReach(0)).toBe(0);
    expect(getShotReach(IDEAL_RELEASE)).toBeCloseTo(1);
    expect(getShotReach(1)).toBeGreaterThan(1);
  });

  it("takes exactly three shots and counts only the ones that dropped", () => {
    const state = run<BasketballState>(
      createBasketballState(),
      advanceBasketball,
      1200,
      (_tick, current) => {
        if (current.phase === "READY") return press;
        if (current.phase === "CHARGING") {
          return current.charge >= IDEAL_RELEASE ? release : hold;
        }
        return IDLE_INPUT;
      },
    );
    expect(state.done).toBe(true);
    expect(state.history).toHaveLength(BASKETBALL_SHOTS);
    expect(state.made).toBe(state.history.filter(isMade).length);
    expect(getBasketballResult(state).playerScore).toBe(
      `${state.made} / ${BASKETBALL_SHOTS}`,
    );
  });

  it("misses short when the player releases immediately", () => {
    const state = run<BasketballState>(
      createBasketballState(),
      advanceBasketball,
      1200,
      (_tick, current) => (current.phase === "READY" ? press : release),
    );
    expect(state.made).toBe(0);
    expect(state.history.every((entry) => entry === "SHORT")).toBe(true);
  });
});

describe("running", () => {
  it("drains above cruise and recovers below it", () => {
    expect(getStaminaRate(CRUISE_PACE)).toBe(0);
    expect(getStaminaRate(1)).toBeLessThan(0);
    expect(getStaminaRate(0.2)).toBeGreaterThan(0);
    // The cost of pushing grows faster than the push itself.
    expect(Math.abs(getStaminaRate(1))).toBeGreaterThan(
      4 * Math.abs(getStaminaRate(CRUISE_PACE + 0.15)),
    );
  });

  it("keeps stamina inside 0..1 even when held flat out", () => {
    const state = run<RunningState>(
      createRunningState(),
      advanceRunning,
      3000,
      () => ({ ...IDLE_INPUT, up: true }),
    );
    expect(state.stamina).toBeGreaterThanOrEqual(0);
    expect(state.stamina).toBeLessThanOrEqual(1);
    expect(state.distance).toBeLessThanOrEqual(RACE_METRES);
  });

  it("finishes the race and reports a time derived from the pace held", () => {
    const cruise = run<RunningState>(createRunningState(), advanceRunning, 20000);
    expect(cruise.done).toBe(true);
    expect(cruise.distance).toBe(RACE_METRES);
    expect(cruise.elapsed).toBeGreaterThan(0);
    expect(getRunningResult(cruise).playerScore).toMatch(/^\d+:\d\d\.\d$/);
  });

  it("makes going out too hard cost more than it gains", () => {
    const measured = run<RunningState>(createRunningState(), advanceRunning, 20000);
    const reckless = run<RunningState>(
      createRunningState(),
      advanceRunning,
      20000,
      () => ({ ...IDLE_INPUT, up: true }),
    );
    expect(reckless.blewUp).toBe(true);
    expect(measured.blewUp).toBe(false);
    // Blowing up leaves the runner emptied out at the line.
    expect(reckless.stamina).toBeLessThan(measured.stamina);
  });

  it("stays a demonstration rather than a chore", () => {
    const cruise = run<RunningState>(createRunningState(), advanceRunning, 40000);
    // Long enough that pacing has to be paid for, short enough to sit through.
    expect(cruise.elapsed).toBeGreaterThan(15);
    expect(cruise.elapsed).toBeLessThan(50);
  });

  it("rewards spending stamina and paying it back over emptying the tank", () => {
    const allOut = run<RunningState>(
      createRunningState(),
      advanceRunning,
      40000,
      () => ({ ...IDLE_INPUT, up: true }),
    );
    // Pace is sticky: easing off is a decision the runner has to make, so a
    // real pacing strategy has to spend and then pay back.
    const paced = run<RunningState>(
      createRunningState(),
      advanceRunning,
      40000,
      (_tick, current) => {
        if (current.stamina > 0.55) return { ...IDLE_INPUT, up: true };
        if (current.stamina < 0.35) return { ...IDLE_INPUT, down: true };
        return IDLE_INPUT;
      },
    );
    expect(paced.blewUp).toBe(false);
    expect(allOut.blewUp).toBe(true);
    expect(paced.elapsed).toBeLessThan(allOut.elapsed);
  });

  it("formats race time as minutes and tenths", () => {
    expect(formatRaceTime(0)).toBe("0:00.0");
    expect(formatRaceTime(65.44)).toBe("1:05.4");
    expect(formatRaceTime(125)).toBe("2:05.0");
  });
});
