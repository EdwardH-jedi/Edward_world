import { describe, expect, it } from "vitest";
import {
  createFixedStepper,
  SPORTSGANG_STEP_MS,
} from "@/lib/game/minigames/fixed-step";
import {
  distanceToHoleM,
  GOLF_CLUBS,
  GOLF_COURSE,
  surfaceAt,
} from "@/lib/game/minigames/golf-course";
import {
  estimateShotDistanceM,
  GOLF_SWING,
  GOLF_TUNING,
} from "@/lib/game/minigames/golf-hole";
import {
  abandonGolfHole,
  advanceGolfHole,
  createGolfHoleState,
  draftGolfRun,
  getGolfHoleResult,
  stepBallMotion,
  type BallMotion,
  type GolfHoleState,
} from "@/lib/game/minigames/golf-hole";
import { createGolfRunResult, isGolfRunResultV1 } from "@/lib/game/minigames/golf-result";
import { IDLE_INPUT, type MinigameInput } from "@/lib/game/minigames/types";

const DT = 1 / 60;
const PRESS: MinigameInput = { ...IDLE_INPUT, pressed: true, action: true };
const LEFT: MinigameInput = { ...IDLE_INPUT, left: true };
const RIGHT: MinigameInput = { ...IDLE_INPUT, right: true };

/**
 * A scripted player.
 *
 * It reacts to the state the way a person reacts to the screen — stop the
 * power bar above `power`, stop the contact bar within `contactTolerance` of
 * the middle of the face — so a test reads as "played well" or "played badly"
 * rather than as a list of tick numbers.
 */
interface Player {
  /** A fixed power, or one measured against the distance left. */
  readonly power: number | "measured";
  /** How far short of the flag a measured player aims. Real players lay up. */
  readonly layUpM?: number;
  readonly contactTolerance: number | null;
  readonly aim?: "left" | "right" | null;
  readonly aimSeconds?: number;
}

/**
 * The power that would leave the ball where the player wants it.
 *
 * Bisection over the club's own range function, which is the same physics the
 * shot uses — so this is a player reading the range printed beside the club,
 * not a test reaching into the simulation for an answer.
 */
