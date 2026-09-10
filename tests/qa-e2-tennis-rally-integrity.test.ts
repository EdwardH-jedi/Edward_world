/**
 * Rally integrity, asserted rather than observed.
 *
 * The first QA pass (session E) found the serve teleporting — the toss fell
 * through the court while the phase ran on, and the ball reappeared above it
 * already struck. That defect was fixed and pinned by `qa-e-tennis-serve.test.ts`,
 * but it was a *floor-penetration* bug found by watching one phase, and nothing
 * asserted the equivalent invariants across an ordinary rally.
 *
 * This file is the second QA pass (E2) closing that gap. Every check here runs
 * over complete matches played to the target score, under the same four frame
 * schedules the determinism suite uses, so a defect that only appears on a
 * stuttering browser is caught here rather than on a visitor's screen.
 *
 * These are invariants, not tuning: each one is a thing the brief asks about —
 * 허공 타격 (swinging at air), 중복 타격 (a double hit), 공 teleport, and
 * 네트/바닥 관통 (going through the net or the floor).
 */

import { describe, expect, it } from "vitest";
import {
  advanceTennis,
  contactAnchor,
  createTennisState,
  STRIKE_HALF_X,
  STRIKE_HALF_Y,
  SWING_SPEC,
  TENNIS_COURT,
  type TennisState,
} from "@/lib/game/minigames/tennis";
import { createFixedStepper, SPORTSGANG_STEP_MS } from "@/lib/game/minigames/fixed-step";
import { IDLE_INPUT, type MinigameInput } from "@/lib/game/minigames/types";

const DT = SPORTSGANG_STEP_MS / 1000;

/**
 * ALEX's extra strike-zone half-extent, mirrored from `ALEX.REACH_BONUS` in the
 * simulation, which is module-private. Duplicated deliberately: if that number
 * moves, this test should fail and be looked at rather than silently follow it.
 */
const ALEX_REACH_BONUS = 0.6;

const SCHEDULES = {
  "60Hz": [SPORTSGANG_STEP_MS],
  "30Hz": [SPORTSGANG_STEP_MS * 2],
  "120Hz": [SPORTSGANG_STEP_MS / 2],
  ragged: [7, 41, 16.7, 3, 29, 11, 51, 2, 18, 33],
} as const;

/**
 * A visitor who chases the ball and swings when it is near — an ordinary
 * player, not a fixture. Decided from state alone so the script replays
 * identically on every schedule.
 */
function rallyPolicy(state: TennisState): MinigameInput {
  const ball = state.ball;
  const wantsRight = ball.x > state.playerX + 1;
  const wantsLeft = ball.x < state.playerX - 1;
  // Swing when the ball is on Edward's side and within reach.
  const near =
    ball.x < TENNIS_COURT.NET_X && Math.abs(ball.x - state.playerX) < 9 && ball.y < 26;
  return {
    ...IDLE_INPUT,
    left: wantsLeft,
    right: wantsRight,
    action: near,
    pressed: near,
  };
}

interface Observation {
  readonly minBallY: number;
  readonly minTossY: number;
  readonly contacts: {
    tick: number;
    x: number;
    y: number;
    impactX: number;
    impactY: number;
    swing: string;
    by: string;
    /** The striker's position either side of the step the contact fell in. */
    strikerBefore: number;
    strikerAfter: number;
    progress: number;
    /** The swept parameter within the step, as the engine recorded it. */
    t: number;
  }[];
  readonly ticks: number;
  readonly done: boolean;
  readonly points: number;
}

