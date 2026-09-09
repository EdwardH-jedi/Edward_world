import { describe, expect, it } from "vitest";
import {
  advanceTennis,
  createTennisState,
  selectSwing,
  SWING_SPEC,
  contactAnchor,
  timeToStrike,
  type TennisState,
} from "@/lib/game/minigames/tennis";
import { IDLE_INPUT, type MinigameInput } from "@/lib/game/minigames/types";

/**
 * QA (session E): the serve, and the five swings.
 *
 * Two things this file pins, both found by inspection during the QA pass.
 *
 * **The serve used to teleport.** The toss is aimed at `SERVE_CONTACT_AT` —
 * the instant the strings reach it — but the phase ran on to a separate
 * `PACE.SERVE_SECONDS` of 0.9s before launching the ball. In the 14 ticks
 * between the two the toss kept falling, from the contact height of y = 15.2
 * down to y = -4.1, which is below the court surface, and then vanished and
 * reappeared at the strings as a struck ball. Measured on screen at 1440x900
 * and in the simulation. The fix was to end the phase at contact; these tests
 * are what stops it coming back.
 *
 * **All five swings.** `tennis-swings.test.ts` is titled "all five swings
 * occur in ordinary play" but asserts three of them. All five are in fact
 * reachable — which swing you get depends on where you stand — so the claim
 * is pinned here rather than left to the title.
 */

const DT = 1 / 60;

/** Runs the opening serve out and reports every frame of it. */
function serveFrames() {
  let state = createTennisState();
  const frames: { t: number; phase: string; tossY: number | null; ballY: number }[] = [];
  for (let i = 0; i < 200; i += 1) {
    state = advanceTennis(state, IDLE_INPUT, DT);
    frames.push({
      t: (i + 1) * DT,
      phase: state.phase,
      tossY: state.toss ? state.toss.y : null,
      ballY: state.ball.y,
    });
    if (state.phase === "RALLY") break;
  }
  return { state, frames };
}

describe("the serve is one event, not two", () => {
  const { state, frames } = serveFrames();
  const launch = frames.at(-1)!;
  const lastVisibleToss = [...frames].reverse().find((f) => f.tossY !== null)!;

  it("launches the ball on the frame the strings meet it", () => {
    expect(launch.phase).toBe("RALLY");
    expect(state.lastContact?.swing).toBe("SERVE");
    // The struck ball starts at the contact the record describes.
    expect(state.ball.y).toBeCloseTo(state.lastContact!.y, 9);
    expect(state.ball.x).toBeCloseTo(state.lastContact!.x, 9);
  });

  it("hands the ball over where the toss actually was", () => {
    // The gap that used to be here was 19.3 units. One tick of toss travel is
    // the honest tolerance: the ball may not jump.
    const gap = Math.abs(lastVisibleToss.tossY! - state.ball.y);
    expect(gap).toBeLessThan(2);
  });

  it("never drops the toss through the court surface", () => {
    // y = 0 is the ground. A toss that goes under it has been abandoned by
    // the swing that was supposed to hit it.
    for (const frame of frames) {
      if (frame.tossY !== null) expect(frame.tossY).toBeGreaterThan(0);
    }
  });

  it("keeps the toss visible for the whole serve", () => {
    // It is thrown, it travels, and the last frame before the rally still has
    // it in the air — no blank stretch where the ball does not exist.
    const airborne = frames.filter((f) => f.tossY !== null);
    expect(airborne.length).toBeGreaterThan(20);
    expect(frames.at(-2)?.tossY).not.toBeNull();
  });

  it("still serves into the receiver's service box", () => {
    // The fix moved a moment, not a target. `COURT` is not exported, so its
    // numbers are repeated here rather than widening another session's module.
    const NET_X = 49.6;
    const SERVICE_NEAR = 30;
    const SERVICE_FAR = 70;

    let s = state;
    const server = s.server;
    // Stop at whichever comes first: the ball landing, or the receiver taking
    // it out of the air. Running past a volley would measure where the
    // *return* landed, which says nothing about the serve.
    for (let i = 0; i < 400 && s.ball.bounces === 0 && s.ball.lastHitBy === server; i += 1) {
      s = advanceTennis(s, IDLE_INPUT, DT);
    }
    if (s.ball.bounces > 0) {
      // It landed: inside the receiver's service box, past the net.
      if (server === "PLAYER") {
        expect(s.ball.x).toBeGreaterThan(NET_X);
        expect(s.ball.x).toBeLessThan(SERVICE_FAR);
      } else {
        expect(s.ball.x).toBeLessThan(NET_X);
        expect(s.ball.x).toBeGreaterThan(SERVICE_NEAR);
      }
    } else {
      // The receiver volleyed it, which means it arrived at them in play: it
      // must at least have crossed the net to get there.
      expect(s.ball.lastHitBy).not.toBe(server);
      if (server === "PLAYER") expect(s.ball.x).toBeGreaterThan(NET_X);
      else expect(s.ball.x).toBeLessThan(NET_X);
    }
  });

  it("still plays a whole match to five", () => {
    let s = createTennisState();
    for (let i = 0; i < 60 * 400 && !s.done; i += 1) s = advanceTennis(s, IDLE_INPUT, DT);
    expect(s.done).toBe(true);
    expect(Math.max(s.playerPoints, s.alexPoints)).toBe(5);
  });
});

/* ── The five swings, in ordinary play ────────────────────────────────────── */

/** Presses when the ball is about to be reachable, and stands where told. */
function playFrom(station: (state: TennisState) => number) {
  let state = createTennisState();
  const swings: string[] = [];
  for (let tick = 0; tick < 60 * 240 && !state.done; tick += 1) {
    const before = state;
    let input: MinigameInput = IDLE_INPUT;
    if (
      state.phase === "RALLY" &&
      state.playerRacket.swing === null &&
      state.playerRacket.cooldown <= 0 &&
      state.ball.lastHitBy !== "PLAYER"
    ) {
      const kind = selectSwing("PLAYER", state.phase, state.playerX, state.ball);
      const spec = SWING_SPEC[kind];
      const centre = (spec.windowStart + spec.windowEnd) / 2;
      const anchor = contactAnchor("PLAYER", state.playerX, kind, centre);
      const strike = timeToStrike(state.ball, anchor.x, anchor.y, 2.4, 5);
      if (strike !== null && strike <= centre * spec.duration) {
        input = { ...IDLE_INPUT, pressed: true, action: true };
      }
    }
    const target = station(state);
    input = {
      ...input,
      left: target < state.playerX - 1,
      right: target > state.playerX + 1,
    };
    state = advanceTennis(state, input, DT);
    const started = state.playerRacket.swing;
    if (started && !before.playerRacket.swing) swings.push(started.kind);
  }
  return swings;
}

describe("every one of the five swings is reachable by the visitor", () => {
  it("gives all five across ordinary court positions", () => {
    // Where you stand is the whole difference: back at the baseline you play
    // groundstrokes, up the court you volley, and a ball dropping on you from
    // above is a smash. Three stations, no fixtures, no hand-placed balls.
    const seen = new Set<string>();
    for (const station of [
      (s: TennisState) => s.ball.x, // chase it — baseline play
      () => 35, // up the court
      () => 44, // at the net
    ]) {
      for (const kind of playFrom(station)) seen.add(kind);
    }
    for (const kind of ["SERVE", "FOREHAND", "BACKHAND", "VOLLEY", "SMASH"]) {
      expect(seen, `swing ${kind} never occurred in ordinary play`).toContain(kind);
    }
  });
});
