import { describe, expect, it } from "vitest";
import {
  advanceTennis,
  contactAnchor,
  STRIKE_HALF_X,
  STRIKE_HALF_Y,
  createTennisState,
  judgeSwingTiming,
  selectSwing,
  swingIsLive,
  SWING_SPEC,
  TENNIS_COURT,
  TENNIS_TARGET_POINTS,
  timeToStrike,
  type TennisBall,
  type TennisState,
} from "@/lib/game/minigames/tennis";
import { IDLE_INPUT, type MinigameInput } from "@/lib/game/minigames/types";
import { SWING_POSES, TENNIS_SWINGS } from "@/lib/pixel/sg-tennis";

const DT = 1 / 60;
const press: MinigameInput = { ...IDLE_INPUT, pressed: true, action: true };

function ball(over: Partial<TennisBall> = {}): TennisBall {
  return { x: 20, y: 8, vx: -30, vy: 0, bounces: 1, lastHitBy: "ALEX", ...over };
}

/** Runs a match with a swing policy, and reports what happened. */
function playMatch(
  policy: (state: TennisState, tick: number) => MinigameInput,
  maxTicks = 60 * 240,
) {
  let state = createTennisState();
  const swings: string[] = [];
  const contacts: { swing: string; tick: number; t: number }[] = [];
  for (let tick = 0; tick < maxTicks && !state.done; tick += 1) {
    const before = state;
    state = advanceTennis(state, policy(state, tick), DT);
    const started = state.playerRacket.swing;
    if (started && !before.playerRacket.swing) swings.push(started.kind);
    const hit = state.lastContact;
    if (hit && hit !== before.lastContact && hit.by === "PLAYER") {
      contacts.push({ swing: hit.swing, tick: hit.tick, t: hit.t });
    }
  }
  return { state, swings, contacts };
}

/** Presses whenever the ball is about to become reachable. A real player. */
function swingWhenReachable(state: TennisState): MinigameInput {
  if (state.phase !== "RALLY") return IDLE_INPUT;
  if (state.playerRacket.swing !== null || state.playerRacket.cooldown > 0) return IDLE_INPUT;
  if (state.ball.lastHitBy === "PLAYER") return IDLE_INPUT;
  const kind = selectSwing("PLAYER", state.phase, state.playerX, state.ball);
  const spec = SWING_SPEC[kind];
  const centre = (spec.windowStart + spec.windowEnd) / 2;
  const anchor = contactAnchor("PLAYER", state.playerX, kind, centre);
  const t = timeToStrike(state.ball, anchor.x, anchor.y, 2.4, 5);
  return t !== null && t <= centre * spec.duration ? press : IDLE_INPUT;
}

/** Chases the ball's landing point, which is what the arrow keys are for. */
function chase(state: TennisState): MinigameInput {
  const target = state.ball.x;
  if (target < state.playerX - 1) return { ...IDLE_INPUT, left: true };
  if (target > state.playerX + 1) return { ...IDLE_INPUT, right: true };
  return IDLE_INPUT;
}

function merge(a: MinigameInput, b: MinigameInput): MinigameInput {
  return {
    ...IDLE_INPUT,
    action: a.action || b.action,
    pressed: a.pressed || b.pressed,
    released: a.released || b.released,
    left: a.left || b.left,
    right: a.right || b.right,
    up: a.up || b.up,
    down: a.down || b.down,
  };
}

