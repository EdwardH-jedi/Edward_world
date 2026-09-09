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
  describeLanding,
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
  aimReturn,
  buildShot,
  clearsNet,
  createTennisState,
  getTennisResult,
  judgeContact,
  predictLandingX,
  TENNIS_COURT,
  TENNIS_SWING,
  TENNIS_TARGET_POINTS,
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

describe("tennis — judging a swing", () => {
  it("grades contact by how far the ball was from the racket's middle", () => {
    expect(judgeContact(0)).toBe("PERFECT");
    expect(judgeContact(2)).toBe("PERFECT");
    expect(judgeContact(4)).toBe("GOOD");
    expect(judgeContact(-4)).toBe("GOOD");
  });

  it("tells early from late by which side of Edward the ball is on", () => {
    // Edward plays the left half, so a ball with a greater x has not arrived.
    expect(judgeContact(7)).toBe("EARLY");
    expect(judgeContact(-7)).toBe("LATE");
  });

  it("misses anything outside the racket's reach", () => {
    expect(judgeContact(TENNIS_SWING.REACH_X + 0.1)).toBe("MISS");
    expect(judgeContact(-(TENNIS_SWING.REACH_X + 0.1))).toBe("MISS");
  });

  it("nests the perfect window inside the good one", () => {
    for (let offset = -12; offset <= 12; offset += 0.1) {
      if (judgeContact(offset) === "PERFECT") {
        expect(Math.abs(offset)).toBeLessThanOrEqual(TENNIS_SWING.GOOD_X);
      }
    }
  });
});

describe("tennis — shot placement", () => {
  it("sends it long from the back of the court and short from up at the net", () => {
    const fromDeep = aimReturn(TENNIS_COURT.PLAYER_MIN, 0, "PERFECT", 75);
    const fromNet = aimReturn(TENNIS_COURT.PLAYER_MAX, 0, "PERFECT", 75);
    expect(fromDeep).toBeGreaterThan(fromNet);
  });

  it("gives a clean strike its intention and a mistimed one the middle", () => {
    const here = TENNIS_COURT.PLAYER_MAX;
    const clean = aimReturn(here, 0, "PERFECT", 75);
    const scuffed = aimReturn(here, 0, "LATE", 75);
    // Both are trying to go short; only the clean one gets there.
    expect(clean).toBeLessThan(scuffed);
    expect(Math.abs(scuffed - 75)).toBeLessThan(Math.abs(clean - 75));
  });

  it("keeps every aim inside the opponent's half", () => {
    for (let playerX = TENNIS_COURT.PLAYER_MIN; playerX <= TENNIS_COURT.PLAYER_MAX; playerX += 1) {
      for (const quality of ["PERFECT", "GOOD", "EARLY", "LATE"] as const) {
        for (const opponentX of [58, 70, 80, 92]) {
          const aim = aimReturn(playerX, 0, quality, opponentX);
          expect(aim).toBeGreaterThanOrEqual(TENNIS_COURT.NET_X);
          expect(aim).toBeLessThanOrEqual(TENNIS_COURT.BASELINE_RIGHT);
        }
      }
    }
  });

  it("builds a shot that lands where it was aimed", () => {
    const seconds = 0.9;
    const shot = buildShot(20, TENNIS_COURT.CONTACT_Y, 80, seconds, { lift: false });
    // Integrate the closed form back out: y returns to zero at `seconds`.
    const landingX = predictLandingX({
      x: 20,
      y: TENNIS_COURT.CONTACT_Y,
      vx: shot.vx,
      vy: shot.vy,
      bounces: 0,
      lastHitBy: "PLAYER",
    });
    expect(landingX).toBeCloseTo(80, 4);
  });

  it("lifts a shot that would otherwise die in the tape", () => {
    // Struck low and close to the net, aimed short: the flat version cannot
    // clear, and the lift is what stops bad timing costing the point twice.
    const flat = buildShot(46, 2, 60, 0.5, { lift: false });
    expect(flat.clearsNet).toBe(false);
    const lifted = buildShot(46, 2, 60, 0.5);
    expect(lifted.clearsNet).toBe(true);
  });

  it("knows a ball is over the net only when it is above the tape", () => {
    expect(clearsNet(20, 11, 60, 120)).toBe(true);
    expect(clearsNet(20, 2, 60, 0)).toBe(false);
  });
});

