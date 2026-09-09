import { describe, expect, it } from "vitest";
import {
  advanceBasketball,
  BASKETBALL_SHOTS,
  createBasketballState,
  IDEAL_RELEASE,
  type BasketballState,
} from "@/lib/game/minigames/basketball";
import {
  createFixedStepper,
  SPORTSGANG_MAX_SUBSTEPS,
  SPORTSGANG_STEP_MS,
} from "@/lib/game/minigames/fixed-step";
import {
  advanceGolfHole,
  createGolfHoleState,
  GOLF_SWING,
  remainingDistanceM,
  type GolfHoleState,
} from "@/lib/game/minigames/golf-hole";
import {
  advanceRunning,
  createRunningState,
  RACE_METRES,
  type RunningState,
} from "@/lib/game/minigames/running";
import { IDLE_INPUT, type MinigameInput } from "@/lib/game/minigames/types";

/**
 * QA (session E): the render schedule may not change what happened.
 *
 * Session A left `tennis-schedule.test.ts` for tennis. Basketball, running and
 * the golf hole had no equivalent, so a browser painting at 30Hz or stuttering
 * could have changed a score, a stroke count or a finish time and nothing
 * would have caught it. This is that check for the other three.
 *
 * The method is A's, deliberately, so the two suites mean the same thing:
 *
 * - the input is a **script indexed by simulation tick**, recorded once at
 *   60Hz. A 30Hz browser really does sample the keyboard half as often, so a
 *   policy re-evaluated per frame would differ between schedules for an honest
 *   reason and would prove nothing about the simulation. Fixing the script
 *   isolates the one thing that must not vary: the path from a frame to a
 *   simulation step.
 * - the tolerance is **zero**. Same seed, same ticks, same order — the states
 *   are compared with `toEqual`, not with a delta. If this ever needs a
 *   tolerance, something has started reading frame time.
 *
 * Nothing here is a frame-rate or FPS measurement: no rendering happens in
 * this file and no GPU was involved. It is a determinism test.
 */

const SIXTY = [SPORTSGANG_STEP_MS];
const THIRTY = [SPORTSGANG_STEP_MS * 2];
const ONE_TWENTY = [SPORTSGANG_STEP_MS / 2];
/** A stuttering browser: long frames, short frames, frames too short to step. */
const RAGGED = [7, 41, 16.7, 3, 29, 11, 51, 2, 18, 33];

interface Sim<S> {
  readonly create: () => S;
  readonly advance: (state: S, input: MinigameInput, dt: number) => S;
  /** Chosen from the state alone, so the script is reproducible. */
  readonly policy: (state: S, tick: number) => MinigameInput;
  readonly steps: number;
}

/** Records one run at exactly 60Hz and keeps the input it used, per tick. */
function recordScript<S>(sim: Sim<S>): readonly MinigameInput[] {
  const script: MinigameInput[] = [];
  let state = sim.create();
  for (let tick = 0; tick < sim.steps; tick += 1) {
    const input = sim.policy(state, tick);
    script.push(input);
    state = sim.advance(state, input, SPORTSGANG_STEP_MS / 1000);
  }
  return script;
}

/** Replays that script through the shared stepper on a frame schedule. */
function runSchedule<S>(
  sim: Sim<S>,
  frameMs: readonly number[],
  script: readonly MinigameInput[],
): { state: S; steps: number } {
  const stepper = createFixedStepper();
  let state = sim.create();
  let steps = 0;
  let frame = 0;

  while (steps < script.length) {
    const delta = frameMs[frame % frameMs.length];
    frame += 1;
    // One input read per frame, exactly as the components do.
    stepper.advance(delta, script[Math.min(steps, script.length - 1)], (dt) => {
      if (steps >= script.length) return;
      state = sim.advance(state, script[steps], dt);
      steps += 1;
    });
    if (frame > 500_000) throw new Error("schedule made no progress");
  }
  return { state, steps };
}

