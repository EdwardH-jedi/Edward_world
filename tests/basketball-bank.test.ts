import { describe, expect, it } from "vitest";
import {
  advanceBasketball,
  BALL_RX,
  COURT,
  createBasketballState,
  IDEAL_RELEASE,
  isMade,
  launchFor,
  stepFlight,
  type BasketballState,
} from "@/lib/game/minigames/basketball";
import { createFixedStepper, SPORTSGANG_STEP_MS } from "@/lib/game/minigames/fixed-step";
import { IDLE_INPUT, type MinigameInput } from "@/lib/game/minigames/types";

/**
 * The backboard, and scoring off it.
 *
 * Before this pass there was no ball: `flight` was a 0..1 progress number, the
 * outcome was decided from the charge at the instant the button came up, and
 * the board was a rectangle in the stylesheet that the drawn curve happened to
 * cross. So a shot with too much on it drew straight through the board and
 * then stopped dead wherever its curve ended, which is what "passes through
 * it" and "gets stuck around it" were.
 *
 * The ball is now simulated in the court-percent coordinates the renderer
 * already used, the board is a swept collision plane, and a shot is scored by
 * dropping through the ring. These are the tests for that.
 */

const DT = 1 / 60;
const press: MinigameInput = { ...IDLE_INPUT, pressed: true, action: true };
/** `CHARGE_SPEED` is 0.85 a second, and the meter moves once more on release. */
const CHARGE_PER_TICK = 0.85 / 60;
const released: MinigameInput = { ...IDLE_INPUT, released: true };

/** Takes one shot at an exact release strength and plays it out. */
function shoot(release: number, dt = DT) {
  let state: BasketballState = createBasketballState();
  state = advanceBasketball(state, press, DT);
  // Set the charge directly: stepping up to it would land a fraction past.
  // The releasing step adds one more tick of charge before it lets go, so the
  // seed is one tick short and the shot leaves at exactly `release`.
  state = { ...state, charge: release - CHARGE_PER_TICK } as BasketballState;
  state = advanceBasketball(state, released, DT);

  let maxX = state.ballX;
  let ticks = 0;
  const boardContacts: number[] = [];
  let wasOnBoard = false;
  while (state.phase === "SHOT" && ticks < 900) {
    const before = state;
    state = advanceBasketball(state, IDLE_INPUT, dt);
    ticks += 1;
    maxX = Math.max(maxX, state.ballX);
    if (state.hitBoard && !before.hitBoard) boardContacts.push(ticks);
    if (state.hitBoard) wasOnBoard = true;
  }
  return { state, maxX, ticks, boardContacts, wasOnBoard };
}

/** The plane the ball's centre may not cross while the board is in the way. */
const FACE = COURT.BACKBOARD_X - BALL_RX;

describe("the calibration the meter promises", () => {
  // The screen says "let go in the band". These are the numbers that make that
  // sentence true, and they are the whole of the difficulty claim.
  it("drops the ideal release cleanly through the ring", () => {
    const { state } = shoot(IDEAL_RELEASE);
    expect(state.outcome).toBe("SWISH");
    expect(state.hitBoard).toBe(false);
    // Through the opening, touching neither the near lip nor the board.
    expect(state.rimCrossX!).toBeGreaterThan(COURT.RIM_NEAR_X + BALL_RX);
    expect(state.rimCrossX!).toBeLessThan(FACE);
  });

  it("makes every shot inside the band the meter draws", () => {
    // `Meter target` in the component is the literal `IDEAL_RELEASE` ± 0.085,
    // and the hint says to let go inside it. That literal — not `SCORE_WINDOW`,
    // which happens to equal it — is what the player is shown, so it is what is
    // checked here. Every release inside it has to go in, or the screen is
    // lying about the game.
    for (let offset = -0.085; offset <= 0.0851; offset += 0.005) {
      const { state } = shoot(IDEAL_RELEASE + offset);
      expect(isMade(state.outcome!), `offset ${offset.toFixed(3)}`).toBe(true);
    }
  });

  it("puts a bank shot inside that band, not beyond it", () => {
    // The thing the owner asked for: banking is part of normal play, not a
    // trick shot. A release at the top of the band goes in off the board.
    const { state } = shoot(IDEAL_RELEASE + 0.085);
    expect(state.hitBoard).toBe(true);
    expect(state.outcome).toBe("SCORED");
  });

  it("still punishes both kinds of mistake", () => {
    expect(shoot(IDEAL_RELEASE - 0.3).state.outcome).toBe("SHORT");
    expect(shoot(IDEAL_RELEASE + 0.3).state.outcome).toBe("LONG");
    expect(shoot(1).state.outcome).toBe("LONG");
  });
});

