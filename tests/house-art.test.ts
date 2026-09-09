import { describe, expect, it } from "vitest";
import {
  drawBedCorner,
  drawBookshelf,
  drawClarinet,
  drawCloset,
  drawCollection,
  drawDeskPc,
  drawHouseRoom,
  drawJersey,
  drawSportsCorner,
  HOUSE_ART_SIZE,
  HOUSE_FLOOR_Y,
  HOUSE_STAND_Y,
  HOUSE_THING_BOUNDS,
  type HouseThingId,
  houseThingDistance,
} from "@/lib/pixel/house";
import { palette } from "@/lib/pixel/palette";
import { clipRaster, type Raster } from "@/lib/pixel/raster";

interface Call {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

/** A recording `Raster` that captures every draw call instead of painting. */
function recordingRaster() {
  const calls: Call[] = [];
  const draw: Raster = (x, y, width, height, color) => {
    calls.push({ x, y, width, height, color });
  };
  return { calls, draw };
}

const PALETTE_COLORS: ReadonlySet<string> = new Set<string>(Object.values(palette));
const THING_IDS: readonly HouseThingId[] = [
  "collection",
  "clarinet",
  "jersey",
  "sports",
  "pc",
  "closet",
  "window",
];

/** Every reveal state the room can be caught in, including mid-animation. */
const REVEAL_STEPS = [0, 0.25, 0.5, 0.75, 1] as const;

function room(frame: number, value: number) {
  const { calls, draw } = recordingRaster();
  drawHouseRoom(
    draw,
    frame,
    Object.fromEntries(THING_IDS.map((id) => [id, value])),
  );
  return calls;
}

describe("house art size", () => {
  it("is a positive, integer art-pixel rectangle", () => {
    expect(Number.isInteger(HOUSE_ART_SIZE.width)).toBe(true);
    expect(Number.isInteger(HOUSE_ART_SIZE.height)).toBe(true);
    expect(HOUSE_ART_SIZE.width).toBeGreaterThan(0);
    expect(HOUSE_ART_SIZE.height).toBeGreaterThan(0);
  });

  it("stands Edward in front of the furniture line, inside the room", () => {
    expect(HOUSE_STAND_Y).toBeGreaterThan(HOUSE_FLOOR_Y);
    expect(HOUSE_STAND_Y).toBeLessThan(HOUSE_ART_SIZE.height);
  });
});

describe("palette discipline", () => {
  it("only ever draws with colours from the shared palette", () => {
    for (const frame of [0, 1, 3, 47]) {
      for (const value of REVEAL_STEPS) {
        const calls = room(frame, value);
        expect(calls.length).toBeGreaterThan(0);
        for (const call of calls) {
          expect(PALETTE_COLORS.has(call.color)).toBe(true);
        }
      }
    }
  });

  it("paints the wall the mint the real room is painted", () => {
    const wall = room(0, 0).find(
      (call) => call.width === HOUSE_ART_SIZE.width && call.color === palette.mint,
    );
    expect(wall).toBeDefined();
  });
});

describe("the room stays inside its own walls", () => {
  it("never paints outside the art rectangle, at any frame or reveal", () => {
    for (const frame of [0, 2, 5, 1_234]) {
      for (const value of REVEAL_STEPS) {
        for (const call of room(frame, value)) {
          expect(call.x).toBeGreaterThanOrEqual(0);
          expect(call.y).toBeGreaterThanOrEqual(0);
          expect(call.x + call.width).toBeLessThanOrEqual(HOUSE_ART_SIZE.width);
          expect(call.y + call.height).toBeLessThanOrEqual(HOUSE_ART_SIZE.height);
        }
      }
    }
  });

  /**
   * A runaway-loop guard, not a design budget. The room draws about 655 rects —
   * two shelving units, a full bookshelf, two skylines and the dithered cabinet
   * glass — so the ceiling sits well clear of that and only catches a loop that
   * has stopped terminating.
   */
  it("keeps the whole room bounded regardless of frame", () => {
    for (const frame of [0, 9, 100_000]) {
      const calls = room(frame, 1);
      expect(calls.length).toBeGreaterThan(0);
      expect(calls.length).toBeLessThan(1_000);
    }
  });

  it("renders every routine at frame zero without throwing", () => {
    const { draw } = recordingRaster();
    expect(() => drawCollection(draw, 0)).not.toThrow();
    expect(() => drawClarinet(draw, 0)).not.toThrow();
    expect(() => drawBookshelf(draw)).not.toThrow();
    expect(() => drawJersey(draw)).not.toThrow();
    expect(() => drawSportsCorner(draw)).not.toThrow();
    expect(() => drawDeskPc(draw, 0, 0)).not.toThrow();
    expect(() => drawCloset(draw, 0)).not.toThrow();
    expect(() => drawBedCorner(draw, 0, 0)).not.toThrow();
    expect(() => drawHouseRoom(draw, 0)).not.toThrow();
  });

  it("treats a missing reveal entry as shut rather than as a crash", () => {
    const withNothing = room(0, 0);
    const { calls, draw } = recordingRaster();
    drawHouseRoom(draw, 0);
    expect(calls).toEqual(withNothing);
  });
});

describe("the seven things", () => {
  it("places every hotspot inside the room", () => {
    for (const id of THING_IDS) {
      const bounds = HOUSE_THING_BOUNDS[id];
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(HOUSE_ART_SIZE.width);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(HOUSE_ART_SIZE.height);
    }
  });

  it("never overlaps two hotspots, so walking up picks one thing", () => {
    const ordered = [...THING_IDS].sort(
      (a, b) => HOUSE_THING_BOUNDS[a].x - HOUSE_THING_BOUNDS[b].x,
    );
    for (let index = 1; index < ordered.length; index += 1) {
      const previous = HOUSE_THING_BOUNDS[ordered[index - 1]];
      const current = HOUSE_THING_BOUNDS[ordered[index]];
      expect(current.x).toBeGreaterThanOrEqual(previous.x + previous.width);
    }
  });

  it("reads as zero distance anywhere in front of a thing", () => {
    for (const id of THING_IDS) {
      const bounds = HOUSE_THING_BOUNDS[id];
      expect(houseThingDistance(id, bounds.x)).toBe(0);
      expect(houseThingDistance(id, bounds.x + bounds.width / 2)).toBe(0);
      expect(houseThingDistance(id, bounds.x + bounds.width)).toBe(0);
    }
  });

  it("measures to the edge, so a wide thing is not harder to reach", () => {
    const cabinet = HOUSE_THING_BOUNDS.collection;
    expect(houseThingDistance("collection", cabinet.x - 6)).toBe(6);
    expect(
      houseThingDistance("collection", cabinet.x + cabinet.width + 9),
    ).toBe(9);
  });

  it("leaves a walkable gap between every pair of neighbours", () => {
    const ordered = [...THING_IDS].sort(
      (a, b) => HOUSE_THING_BOUNDS[a].x - HOUSE_THING_BOUNDS[b].x,
    );
    for (let index = 1; index < ordered.length; index += 1) {
      const previous = HOUSE_THING_BOUNDS[ordered[index - 1]];
      const current = HOUSE_THING_BOUNDS[ordered[index]];
      expect(current.x - (previous.x + previous.width)).toBeGreaterThan(0);
    }
  });
});

function colorsOf(calls: readonly Call[]) {
  return new Set(calls.map((call) => call.color));
}

/** Every call painted in one colour. */
function inColor(calls: readonly Call[], color: string) {
  return calls.filter((call) => call.color === color);
}

describe("looking at something opens it", () => {
  it("narrows the reflection in the cabinet glass as the lights come up", () => {
    const reflected = REVEAL_STEPS.map((value) => {
      const { calls, draw } = recordingRaster();
      drawCollection(draw, value);
      return inColor(calls, palette.mint3).reduce(
        (total, call) => total + call.width,
        0,
      );
    });
    for (let index = 1; index < reflected.length; index += 1) {
      expect(reflected[index]).toBeLessThanOrEqual(reflected[index - 1]);
    }
    expect(reflected[reflected.length - 1]).toBe(0);
    expect(reflected[0]).toBeGreaterThan(0);
  });

  it("turns the cabinet's strip lights on only once it is looked at", () => {
    const { calls: dark, draw: drawDark } = recordingRaster();
    drawCollection(drawDark, 0);
    const { calls: lit, draw: drawLit } = recordingRaster();
    drawCollection(drawLit, 1);
    expect(colorsOf(dark).has(palette.warm)).toBe(false);
    expect(colorsOf(lit).has(palette.warm)).toBe(true);
  });

  it("lifts the clarinet clear of its stand, and never pushes it down", () => {
    const heights = REVEAL_STEPS.map((value) => {
      const { calls, draw } = recordingRaster();
      drawClarinet(draw, value);
      return Math.min(...inColor(calls, palette.ink).map((call) => call.y));
    });
    for (let index = 1; index < heights.length; index += 1) {
      expect(heights[index]).toBeLessThanOrEqual(heights[index - 1]);
    }
    expect(heights[heights.length - 1]).toBeLessThan(heights[0]);
  });

  it("brings the monitor up dark, then bright, then with something on it", () => {
    const stages = [0, 0.25, 1].map((value) => {
      const { calls, draw } = recordingRaster();
      drawDeskPc(draw, 0, value);
      return colorsOf(calls);
    });
    expect(stages[0].has(palette.navy2)).toBe(false);
    expect(stages[0].has(palette.glow)).toBe(false);
    // The power-on flash, before the picture arrives.
    expect(stages[1].has(palette.glow)).toBe(true);
    expect(stages[1].has(palette.navy2)).toBe(false);
    expect(stages[2].has(palette.navy2)).toBe(true);
  });

  it("never draws a rank on the monitor — the card carries the words", () => {
    const { calls, draw } = recordingRaster();
    drawDeskPc(draw, 0, 1);
    // No glyph routine is reachable from the desk, so nothing on the screen can
    // ever spell a tier. The only readable characters in the room are the two
    // on the shirt, and they are a squad number.
    expect(calls.every((call) => call.width >= 1 && call.height >= 1)).toBe(true);
    const { calls: shirt, draw: drawShirt } = recordingRaster();
    drawJersey(drawShirt);
    expect(inColor(shirt, palette.navy).length).toBeGreaterThan(6);
  });

  it("slides the rail along, and keeps every garment over the floor stack", () => {
    const lefts = REVEAL_STEPS.map((value) => {
      const { calls, draw } = recordingRaster();
      drawCloset(draw, value);
      return Math.max(...inColor(calls, palette.brown).map((call) => call.x));
    });
    for (let index = 1; index < lefts.length; index += 1) {
      expect(lefts[index]).toBeGreaterThanOrEqual(lefts[index - 1]);
    }
    expect(lefts[lefts.length - 1]).toBeGreaterThan(lefts[0]);

    const { calls, draw } = recordingRaster();
    drawCloset(draw, 1);
    const bounds = HOUSE_THING_BOUNDS.closet;
    for (const call of calls) {
      expect(call.x + call.width).toBeLessThanOrEqual(bounds.x + bounds.width);
    }
  });

  it("lights more of the city as the window is looked out of", () => {
    const windows = REVEAL_STEPS.map((value) => {
      const { calls, draw } = recordingRaster();
      drawBedCorner(draw, 0, value);
      return inColor(calls, palette.warm).length;
    });
    for (let index = 1; index < windows.length; index += 1) {
      expect(windows[index]).toBeGreaterThanOrEqual(windows[index - 1]);
    }
    expect(windows[windows.length - 1]).toBeGreaterThan(windows[0]);
  });

  it("leaves the shirt, the gear and the bookshelf alone", () => {
    for (const routine of [drawJersey, drawSportsCorner, drawBookshelf]) {
      const { calls: first, draw: drawFirst } = recordingRaster();
      routine(drawFirst);
      const { calls: second, draw: drawSecond } = recordingRaster();
      routine(drawSecond);
      expect(second).toEqual(first);
    }
  });

  it("clamps a reveal that arrives out of range", () => {
    const { calls: open, draw: drawOpen } = recordingRaster();
    drawCloset(drawOpen, 1);
    const { calls: over, draw: drawOver } = recordingRaster();
    drawCloset(drawOver, 4);
    expect(over).toEqual(open);

    const { calls: shut, draw: drawShut } = recordingRaster();
    drawCollection(drawShut, 0);
    const { calls: under, draw: drawUnder } = recordingRaster();
    drawCollection(drawUnder, -2);
    expect(under).toEqual(shut);
  });
});

describe("clipRaster", () => {
  const bounds = { x: 10, y: 10, width: 10, height: 10 };

  it("drops anything entirely outside the bounds", () => {
    const { calls, draw } = recordingRaster();
    const clipped = clipRaster(draw, bounds);
    clipped(0, 0, 5, 5, palette.cream);
    clipped(40, 40, 5, 5, palette.cream);
    expect(calls).toEqual([]);
  });

  it("trims a rect that straddles an edge instead of dropping it", () => {
    const { calls, draw } = recordingRaster();
    clipRaster(draw, bounds)(5, 5, 10, 10, palette.cream);
    expect(calls).toEqual([
      { x: 10, y: 10, width: 5, height: 5, color: palette.cream },
    ]);
  });

  it("translates by the offset before clipping", () => {
    const { calls, draw } = recordingRaster();
    clipRaster(draw, bounds, { x: 10, y: 10 })(0, 0, 4, 4, palette.cream);
    expect(calls).toEqual([
      { x: 10, y: 10, width: 4, height: 4, color: palette.cream },
    ]);
  });

  it("passes a rect that already fits through untouched", () => {
    const { calls, draw } = recordingRaster();
    clipRaster(draw, bounds)(12, 12, 3, 3, palette.cream);
    expect(calls).toEqual([
      { x: 12, y: 12, width: 3, height: 3, color: palette.cream },
    ]);
  });
});
