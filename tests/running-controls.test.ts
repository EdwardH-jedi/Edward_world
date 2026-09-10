import { describe, expect, it } from "vitest";
import {
  advanceRunning,
  createRunningState,
  CRUISE_PACE,
  getPacerDistance,
  getRunningResult,
  getStaminaRate,
  LANE_LIMIT,
  RACE_METRES,
  SPRINT_PACE,
  TOP_SPEED_MPS,
  type RunningState,
} from "@/lib/game/minigames/running";
import { IDLE_INPUT, type MinigameInput } from "@/lib/game/minigames/types";

/**
 * The running control contract, driven the way the loop drives it.
 *
 * Arrows move, `S` spurts, and the three of them are separate channels that can
 * be held at once. What is being defended here is mostly the honesty of the
 * result: that the clock and the finish line answer to the runner's position on
 * the track's forward axis and to nothing else, so no amount of crossing,
 * doubling back or moving diagonally can manufacture a time.
 */

const TICK = 1 / 60;

const right: MinigameInput = { ...IDLE_INPUT, right: true };
const left: MinigameInput = { ...IDLE_INPUT, left: true };
const sprintRight: MinigameInput = { ...IDLE_INPUT, right: true, sprint: true };
const sprintOnly: MinigameInput = { ...IDLE_INPUT, sprint: true };

function run(
  ticks: number,
  inputAt: (tick: number, state: RunningState) => MinigameInput = () => IDLE_INPUT,
  from: RunningState = createRunningState(),
) {
  let state = from;
  for (let tick = 0; tick < ticks; tick += 1) {
    state = advanceRunning(state, inputAt(tick, state), TICK);
  }
  return state;
}

/** Runs until something is true, so a test can sample the moment it happens. */
function runUntil(
  reached: (state: RunningState) => boolean,
  inputAt: (tick: number, state: RunningState) => MinigameInput,
  from: RunningState = createRunningState(),
  cap = 60 * 120,
) {
  let state = from;
  for (let tick = 0; tick < cap; tick += 1) {
    if (reached(state)) return state;
    state = advanceRunning(state, inputAt(tick, state), TICK);
  }
  throw new Error("the run never reached the state the test was waiting for");
}

/** Past the SET phase and running, with nothing else having happened. */
function onTheTrack() {
  const state = run(120);
  expect(state.phase).toBe("RUNNING");
  return state;
}

describe("running — movement", () => {
  it("stays on the line through the SET phase whatever is held", () => {
    const state = run(50, () => sprintRight);
    expect(state.phase).toBe("SET");
    expect(state.distance).toBe(0);
    expect(state.pace).toBe(0);
    expect(state.stamina).toBe(1);
  });

  it("moves right while right is held", () => {
    const state = run(120, () => right, onTheTrack());
    expect(state.distance).toBeGreaterThan(0);
    expect(state.heading).toBe(1);
    expect(state.pace).toBeCloseTo(CRUISE_PACE, 5);
  });

  it("coasts to a stop when nothing is held, rather than running on for ever", () => {
    const moving = run(120, () => right, onTheTrack());
    const coasted = run(120, () => IDLE_INPUT, moving);
    expect(coasted.pace).toBe(0);
    // It carried on a little way while slowing, and then stopped dead.
    expect(coasted.distance).toBeGreaterThan(moving.distance);
    const later = run(120, () => IDLE_INPUT, coasted);
    expect(later.distance).toBe(coasted.distance);
  });

  it("brakes before it turns round, and then goes the other way", () => {
    const moving = run(300, () => right, onTheTrack());
    expect(moving.heading).toBe(1);

    // One tick of the opposite direction slows it and does not flip it.
    const braking = advanceRunning(moving, left, TICK);
    expect(braking.heading).toBe(1);
    expect(braking.pace).toBeLessThan(moving.pace);

    // Momentum is real: the runner carries on forward while shedding pace, and
    // only turns once actually stopped.
    const stopped = runUntil((state) => state.pace === 0, () => left, moving);
    expect(stopped.distance).toBeGreaterThan(moving.distance);

    const turned = run(60, () => left, stopped);
    expect(turned.heading).toBe(-1);
    expect(advanceRunning(turned, left, TICK).distance).toBeLessThan(turned.distance);

    // And given room it ends up behind where the brake was applied.
    const wayBack = run(180, () => left, turned);
    expect(wayBack.distance).toBeLessThan(moving.distance);
  });

  it("treats both directions at once as no direction at all", () => {
    const moving = run(120, () => right, onTheTrack());
    const both = run(120, () => ({ ...IDLE_INPUT, left: true, right: true }), moving);
    expect(both.pace).toBe(0);
    expect(both.heading).toBe(1);
  });

  it("stops at the start line instead of running off the back of the track", () => {
    const backwards = run(600, () => left, onTheTrack());
    expect(backwards.distance).toBe(0);
    expect(backwards.pace).toBe(0);
    // And it is not still burning stamina against the wall.
    const later = run(300, () => left, backwards);
    expect(later.stamina).toBe(backwards.stamina);
  });
});

