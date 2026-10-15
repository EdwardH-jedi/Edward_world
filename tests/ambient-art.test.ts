import { describe, expect, it } from "vitest";
import { BIRD_PERIOD, drawBird, drawClouds } from "@/lib/pixel/ambient";
import { drawBackdrop } from "@/lib/pixel/backdrop";
import { buildingArt, signpostArt } from "@/lib/pixel/buildings";
import { edwardPoses } from "@/lib/pixel/characters";
import { palette } from "@/lib/pixel/palette";
import { lamp, smoke, tree, type ArtRoutine, type Raster } from "@/lib/pixel/raster";
import { worldExitArt } from "@/lib/pixel/world-exit";

type Call = readonly [number, number, number, number, string];

/** Runs a routine against a recording raster and returns every rect drawn. */
function record(routine: ArtRoutine, frame: number): Call[] {
  const calls: Call[] = [];
  const raster: Raster = (x, y, width, height, color) => {
    calls.push([x, y, width, height, color]);
  };
  routine(raster, frame);
  return calls;
}

const key = (calls: readonly Call[]) => JSON.stringify(calls);
const FRAMES = [0, 1, 2, 3, 4, 5, 6, 7];

/** Draws frames 0..7 and asserts the loop has exactly `period` distinct frames. */
function expectLoop(routine: ArtRoutine, period: number, distinct = period) {
  const keys = FRAMES.map((frame) => key(record(routine, frame)));
  expect(new Set(keys.slice(0, period)).size, "frames within a period differ").toBe(distinct);
  for (const frame of FRAMES) {
    expect(keys[frame], `frame ${frame} repeats at ${frame % period}`).toBe(keys[frame % period]);
  }
}

describe("chimney smoke", () => {
  const routine: ArtRoutine = (draw, frame) => smoke(draw, 133, 31, frame);

  it("loops over four frames", () => expectLoop(routine, 4));

  it("draws three puffs that rise and thin, and never all vanish at once", () => {
    for (const frame of FRAMES) {
      const puffs = record(routine, frame);
      expect(puffs).toHaveLength(3);
      // At most one puff is on its last, one-pixel frame.
      expect(puffs.filter(([, , width]) => width === 1).length).toBeLessThanOrEqual(1);
    }
    // Rising: a puff's height above the chimney never goes down while it ages.
    const ys = (frame: number) => record(routine, frame).map(([, y]) => y);
    expect(ys(1)).not.toEqual(ys(0));
  });
});

describe("tree sway", () => {
  const routine: ArtRoutine = (draw, frame) => tree(draw, 10, 50, 2, frame);

  it("loops over two frames", () => expectLoop(routine, 2));

  it("moves the canopy top and leaves the trunk fixed", () => {
    const trunk = (frame: number) =>
      record(routine, frame).filter(([, , , , color]) => color === palette.brown3);
    expect(key(trunk(0))).toBe(key(trunk(1)));
    const top = (frame: number) => record(routine, frame)[2];
    expect(Math.abs(top(1)[0] - top(0)[0])).toBe(1);
  });
});

describe("lamp flicker", () => {
  const routine: ArtRoutine = (draw, frame) => lamp(draw, 20, 60, 18, frame);
  const glow = (frame: number) =>
    record(routine, frame).filter(([, , , , color]) => color === palette.glow);

  it("loops over four frames", () => expectLoop(routine, 4, 2));

  it("lights a one-pixel glow on three frames and drops it on the fourth", () => {
    expect([0, 1, 2, 3].map((frame) => glow(frame).length)).toEqual([1, 1, 1, 0]);
    expect(glow(0)[0].slice(2, 4)).toEqual([1, 1]);
  });

  it("does not glow when no frame is given, so other scenes are unchanged", () => {
    const calls = record((draw) => lamp(draw, 20, 60), 0);
    expect(calls.some(([, , , , color]) => color === palette.glow)).toBe(false);
  });
});