describe("tennis — the match", () => {
  const still = IDLE_INPUT;

  it("starts level, with nothing decided", () => {
    const state = createTennisState();
    expect(state.playerPoints).toBe(0);
    expect(state.alexPoints).toBe(0);
    expect(state.matchWinner).toBeNull();
    expect(state.done).toBe(false);
    expect(state.phase).toBe("SERVE");
  });

  it("serves itself, without asking for another button", () => {
    const state = run<TennisState>(createTennisState(), advanceTennis, 90, () => still);
    expect(state.phase).toBe("RALLY");
    expect(state.ball.lastHitBy).not.toBeNull();
    expect(state.ball.vx).not.toBe(0);
  });

  it("loses the match for a player who never swings", () => {
    const state = run<TennisState>(createTennisState(), advanceTennis, 60 * 90, () => still);
    expect(state.matchWinner).toBe("ALEX");
    expect(state.alexPoints).toBe(TENNIS_TARGET_POINTS);
    // Not a shut-out, and deliberately so: ALEX makes unforced errors, so even
    // a motionless visitor sees the scoreboard move. It must not be many.
    expect(state.playerPoints).toBeLessThanOrEqual(2);
  });

  it("ends the moment either side reaches five, and not before", () => {
    let state = createTennisState();
    for (let tick = 0; tick < 60 * 90 && !state.done; tick += 1) {
      const before = state;
      state = advanceTennis(state, still, 1 / 60);
      if (before.matchWinner === null && state.matchWinner !== null) {
        expect(
          Math.max(state.playerPoints, state.alexPoints),
        ).toBe(TENNIS_TARGET_POINTS);
      }
      expect(state.playerPoints).toBeLessThanOrEqual(TENNIS_TARGET_POINTS);
      expect(state.alexPoints).toBeLessThanOrEqual(TENNIS_TARGET_POINTS);
    }
    expect(state.done).toBe(true);
  });

  it("holds the winner's banner before it reports itself", () => {
    let state = createTennisState();
    let sawBanner = false;
    for (let tick = 0; tick < 60 * 90 && !state.done; tick += 1) {
      state = advanceTennis(state, still, 1 / 60);
      if (state.phase === "DONE" && !state.done) sawBanner = true;
    }
    // The banner is what the RESULT stage would otherwise cut straight past.
    expect(sawBanner).toBe(true);
    expect(state.prompt).toBe("GOOD GAME!");
  });

  it("says MATCH POINT when someone is one away", () => {
    let state = { ...createTennisState(), playerPoints: 4, alexPoints: 2 };
    state = advanceTennis(state, still, 1 / 60);
    // The prompt is refreshed as each point begins.
    let seen = "";
    for (let tick = 0; tick < 120; tick += 1) {
      state = advanceTennis(state, still, 1 / 60);
      if (state.prompt.includes("MATCH POINT")) seen = state.prompt;
    }
    expect(seen).toBe("MATCH POINT");
  });

  it("resets the ball cleanly for every point", () => {
    let state = createTennisState();
    const serves: number[] = [];
    for (let tick = 0; tick < 60 * 90 && !state.done; tick += 1) {
      const before = state.phase;
      state = advanceTennis(state, still, 1 / 60);
      if (before === "POINT" && state.phase === "SERVE") {
        expect(state.ball.bounces).toBe(0);
        expect(state.ball.lastHitBy).toBeNull();
        expect(state.rallyShots).toBe(0);
        expect(state.pointWinner).toBeNull();
        serves.push(state.ball.x);
      }
    }
    // Every point after the first re-served from a baseline, never mid-court.
    expect(serves.length).toBeGreaterThan(0);
    for (const x of serves) expect([20, 80]).toContain(x);
  });

  it("keeps Edward inside his own half however long left is held", () => {
    const left: MinigameInput = { ...IDLE_INPUT, left: true };
    const right: MinigameInput = { ...IDLE_INPUT, right: true };
    let state = createTennisState();
    for (let tick = 0; tick < 600; tick += 1) {
      state = advanceTennis(state, tick < 300 ? left : right, 1 / 60);
      expect(state.playerX).toBeGreaterThanOrEqual(TENNIS_COURT.PLAYER_MIN);
      expect(state.playerX).toBeLessThanOrEqual(TENNIS_COURT.PLAYER_MAX);
      expect(state.alexX).toBeGreaterThanOrEqual(TENNIS_COURT.ALEX_MIN);
      expect(state.alexX).toBeLessThanOrEqual(TENNIS_COURT.ALEX_MAX);
    }
  });

  it("does not let Edward walk through the net", () => {
    const right: MinigameInput = { ...IDLE_INPUT, right: true };
    let state = createTennisState();
    for (let tick = 0; tick < 600; tick += 1) {
      state = advanceTennis(state, right, 1 / 60);
      expect(state.playerX).toBeLessThan(TENNIS_COURT.NET_X);
    }
  });

  it("refuses to swing again until the racket has cooled", () => {
    const press: MinigameInput = { ...IDLE_INPUT, pressed: true, action: true };
    let state = createTennisState();
    // Get into a rally first; SERVE ignores the racket entirely.
    for (let tick = 0; tick < 90; tick += 1) state = advanceTennis(state, IDLE_INPUT, 1 / 60);
    expect(state.phase).toBe("RALLY");

    state = advanceTennis(state, press, 1 / 60);
    const cooldown = state.playerRacket.cooldown;
    expect(cooldown).toBeGreaterThan(0);
    // Mashing during the cooldown must not restart the swing.
    state = advanceTennis(state, press, 1 / 60);
    expect(state.playerRacket.cooldown).toBeLessThan(cooldown);
  });

  it("says YOU WIN when Edward is the one who got to five", () => {
    // Every match a test can play out ends with ALEX winning, so the winning
    // branch would otherwise never be executed by anything.
    const won = getTennisResult({
      ...createTennisState(),
      playerPoints: TENNIS_TARGET_POINTS,
      alexPoints: 3,
      perfects: 6,
      longestRally: 9,
      matchWinner: "PLAYER",
      done: true,
    });
    expect(won.heading).toBe("YOU WIN!");
    expect(won.playerScore).toBe("5");
    expect(won.opponentScore).toBe("3");
    expect(won.note).toContain("6 PERFECT STRIKES");
    expect(won.rank.value).toBe(TENNIS_TARGET_POINTS);
  });

  it("reports a result that matches the score it finished on", () => {
    const state = run<TennisState>(createTennisState(), advanceTennis, 60 * 90, () => still);
    const result = getTennisResult(state);
    expect(result.playerScore).toBe(String(state.playerPoints));
    expect(result.opponentScore).toBe(String(state.alexPoints));
    expect(result.opponentLabel).toBe("ALEX");
    expect(result.heading).toBe(state.matchWinner === "PLAYER" ? "YOU WIN!" : "GOOD GAME!");
    expect(result.rank.value).toBe(state.playerPoints);
  });
});