/** Plays a whole match on one frame schedule, recording every invariant. */
function playMatch(frameMs: readonly number[]): Observation {
  const stepper = createFixedStepper();
  let state = createTennisState();
  let minBallY = Infinity;
  let minTossY = Infinity;
  const contacts: Observation["contacts"] = [];
  let lastContactTick = -1;
  let ticks = 0;
  let frame = 0;

  while (!state.done && frame < 200_000) {
    const delta = frameMs[frame % frameMs.length];
    frame += 1;
    stepper.advance(delta, rallyPolicy(state), (dt, input) => {
      const before = state;
      state = advanceTennis(state, input as MinigameInput, dt);
      ticks += 1;

      minBallY = Math.min(minBallY, state.ball.y);
      if (state.toss) minTossY = Math.min(minTossY, state.toss.y);

      const contact = state.lastContact;
      if (contact && contact.tick !== lastContactTick) {
        lastContactTick = contact.tick;
        const isPlayer = contact.by === "PLAYER";
        contacts.push({
          tick: contact.tick,
          x: contact.x,
          y: contact.y,
          impactX: state.impactX,
          impactY: state.impactY,
          swing: contact.swing,
          by: contact.by,
          strikerBefore: isPlayer ? before.playerX : before.alexX,
          strikerAfter: isPlayer ? state.playerX : state.alexX,
          progress: contact.progress,
          t: contact.t,
        });
      }
    });
  }

  return {
    minBallY,
    minTossY,
    contacts,
    ticks,
    done: state.done,
    points: state.playerPoints + state.alexPoints,
  };
}