describe("running — the width of the track", () => {
  it("moves between lanes with up and down", () => {
    const start = onTheTrack();
    const up = run(30, () => ({ ...IDLE_INPUT, up: true }), start);
    expect(up.lane).toBeLessThan(start.lane);

    const down = run(60, () => ({ ...IDLE_INPUT, down: true }), up);
    expect(down.lane).toBeGreaterThan(up.lane);
  });

  it("keeps the runner inside the track", () => {
    const far = run(600, () => ({ ...IDLE_INPUT, up: true }), onTheTrack());
    expect(far.lane).toBe(-LANE_LIMIT);
    const near = run(600, () => ({ ...IDLE_INPUT, down: true }), far);
    expect(near.lane).toBe(LANE_LIMIT);
  });

  it("treats both lane keys at once as neither", () => {
    const start = onTheTrack();
    const state = run(120, () => ({ ...IDLE_INPUT, up: true, down: true }), start);
    expect(state.lane).toBe(start.lane);
  });

  it("gains no ground by crossing the track", () => {
    const start = onTheTrack();
    const straight = run(180, () => right, start);
    // The same 180 ticks, weaving across the full width and back the whole way.
    const weaving = run(
      180,
      (tick) => ({ ...IDLE_INPUT, right: true, up: tick % 60 < 30, down: tick % 60 >= 30 }),
      start,
    );
    expect(weaving.distance).toBeCloseTo(straight.distance, 9);
    expect(weaving.elapsed).toBeCloseTo(straight.elapsed, 9);
  });

  it("gains nothing by pressing a lane key instead of a direction", () => {
    const state = run(300, () => ({ ...IDLE_INPUT, up: true }), onTheTrack());
    expect(state.distance).toBe(0);
    expect(state.pace).toBe(0);
  });

  it("gives a diagonal no more forward speed than a straight line", () => {
    const start = onTheTrack();
    const straight = run(120, () => sprintRight, start);
    const diagonal = run(120, () => ({ ...sprintRight, up: true }), start);
    expect(diagonal.distance).toBeCloseTo(straight.distance, 9);
    expect(diagonal.pace).toBeCloseTo(straight.pace, 9);
    expect(diagonal.stamina).toBeCloseTo(straight.stamina, 9);
  });
});