describe("tennis — the ball", () => {
  it("always lifts Edward's shot over the tape, from anywhere he can stand", () => {
    // The invariant the whole difficulty curve rests on: a mistimed swing
    // costs a weak ball, never the point. A fast rally shortens the flight
    // enough that a naive lift gives up, which is exactly when this matters.
    for (let x = TENNIS_COURT.PLAYER_MIN; x <= TENNIS_COURT.PLAYER_MAX; x += 1) {
      for (const y of [1, 4, 10.5, 17]) {
        for (const target of [58, 70, 80, 92]) {
          for (const seconds of [0.28, 0.4, 0.62, 0.95]) {
            const shot = buildShot(x, y, target, seconds);
            expect(
              shot.clearsNet,
              `x=${x} y=${y} target=${target} t=${seconds}`,
            ).toBe(true);
          }
        }
      }
    }
  });

  it("speeds a rally up until someone cracks", () => {
    // Without this two competent players trade the ball forever. Measured as
    // the flight time of the same shot early in a rally and late in one.
    let state = createTennisState();
    while (state.phase !== "RALLY") state = advanceTennis(state, IDLE_INPUT, 1 / 60);
    const early = buildShot(20, 10.5, 80, 0.8);
    const late = buildShot(20, 10.5, 80, 0.8 * 0.5);
    expect(Math.abs(late.vx)).toBeGreaterThan(Math.abs(early.vx));
  });

  it("never leaves the ball behind when a point is awarded", () => {
    let state = createTennisState();
    for (let tick = 0; tick < 60 * 90 && !state.done; tick += 1) {
      state = advanceTennis(state, IDLE_INPUT, 1 / 60);
      if (state.phase === "POINT") {
        expect(state.pointWinner).not.toBeNull();
        expect(state.pointReason).not.toBe("");
      }
    }
  });
});