describe("a whole match keeps its physical invariants on every schedule", () => {
  const runs = Object.entries(SCHEDULES).map(
    ([name, schedule]) => [name, playMatch(schedule)] as const,
  );

  it("plays real matches, so the assertions below are worth making", () => {
    for (const [name, run] of runs) {
      expect(run.done, `${name} finished`).toBe(true);
      // A match that never rallied would satisfy every invariant vacuously.
      expect(run.contacts.length, `${name} had contacts`).toBeGreaterThan(4);
      expect(run.points, `${name} scored points`).toBeGreaterThan(0);
    }
  });

  it("never lets the ball go through the floor", () => {
    for (const [name, run] of runs) {
      expect(run.minBallY, `${name} ball floor`).toBeGreaterThanOrEqual(0);
    }
  });

  it("never lets the serve toss go through the floor — the E-1 defect class", () => {
    for (const [name, run] of runs) {
      if (run.minTossY === Infinity) continue;
      expect(run.minTossY, `${name} toss floor`).toBeGreaterThanOrEqual(0);
    }
  });

  it("draws the spark at the contact, not somewhere else", () => {
    for (const [name, run] of runs) {
      for (const c of run.contacts) {
        expect(c.impactX, `${name} spark x @${c.tick}`).toBeCloseTo(c.x, 9);
        expect(c.impactY, `${name} spark y @${c.tick}`).toBeCloseTo(c.y, 9);
      }
    }
  });

  it("counts no contact twice", () => {
    for (const [name, run] of runs) {
      const ticks = run.contacts.map((c) => c.tick);
      expect(new Set(ticks).size, `${name} distinct contact ticks`).toBe(ticks.length);
    }
  });

  it("never strikes a ball the racket was not on — no swinging at air", () => {
    /*
     * Rebuilds the engine's own swept anchor rather than guessing at it.
     *
     * The racket head is swept from (progressBefore, strikerBefore) to
     * (progressAfter, strikerAfter) and the ball segment is tested against it;
     * `lastContact` records the blended progress and the swept parameter `t`,
     * and the step is always one fixed tick, so both endpoints are recoverable:
     * progressAfter - progressBefore is DT / duration, and progressBefore is
     * progress - t * that.
     *
     * Reconstructing at the blended progress alone does not work — the racket
     * pose comes from a discrete pose table, so the head jumps between frames
     * and anchor(lerp(progress)) is not lerp(anchor(progress)). That is a
     * reconstruction artefact, which is why the endpoints are rebuilt exactly.
     */
    for (const [name, run] of runs) {
      for (const c of run.contacts) {
        const side = c.by as "PLAYER" | "ALEX";
        const kind = c.swing as keyof typeof SWING_SPEC;
        const delta = DT / SWING_SPEC[kind].duration;
        /*
         * The two sides record different progress. Edward's block stores the
         * *blended* progress at the contact instant (`progressBefore + t*delta`);
         * ALEX's stores `swingProgress(swing)`, which is the end-of-step
         * progress. Reconstructing both the same way silently mis-locates one
         * of them, so the origin is recovered per side.
         */
        const progressBefore =
          side === "ALEX" ? c.progress - delta : c.progress - c.t * delta;
        const progressAfter = progressBefore + delta;
        const a = contactAnchor(side, c.strikerBefore, kind, progressBefore);
        const b = contactAnchor(side, c.strikerAfter, kind, progressAfter);
        // Where the engine's racket head actually was at the contact instant.
        const anchorX = a.x + (b.x - a.x) * c.t;
        const anchorY = a.y + (b.y - a.y) * c.t;
        const dx = Math.abs(c.x - anchorX);
        const dy = Math.abs(c.y - anchorY);
        /*
         * The two sides do not share a strike box. ALEX gets `REACH_BONUS`
         * (0.6) on both half-extents — a deliberate and documented handicap,
         * "the whole of his advantage". Holding him to Edward's box reports a
         * phantom hit that is really the AI's reach, so each side is checked
         * against the box the engine actually gave it.
         */
        const bonus = side === "ALEX" ? ALEX_REACH_BONUS : 0;
        expect(dx, `${name} contact dx @${c.tick} (${c.swing} by ${c.by})`).toBeLessThanOrEqual(
          STRIKE_HALF_X + bonus + 1e-6,
        );
        expect(dy, `${name} contact dy @${c.tick} (${c.swing} by ${c.by})`).toBeLessThanOrEqual(
          STRIKE_HALF_Y + bonus + 1e-6,
        );
      }
    }
  });

  it("never leaves the ball inside the net's plane below the tape", () => {
    // Structural: a crossing below NET_TOP awards the point and stops the ball
    // at the tape. Asserted directly in the walk below.
    const stepper = createFixedStepper();
    let state = createTennisState();
    let frame = 0;
    let violations = 0;
    while (!state.done && frame < 200_000) {
      frame += 1;
      stepper.advance(SPORTSGANG_STEP_MS, rallyPolicy(state), (dt, input) => {
        const previous = state.ball;
        state = advanceTennis(state, input as MinigameInput, dt);
        const now = state.ball;
        const crossed =
          (previous.x < TENNIS_COURT.NET_X && now.x > TENNIS_COURT.NET_X) ||
          (previous.x > TENNIS_COURT.NET_X && now.x < TENNIS_COURT.NET_X);
        // A ball that crossed the net plane while the point continued must
        // have been above the tape when it did.
        //
        // A new point being set up is not a crossing: the previous ball is
        // dead on the ground, sometimes out past a baseline, and the next one
        // appears at the server's contact height on the other side. That is a
        // reset, and the giveaway is its bounce count going back to zero.
        const reset = now.bounces < previous.bounces;
        if (crossed && !reset && !state.pointWinner) {
          const t = (TENNIS_COURT.NET_X - previous.x) / (now.x - previous.x || 1);
          const heightAtNet = previous.y + (now.y - previous.y) * t;
          if (heightAtNet <= TENNIS_COURT.NET_TOP) violations += 1;
        }
      });
    }
    expect(violations).toBe(0);
  });
});

describe("the ball does not jump between frames", () => {
  it("moves no further in one step than its speed allows, except when struck", () => {
    let state = createTennisState();
    let worst = 0;
    let worstTick = -1;
    for (let i = 0; i < 60 * 120 && !state.done; i += 1) {
      const before = state.ball;
      const beforeContact = state.lastContact?.tick ?? -1;
      state = advanceTennis(state, rallyPolicy(state), DT);
      const after = state.ball;
      const struck = (state.lastContact?.tick ?? -1) !== beforeContact;
      // A struck ball is repositioned to the contact point by design; a served
      // ball is created at the strings. Only free flight is checked here.
      if (struck || state.toss || before.bounces !== after.bounces) continue;
      const travelled = Math.hypot(after.x - before.x, after.y - before.y);
      const allowed = Math.hypot(before.vx, before.vy) * DT + 1;
      if (travelled - allowed > worst) {
        worst = travelled - allowed;
        worstTick = i;
      }
    }
    expect(worst, `worst overshoot at tick ${worstTick}`).toBeLessThanOrEqual(0);
  });
});