/** Runs one simulation under all four schedules and compares them exactly. */
function expectScheduleIndependence<S>(sim: Sim<S>, describeState: (state: S) => unknown) {
  const script = recordScript(sim);
  const sixty = runSchedule(sim, SIXTY, script);
  for (const [name, schedule] of [
    ["30Hz", THIRTY],
    ["120Hz", ONE_TWENTY],
    ["ragged", RAGGED],
  ] as const) {
    const other = runSchedule(sim, schedule, script);
    expect(other.steps, name).toBe(sixty.steps);
    expect(describeState(other.state), name).toEqual(describeState(sixty.state));
  }
  return sixty.state;
}

/* ── Basketball ───────────────────────────────────────────────────────────── */

/**
 * Three shots, released at three different charges on purpose: one at the
 * ideal, one well short, one held past it. So the run covers a made shot and
 * both ways of missing, and the outcome list is worth comparing.
 */
const BASKETBALL_TARGETS = [IDEAL_RELEASE, 0.3, 0.95] as const;

const basketballSim: Sim<BasketballState> = {
  create: createBasketballState,
  advance: advanceBasketball,
  steps: 1_000,
  policy(state) {
    const target = BASKETBALL_TARGETS[Math.min(state.shot, BASKETBALL_TARGETS.length - 1)];
    if (state.phase === "READY") return { ...IDLE_INPUT, pressed: true, action: true };
    if (state.phase === "CHARGING") {
      return state.charge < target
        ? { ...IDLE_INPUT, action: true }
        : { ...IDLE_INPUT, released: true };
    }
    return IDLE_INPUT;
  },
};

describe("basketball is the same game at any frame rate", () => {
  const final = expectScheduleIndependence(basketballSim, (s) => ({
    phase: s.phase,
    shot: s.shot,
    made: s.made,
    history: s.history,
    release: s.release,
    flight: s.flight,
    charge: s.charge,
    outcome: s.outcome,
    done: s.done,
  }));

  it("actually took every shot, and judged them differently", () => {
    // Guards the test itself: a run that never left READY would compare equal
    // under every schedule and prove nothing.
    expect(final.history).toHaveLength(BASKETBALL_SHOTS);
    expect(new Set(final.history).size).toBeGreaterThan(1);
    expect(final.made).toBeGreaterThan(0);
    expect(final.done).toBe(true);
  });

  it("charges by simulated time, not by frame count", () => {
    // Same held input, same simulated duration, different frame sizes.
    const hold: MinigameInput = { ...IDLE_INPUT, action: true, pressed: true };
    function chargeAfter(frameMs: number, frames: number) {
      const stepper = createFixedStepper();
      let state = createBasketballState();
      for (let i = 0; i < frames; i += 1) {
        stepper.advance(frameMs, hold, (dt, input) => {
          state = advanceBasketball(state, input, dt);
        });
      }
      return state.charge;
    }
    // 30 frames at 33.3ms and 60 at 16.6ms are both ~1s of simulated time.
    expect(chargeAfter(SPORTSGANG_STEP_MS * 2, 30)).toBeCloseTo(
      chargeAfter(SPORTSGANG_STEP_MS, 60),
      10,
    );
  });
});

/* ── Running ──────────────────────────────────────────────────────────────── */

/**
 * A whole race: cruise, spurt, let the spurt go and recover, change lanes both
 * ways, and finish. Every branch the controls have, in one script.
 */
const runningSim: Sim<RunningState> = {
  create: createRunningState,
  advance: advanceRunning,
  steps: 3_000,
  policy(state) {
    if (state.phase !== "RUNNING") return IDLE_INPUT;
    const spurting = state.distance > 30 && state.distance < 90;
    const laneUp = state.distance > 100 && state.distance < 110;
    const laneDown = state.distance > 130 && state.distance < 140;
    return {
      ...IDLE_INPUT,
      right: true,
      sprint: spurting,
      up: laneUp,
      down: laneDown,
    };
  },
};

