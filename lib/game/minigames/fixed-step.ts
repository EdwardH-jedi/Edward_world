/**
 * The SportsGang simulation clock.
 *
 * Every sport in this location advances on one fixed interval, so a ball and
 * the player holding the racket cannot drift apart the way they would if each
 * read its own `deltaSeconds` off `requestAnimationFrame`. Frame time is
 * accumulated here and handed to the simulation in equal slices.
 *
 * It is a plain function rather than a hook on purpose: this is the layer that
 * has to be testable without React, a DOM, or a real clock. The component-side
 * wrapper is `components/sportsgang/minigames/use-fixed-step-loop.ts`, and it
 * is the only place `requestAnimationFrame` appears.
 *
 * Nothing here changes `lib/motion/use-game-loop.ts`. The house, the arcade
 * platformer and the intro keep the variable-delta loop they already use —
 * this adapter is scoped to SportsGang.
 *
 * ## The three rules that make edges survive a fixed step
 *
 * A frame and a simulation step are different lengths, so a press can land in
 * a frame that produces no step at all, or in one that produces five. Both
 * cases are wrong by default, and both are handled:
 *
 * 1. **Edges fire on the first substep only.** `pressed` means "went down
 *    during this frame", so replaying it on substeps 2..n would count one tap
 *    as several. Later substeps see the same `held` values with the edges
 *    cleared.
 * 2. **A frame with no substep latches its edges** rather than dropping them.
 *    A 3 ms frame at 60 Hz produces nothing to step; the tap inside it is held
 *    until the next frame that does step, where it fires exactly once.
 * 3. **A long stall is discarded, not repaid.** After a tab has been hidden
 *    for a minute the accumulator is clamped to `maxSubsteps` worth of time
 *    and the rest is thrown away — the alternative is a spiral where catching
 *    up costs more time than it recovers.
 */

import type { MinigameInput } from "@/lib/game/minigames/types";

/** 60 Hz. The rate every SportsGang simulation is written and tested against. */
export const SPORTSGANG_STEP_MS = 1000 / 60;

/** Frames worth of catch-up before time is dropped instead of simulated. */
export const SPORTSGANG_MAX_SUBSTEPS = 5;

/**
 * Slack in the "is a whole step available" comparison.
 *
 * 1000/60 has no exact binary representation, so subtracting it three times
 * from 50 leaves 16.66666666666666 — a hair under one step, which silently
 * costs the frame its third substep and, over a minute, drops simulated time
 * the player paid for. The tolerance is far below a step and far above the
 * accumulated error.
 */
const STEP_EPSILON_MS = 1e-9;

export interface FixedStepperOptions {
  /** Length of one simulation step, in milliseconds. */
  readonly stepMs?: number;
  /** Most steps a single frame may run before the remainder is discarded. */
  readonly maxSubsteps?: number;
}

/** What one call to `advance` did, so callers and tests can assert on it. */
export interface FixedStepReport {
  /** Substeps actually run. */
  readonly steps: number;
  /** Simulated milliseconds this call added. `steps * stepMs`. */
  readonly steppedMs: number;
  /** Frame time discarded because `maxSubsteps` was reached. */
  readonly droppedMs: number;
}

export interface FixedStepper {
  /**
   * Feeds one frame in and runs whole steps out.
   *
   * `input` is the frame's snapshot. `step` is the simulation, called once per
   * substep with a constant `dtSeconds`.
   */
  advance(
    frameDeltaMs: number,
    input: MinigameInput,
    step: (dtSeconds: number, input: MinigameInput) => void,
  ): FixedStepReport;
  /**
   * Forgets pending time and any latched edge.
   *
   * Used when play is suspended — a blurred window, a hidden tab — so a tap
   * made just before leaving does not fire on return, and the accumulated
   * away-time is not simulated at once.
   */
  reset(): void;
  /** Total simulated milliseconds since creation. Survives `reset`. */
  readonly elapsedMs: number;
  /**
   * Starts a new run's clock.
   *
   * `elapsedMs` deliberately survives `reset`, so it cannot also mean "this
   * attempt". A sport that offers PLAY AGAIN without remounting — which is
   * every sport here — calls this when the new run begins, and reports
   * `elapsedSinceRunStartMs`. Without it the second run inherits the first
   * one's duration.
   */
  markRunStart(): void;
  /** Simulated milliseconds since the last `markRunStart`, or since creation. */
  readonly elapsedSinceRunStartMs: number;
  /** Unsimulated remainder currently held, in milliseconds. */
  readonly pendingMs: number;
}

/** The two edge flags, apart from the held state they travel with. */
interface EdgePair {
  readonly pressed: boolean;
  readonly released: boolean;
}

/** Edge fields only. Held state always comes from the live frame. */
function latchEdges(carried: EdgePair, frame: EdgePair): EdgePair {
  return {
    pressed: carried.pressed || frame.pressed,
    released: carried.released || frame.released,
  };
}

export function createFixedStepper(options: FixedStepperOptions = {}): FixedStepper {
  const stepMs = options.stepMs ?? SPORTSGANG_STEP_MS;
  const maxSubsteps = options.maxSubsteps ?? SPORTSGANG_MAX_SUBSTEPS;

  if (!(stepMs > 0)) throw new RangeError("stepMs must be positive");
  if (!Number.isInteger(maxSubsteps) || maxSubsteps < 1) {
    throw new RangeError("maxSubsteps must be a positive integer");
  }

  const dtSeconds = stepMs / 1000;
  let accumulatorMs = 0;
  let elapsedMs = 0;
  let runStartMs = 0;
  /** Edges seen in frames that produced no step, waiting for one that does. */
  let carried: EdgePair = { pressed: false, released: false };

  return {
    advance(frameDeltaMs, input, step) {
      // A negative or non-finite frame delta is a clock going backwards, not a
      // request to simulate backwards.
      if (Number.isFinite(frameDeltaMs) && frameDeltaMs > 0) {
        accumulatorMs += frameDeltaMs;
      }

      const edges = latchEdges(carried, input);

      const budgetMs = maxSubsteps * stepMs;
      let droppedMs = 0;
      if (accumulatorMs > budgetMs + STEP_EPSILON_MS) {
        droppedMs = accumulatorMs - budgetMs;
        accumulatorMs = budgetMs;
      }

      let steps = 0;
      while (accumulatorMs >= stepMs - STEP_EPSILON_MS) {
        // Rule 1: the frame's edges belong to the first substep and no other.
        const substepInput: MinigameInput =
          steps === 0
            ? { ...input, pressed: edges.pressed, released: edges.released }
            : { ...input, pressed: false, released: false };

        accumulatorMs -= stepMs;
        // Drift can leave a negative crumb where the answer is exactly zero.
        if (Math.abs(accumulatorMs) < STEP_EPSILON_MS) accumulatorMs = 0;
        steps += 1;
        elapsedMs += stepMs;
        step(dtSeconds, substepInput);
      }

      // Rule 2: nothing stepped, so the edges are still owed to the simulation.
      carried = steps === 0 ? edges : { pressed: false, released: false };

      return { steps, steppedMs: steps * stepMs, droppedMs };
    },

    reset() {
      accumulatorMs = 0;
      carried = { pressed: false, released: false };
    },

    markRunStart() {
      runStartMs = elapsedMs;
    },

    get elapsedMs() {
      return elapsedMs;
    },

    get elapsedSinceRunStartMs() {
      return elapsedMs - runStartMs;
    },

    get pendingMs() {
      return accumulatorMs;
    },
  };
}