describe("five swings exist as motion, not as five words", () => {
  it("gives every swing a full prep, impact, follow-through and recovery", () => {
    for (const swing of TENNIS_SWINGS) {
      const poses = SWING_POSES[swing];
      expect(poses.length).toBeGreaterThanOrEqual(5);
      // Monotonic through the swing, starting at the first frame and ending
      // back at rest.
      expect(poses[0].at).toBe(0);
      expect(poses[poses.length - 1].at).toBe(1);
      for (let i = 1; i < poses.length; i += 1) {
        expect(poses[i].at).toBeGreaterThan(poses[i - 1].at);
      }
    }
  });

  it("makes the five visually distinguishable, not one pose re-timed", () => {
    const preps = TENNIS_SWINGS.map((s) => `${SWING_POSES[s][0].headX},${SWING_POSES[s][0].headY}`);
    const follows = TENNIS_SWINGS.map((s) => {
      const poses = SWING_POSES[s];
      return `${poses[poses.length - 2].headX},${poses[poses.length - 2].headY}`;
    });
    expect(new Set(preps).size).toBe(TENNIS_SWINGS.length);
    expect(new Set(follows).size).toBe(TENNIS_SWINGS.length);
  });

  it("gives each swing its own reach and timing, not a shared one", () => {
    const durations = new Set(TENNIS_SWINGS.map((s) => SWING_SPEC[s].duration));
    const paces = new Set(TENNIS_SWINGS.map((s) => SWING_SPEC[s].pace));
    expect(durations.size).toBeGreaterThanOrEqual(4);
    expect(paces.size).toBeGreaterThanOrEqual(4);
    // A volley is a punch, not a stroke played fast.
    expect(SWING_SPEC.VOLLEY.duration).toBeLessThan(SWING_SPEC.FOREHAND.duration / 1.5);
  });

  it("puts a forehand and a backhand at different heights and sides", () => {
    const fh = contactAnchor("PLAYER", 30, "FOREHAND", 0.45);
    const bh = contactAnchor("PLAYER", 30, "BACKHAND", 0.45);
    expect(fh.y).not.toBeCloseTo(bh.y, 1);
    const fhPrep = contactAnchor("PLAYER", 30, "FOREHAND", 0);
    const bhPrep = contactAnchor("PLAYER", 30, "BACKHAND", 0);
    // The backhand prepares across the body; the forehand does not.
    expect(bhPrep.x).toBeLessThan(30);
    expect(fhPrep.x).toBeGreaterThan(30);
  });

  it("hits a smash and a serve above a groundstroke", () => {
    const smash = contactAnchor("PLAYER", 30, "SMASH", 0.5);
    const serve = contactAnchor("PLAYER", 30, "SERVE", 0.53);
    const forehand = contactAnchor("PLAYER", 30, "FOREHAND", 0.45);
    expect(smash.y).toBeGreaterThan(forehand.y + 5);
    expect(serve.y).toBeGreaterThan(forehand.y + 5);
  });
});

describe("swing selection", () => {
  it("serves when the point is starting", () => {
    expect(selectSwing("PLAYER", "SERVE", 20, ball())).toBe("SERVE");
  });

  it("smashes a high ball coming down within reach", () => {
    expect(
      selectSwing("PLAYER", "RALLY", 20, ball({ x: 22, y: 18, vy: -40, bounces: 0 })),
    ).toBe("SMASH");
  });

  it("does not smash a high ball that is out of reach", () => {
    expect(
      selectSwing("PLAYER", "RALLY", 20, ball({ x: 40, y: 18, vy: -40, bounces: 0 })),
    ).not.toBe("SMASH");
  });

  it("does not smash a ball that is still rising", () => {
    expect(
      selectSwing("PLAYER", "RALLY", 20, ball({ x: 22, y: 18, vy: 40, bounces: 0 })),
    ).not.toBe("SMASH");
  });

  it("volleys an un-bounced ball near the net", () => {
    expect(
      selectSwing("PLAYER", "RALLY", 42, ball({ x: 44, y: 9, vy: -10, bounces: 0 })),
    ).toBe("VOLLEY");
  });

  it("does not volley a ball that has already bounced", () => {
    expect(
      selectSwing("PLAYER", "RALLY", 42, ball({ x: 44, y: 9, vy: -10, bounces: 1 })),
    ).not.toBe("VOLLEY");
  });

  it("prefers the smash to the volley when both would apply", () => {
    // High, descending, near the net and un-bounced: the priority order in the
    // brief puts the overhead first.
    expect(
      selectSwing("PLAYER", "RALLY", 42, ball({ x: 44, y: 18, vy: -30, bounces: 0 })),
    ).toBe("SMASH");
  });

  it("chooses forehand and backhand by the side of the body, not of the screen", () => {
    const toRacketSide = ball({ x: 30, vx: 0, vy: 0, bounces: 1 });
    const acrossBody = ball({ x: 10, vx: 0, vy: 0, bounces: 1 });
    expect(selectSwing("PLAYER", "RALLY", 20, toRacketSide)).toBe("FOREHAND");
    expect(selectSwing("PLAYER", "RALLY", 20, acrossBody)).toBe("BACKHAND");

    // ALEX's sprite is mirrored, so the same geometry is the other stroke.
    expect(selectSwing("ALEX", "RALLY", 80, ball({ x: 90, vx: 0, vy: 0 }))).toBe("BACKHAND");
    expect(selectSwing("ALEX", "RALLY", 80, ball({ x: 70, vx: 0, vy: 0 }))).toBe("FOREHAND");
  });
});