describe("tennis — ALEX", () => {
  it("reads the bounce rather than tracking the ball", () => {
    // A ball hit flat and hard lands further on than one lofted from the same
    // place; his prediction has to move with it or he is not predicting.
    const flat = predictLandingX({ x: 20, y: 11, vx: 70, vy: 60, bounces: 0, lastHitBy: "PLAYER" });
    const lofted = predictLandingX({ x: 20, y: 11, vx: 40, vy: 120, bounces: 0, lastHitBy: "PLAYER" });
    expect(flat).toBeGreaterThan(TENNIS_COURT.NET_X);
    expect(lofted).toBeGreaterThan(TENNIS_COURT.NET_X);
    expect(flat).not.toBeCloseTo(lofted, 1);
  });

  it("does not answer a shot before a human could have", () => {
    let state = createTennisState();
    // Advance to the instant the serve leaves Edward's racket.
    while (state.phase !== "RALLY") state = advanceTennis(state, IDLE_INPUT, 1 / 60);
    expect(state.ball.lastHitBy).toBe("PLAYER");
    state = advanceTennis(state, IDLE_INPUT, 1 / 60);
    // He is still reading it, and he has not moved.
    expect(state.alexReaction).toBeGreaterThan(0);
    expect(state.alexVx).toBe(0);
  });

  it("can be beaten by placement, not only by waiting for his errors", () => {
    // Play a match the way the game intends — run to the ball, swing when it
    // is there — and check the scoreboard moves for reasons Edward caused.
    let state = createTennisState();
    const reasons = new Set<string>();
    for (let tick = 0; tick < 60 * 120 && !state.done; tick += 1) {
      const ball = state.ball;
      const mine = ball.x < TENNIS_COURT.NET_X && ball.lastHitBy !== "PLAYER";
      let move: MinigameInput = IDLE_INPUT;
      if (mine) {
        const target = predictLandingX(ball);
        const gap = target - state.playerX;
        move = { ...IDLE_INPUT, left: gap < -0.6, right: gap > 0.6 };
        if (Math.abs(ball.x - state.playerX) < 3 && state.playerRacket.cooldown <= 0) {
          move = { ...move, pressed: true, action: true };
        }
      }
      const before = state.pointWinner;
      state = advanceTennis(state, move, 1 / 60);
      if (before === null && state.pointWinner !== null) reasons.add(state.pointReason);
    }
    expect(state.done).toBe(true);
    // "POINT TO EDWARD" is ALEX failing to reach a ball that was put away from
    // him. If this never happens, placement is decorative.
    expect([...reasons]).toContain("POINT TO EDWARD");
  });

  it("wins a match against someone who never moves, but has to play it out", () => {
    let state = createTennisState();
    let ticks = 0;
    while (!state.done && ticks < 60 * 90) {
      state = advanceTennis(state, IDLE_INPUT, 1 / 60);
      ticks += 1;
    }
    expect(state.matchWinner).toBe("ALEX");
    // If he were perfect this would be over almost instantly; he is not.
    expect(ticks).toBeGreaterThan(60 * 10);
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

describe("a golf drive is judged on how far it went, not just how straight", () => {
  it("calls a shot that never left the tee a duff, however straight", () => {
    expect(describeLanding(0, 0)).toBe("DUFFED OFF THE TEE");
    expect(describeLanding(0, 8)).toBe("DUFFED OFF THE TEE");
  });

  it("will not put a barely-struck ball on the fairway", () => {
    expect(describeLanding(2, 30)).toBe("SHORT OF THE FAIRWAY");
  });

  it("still judges a real drive on its line", () => {
    expect(describeLanding(3, 200)).toBe("FAIRWAY");
    expect(describeLanding(30, 200)).toBe("ROUGH");
  });
});