describe("running is the same race at any frame rate", () => {
  const final = expectScheduleIndependence(runningSim, (s) => ({
    phase: s.phase,
    distance: s.distance,
    lane: s.lane,
    pace: s.pace,
    stamina: s.stamina,
    elapsed: s.elapsed,
    heading: s.heading,
    blewUp: s.blewUp,
    exhausted: s.exhausted,
    lowestStamina: s.lowestStamina,
    done: s.done,
  }));

  it("actually ran the race, spurted and recovered", () => {
    expect(final.distance).toBe(RACE_METRES);
    expect(["FINISHED", "DONE"]).toContain(final.phase);
    expect(final.lowestStamina).toBeLessThan(1);
    // The spurt ended well before the line, so the tank rebuilt afterwards.
    expect(final.stamina).toBeGreaterThan(final.lowestStamina);
  });

  it("covers the same ground per simulated second, not per frame", () => {
    function distanceAfter(frameMs: number, frames: number) {
      const stepper = createFixedStepper();
      let state = createRunningState();
      for (let i = 0; i < frames; i += 1) {
        stepper.advance(frameMs, { ...IDLE_INPUT, right: true }, (dt, input) => {
          state = advanceRunning(state, input, dt);
        });
      }
      return state.distance;
    }
    // ~5 simulated seconds each way.
    expect(distanceAfter(SPORTSGANG_STEP_MS * 2, 150)).toBeCloseTo(
      distanceAfter(SPORTSGANG_STEP_MS / 2, 600),
      10,
    );
  });
});

/* ── Golf ─────────────────────────────────────────────────────────────────── */

/**
 * Plays the hole out: stop the power bar high, catch the face near square,
 * and press on through each shot until the ball is holed or the shot cap ends
 * the run.
 */
const golfSim: Sim<GolfHoleState> = {
  create: createGolfHoleState,
  advance: advanceGolfHole,
  steps: 12_000,
  policy(state) {
    switch (state.phase) {
      case "AIM":
        return { ...IDLE_INPUT, pressed: true, action: true };
      case "POWER":
        // Stop the bar on the way up, near the top: a repeatable strong shot.
        return state.meter >= 0.82 && state.meterDirection === 1
          ? { ...IDLE_INPUT, pressed: true, action: true }
          : IDLE_INPUT;
      case "SWING":
        return state.faceActive && !state.contactLocked && state.meter >= 0.48
          ? { ...IDLE_INPUT, pressed: true, action: true }
          : IDLE_INPUT;
      case "SHOT_END":
      case "HOLED":
        return { ...IDLE_INPUT, pressed: true, action: true };
      default:
        return IDLE_INPUT;
    }
  },
};

describe("the golf hole is the same hole at any frame rate", () => {
  const final = expectScheduleIndependence(golfSim, (s) => ({
    phase: s.phase,
    status: s.status,
    shotCount: s.shotCount,
    totalStrokes: s.totalStrokes,
    penaltyStrokes: s.penaltyStrokes,
    impactCount: s.impactCount,
    longestDriveM: s.longestDriveM,
    lastShotM: s.lastShotM,
    ball: s.ball,
    shotLog: s.shotLog,
    simulationMs: s.simulationMs,
    remainingM: remainingDistanceM(s),
  }));

  it("actually played the hole out", () => {
    expect(final.shotCount).toBeGreaterThan(1);
    expect(final.impactCount).toBe(final.shotCount);
    expect(["completed", "abandoned"]).toContain(final.status);
    expect(final.shotLog).toHaveLength(final.shotCount);
  });

  it("keeps the score arithmetic whatever the schedule", () => {
    // The relationship the board's validator also checks, asserted on a run
    // that was replayed under four different frame schedules.
    expect(final.totalStrokes).toBe(final.shotCount + final.penaltyStrokes);
    expect(final.shotLog.reduce((n, shot) => n + shot.penalty, 0)).toBe(final.penaltyStrokes);
  });

  it("launches exactly once per swing, however the frames fall", () => {
    // A long frame spanning the impact instant must not fire two launches,
    // and a frame too short to step must not lose one.
    for (const schedule of [SIXTY, THIRTY, ONE_TWENTY, RAGGED, [100], [3]]) {
      const stepper = createFixedStepper();
      let state = createGolfHoleState();
      let impacts = 0;
      let frame = 0;
      const script = recordScript(golfSim);
      let steps = 0;
      while (steps < 600) {
        stepper.advance(schedule[frame % schedule.length], script[steps], (dt) => {
          if (steps >= script.length) return;
          const before = state;
          state = advanceGolfHole(state, script[steps], dt);
          steps += 1;
          if (state.impactCount !== before.impactCount) impacts += 1;
        });
        frame += 1;
        if (frame > 100_000) throw new Error("schedule made no progress");
      }
      expect(impacts, `schedule ${schedule.join(",")}`).toBe(state.impactCount);
    }
  });

  it("puts the ball in flight only after the club arrives", () => {
    // Impact is the one place a ball is launched: no schedule may let it
    // leave the tee before the downswing has reached the ball.
    const script = recordScript(golfSim);
    let state = createGolfHoleState();
    const stepper = createFixedStepper();
    let steps = 0;
    let frame = 0;
    let launchedEarly = false;
    while (steps < 400) {
      stepper.advance(RAGGED[frame % RAGGED.length], script[steps], (dt) => {
        if (steps >= script.length) return;
        const before = state;
        state = advanceGolfHole(state, script[steps], dt);
        steps += 1;
        if (before.impactCount === 0 && state.impactCount === 1) {
          if (state.swingTime < GOLF_SWING.impactAtSeconds) launchedEarly = true;
        }
      });
      frame += 1;
    }
    expect(launchedEarly).toBe(false);
  });
});