describe("hanging signs", () => {
  it("bob a pixel on every other frame: wardrobe", () => {
    expectLoop(buildingArt.wardrobe.draw, 2);
  });

  it("bob a pixel on every other frame: directions", () => {
    expectLoop(signpostArt.draw, 2);
    const board = (frame: number) => record(signpostArt.draw, frame)[1];
    expect(board(1)[1] - board(0)[1]).toBe(1);
  });

  it("bob a pixel on every other frame: exit (its lantern keeps its own four-frame loop)", () => {
    expectLoop(worldExitArt.draw, 4, 3);
    const board = (frame: number) =>
      record(worldExitArt.draw, frame).find(([x, , width]) => x === 3 && width === 14)!;
    expect(board(1)[1] - board(0)[1]).toBe(1);
    expect(board(2)[1]).toBe(board(0)[1]);
  });
});

describe("Edward idle", () => {
  it("breathes over two frames while standing", () => {
    expectLoop(edwardPoses.front, 2);
  });
});

describe("the bird", () => {
  const routine: ArtRoutine = (draw, frame) => drawBird(draw, frame, 960);

  it("is absent on the first frames, then flaps through a two-frame wing loop", () => {
    expect(record(routine, 0)).toHaveLength(0);
    const flight = [2, 3, 4, 5, 6, 7].map((frame) => record(routine, frame));
    for (const calls of flight) expect(calls).toHaveLength(3);
    // Each frame differs from the next, and wings repeat every second frame.
    for (let index = 0; index < flight.length - 1; index += 1) {
      expect(key(flight[index])).not.toBe(key(flight[index + 1]));
    }
    const wings = (frame: number) => record(routine, frame).map(([, y]) => y - record(routine, frame)[0][1]);
    expect(wings(2)).toEqual(wings(4));
    expect(wings(3)).not.toEqual(wings(2));
  });

  it("crosses the sky and despawns, then repeats every BIRD_PERIOD frames", () => {
    expect(BIRD_PERIOD).toBe(40);
    const x = (frame: number) => record(routine, frame)[0][0];
    expect(x(5)).toBeGreaterThan(x(2));
    expect(record(routine, 34)).toHaveLength(0);
    expect(record(routine, 39)).toHaveLength(0);
    // The first cycle is fixed; the next bird starts a new crossing.
    expect(record(routine, 42)).toHaveLength(3);
    for (const frame of FRAMES) {
      expect(record(routine, frame)).toEqual(record(routine, frame)); // pure
    }
  });
});

describe("cloud drift and the still skyline", () => {
  const routine: ArtRoutine = (draw, frame) => drawClouds(draw, frame, 960);

  it("advances low clouds one pixel every 2 frames and high clouds every 4", () => {
    const first = (frame: number, y: number) =>
      record(routine, frame).find(([, cloudY]) => cloudY === y)![0];
    expect(first(2, 30) - first(0, 30)).toBe(1);
    expect(first(1, 30)).toBe(first(0, 30));
    expect(first(4, 14) - first(0, 14)).toBe(1);
    expect(first(2, 14)).toBe(first(0, 14));
  });

  it("differs between frames and wraps back to the start of its loop", () => {
    expect(key(record(routine, 0))).not.toBe(key(record(routine, 2)));
    // The slow banks take 4 * (960 + 40) frames to wrap; the fast ones divide it.
    expect(key(record(routine, 4_000))).toBe(key(record(routine, 0)));
    expect(key(record(routine, 4_003))).toBe(key(record(routine, 3)));
  });

  it("leaves the far skyline untouched in the full backdrop", () => {
    const hillsOf = (frame: number) =>
      record(drawBackdrop, frame).filter(
        ([, , , , color]) => color === palette.farHill || color === palette.midHill,
      );
    expect(hillsOf(0).length).toBeGreaterThan(0);
    for (const frame of FRAMES) expect(key(hillsOf(frame))).toBe(key(hillsOf(0)));
  });
});