function powerForDistance(state: GolfHoleState, targetM: number) {
  let low: number = GOLF_TUNING.minPower;
  let high = 0.99;
  for (let step = 0; step < 40; step += 1) {
    const mid = (low + high) / 2;
    if (estimateShotDistanceM(GOLF_COURSE, state.club, mid, state.lie) < targetM) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return high;
}

function targetPower(state: GolfHoleState, player: Player) {
  if (player.power !== "measured") return player.power;
  const remaining = distanceToHoleM(GOLF_COURSE, state.ball);
  const layUp = player.layUpM ?? 0;
  // On the green you are trying to hole it; everywhere else you leave yourself
  // something, because a full swing at the flag runs miles past it.
  const target =
    state.club === "PUTTER" ? remaining : Math.max(remaining - layUp, remaining * 0.6);
  return powerForDistance(state, target);
}

function inputFor(state: GolfHoleState, player: Player, aimHeld: number): MinigameInput {
  switch (state.phase) {
    case "AIM": {
      if (player.aim && aimHeld < (player.aimSeconds ?? 0)) {
        return player.aim === "left" ? LEFT : RIGHT;
      }
      return PRESS;
    }
    case "POWER":
      return state.meter >= targetPower(state, player) ? PRESS : IDLE_INPUT;
    case "SWING": {
      if (state.contactLocked || player.contactTolerance === null) return IDLE_INPUT;
      if (!state.faceActive) return IDLE_INPUT;
      return Math.abs(state.meter - 0.5) <= player.contactTolerance ? PRESS : IDLE_INPUT;
    }
    // Skipping the dwell keeps a scripted hole inside a sane number of ticks.
    case "SHOT_END":
    case "HOLED":
      return PRESS;
    default:
      return IDLE_INPUT;
  }
}

interface PlayLog {
  readonly state: GolfHoleState;
  readonly ticks: number;
  readonly phases: readonly string[];
}

function play(player: Player, maxTicks = 60 * 240): PlayLog {
  let state = createGolfHoleState();
  const phases: string[] = [state.phase];
  let aimHeld = 0;
  let ticks = 0;

  while (!state.done && ticks < maxTicks) {
    const input = inputFor(state, player, aimHeld);
    aimHeld = state.phase === "AIM" && (input.left || input.right) ? aimHeld + DT : aimHeld;
    if (state.phase !== "AIM") aimHeld = 0;
    const next = advanceGolfHole(state, input, DT);
    if (next.phase !== state.phase) phases.push(next.phase);
    state = next;
    ticks += 1;
  }
  return { state, ticks, phases };
}

/** Strikes the ball well and leaves itself a putt rather than a card wreck. */
const GOOD: Player = { power: "measured", layUpM: 6, contactTolerance: 0.03 };
/** Barely moves the ball and never times the contact. */
const WEAK: Player = { power: 0.12, contactTolerance: null };

/* ── The ball, on its own ─────────────────────────────────────────────────── */

function rolling(x: number, speed: number): BallMotion {
  return { x, y: 0, z: 0, vx: speed, vy: 0, vz: 0, airborne: false, holed: false, atRest: false };
}

function rollOut(motion: BallMotion, maxSteps = 60 * 60) {
  let current = motion;
  let steps = 0;
  while (!current.atRest && !current.holed && steps < maxSteps) {
    current = stepBallMotion(GOLF_COURSE, current, DT);
    steps += 1;
  }
  return current;
}

describe("the ball obeys one set of physics", () => {
  it("stops, rather than rolling for ever, and stops sooner in the rough", () => {
    const onGreen = rollOut(rolling(GOLF_COURSE.holeM - 60, 6));
    const inRough = rollOut({ ...rolling(120, 6), y: 30 });
    expect(onGreen.atRest).toBe(true);
    expect(inRough.atRest).toBe(true);
    expect(surfaceAt(GOLF_COURSE, { x: inRough.x, y: inRough.y })).toBe("ROUGH");
    // Same speed, less distance: the rough is the reason to stay on the fairway.
    expect(inRough.x - 120).toBeLessThan(onGreen.x - (GOLF_COURSE.holeM - 60));
  });

  it("drops a ball that reaches the cup slowly", () => {
    const holed = rollOut(rolling(GOLF_COURSE.holeM - 10, 6.8));
    expect(holed.holed).toBe(true);
    expect(distanceToHoleM(GOLF_COURSE, holed)).toBe(0);
  });

  it("will not hole a ball that crosses the cup at speed", () => {
    const start = GOLF_COURSE.holeM - 10;
    const past = rollOut(rolling(start, 12));
    expect(past.holed).toBe(false);
    // It went over the hole and kept going, so there is more to do, not less.
    expect(past.x).toBeGreaterThan(GOLF_COURSE.holeM);
    expect(distanceToHoleM(GOLF_COURSE, past)).toBeGreaterThan(10);
  });

  it("will not hole a ball that merely finishes near the cup", () => {
    const beside = rollOut({ ...rolling(GOLF_COURSE.holeM - 4, 4), y: 3 });
    expect(beside.holed).toBe(false);
    expect(distanceToHoleM(GOLF_COURSE, beside)).toBeGreaterThan(GOLF_COURSE.holeRadiusM);
  });

  it("keeps height and ground position on separate axes", () => {
    const lofted: BallMotion = {
      x: 0, y: 0, z: 0, vx: 30, vy: 0, vz: 25,
      airborne: true, holed: false, atRest: false,
    };
    const afterOneStep = stepBallMotion(GOLF_COURSE, lofted, DT);
    expect(afterOneStep.z).toBeGreaterThan(0);
    expect(afterOneStep.x).toBeGreaterThan(0);
    // A ball in the air is never holed, however far down the hole it is.
    const overCup: BallMotion = { ...lofted, x: GOLF_COURSE.holeM - 0.1, z: 8, vx: 1, vz: 0 };
    expect(stepBallMotion(GOLF_COURSE, overCup, DT).holed).toBe(false);
  });
});

/* ── One shot ─────────────────────────────────────────────────────────────── */

describe("a shot leaves the club once, when the club reaches the ball", () => {
  it("walks the whole state flow in order", () => {
    const { phases } = play(GOOD);
    expect(phases[0]).toBe("AIM");
    expect(phases.slice(1, 6)).toEqual(["POWER", "SWING", "IMPACT", "FLIGHT", "ROLL"]);
    expect(phases).toContain("SHOT_END");
    expect(phases.at(-1)).toBe("RESULT");
  });

  it("fires exactly one impact per shot, however long the follow-through runs", () => {
    let state = createGolfHoleState();
    let aimHeld = 0;
    // Play until the ball is rolling: one whole shot, impact included.
    for (let tick = 0; tick < 60 * 20 && state.phase !== "ROLL"; tick += 1) {
      state = advanceGolfHole(state, inputFor(state, GOOD, aimHeld), DT);
      aimHeld = 0;
    }
    expect(state.impactCount).toBe(1);
    expect(state.shotCount).toBe(1);
  });

  it("holds the ball on the tee until the impact event, then lets it go", () => {
    let state = createGolfHoleState();
    while (state.phase !== "SWING") state = advanceGolfHole(state, inputFor(state, GOOD, 0), DT);

    // Mid-swing the club is moving and the ball has not moved at all.
    for (let tick = 0; tick < 10; tick += 1) {
      state = advanceGolfHole(state, IDLE_INPUT, DT);
    }
    expect(state.phase).toBe("SWING");
    expect(state.ball.x).toBe(0);
    expect(state.swingTime).toBeGreaterThan(0);

    while (state.phase === "SWING") state = advanceGolfHole(state, IDLE_INPUT, DT);
    expect(state.phase).toBe("IMPACT");
    // The follow-through is still to come: the swing clock keeps running while
    // the ball flies, which is what makes them one motion rather than two.
    expect(state.swingTime).toBeCloseTo(GOLF_SWING.impactAtSeconds, 1);
    expect(state.swingStage).toBe("IMPACT");
  });

  it("shows the six poses of a driver swing, not one rotating arm", () => {
    const seen = new Set<string>();
    let state = createGolfHoleState();
    let aimHeld = 0;
    for (let tick = 0; tick < 60 * 20 && state.phase !== "SHOT_END"; tick += 1) {
      state = advanceGolfHole(state, inputFor(state, GOOD, aimHeld), DT);
      aimHeld = 0;
      seen.add(state.swingStage);
    }
    expect([...seen].sort()).toEqual(
      ["ADDRESS", "BACKSWING", "DOWNSWING", "FINISH", "FOLLOW_THROUGH", "IMPACT"].sort(),
    );
  });
});

describe("power and timing decide the shot, and nothing else does", () => {
  it("sends the ball further the harder it is struck", () => {
    const soft = play({ power: 0.45, contactTolerance: 0.03 });
    const hard = play({ power: 0.97, contactTolerance: 0.03 });
    expect(hard.state.shotLog[0].carryM).toBeGreaterThan(soft.state.shotLog[0].carryM);
  });

  it("costs distance and line when the face is not square", () => {
    const pure = play({ power: 0.97, contactTolerance: 0.03 });
    const thin = play({ power: 0.97, contactTolerance: 0.3 });
    expect(Math.abs(pure.state.shotLog[0].carryM)).toBeGreaterThan(0);
    expect(thin.state.shotLog[0].carryM).toBeLessThanOrEqual(pure.state.shotLog[0].carryM);
  });

  it("punishes not swinging at all rather than quietly letting it pass", () => {
    const struck = play({ power: 0.97, contactTolerance: 0.03 });
    const missed = play({ power: 0.97, contactTolerance: null });
    expect(missed.state.shotLog[0].carryM).toBeLessThan(struck.state.shotLog[0].carryM);
    // A player who never presses the second button cannot out-drive one who does.
    expect(GOLF_TUNING.noContactStrike).toBeLessThan(1);
  });

  it("runs no further than the range its own club advertises", () => {
    // The range beside the club is the estimator; the shot is the simulation.
    // If they disagree the player is being told a number nobody used.
    let state = createGolfHoleState();
    const player: Player = { power: 0.97, contactTolerance: 0.03 };
    while (state.phase !== "SHOT_END") {
      state = advanceGolfHole(state, inputFor(state, player, 0), DT);
    }
    const advertised = estimateShotDistanceM(GOLF_COURSE, "DRIVER", state.power, "TEE");
    expect(state.lastShotM).toBeLessThanOrEqual(advertised);
    // And not so far under it that the estimate is decorative.
    expect(state.lastShotM).toBeGreaterThan(advertised * 0.9);
  });

  it("aims relative to the flag, so a held key really moves the line", () => {
    let state = createGolfHoleState();
    expect(state.aimDeg).toBe(0);
    for (let tick = 0; tick < 60; tick += 1) state = advanceGolfHole(state, LEFT, DT);
    expect(state.aimDeg).toBeLessThan(0);
    for (let tick = 0; tick < 600; tick += 1) state = advanceGolfHole(state, LEFT, DT);
    // Clamped, so the line cannot be walked round behind the player.
    expect(state.aimDeg).toBe(-GOLF_TUNING.aimLimitDeg);
  });
});

/* ── The hole, end to end ─────────────────────────────────────────────────── */

describe("one hole, played to the end", () => {
  it("is identical run to run from identical input", () => {
    const first = play(GOOD);
    const second = play(GOOD);
    expect(second.state).toEqual(first.state);
    expect(second.ticks).toBe(first.ticks);
  });

  it("starts every run from a genuinely fresh state", () => {
    const before = createGolfHoleState();
    play(GOOD);
    expect(createGolfHoleState()).toEqual(before);
    expect(before.done).toBe(false);
    expect(before.shotCount).toBe(0);
    // Shot one is on the tee before a ball has been struck: the two numbers
    // are different things and are never the same variable.
    expect(before.shotCount + 1).toBe(1);
  });

  it("refuses to advance once it has reported itself", () => {
    const { state } = play(GOOD);
    expect(state.done).toBe(true);
    expect(advanceGolfHole(state, PRESS, DT)).toBe(state);
  });

  it("changes club as the hole gets shorter, with no menu to open", () => {
    const clubs = new Set<string>();
    let state = createGolfHoleState();
    let ticks = 0;
    while (!state.done && ticks < 60 * 240) {
      state = advanceGolfHole(state, inputFor(state, GOOD, 0), DT);
      clubs.add(state.club);
      ticks += 1;
    }
    expect(clubs.has("DRIVER")).toBe(true);
    expect(clubs.has("PUTTER")).toBe(true);
    expect(GOLF_CLUBS.PUTTER.launchSpeedMps).toBeLessThan(GOLF_CLUBS.DRIVER.launchSpeedMps);
  });

  it("keeps the ball, the score and the club across a shot boundary", () => {
    let state = createGolfHoleState();
    while (state.shotCount < 1 || state.phase !== "AIM") {
      state = advanceGolfHole(state, inputFor(state, GOOD, 0), DT);
    }
    expect(state.shotCount).toBe(1);
    expect(state.ball.x).toBeGreaterThan(50);
    expect(state.lastShotM).toBeGreaterThan(50);
    expect(state.totalStrokes).toBe(1);
    // A second shot starts where the first one stopped, not back on the tee.
    expect(state.shotStart.x).toBeCloseTo(state.ball.x, 6);
  });

  it("stops at the shot cap and calls that unfinished, not a win", () => {
    const { state } = play(WEAK);
    expect(state.shotCount).toBe(GOLF_COURSE.maxShots);
    expect(state.status).toBe("abandoned");
    expect(state.phase).toBe("RESULT");
    expect(getGolfHoleResult(state).heading).toBe("RUN ABANDONED");
  });

  it("records a penalty for going out, and puts the ball back where it was", () => {
    // Aimed far enough off line that a pure strike leaves the hole entirely.
    const wild = play({
      power: 0.97,
      contactTolerance: 0.03,
      aim: "left",
      aimSeconds: 3,
    });
    const outShot = wild.state.shotLog.find((shot) => shot.penalty > 0);
    expect(outShot, "no shot ever went out of bounds").toBeDefined();
    expect(wild.state.penaltyStrokes).toBeGreaterThan(0);
    // Stroke and distance: the score went up, the ball did not move forward.
    expect(wild.state.totalStrokes).toBeGreaterThan(wild.state.shotCount);
  });

  it("does not turn a ball already in the cup into an abandoned run", () => {
    let state = createGolfHoleState();
    while (state.phase !== "HOLED") {
      state = advanceGolfHole(state, inputFor(state, GOOD, 0), DT);
    }
    // Leaving while the ball is sitting in the hole finished the hole.
    const left = abandonGolfHole(state);
    expect(left.status).toBe("completed");
    expect(getGolfHoleResult(left).heading).toBe("HOLED OUT");
  });

  it("holes out, and says so, when the ball actually goes in", () => {
    const { state } = play(GOOD);
    expect(state.status).toBe("completed");
    expect(state.ball.x).toBe(GOLF_COURSE.holeM);
    expect(distanceToHoleM(GOLF_COURSE, state.ball)).toBe(0);
    expect(getGolfHoleResult(state).heading).toBe("HOLED OUT");
  });

  it("can be conceded part way, which is not a completed hole", () => {
    let state = createGolfHoleState();
    while (state.shotCount < 1) state = advanceGolfHole(state, inputFor(state, GOOD, 0), DT);
    const conceded = abandonGolfHole(state);
    expect(conceded.done).toBe(true);
    expect(conceded.status).toBe("abandoned");
    expect(conceded.phase).toBe("RESULT");
    // Conceding twice is still one ending.
    expect(abandonGolfHole(conceded)).toBe(conceded);
    expect(getGolfHoleResult(conceded).heading).toBe("RUN ABANDONED");
  });
});

/* ── What leaves the hole ─────────────────────────────────────────────────── */

describe("the run record the board will read", () => {
  it("is a valid versioned run, GUEST until a name is supplied", () => {
    const { state } = play(GOOD);
    const run = createGolfRunResult(
      draftGolfRun(state, { runId: "run-1", elapsedSimulationMs: 42_000 }),
    );
    expect(isGolfRunResultV1(run)).toBe(true);
    expect(run.playerDisplayName).toBe("GUEST");
    expect(run.courseId).toBe(GOLF_COURSE.courseId);
    expect(run.rulesVersion).toBe(GOLF_COURSE.rulesVersion);
    expect(run.status).toBe("completed");
    expect(run.remainingDistanceM).toBe(0);
    expect(run.elapsedSimulationMs).toBe(42_000);
    expect(run.totalStrokes).toBe(run.shotCount + run.penaltyStrokes);
  });

  it("carries the supplied name through untouched", () => {
    const { state } = play(GOOD);
    const run = createGolfRunResult(
      draftGolfRun(state, {
        runId: "run-2",
        elapsedSimulationMs: 1,
        playerDisplayName: "EDWARD",
      }),
    );
    expect(run.playerDisplayName).toBe("EDWARD");
  });

  it("logs one entry per shot struck, in the order they were played", () => {
    const { state } = play(GOOD);
    expect(state.shotLog).toHaveLength(state.shotCount);
    state.shotLog.forEach((shot, index) => {
      expect(shot.index).toBe(index + 1);
      expect(shot.atSimulationMs).toBeGreaterThanOrEqual(0);
    });
    const times = state.shotLog.map((shot) => shot.atSimulationMs);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it("ranks a hole by strokes, where fewer is better", () => {
    const { state } = play(GOOD);
    const result = getGolfHoleResult(state);
    expect(result.rank.better).toBe("lower");
    expect(result.rank.value).toBe(state.totalStrokes);
  });
});

/* ── Clocks and screens ───────────────────────────────────────────────────── */

describe("the simulation is the same however the frames arrive", () => {
  /** Drives the hole through the fixed stepper at a given steps-per-frame. */
  const TOTAL_STEPS = 1800;

  function throughStepper(stepsPerFrame: number, pressAtSteps: readonly number[]) {
    const stepper = createFixedStepper();
    const presses = new Set(pressAtSteps);
    let state = createGolfHoleState();
    let stepIndex = 0;

    // The same simulated time in every schedule — a frame count would give the
    // slow schedule six times as much hole to play.
    for (let frame = 0; frame < TOTAL_STEPS / stepsPerFrame; frame += 1) {
      const firstStep = frame * stepsPerFrame;
      const input = presses.has(firstStep) ? PRESS : IDLE_INPUT;
      stepper.advance(SPORTSGANG_STEP_MS * stepsPerFrame, input, (dt, stepInput) => {
        state = advanceGolfHole(state, stepInput, dt);
        stepIndex += 1;
      });
    }
    return { state, stepIndex };
  }

  it("reaches the same state at 60, 30, 20 and 12 frames a second", () => {
    // Presses land on step multiples of thirty, which is the first substep of
    // a frame at every schedule below — so the same taps reach the same steps
    // and any difference left is the simulation's, not the schedule's.
    const pressAtSteps = [30, 60, 90, 330, 630, 930, 1230];
    const at60 = throughStepper(1, pressAtSteps);
    const at30 = throughStepper(2, pressAtSteps);
    const at20 = throughStepper(3, pressAtSteps);
    const at12 = throughStepper(5, pressAtSteps);

    expect(at60.stepIndex).toBe(TOTAL_STEPS);
    expect(at30.state).toEqual(at60.state);
    expect(at20.state).toEqual(at60.state);
    expect(at12.state).toEqual(at60.state);
  });

  it("drops time rather than spiralling when a frame is longer than the budget", () => {
    // Six steps in one frame is past the clock's five-substep catch-up budget,
    // so the sixth step's time is discarded by design. The hole must fall
    // behind, not break: this is the documented clock, not a golf rule.
    const pressAtSteps = [30, 60, 90, 330, 630, 930, 1230];
    const starved = throughStepper(6, pressAtSteps);
    expect(starved.stepIndex).toBeLessThan(TOTAL_STEPS);
    expect(starved.state.done).toBe(false);
  });

  it("does not replay a tap that was made just before the tab was hidden", () => {
    const stepper = createFixedStepper();
    let state = createGolfHoleState();
    const step = (dt: number, input: MinigameInput) => {
      state = advanceGolfHole(state, input, dt);
    };

    // A tap inside a frame too short to produce a step, then a suspend.
    stepper.advance(3, PRESS, step);
    expect(state.phase).toBe("AIM");
    stepper.reset();

    // Back from the hidden tab: plenty of time, no press, nothing latched.
    stepper.advance(SPORTSGANG_STEP_MS, IDLE_INPUT, step);
    expect(state.phase).toBe("AIM");
    expect(state.shotCount).toBe(0);
  });
});
