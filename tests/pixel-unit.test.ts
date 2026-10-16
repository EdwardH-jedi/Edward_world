import { describe, expect, it } from "vitest";
import { initialPlayer, WORLD_CONFIG, worldObjects } from "@/data/world";
import { HILL_GROUND_Y, PIXEL_UNIT, TOWN_GROUND_Y, getGroundY } from "@/lib/game/terrain";
import {
  MAX_PIXEL_UNIT,
  MIN_PIXEL_UNIT,
  courtUnit,
  getPixelUnit,
  snapToCss,
  toCss,
  fitPixelUnit,
} from "@/lib/game/pixel-unit";
import { BACKDROP_ART_SIZE } from "@/lib/pixel/backdrop";
import { EDWARD_ART_SIZE, getAvatarAnchor } from "@/lib/pixel/characters";

const UNITS = Array.from(
  { length: MAX_PIXEL_UNIT - MIN_PIXEL_UNIT + 1 },
  (_, index) => MIN_PIXEL_UNIT + index,
);

describe("getPixelUnit", () => {
  it.each([
    [800, 5], // 1280x800 desktop
    [844, 6], // 390x844 phone
    [1080, 7],
    [552, 4], // the old fixed world height still gets the old unit
    [138, MIN_PIXEL_UNIT], // one unit would fit, but the floor is 2
    [2000, MAX_PIXEL_UNIT],
    [200, MIN_PIXEL_UNIT],
    [0, MIN_PIXEL_UNIT],
  ])("a %ipx-tall viewport uses unit %i", (height, unit) => {
    expect(getPixelUnit(height)).toBe(unit);
  });

  it("never lets the scaled world overflow the viewport above the floor", () => {
    for (let height = 276; height <= 2000; height += 1) {
      expect(BACKDROP_ART_SIZE.height * getPixelUnit(height)).toBeLessThanOrEqual(height);
    }
  });

  it("picks the largest unit that fits", () => {
    for (const height of [300, 414, 552, 700, 800, 1000]) {
      const unit = getPixelUnit(height);
      if (unit < MAX_PIXEL_UNIT) {
        expect(BACKDROP_ART_SIZE.height * (unit + 1)).toBeGreaterThan(height);
      }
    }
  });
});

describe("layout at a live unit", () => {
  const authored = [
    WORLD_CONFIG.width,
    WORLD_CONFIG.height,
    HILL_GROUND_Y,
    TOWN_GROUND_Y,
    ...[760, 800, 1000, 3_300].map(getGroundY),
    ...worldObjects.flatMap((object) => [
      object.position.x,
      object.position.y,
      object.size.width,
      object.size.height,
    ]),
  ];

  it("keeps the authored world a whole number of art pixels", () => {
    expect(WORLD_CONFIG.height).toBe(BACKDROP_ART_SIZE.height * PIXEL_UNIT);
    for (const value of authored) expect(value % PIXEL_UNIT).toBe(0);
  });

  it.each(UNITS)("every authored position and size is a multiple of %i", (unit) => {
    for (const value of authored) expect(toCss(value, unit) % unit).toBe(0);
  });

  it.each(UNITS)("the avatar anchor lands on the unit grid at %i", (unit) => {
    const anchor = getAvatarAnchor(EDWARD_ART_SIZE, initialPlayer.size, PIXEL_UNIT);
    for (const value of [anchor.width, anchor.height, anchor.left, anchor.top]) {
      expect(toCss(value, unit) % unit).toBe(0);
    }
  });

  it.each(UNITS)("continuous player and camera x snap to a multiple of %i", (unit) => {
    for (const x of [0, 0.3, 190, 190.9, 1_234.567, 3_791.99]) {
      expect(snapToCss(x, unit) % unit).toBe(0);
      // Floors, so the sprite never jumps ahead of where the simulation has it.
      expect(snapToCss(x, unit) / unit).toBeLessThanOrEqual(x / PIXEL_UNIT);
    }
  });
});

describe("fitPixelUnit", () => {
  const room = { width: 344, height: 104 };

  it.each([
    // 1280×800 at 98%/66%: the room fits 3 wide even though the world is 5.
    [5, { width: 1254.4, height: 528 }, 3],
    [4, { width: 2000, height: 2000 }, 4], // never above the live unit
    [6, { width: 2100, height: 528 }, 5], // height can be the tighter side
    [4, { width: 200, height: 50 }, 1], // and never below one CSS pixel
  ])("unit %i in %o is %i", (unit, space, expected) => {
    expect(fitPixelUnit(unit, space, room)).toBe(expected);
  });
});

describe("courtUnit", () => {
  it.each([
    [1280, 5, 5], // 1177px of court share / 225 = 5.2, capped by the live unit
    [1280, 4, 4],
    [1280, 8, 5], // the stage, not the live unit, is the limit
    [1000, 6, 4], // 920 / 225 = 4.08
    [390, 6, 2], // 1.59 floors to 1, lifted to the 2px minimum
    [0, 5, 2],
  ])("a %ipx stage at live unit %i uses court unit %i", (width, live, expected) => {
    const unit = courtUnit(width, live);
    expect(unit).toBe(expected);
    expect(Number.isInteger(unit)).toBe(true);
  });
});