describe("the backboard is solid", () => {
  it("never lets the ball past its face", () => {
    // Every release, including the ones that reach the board hardest.
    for (let release = 0; release <= 1.0001; release += 0.05) {
      const { state, maxX } = shoot(release);
      if (!state.hitBoard) continue;
      expect(maxX, `release ${release.toFixed(2)}`).toBeLessThanOrEqual(FACE);
    }
  });

  it("does not let a fast ball step over it in one go", () => {
    // The tunnelling case, driven the way the component drives it: a stalled
    // frame arrives as one long delta and the stepper runs it as substeps.
    for (const frameMs of [SPORTSGANG_STEP_MS, 50, 100, 250]) {
      let state: BasketballState = createBasketballState();
      state = advanceBasketball(state, press, DT);
      state = { ...state, charge: 1 } as BasketballState;
      state = advanceBasketball(state, released, DT);

      const stepper = createFixedStepper();
      let maxX = state.ballX;
      for (let frame = 0; frame < 200 && state.phase === "SHOT"; frame += 1) {
        stepper.advance(frameMs, IDLE_INPUT, (dt, input) => {
          state = advanceBasketball(state, input, dt);
          maxX = Math.max(maxX, state.ballX);
        });
      }
      expect(state.hitBoard, `frame ${frameMs}ms`).toBe(true);
      expect(maxX, `frame ${frameMs}ms`).toBeLessThanOrEqual(FACE);
    }
  });

  it("does not trap the ball against itself", () => {
    // The stuck case: a ball resolved onto the surface must not be turned
    // round again next step and sit there inverting for ever.
    const { state, boardContacts, ticks } = shoot(IDEAL_RELEASE + 0.3);
    expect(state.hitBoard).toBe(true);
    // One contact for one approach.
    expect(boardContacts).toHaveLength(1);
    // And it leaves: the shot ends by landing, not by running out of patience.
    expect(ticks).toBeLessThan(900);
    expect(state.ballVx).toBeLessThanOrEqual(0);
  });

  it("only reflects a ball that is moving into it", () => {
    // Placed already against the face and travelling away: nothing to resolve.
    const flight = {
      x: FACE - 0.001,
      y: COURT.RIM_Y + 6,
      vx: -30,
      vy: -10,
      hitBoard: false,
      scored: false,
      rimCrossX: null,
    };
    stepFlight(flight, DT);
    expect(flight.hitBoard).toBe(false);
    expect(flight.vx).toBe(-30);
  });

  it("lets a ball that genuinely misses the board go by", () => {
    // Over the top: the board ends, and above it there is nothing to hit.
    const flight = {
      x: FACE - 1,
      y: COURT.BACKBOARD_TOP + 20,
      vx: 120,
      vy: 0,
      hitBoard: false,
      scored: false,
      rimCrossX: null,
    };
    stepFlight(flight, DT);
    expect(flight.hitBoard).toBe(false);
    expect(flight.x).toBeGreaterThan(FACE);
  });
});

describe("scoring is the ball going through the ring", () => {
  it("counts a bank shot", () => {
    const { state } = shoot(IDEAL_RELEASE + 0.12);
    expect(state.hitBoard).toBe(true);
    expect(state.scored).toBe(true);
    expect(state.outcome).toBe("SCORED");
    expect(isMade(state.outcome!)).toBe(true);
  });

  it("does not count the board itself", () => {
    // Touching the board is not scoring: this one hits and comes away.
    const { state } = shoot(IDEAL_RELEASE + 0.3);
    expect(state.hitBoard).toBe(true);
    expect(state.scored).toBe(false);
    expect(isMade(state.outcome!)).toBe(false);
  });

  it("never scores a ball travelling upward through the ring", () => {
    const flight = {
      x: (COURT.RIM_NEAR_X + BALL_RX + FACE) / 2,
      y: COURT.RIM_Y - 2,
      vx: 0,
      vy: 80,
      hitBoard: false,
      scored: false,
      rimCrossX: null,
    };
    for (let i = 0; i < 30; i += 1) stepFlight(flight, DT);
    expect(flight.y).toBeGreaterThan(COURT.RIM_Y);
    expect(flight.scored).toBe(false);
  });

  it("scores one shot once, whatever the frame schedule", () => {
    for (const frameMs of [SPORTSGANG_STEP_MS, SPORTSGANG_STEP_MS * 2, 7, 41, 100]) {
      let state: BasketballState = createBasketballState();
      state = advanceBasketball(state, press, DT);
      state = { ...state, charge: IDEAL_RELEASE } as BasketballState;
      state = advanceBasketball(state, released, DT);

      const stepper = createFixedStepper();
      let scoredTransitions = 0;
      for (let frame = 0; frame < 400 && state.phase === "SHOT"; frame += 1) {
        stepper.advance(frameMs, IDLE_INPUT, (dt, input) => {
          const before = state;
          state = advanceBasketball(state, input, dt);
          if (state.scored && !before.scored) scoredTransitions += 1;
        });
      }
      expect(scoredTransitions, `frame ${frameMs}ms`).toBe(1);
      expect(state.made, `frame ${frameMs}ms`).toBe(1);
      expect(state.history, `frame ${frameMs}ms`).toHaveLength(1);
    }
  });

  it("adds one to the tally per shot and no more", () => {
    // A whole session, released in the band every time.
    let state: BasketballState = createBasketballState();
    for (let tick = 0; tick < 60 * 40 && !state.done; tick += 1) {
      const input =
        state.phase === "READY"
          ? press
          : state.phase === "CHARGING"
            ? state.charge >= IDEAL_RELEASE
              ? released
              : { ...IDLE_INPUT, action: true }
            : IDLE_INPUT;
      state = advanceBasketball(state, input, DT);
    }
    expect(state.done).toBe(true);
    expect(state.history).toHaveLength(3);
    expect(state.made).toBe(state.history.filter(isMade).length);
  });
});

describe("the launch itself", () => {
  it("leaves the hands going up and forwards for any real shot", () => {
    for (const release of [0.2, 0.5, IDEAL_RELEASE, 0.9]) {
      const launch = launchFor(release);
      expect(launch.vx, `release ${release}`).toBeGreaterThan(0);
      expect(launch.vy, `release ${release}`).toBeGreaterThan(0);
    }
  });

  it("throws nothing at all when nothing was put into it", () => {
    expect(launchFor(0)).toEqual({ vx: 0, vy: 0 });
  });

  it("is deterministic", () => {
    expect(launchFor(0.7)).toEqual(launchFor(0.7));
    expect(shoot(0.7).state.rimCrossX).toBe(shoot(0.7).state.rimCrossX);
  });
});
