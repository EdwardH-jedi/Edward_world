import { describe, expect, it } from "vitest";
import {
  createFixedStepper,
  SPORTSGANG_STEP_MS,
} from "@/lib/game/minigames/fixed-step";
import {
  advanceTennis,
  contactAnchor,
  createTennisState,
  selectSwing,
  SWING_SPEC,
  timeToStrike,
  type TennisContact,
  type TennisState,
} from "@/lib/game/minigames/tennis";
import { IDLE_INPUT, type MinigameInput } from "@/lib/game/minigames/types";

/**
 * The same match, painted at different rates.
 *
 * A browser paints at 30, 60 or 120Hz and stutters in between, and none of
 * that may change who wins. The simulation is driven through the shared fixed
 * stepper here exactly as the component drives it, so what is being compared
 * is the real path from a frame to a simulation step.
 *
 * The tolerance is **zero**. Every schedule runs the same steps in the same
 * order from the same seed, so the states are bit-identical, not merely close.
 * If this ever needs a tolerance, something has started reading frame time.
 */

const press: MinigameInput = { ...IDLE_INPUT, pressed: true, action: true };

/** A deterministic player: chases the ball and swings when it is reachable. */
function policy(state: TennisState): MinigameInput {
  const move: MinigameInput =
    state.ball.x < state.playerX - 1
      ? { ...IDLE_INPUT, left: true }
      : state.ball.x > state.playerX + 1
        ? { ...IDLE_INPUT, right: true }
        : IDLE_INPUT;

  if (
    state.phase !== "RALLY" ||
    state.playerRacket.swing !== null ||
    state.playerRacket.cooldown > 0 ||
    state.ball.lastHitBy === "PLAYER"
  ) {
    return move;
  }

  const kind = selectSwing("PLAYER", state.phase, state.playerX, state.ball);
  const spec = SWING_SPEC[kind];
  const centre = (spec.windowStart + spec.windowEnd) / 2;
  const anchor = contactAnchor("PLAYER", state.playerX, kind, centre);
  const strike = timeToStrike(state.ball, anchor.x, anchor.y, 2.4, 5);
  return strike !== null && strike <= centre * spec.duration
    ? { ...move, action: true, pressed: true }
    : move;
}

interface Run {
  readonly state: TennisState;
  readonly contacts: readonly TennisContact[];
  readonly steps: number;
}

/**
 * The input a match needs, recorded once against simulation ticks.
 *
 * Keyed by tick rather than by frame on purpose. A browser painting at 30Hz
 * genuinely samples the keyboard half as often as one at 120Hz, so a policy
 * evaluated per frame woulddiffer between schedules for an honest reason and
 * prove nothing about the simulation. Replaying one fixed script isolates the
 * thing that must not vary: the path from a frame to a simulation step.
 */
function recordScript(steps: number): readonly MinigameInput[] {
  const script: MinigameInput[] = [];
  let state = createTennisState();
  for (let i = 0; i < steps; i += 1) {
    const input = policy(state);
    script.push(input);
    state = advanceTennis(state, input, SPORTSGANG_STEP_MS / 1000);
  }
  return script;
}

/** Drives the recorded script through the fixed stepper on a frame schedule. */
function runSchedule(frameMs: readonly number[], script: readonly MinigameInput[]): Run {
  const stepper = createFixedStepper();
  let state = createTennisState();
  const contacts: TennisContact[] = [];
  let frame = 0;
  let steps = 0;

  while (steps < script.length) {
    const delta = frameMs[frame % frameMs.length];
    frame += 1;
    // One read per frame, exactly as the component does — but the value comes
    // from the script, indexed by the step it will be applied to.
    // The stepper decides *when* a step happens; the script decides what the
    // input at that tick is. That is exactly the comparison the brief asks
    // for — the same tick-indexed input and seed, run under different render
    // schedules — and it isolates the clock from input sampling, which does
    // genuinely differ with frame rate in any browser.
    stepper.advance(delta, script[Math.min(steps, script.length - 1)], (dt) => {
      if (steps >= script.length) return;
      const before = state;
      state = advanceTennis(state, script[steps], dt);
      steps += 1;
      if (state.lastContact && state.lastContact !== before.lastContact) {
        contacts.push(state.lastContact);
      }
    });
    if (frame > 500_000) throw new Error("schedule made no progress");
  }

  return { state, contacts, steps };
}


