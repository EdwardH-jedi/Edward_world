import { describe, expect, it } from "vitest";
import {
  CANVAS_WIDTH_PCT,
  contactAnchor,
  PCT_PER_ART_X,
  PCT_PER_ART_Y,
  STRIKE_HALF_X,
  STRIKE_HALF_Y,
  sweptHit,
  TENNIS_FIGURE,
} from "@/lib/game/minigames/tennis";
import { racketHeadCentre, racketPoseAt, SWING_POSES } from "@/lib/pixel/sg-tennis";

/**
 * The bridge between an art cell and a court coordinate.
 *
 * These numbers come from `.sg-tennis__figure` in the stylesheet. If that box
 * changes, this file fails — which is the point. The bug this replaces was a
 * racket drawn six art columns and three rows away from where the physics
 * contacted the ball, and nothing anywhere said the two were supposed to agree.
 */
describe("figure geometry", () => {
  it("derives the drawn canvas from the stylesheet's box", () => {
    // bottom: 22%, height: 20%, court aspect 900/340, canvas height:100% width:auto
    expect(TENNIS_FIGURE.boxBottom).toBe(22);
    expect(TENNIS_FIGURE.boxHeight).toBe(20);
    expect(CANVAS_WIDTH_PCT).toBeCloseTo(8.5, 3);
    expect(PCT_PER_ART_X).toBeCloseTo(0.4722, 4);
    expect(PCT_PER_ART_Y).toBeCloseTo(1.25, 6);
  });

  it("puts the strike zone at the size of a racket, not a fifth of the court", () => {
    // The old reach was 8 court units — 1.88x the drawn sprite's half-width.
    expect(STRIKE_HALF_X).toBeLessThan(CANVAS_WIDTH_PCT / 2);
    expect(STRIKE_HALF_X).toBeCloseTo(2.317, 2);
    expect(STRIKE_HALF_Y).toBeCloseTo(4.775, 2);
  });
});

describe("contact anchor", () => {
  it("is the racket head, not the middle of the sprite", () => {
    const anchor = contactAnchor("PLAYER", 40, "FOREHAND", 0.45);
    // The head sits on the racket-arm side, which is why the old centre-of-
    // sprite contact showed the ball passing beside the strings.
    expect(anchor.x).toBeGreaterThan(40);
    expect(anchor.x - 40).toBeCloseTo(2.833, 2);
  });

  it("mirrors for ALEX, whose sprite is drawn flipped", () => {
    const edward = contactAnchor("PLAYER", 40, "FOREHAND", 0.45);
    const alex = contactAnchor("ALEX", 40, "FOREHAND", 0.45);
    expect(alex.x - 40).toBeCloseTo(-(edward.x - 40), 6);
    expect(alex.y).toBeCloseTo(edward.y, 6);
  });

  it("agrees with the pose table it is derived from", () => {
    for (const swing of ["FOREHAND", "BACKHAND", "SERVE", "VOLLEY", "SMASH"] as const) {
      for (const at of [0, 0.25, 0.5, 0.75, 1]) {
        const { col, row } = racketHeadCentre(racketPoseAt(swing, at));
        const anchor = contactAnchor("PLAYER", 30, swing, at);
        expect(anchor.x).toBeCloseTo(30 + (col - 9) * PCT_PER_ART_X, 9);
        expect(anchor.y).toBeCloseTo(20 - row * PCT_PER_ART_Y, 9);
      }
    }
  });

  it("moves through the swing rather than snapping between frames", () => {
    const samples = [0, 0.2, 0.4, 0.6, 0.8, 1].map(
      (t) => contactAnchor("PLAYER", 30, "FOREHAND", t).y,
    );
    // Every neighbouring pair differs: the anchor travels.
    for (let i = 1; i < samples.length; i += 1) {
      expect(samples[i]).not.toBe(samples[i - 1]);
    }
  });

  it("keeps every racket head inside the sprite's own canvas", () => {
    for (const poses of Object.values(SWING_POSES)) {
      for (const pose of poses) {
        expect(pose.headX).toBeGreaterThanOrEqual(0);
        expect(pose.headX + 4).toBeLessThanOrEqual(TENNIS_FIGURE.artWidth);
        expect(pose.headY).toBeGreaterThanOrEqual(0);
        expect(pose.headY + 5).toBeLessThanOrEqual(TENNIS_FIGURE.artHeight);
      }
    }
  });
});

describe("swept contact", () => {
  const zero = { x: 0, y: 0 };

  it("catches a ball that crosses the racket inside one step", () => {
    // 29.6 units in a step against a zone 4.6 wide: a point test at the end of
    // the step misses this outright, which is what it used to do.
    const t = sweptHit(
      { x: -20, y: 0 },
      { x: 20, y: 0 },
      zero,
      zero,
      STRIKE_HALF_X,
      STRIKE_HALF_Y,
    );
    expect(t).not.toBeNull();
    expect(t!).toBeGreaterThan(0);
    expect(t!).toBeLessThan(1);
  });

  it("reports where in the step the contact happened", () => {
    const t = sweptHit({ x: -10, y: 0 }, { x: 10, y: 0 }, zero, zero, 1, 1);
    // Enters the box at x = -1, which is 45% of the way across.
    expect(t!).toBeCloseTo(0.45, 6);
  });

  it("misses a ball that passes above the racket", () => {
    const t = sweptHit(
      { x: -20, y: 40 },
      { x: 20, y: 40 },
      zero,
      zero,
      STRIKE_HALF_X,
      STRIKE_HALF_Y,
    );
    expect(t).toBeNull();
  });

  it("misses a ball that stops short", () => {
    expect(sweptHit({ x: -20, y: 0 }, { x: -10, y: 0 }, zero, zero, 2, 2)).toBeNull();
  });

  it("accounts for the racket moving too", () => {
    // Ball still, racket swung onto it: contact must still be found.
    const t = sweptHit({ x: 5, y: 0 }, { x: 5, y: 0 }, { x: -20, y: 0 }, { x: 20, y: 0 }, 1, 1);
    expect(t).not.toBeNull();
  });

  it("finds a ball already inside the box at the start of the step", () => {
    expect(sweptHit({ x: 0, y: 0 }, { x: 30, y: 0 }, zero, zero, 2, 2)).toBe(0);
  });
});