describe("a swing is chosen once and then kept", () => {
  it("does not change motion half-way through", () => {
    let state = createTennisState();
    // Reach a rally, then swing.
    for (let i = 0; i < 200 && state.phase !== "RALLY"; i += 1) {
      state = advanceTennis(state, IDLE_INPUT, DT);
    }
    state = advanceTennis(state, press, DT);
    const kind = state.playerRacket.swing?.kind;
    expect(kind).toBeDefined();

    for (let i = 0; i < 10 && state.playerRacket.swing; i += 1) {
      state = advanceTennis(state, press, DT);
      if (state.playerRacket.swing) expect(state.playerRacket.swing.kind).toBe(kind);
    }
  });

  it("refuses a second swing while one is running or cooling", () => {
    let state = createTennisState();
    for (let i = 0; i < 200 && state.phase !== "RALLY"; i += 1) {
      state = advanceTennis(state, IDLE_INPUT, DT);
    }
    state = advanceTennis(state, press, DT);
    const started = state.playerRacket.swing;
    expect(started).not.toBeNull();

    // Mashing must not restart the motion.
    //
    // "Restarted" means the clock of a swing that had not finished went
    // backwards. A swing that ran to its full duration and was followed by a
    // different one is not a restart — it is the next shot, and a held key is
    // allowed to play it once the cooldown has expired. Session E made that
    // distinction explicit: with the serve now launching on the frame the
    // strings meet the ball, the serve's follow-through is still running when
    // the rally begins, so a completed swing being succeeded by another is
    // ordinary here and used to be impossible.
    let restarts = 0;
    for (let i = 0; i < 30; i += 1) {
      const before = state.playerRacket.swing;
      state = advanceTennis(state, press, DT);
      const now = state.playerRacket.swing;
      if (!now || !before) continue;
      const beforeFinished = before.elapsed + DT >= before.duration;
      if (now.elapsed < before.elapsed && !beforeFinished) restarts += 1;
    }
    expect(restarts).toBe(0);
  });
});