/* ── Coming back from a long pause ────────────────────────────────────────── */

describe("a long stall does not run the game while nobody was watching", () => {
  /** The suspension path the components use: reset the clock, drop the input. */
  it("drops time past the substep cap instead of simulating it", () => {
    const stepper = createFixedStepper();
    // Ten seconds of hidden tab arriving as one frame.
    const report = stepper.advance(10_000, IDLE_INPUT, () => {});
    expect(report.steps).toBe(SPORTSGANG_MAX_SUBSTEPS);
    expect(report.droppedMs).toBeGreaterThan(9_000);
  });

  it("returns to a running race exactly where it was left", () => {
    // Run, suspend the way the loop does, wait, resume: the state must be the
    // one from before the pause, not one advanced by the away time.
    const stepper = createFixedStepper();
    let state = createRunningState();
    const hold: MinigameInput = { ...IDLE_INPUT, right: true };
    for (let i = 0; i < 240; i += 1) {
      stepper.advance(SPORTSGANG_STEP_MS, hold, (dt, input) => {
        state = advanceRunning(state, input, dt);
      });
    }
    const before = state;

    stepper.reset();
    // The frame that arrives on return carries the whole away time.
    stepper.advance(30_000, IDLE_INPUT, (dt, input) => {
      state = advanceRunning(state, input, dt);
    });

    // Five substeps at most, and idle input, so the runner decelerates from
    // where they were — they do not teleport down the track.
    expect(state.distance - before.distance).toBeLessThan(1);
    expect(state.distance).toBeGreaterThanOrEqual(before.distance);
    expect(state.phase).toBe(before.phase);
  });

  it("does not fire a tap that was made before the pause", () => {
    const stepper = createFixedStepper();
    let pressesSeen = 0;
    // A tap on a frame too short to produce a step: the edge is carried.
    stepper.advance(3, { ...IDLE_INPUT, pressed: true, action: true }, (_dt, input) => {
      if (input.pressed) pressesSeen += 1;
    });
    expect(pressesSeen).toBe(0);
    // Suspending forgets it, so returning does not shoot.
    stepper.reset();
    for (let i = 0; i < 10; i += 1) {
      stepper.advance(SPORTSGANG_STEP_MS, IDLE_INPUT, (_dt, input) => {
        if (input.pressed) pressesSeen += 1;
      });
    }
    expect(pressesSeen).toBe(0);
  });

  it("still lands a tap that survives to a stepping frame", () => {
    // The other half of the same rule: not losing real input.
    const stepper = createFixedStepper();
    let pressesSeen = 0;
    stepper.advance(3, { ...IDLE_INPUT, pressed: true, action: true }, (_dt, input) => {
      if (input.pressed) pressesSeen += 1;
    });
    stepper.advance(SPORTSGANG_STEP_MS, IDLE_INPUT, (_dt, input) => {
      if (input.pressed) pressesSeen += 1;
    });
    expect(pressesSeen).toBe(1);
  });
});