describe("running — the spurt", () => {
  it("is faster than running, and costs stamina to be", () => {
    const start = onTheTrack();
    const cruising = run(180, () => right, start);
    const spurting = run(180, () => sprintRight, start);

    expect(spurting.distance).toBeGreaterThan(cruising.distance);
    expect(spurting.pace).toBeGreaterThan(cruising.pace);
    expect(spurting.pace).toBeCloseTo(SPRINT_PACE, 5);

    // Cruise is the pace that costs nothing; the spurt is the pace that does.
    expect(cruising.stamina).toBe(1);
    expect(spurting.stamina).toBeLessThan(1);
  });

  it("does nothing at all while standing still", () => {
    const start = onTheTrack();
    const state = run(300, () => sprintOnly, start);
    expect(state.distance).toBe(start.distance);
    expect(state.pace).toBe(0);
    // Not moving is not spurting, so there is nothing to pay for.
    expect(state.stamina).toBe(1);
    expect(state.exhausted).toBe(false);
  });

  it("drops back to running pace the moment it is released", () => {
    const spurting = run(180, () => sprintRight, onTheTrack());
    expect(spurting.pace).toBeGreaterThan(CRUISE_PACE);

    const released = run(120, () => right, spurting);
    expect(released.pace).toBeCloseTo(CRUISE_PACE, 5);
    // Back at cruise the tank neither empties nor refills.
    const held = run(120, () => right, released);
    expect(held.stamina).toBeCloseTo(released.stamina, 9);
  });

  it("pays the spurt back only below cruise, by easing off", () => {
    const spent = run(240, () => sprintRight, onTheTrack());
    expect(spent.stamina).toBeLessThan(1);

    const recovered = run(180, () => IDLE_INPUT, spent);
    expect(recovered.stamina).toBeGreaterThan(spent.stamina);
    // Which costs ground: the recovery is bought with the clock.
    expect(recovered.distance - spent.distance).toBeLessThan(
      CRUISE_PACE * TOP_SPEED_MPS * 180 * TICK,
    );
  });

  it("empties the tank if it is never released, and then caps the legs", () => {
    const emptied = runUntil((state) => state.exhausted, () => sprintRight, onTheTrack());
    // Empty is the pre-existing 0.001 threshold the exhaustion latch uses, not
    // a hard zero: the tank is judged spent a hair before it reads nothing.
    expect(emptied.lowestStamina).toBeLessThanOrEqual(0.001);
    expect(emptied.blewUp).toBe(true);
    // Flat out is no longer available: the legs are capped to a stagger.
    const staggering = run(30, () => sprintRight, emptied);
    expect(staggering.pace).toBeLessThanOrEqual(0.28);
  });

  it("holds the runner in the stagger until well past empty, then lets go", () => {
    const emptied = runUntil((state) => state.exhausted, () => sprintRight, onTheTrack());

    // Still capped a moment after the tank refills off zero: the exhaustion is
    // hysteretic, so it does not flicker back and forth at the boundary.
    const nearlyBack = run(30, () => IDLE_INPUT, emptied);
    expect(nearlyBack.stamina).toBeGreaterThan(0);
    expect(nearlyBack.stamina).toBeLessThan(0.45);
    expect(nearlyBack.exhausted).toBe(true);

    const back = runUntil((state) => !state.exhausted, () => IDLE_INPUT, emptied);
    expect(back.stamina).toBeGreaterThanOrEqual(0.45);
    // And the run remembers it happened.
    expect(back.blewUp).toBe(true);
  });

  it("keeps stamina inside 0..1 however long the spurt is held", () => {
    const state = run(60 * 40, () => sprintRight);
    expect(state.stamina).toBeGreaterThanOrEqual(0);
    expect(state.stamina).toBeLessThanOrEqual(1);
  });
});

describe("running — input robustness", () => {
  it("survives a tap far shorter than a frame's worth of holding", () => {
    const start = onTheTrack();
    const tapped = advanceRunning(start, right, TICK);
    expect(tapped.pace).toBeGreaterThan(0);
    // And a single tap is not a run: it coasts back to a stop on its own.
    const after = run(120, () => IDLE_INPUT, tapped);
    expect(after.pace).toBe(0);
  });

  it("reads a held key the same however many ticks it is held over", () => {
    // Auto-repeat gives the hook a stream of key events but one held channel,
    // so the simulation must not care how the hold was delivered.
    const start = onTheTrack();
    const steady = run(180, () => right, start);
    const chunked = run(60, () => right, run(60, () => right, run(60, () => right, start)));
    expect(chunked.distance).toBeCloseTo(steady.distance, 9);
    expect(chunked.pace).toBeCloseTo(steady.pace, 9);
  });

  it("comes to rest, not to a crawl, when every key is let go", () => {
    // A stuck key would show up here as a pace that never reaches zero.
    const moving = run(300, () => sprintRight, onTheTrack());
    const released = run(300, () => IDLE_INPUT, moving);
    expect(released.pace).toBe(0);
    expect(released.lane).toBe(moving.lane);
  });
});

