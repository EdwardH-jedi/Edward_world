import { describe, expect, it } from "vitest";
import {
  BALL_CENTRE,
  BALL_COLORS,
  BALL_OUTLINE_WIDTH,
  BALL_RADIUS,
  BALL_SEAM_WIDTH,
  BALL_SPIN_FRAMES,
  BALL_VIEWBOX,
  basketballSeams,
} from "@/lib/pixel/sg-ball";

/**
 * The ball has to be recognisable as a basketball on the court, at the size it
 * is actually drawn, without a caption. These assert the properties that claim
 * holds on — the seam count, the panel structure, the curvature, the occlusion,
 * and the fact that every point lands inside the ball's own circle — rather
 * than pinning exact path strings, which would only assert that the file has
 * not changed.
 */

/** Every `x y` pair in a path, as numbers. */
function pointsOf(path: string): { x: number; y: number }[] {
  return path
    .split(/[ML]/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .flatMap((chunk) => {
      const numbers = chunk.replace(/Z$/, "").trim().split(/\s+/).map(Number);
      const pairs: { x: number; y: number }[] = [];
      for (let index = 0; index + 1 < numbers.length; index += 2) {
        pairs.push({ x: numbers[index], y: numbers[index + 1] });
      }
      return pairs;
    });
}

const ALL_FRAMES = Array.from({ length: BALL_SPIN_FRAMES }, (_, index) => index);

describe("basketball seams", () => {
  it("draws four seams at every spin phase", () => {
    for (const frame of ALL_FRAMES) {
      const seams = basketballSeams(frame);
      // Two through the middle and two bowing out to the sides. Three would be
      // a beach ball and one would be the cross this replaced.
      expect(seams, `frame ${frame}`).toHaveLength(4);
      for (const seam of seams) {
        expect(seam.startsWith("M"), `frame ${frame}`).toBe(true);
        expect(pointsOf(seam).length, `frame ${frame}`).toBeGreaterThan(8);
      }
    }
  });

  it("keeps every seam point inside the ball", () => {
    // A point outside the silhouette is a seam drawn on the court rather than
    // on the ball, which is what an unprojected or a mis-scaled curve looks
    // like. The half-stroke of slack is the seam's own width.
    const limit = BALL_RADIUS + BALL_SEAM_WIDTH / 2 + 0.01;
    for (const frame of ALL_FRAMES) {
      for (const seam of basketballSeams(frame)) {
        for (const { x, y } of pointsOf(seam)) {
          const distance = Math.hypot(x - BALL_CENTRE, y - BALL_CENTRE);
          expect(distance, `frame ${frame} at ${x},${y}`).toBeLessThanOrEqual(limit);
        }
      }
    }
  });

  it("hides the half of every seam that is round the back", () => {
    // A great circle is exactly half visible under orthographic projection, so
    // a seam whose drawn length approaches the full circumference is one that
    // has been flattened into a decal instead of wrapped onto a sphere.
    const circumference = 2 * Math.PI * BALL_RADIUS;
    for (const frame of ALL_FRAMES) {
      for (const seam of basketballSeams(frame)) {
        const points = pointsOf(seam);
        let drawn = 0;
        for (let index = 1; index < points.length; index += 1) {
          const step = Math.hypot(
            points[index].x - points[index - 1].x,
            points[index].y - points[index - 1].y,
          );
          // Only consecutive samples; a jump is the gap where the seam went
          // behind the ball.
          if (step < BALL_RADIUS / 2) drawn += step;
        }
        expect(drawn, `frame ${frame}`).toBeLessThan(circumference * 0.62);
        expect(drawn, `frame ${frame}`).toBeGreaterThan(circumference * 0.2);
      }
    }
  });

  it("bows the side seams instead of running them straight", () => {
    // The two side seams are what separate a basketball from a cross on a
    // circle: each has to bulge towards its own edge and come back.
    const [, , left, right] = basketballSeams(0);
    const leftReach = Math.min(...pointsOf(left).map((point) => point.x));
    const rightReach = Math.max(...pointsOf(right).map((point) => point.x));

    // Out past a third of the radius, but not all the way to the silhouette.
    expect(BALL_CENTRE - leftReach).toBeGreaterThan(BALL_RADIUS * 0.35);
    expect(BALL_CENTRE - leftReach).toBeLessThan(BALL_RADIUS * 0.85);
    expect(rightReach - BALL_CENTRE).toBeGreaterThan(BALL_RADIUS * 0.35);
    expect(rightReach - BALL_CENTRE).toBeLessThan(BALL_RADIUS * 0.85);

    // And they are mirror images, so the ball is not lopsided when still.
    expect(BALL_CENTRE - leftReach).toBeCloseTo(rightReach - BALL_CENTRE, 6);
  });

  it("puts the two middle seams through the centre when the ball is still", () => {
    const [vertical, horizontal] = basketballSeams(0);
    const verticalPoints = pointsOf(vertical);
    const horizontalPoints = pointsOf(horizontal);

    // The vertical seam holds one x and sweeps the full height; the horizontal
    // one is its transpose. This is the pose a player sees before the shot.
    for (const point of verticalPoints) expect(point.x).toBeCloseTo(BALL_CENTRE, 6);
    for (const point of horizontalPoints) expect(point.y).toBeCloseTo(BALL_CENTRE, 6);

    const height = Math.max(...verticalPoints.map((p) => p.y)) -
      Math.min(...verticalPoints.map((p) => p.y));
    expect(height).toBeGreaterThan(BALL_RADIUS * 1.8);
  });

  it("actually turns, and returns to where it started", () => {
    const still = basketballSeams(0).join("|");
    // Consecutive phases have to differ, or the ball slides without rotating.
    for (let frame = 1; frame < BALL_SPIN_FRAMES; frame += 1) {
      expect(basketballSeams(frame).join("|"), `frame ${frame}`).not.toBe(
        basketballSeams(frame - 1).join("|"),
      );
    }
    // A whole turn is a whole turn.
    expect(basketballSeams(BALL_SPIN_FRAMES).join("|")).toBe(still);
  });

  it("wraps any frame counter, forwards or backwards", () => {
    expect(basketballSeams(BALL_SPIN_FRAMES * 7 + 3)).toBe(basketballSeams(3));
    expect(basketballSeams(-1)).toBe(basketballSeams(BALL_SPIN_FRAMES - 1));
    expect(basketballSeams(-BALL_SPIN_FRAMES * 3)).toBe(basketballSeams(0));
  });

  it("is drawn square and centred, so it cannot become an ellipse", () => {
    // The element is sized by one dimension and an `aspect-ratio`, so the art
    // has to be square about its own centre or a phone would stretch it.
    expect(BALL_CENTRE).toBe(BALL_VIEWBOX / 2);
    expect(BALL_RADIUS + BALL_OUTLINE_WIDTH / 2).toBeLessThanOrEqual(BALL_CENTRE);
  });

  it("keeps the seams dark against an orange that stays on the board", () => {
    // Recognition is carried by the contrast between the panels and the seams,
    // so this is a real requirement rather than a colour preference.
    const luminance = (hex: string) => {
      const value = parseInt(hex.slice(1), 16);
      return (
        (0.299 * ((value >> 16) & 255) +
          0.587 * ((value >> 8) & 255) +
          0.114 * (value & 255)) /
        255
      );
    };

    expect(luminance(BALL_COLORS.line)).toBeLessThan(0.25);
    expect(luminance(BALL_COLORS.base)).toBeGreaterThan(0.45);
    expect(luminance(BALL_COLORS.light)).toBeGreaterThan(luminance(BALL_COLORS.base));
    expect(luminance(BALL_COLORS.shade)).toBeLessThan(luminance(BALL_COLORS.base));

    // Shading is there to round the ball off, not to become the subject: the
    // lit and shaded sides stay closer together than either is to the seams.
    const shadingSpread = luminance(BALL_COLORS.light) - luminance(BALL_COLORS.shade);
    expect(shadingSpread).toBeLessThan(luminance(BALL_COLORS.base) - luminance(BALL_COLORS.line));

    // Orange means red above green above blue, with a real gap either side.
    for (const hex of [BALL_COLORS.light, BALL_COLORS.base, BALL_COLORS.shade]) {
      const value = parseInt(hex.slice(1), 16);
      const red = (value >> 16) & 255;
      const green = (value >> 8) & 255;
      const blue = value & 255;
      expect(red, hex).toBeGreaterThan(green + 30);
      expect(green, hex).toBeGreaterThan(blue + 20);
    }
  });

  it("draws seams thick enough to survive at the size it is shown", () => {
    // The ball is about 15 CSS pixels across on a phone. A life-accurate seam
    // would be a fifth of a pixel there, so it is deliberately exaggerated.
    const seamFraction = BALL_SEAM_WIDTH / (BALL_RADIUS * 2);
    expect(seamFraction).toBeGreaterThan(0.035);
    expect(seamFraction).toBeLessThan(0.07);
  });
});