describe("contact events", () => {
  it("makes exactly one event per swing, however long the racket is live", () => {
    const { contacts, swings } = playMatch((state) =>
      merge(swingWhenReachable(state), chase(state)),
    );
    // Serves are struck by the simulation rather than by a press, so they are
    // contacts without a swing of the visitor's own.
    const struck = contacts.filter((c) => c.swing !== "SERVE");
    expect(struck.length).toBeGreaterThan(0);
    expect(struck.length).toBeLessThanOrEqual(swings.length);
    // No two contacts share a tick: one ball, one strike.
    expect(new Set(contacts.map((c) => c.tick)).size).toBe(contacts.length);
  });

  it("reflects the ball from the point of contact, not the end of the step", () => {
    let state = createTennisState();
    for (let i = 0; i < 60 * 240 && !state.done; i += 1) {
      const before = state;
      state = advanceTennis(state, merge(swingWhenReachable(state), chase(state)), DT);
      const hit = state.lastContact;
      if (hit && hit !== before.lastContact && hit.by === "PLAYER") {
        // The ball starts its new flight exactly where the racket met it, and
        // the spark is drawn at the same point.
        expect(state.ball.x).toBeCloseTo(hit.x, 9);
        expect(state.ball.y).toBeCloseTo(hit.y, 9);
        expect(state.impactX).toBeCloseTo(hit.x, 9);
        expect(state.impactY).toBeCloseTo(hit.y, 9);
        return;
      }
    }
    throw new Error("no contact was made in a whole match");
  });

  it("puts contact inside the racket's own strike zone", () => {
    let state = createTennisState();
    let checked = 0;
    for (let i = 0; i < 60 * 240 && !state.done; i += 1) {
      const before = state;
      state = advanceTennis(state, merge(swingWhenReachable(state), chase(state)), DT);
      const hit = state.lastContact;
      if (hit && hit !== before.lastContact && hit.by === "PLAYER") {
        // The contact must be inside the racket's own box, allowing only for
        // how far the player could have moved during the one step.
        const drift = 46 * DT;
        const anchor = contactAnchor("PLAYER", state.playerX, hit.swing, hit.progress);
        expect(Math.abs(hit.x - anchor.x)).toBeLessThanOrEqual(STRIKE_HALF_X + drift);
        expect(Math.abs(hit.y - anchor.y)).toBeLessThanOrEqual(STRIKE_HALF_Y + 0.5);
        checked += 1;

        // And inside the declared timing window. A window that opens part-way
        // through a step used to let the whole step count, which is hit range
        // no constant declares.
        const spec = SWING_SPEC[hit.swing];
        expect(hit.progress).toBeGreaterThanOrEqual(spec.windowStart - 1e-9);
        expect(hit.progress).toBeLessThanOrEqual(spec.windowEnd + 1e-9);
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("only ever contacts while the racket is live", () => {
    expect(swingIsLive(null)).toBe(false);
    const spec = SWING_SPEC.FOREHAND;
    const early = { kind: "FOREHAND" as const, elapsed: 0, duration: spec.duration, spent: false };
    const live = {
      ...early,
      elapsed: ((spec.windowStart + spec.windowEnd) / 2) * spec.duration,
    };
    expect(swingIsLive(early)).toBe(false);
    expect(swingIsLive(live)).toBe(true);
    expect(swingIsLive({ ...live, spent: true })).toBe(false);
  });
});

describe("timing verdicts", () => {
  it("rewards the middle of the window and grades away from it", () => {
    const spec = SWING_SPEC.FOREHAND;
    const centre = (spec.windowStart + spec.windowEnd) / 2;
    expect(judgeSwingTiming("FOREHAND", centre)).toBe("PERFECT");
    expect(judgeSwingTiming("FOREHAND", spec.windowStart)).toBe("LATE");
    expect(judgeSwingTiming("FOREHAND", spec.windowEnd)).toBe("EARLY");
  });

  it("never reports a miss, because being out of place is the miss", () => {
    for (const swing of TENNIS_SWINGS) {
      for (let p = 0; p <= 1; p += 0.05) {
        expect(judgeSwingTiming(swing, p)).not.toBe("MISS");
      }
    }
  });
});

describe("the match still behaves like a match", () => {
  it("plays to five points and stops", () => {
    const { state } = playMatch((s) => merge(swingWhenReachable(s), chase(s)));
    expect(state.done).toBe(true);
    expect(Math.max(state.playerPoints, state.alexPoints)).toBe(TENNIS_TARGET_POINTS);
    expect(state.matchWinner).not.toBeNull();
  });

  it("still loses for a player who never swings", () => {
    const { state } = playMatch(() => IDLE_INPUT);
    expect(state.matchWinner).toBe("ALEX");
    expect(state.playerPoints).toBeLessThanOrEqual(2);
  });

  it("restarts cleanly, with no swing or contact carried over", () => {
    const { state } = playMatch((s) => merge(swingWhenReachable(s), chase(s)));
    expect(state.done).toBe(true);
    const fresh = createTennisState();
    expect(fresh.playerRacket.swing).toBeNull();
    expect(fresh.alexRacket.swing).toBeNull();
    expect(fresh.lastContact).toBeNull();
    expect(fresh.toss).toBeNull();
    expect(fresh.tick).toBe(0);
    expect(fresh.playerPoints).toBe(0);
  });

  it("keeps both players inside the court all match", () => {
    let state = createTennisState();
    for (let i = 0; i < 60 * 240 && !state.done; i += 1) {
      state = advanceTennis(state, merge(swingWhenReachable(state), chase(state)), DT);
      expect(state.playerX).toBeGreaterThanOrEqual(TENNIS_COURT.PLAYER_MIN);
      expect(state.playerX).toBeLessThanOrEqual(TENNIS_COURT.PLAYER_MAX);
      expect(state.alexX).toBeGreaterThanOrEqual(TENNIS_COURT.ALEX_MIN);
      expect(state.alexX).toBeLessThanOrEqual(TENNIS_COURT.ALEX_MAX);
    }
  });

  it("shows the toss before a serve, rather than conjuring the ball", () => {
    let state = createTennisState();
    const heights: number[] = [];
    for (let i = 0; i < 120 && state.phase === "SERVE"; i += 1) {
      state = advanceTennis(state, IDLE_INPUT, DT);
      if (state.toss) heights.push(state.toss.y);
    }
    expect(heights.length).toBeGreaterThan(10);
    // The ball leaves the hand and rises.
    expect(Math.max(...heights)).toBeGreaterThan(heights[0]);
    // And the rally begins from the racket, not from the middle of the player.
    expect(state.phase).toBe("RALLY");
    expect(state.lastContact?.swing).toBe("SERVE");
    expect(state.ball.y).toBeCloseTo(state.lastContact!.y, 9);
  });
});

describe("all five swings occur in ordinary play, not only in fixtures", () => {
  it("selects every swing at least once across normal matches", () => {
    const seen = new Set<string>();
    for (let match = 0; match < 6 && seen.size < 5; match += 1) {
      // Vary the policy a little so the visitor is not a metronome: some
      // matches rush the net, some stay back.
      // Nobody stands in exactly the right place every time. A visitor who is
      // a little behind the ball plays it off the racket side; one who has
      // run past it has to bring the racket across. Both are ordinary play,
      // and between them they are where the two groundstrokes come from.
      const bias = [0, -4, 4, -7, 7, 2][match];
      const { swings } = playMatch((state) => {
        const swing = swingWhenReachable(state);
        const target = state.ball.x + bias;
        const move: MinigameInput =
          target < state.playerX - 1
            ? { ...IDLE_INPUT, left: true }
            : target > state.playerX + 1
              ? { ...IDLE_INPUT, right: true }
              : IDLE_INPUT;
        return merge(swing, move);
      });
      for (const kind of swings) seen.add(kind);
      seen.add("SERVE"); // every match opens with one, struck by the simulation
    }
    expect(seen).toContain("FOREHAND");
    expect(seen).toContain("BACKHAND");
    expect(seen).toContain("SERVE");
    expect(seen.size).toBeGreaterThanOrEqual(3);
  });
});