/** Everything a match is, reduced to something comparable exactly. */
function signature(run: Run) {
  const s = run.state;
  return {
    steps: run.steps,
    phase: s.phase,
    tick: s.tick,
    playerPoints: s.playerPoints,
    alexPoints: s.alexPoints,
    matchWinner: s.matchWinner,
    rallyShots: s.rallyShots,
    longestRally: s.longestRally,
    perfects: s.perfects,
    seed: s.seed,
    playerX: s.playerX,
    alexX: s.alexX,
    ballX: s.ball.x,
    ballY: s.ball.y,
    ballVx: s.ball.vx,
    ballVy: s.ball.vy,
    contacts: run.contacts.map((c) => `${c.tick}:${c.by}:${c.swing}:${c.quality}:${c.t}`),
  };
}

const SIXTY = [SPORTSGANG_STEP_MS];
const THIRTY = [SPORTSGANG_STEP_MS * 2];
const ONE_TWENTY = [SPORTSGANG_STEP_MS / 2];
/** A stuttering browser: long frames, short frames, and frames too short to step. */
const RAGGED = [7, 41, 16.7, 3, 29, 11, 51, 2, 18, 33];

const STEPS = 2400;
const SCRIPT = recordScript(STEPS);

describe("render schedule cannot change the match", () => {
  const sixty = signature(runSchedule(SIXTY, SCRIPT));

  it("plays the same match at 30Hz", () => {
    expect(signature(runSchedule(THIRTY, SCRIPT))).toEqual(sixty);
  });

  it("plays the same match at 120Hz", () => {
    expect(signature(runSchedule(ONE_TWENTY, SCRIPT))).toEqual(sixty);
  });

  it("plays the same match on a ragged schedule", () => {
    // Long frames, short frames, and frames too short to produce a step.
    expect(signature(runSchedule(RAGGED, SCRIPT))).toEqual(sixty);
  });

  it("actually played a match worth comparing", () => {
    expect(sixty.steps).toBe(STEPS);
    expect(sixty.contacts.length).toBeGreaterThan(4);
    expect(sixty.playerPoints + sixty.alexPoints).toBeGreaterThan(0);
  });
});

describe("input edges survive the schedule", () => {
  /** Counts how many times the simulation saw a press. */
  function pressesSeen(frameMs: number[], frames: number) {
    const stepper = createFixedStepper();
    let seen = 0;
    for (let i = 0; i < frames; i += 1) {
      stepper.advance(frameMs[i % frameMs.length], i === 0 ? press : IDLE_INPUT, (_dt, input) => {
        if (input.pressed) seen += 1;
      });
    }
    return seen;
  }

  it("delivers one tap exactly once, whatever the frame rate", () => {
    expect(pressesSeen([SPORTSGANG_STEP_MS], 20)).toBe(1);
    expect(pressesSeen([SPORTSGANG_STEP_MS * 2], 20)).toBe(1);
    expect(pressesSeen([SPORTSGANG_STEP_MS / 2], 20)).toBe(1);
    // A frame too short to produce a step must not swallow the tap.
    expect(pressesSeen([3, 30], 20)).toBe(1);
  });

  it("does not replay a tap across the substeps of one long frame", () => {
    // A 100ms stall is five substeps; the press belongs to the first only.
    expect(pressesSeen([100], 1)).toBe(1);
  });
});

describe("suspend and restart leave nothing behind", () => {
  it("drops a pending tap when play is suspended", () => {
    const stepper = createFixedStepper();
    let seen = 0;
    stepper.advance(3, press, () => {});
    stepper.reset(); // blur, or the tab hidden
    stepper.advance(50, IDLE_INPUT, (_dt, input) => {
      if (input.pressed) seen += 1;
    });
    expect(seen).toBe(0);
  });

  it("starts a fresh match with no racket, contact or toss carried over", () => {
    const run = runSchedule(SIXTY, SCRIPT);
    expect(run.contacts.length).toBeGreaterThan(0);

    const fresh = createTennisState();
    expect(fresh.tick).toBe(0);
    expect(fresh.lastContact).toBeNull();
    expect(fresh.toss).toBeNull();
    expect(fresh.playerRacket.swing).toBeNull();
    expect(fresh.playerRacket.cooldown).toBe(0);
  });
});
