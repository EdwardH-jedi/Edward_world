import { describe, expect, it } from "vitest";
import { worldObjects } from "@/data/world";
import { placeChip } from "@/lib/game/chip-layout";
import { PIXEL_UNIT } from "@/lib/game/terrain";
import {
  EDWARD_ART_SIZE,
  EDWARD_HEAD_COLUMN,
  edwardPoses,
} from "@/lib/pixel/characters";
import { objectArt, signProfiles } from "@/lib/pixel/object-art";
import type { Raster } from "@/lib/pixel/raster";
import { signDrop, stemFoot, topProfile } from "@/lib/pixel/signage";

/** Collects every rect an art routine draws, in art-pixel space. */
function record(draw: (raster: Raster, frame: number) => void, frame: number) {
  const rects: { x: number; y: number; width: number; height: number; color: string }[] = [];
  draw((x, y, width, height, color) => rects.push({ x, y, width, height, color }), frame);
  return rects;
}

const profiles = signProfiles(worldObjects);

describe("topProfile", () => {
  it("is the first solid row each column draws, over every ambient frame", () => {
    for (const object of worldObjects) {
      const art = objectArt(object);
      const expected = new Array<number>(art.size.width).fill(Infinity);
      for (let frame = 0; frame < 12; frame += 1) {
        for (const rect of record(art.draw, frame)) {
          if (!/^#[0-9a-f]{6}$/i.test(rect.color)) continue;
          for (let column = rect.x; column < rect.x + rect.width; column += 1) {
            if (column >= 0 && column < expected.length) {
              expected[column] = Math.min(expected[column], rect.y);
            }
          }
        }
      }
      expect(profiles.get(object.id), object.id).toEqual(expected);
    }
  });

  it("skips translucent colour, which never carries a sign", () => {
    const profile = topProfile((draw) => {
      draw(0, 0, 3, 1, "rgba(0, 0, 0, 0.3)");
      draw(1, 4, 1, 2, "#123456");
    }, 3);
    expect(profile).toEqual([Infinity, 4, Infinity]);
  });

  it("reads the art, not the box: the boxes that start in sky", () => {
    const top = (id: string) => Math.min(...profiles.get(id)!);
    // The Arcade's box is six rows taller than its roof, the gate's three.
    expect(top("arcade")).toBe(6);
    expect(top("world-exit")).toBe(3);
    // The House's chimney is the only thing in its top row.
    expect(top("edwards-house")).toBe(0);
    expect(profiles.get("edwards-house")![34]).toBeGreaterThan(0);
    // SportsGang's scoreboard tower stands twenty rows over its fence.
    expect(top("sportsgang")).toBe(3);
    expect(profiles.get("sportsgang")![46]).toBeGreaterThan(20);
  });
});

describe("the name sign on every object", () => {
  // Every width a chip can take, from a one-letter name up to one far wider
  // than the object, at the parity `placeChip` gives it.
  const chips = (anchorUnits: number) =>
    Array.from({ length: 60 }, (_, index) => index + 4)
      .map((units) => placeChip({ naturalWidth: units * PIXEL_UNIT, unit: PIXEL_UNIT, anchorUnits }))
      .filter((chip, index, all) => all.findIndex((other) => other.width === chip.width) === index);

  for (const object of worldObjects) {
    const anchorUnits = object.size.width / PIXEL_UNIT;
    const profile = profiles.get(object.id)!;

    it(`${object.id}: hangs a clear unit above all the art under it and its shadow`, () => {
      for (const chip of chips(anchorUnits)) {
        const drop = signDrop(profile, chip);
        expect(Number.isInteger(drop)).toBe(true);
        expect(drop).toBeGreaterThanOrEqual(0);
        const under = profile.slice(Math.max(0, chip.left), chip.left + chip.width + 1);
        // Nothing drawn under the chip rises above the row it hangs from…
        for (const top of under) expect(top).toBeGreaterThanOrEqual(drop);
        // …and it hangs from art, not from the sky above it.
        expect(under).toContain(drop);
      }
    });

    it(`${object.id}: stands its stem on a drawn pixel of the object`, () => {
      for (const chip of chips(anchorUnits)) {
        const middle = chip.left + Math.floor((chip.width - 1) / 2);
        const foot = stemFoot(profile, middle);
        expect(foot, `chip ${chip.width}`).not.toBeNull();
        // The stem runs down from the sign to the art, never up into it.
        expect(foot!).toBeGreaterThanOrEqual(signDrop(profile, chip));
      }
    });
  }

  it("has no stem where a clamped chip's middle is past the art", () => {
    expect(stemFoot([Infinity, 3, 4], 0)).toBeNull();
    expect(stemFoot([Infinity, 3, 4], 5)).toBeNull();
    expect(stemFoot([Infinity, 3, 4], 2)).toBe(4);
  });
});

describe("the prompt bubble's tail", () => {
  it("points at the middle of Edward's head, mirrored when he faces left", () => {
    expect(EDWARD_HEAD_COLUMN.left).toBe(EDWARD_ART_SIZE.width - 1 - EDWARD_HEAD_COLUMN.right);
    for (const [name, pose] of Object.entries(edwardPoses)) {
      for (const frame of [0, 1, 2, 3]) {
        const profile = topProfile((draw) => pose(draw, frame), EDWARD_ART_SIZE.width);
        // The head reaches the sprite's top row there, or the one below it on
        // a breath, so the tail always ends a unit over his hair.
        expect(profile[EDWARD_HEAD_COLUMN.right], `${name}[${frame}]`).toBeLessThanOrEqual(1);
      }
    }
  });
});