describe("running — the race", () => {
  it("finishes on the forward axis, and only by reaching the far line", () => {
    const finished = run(60 * 60, () => right);
    expect(finished.done).toBe(true);
    expect(finished.distance).toBe(RACE_METRES);
    expect(getRunningResult(finished).playerScore).toMatch(/^\d+:\d\d\.\d$/);
  });

  it("cannot be finished by pacing back and forth over the same ground", () => {
    // 90 seconds of running hard in alternating directions covers a great deal
    // of ground and finishes nothing, because the line is a place, not a total.
    const state = run(60 * 90, (tick) => (Math.floor(tick / 90) % 2 === 0 ? right : left));
    expect(state.done).toBe(false);
    expect(state.distance).toBeLessThan(RACE_METRES);
  });

  it("stays a demonstration rather than a chore", () => {
    const cruise = run(60 * 60, () => right);
    expect(cruise.elapsed).toBeGreaterThan(15);
    expect(cruise.elapsed).toBeLessThan(50);
  });

  it("rewards spending stamina and paying it back over emptying the tank", () => {
    const allOut = run(60 * 90, () => sprintRight);
    const paced = run(60 * 90, (_tick, current) => {
      if (current.stamina > 0.55) return sprintRight;
      if (current.stamina < 0.35) return IDLE_INPUT;
      return right;
    });

    expect(allOut.blewUp).toBe(true);
    expect(paced.blewUp).toBe(false);
    expect(paced.done).toBe(true);
    expect(paced.elapsed).toBeLessThan(allOut.elapsed);
  });

  it("beats an even pace by spurting, but only if the tank holds out", () => {
    const even = run(60 * 60, () => right);
    const judged = run(60 * 60, (_tick, current) =>
      current.stamina > 0.25 ? sprintRight : right,
    );
    expect(judged.done).toBe(true);
    expect(judged.elapsed).toBeLessThan(even.elapsed);
  });

  it("refuses to advance once it is over", () => {
    const finished = run(60 * 60, () => right);
    expect(advanceRunning(finished, sprintRight, TICK)).toBe(finished);
  });

  it("plays the same way twice from a fresh state", () => {
    const first = run(60 * 60, () => right);
    const second = run(60 * 60, () => right);
    expect(second).toEqual(first);
    expect(createRunningState()).toEqual(createRunningState());
  });
});

describe("running — the pacer", () => {
  it("is a script on the simulation's own clock", () => {
    expect(getPacerDistance(0)).toBe(0);
    expect(getPacerDistance(10)).toBeCloseTo(10 * CRUISE_PACE * TOP_SPEED_MPS, 9);
    // It runs to the line and stops there; it is not a rival that can be beaten
    // into a wall or dragged past the finish.
    expect(getPacerDistance(10_000)).toBe(RACE_METRES);
    expect(getPacerDistance(-5)).toBe(0);
  });

  it("holds exactly the pace that costs the runner nothing", () => {
    expect(getStaminaRate(CRUISE_PACE)).toBe(0);
    // Which is the whole point of showing it: matching the pacer is free.
    const matched = getPacerDistance(20);
    const runner = run(60 * 20 + 60 * 0.9, () => right);
    expect(runner.stamina).toBe(1);
    // Within the second it takes to wind up to cruise from a standing start.
    expect(Math.abs(runner.distance - matched)).toBeLessThan(
      CRUISE_PACE * TOP_SPEED_MPS,
    );
  });
});

describe("running — the body model is the one that was already here", () => {
  it("keeps the drain, the recovery and the curve exactly as they were", () => {
    expect(getStaminaRate(CRUISE_PACE)).toBe(0);
    expect(getStaminaRate(1)).toBeLessThan(0);
    expect(getStaminaRate(0.2)).toBeGreaterThan(0);
    // The cost of pushing grows faster than the push itself.
    expect(Math.abs(getStaminaRate(1))).toBeGreaterThan(
      4 * Math.abs(getStaminaRate(CRUISE_PACE + 0.15)),
    );
    // The exact values, so a later tuning pass has to be deliberate about it.
    expect(getStaminaRate(1)).toBeCloseTo(-0.8 * 0.38 * 0.38 * 3, 9);
    expect(getStaminaRate(0)).toBeCloseTo(0.2 * CRUISE_PACE * 4, 9);
  });

  it("still makes the tank finite, not decorative", () => {
    // Flat out from the gun empties it inside a few seconds, as it always did.
    // If a later pass ever makes the spurt free, this is what notices.
    const emptied = runUntil((state) => state.exhausted, () => sprintRight);
    expect(emptied.elapsed).toBeLessThan(6);
    expect(emptied.distance).toBeLessThan(RACE_METRES);
  });
});
