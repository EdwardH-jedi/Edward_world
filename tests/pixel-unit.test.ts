import { describe, expect, it } from "vitest";
import { initialPlayer, WORLD_CONFIG, worldObjects } from "@/data/world";
import { HILL_GROUND_Y, PIXEL_UNIT, TOWN_GROUND_Y, getGroundY } from "@/lib/game/terrain";
import {
  MAX_PIXEL_UNIT,
  MIN_PIXEL_UNIT,
  WORLD_SKY_CROP,
  courtUnit,
  getPixelUnit,
  getWorldCrop,
  getWorldUnit,
  snapToCss,
  toCss,
  fitPixelUnit,
} from "@/lib/game/pixel-unit";
import { BACKDROP_ART_SIZE, BACKDROP_LAYERS, backdropLayerWidth } from "@/lib/pixel/backdrop";
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

describe("getWorldUnit", () => {
  it.each([
    [1280, 800, 7], // desktop: one step up from getPixelUnit's 5
    [1440, 900, 7],
    [1920, 1080, MAX_PIXEL_UNIT],
    [390, 844, 6], // phone: the width cap holds it at today's unit
    [320, 568, 4],
    [1280, 138, MIN_PIXEL_UNIT],
  ])("a %ix%i viewport uses unit %i", (width, height, unit) => {
    expect(getWorldUnit({ width, height })).toBe(unit);
  });

  it("never crops more than WORLD_SKY_CROP rows of sky off the top", () => {
    for (let height = 276; height <= 2000; height += 1) {
      const unit = getWorldUnit({ width: 1920, height });
      expect(getWorldCrop(height, unit) / unit).toBeLessThanOrEqual(WORLD_SKY_CROP);
    }
  });

  it("keeps the hill house's label clear of the top edge at every viewport", () => {
    // The house's chimney is at art row 32 on the hill; its sign hangs above
    // it and is held a unit under the crop line, so the crop must leave room
    // (two rows here, one more than the floor needs).
    for (let height = 276; height <= 2000; height += 1) {
      const unit = getWorldUnit({ width: 1920, height });
      expect(getWorldCrop(height, unit) / unit + 2).toBeLessThan(32);
    }
  });

  it("never shows fewer than 64 art columns", () => {
    for (let width = 128; width <= 2560; width += 7) {
      const unit = getWorldUnit({ width, height: 2000 });
      if (unit > MIN_PIXEL_UNIT) expect(width / unit).toBeGreaterThanOrEqual(64);
    }
  });

  it("reports the crop on the unit grid, and zero when the world fits", () => {
    expect(getWorldCrop(800, 7)).toBe(138 * 7 - Math.floor(800 / 7) * 7);
    expect(getWorldCrop(800, 7) % 7).toBe(0);
    expect(getWorldCrop(1200, 8)).toBe(0);
  });
});

describe("backdropLayerWidth", () => {
  it("is exactly what a layer's share of the camera travel needs", () => {
    // 1280px at unit 7 shows 183 columns; the camera travels the other 777.
    expect(backdropLayerWidth(BACKDROP_LAYERS.far, 183)).toBe(Math.ceil(183 + 777 * 0.25));
    expect(backdropLayerWidth(BACKDROP_LAYERS.mid, 183)).toBe(Math.ceil(183 + 777 * 0.5));
  });

  it("never exceeds the world and covers a viewport wider than it", () => {
    for (const columns of [1, 64, 183, 480, 960, 1400]) {
      for (const factor of Object.values(BACKDROP_LAYERS)) {
        const width = backdropLayerWidth(factor, columns);
        expect(width).toBeLessThanOrEqual(BACKDROP_ART_SIZE.width);
        expect(width).toBeGreaterThanOrEqual(Math.min(columns, BACKDROP_ART_SIZE.width));
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
      // The overhangs are negative, and -8 % 4 is -0 in JavaScript.
      expect(Math.abs(toCss(value, unit) % unit)).toBe(0);
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
