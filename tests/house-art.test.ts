import { describe, expect, it } from "vitest";
import {
  drawClothingRail,
  drawComputer,
  drawDrawers,
  drawGamingRig,
  drawHouseRoom,
  drawStudyDesk,
  drawWallMap,
  HOUSE_ART_SIZE,
  HOUSE_FLOOR_Y,
  HOUSE_STAND_Y,
  HOUSE_THING_BOUNDS,
  type HouseThingId,
  houseThingCentre,
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
  "map",
  "desk",
  "computer",
  "papers",
  "rail",
  "rig",
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

  it("keeps the whole room bounded regardless of frame", () => {
    for (const frame of [0, 9, 100_000]) {
      const calls = room(frame, 1);
      expect(calls.length).toBeGreaterThan(0);
      expect(calls.length).toBeLessThan(900);
    }
  });

  it("renders every routine at frame zero without throwing", () => {
    const { draw } = recordingRaster();
    expect(() => drawWallMap(draw, 0)).not.toThrow();
    expect(() => drawStudyDesk(draw, 0, 0)).not.toThrow();
    expect(() => drawComputer(draw, 0, 0)).not.toThrow();
    expect(() => drawDrawers(draw, 0)).not.toThrow();
    expect(() => drawClothingRail(draw)).not.toThrow();
    expect(() => drawGamingRig(draw, 0, 0)).not.toThrow();
    expect(() => drawHouseRoom(draw, 0)).not.toThrow();
  });

  it("treats a missing reveal entry as shut rather than as a crash", () => {
    const withNothing = room(0, 0);
    const { calls, draw } = recordingRaster();
    drawHouseRoom(draw, 0);
    expect(calls).toEqual(withNothing);
  });
});

describe("the six things", () => {
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

  it("reports a centre inside each thing's own bounds", () => {
    for (const id of THING_IDS) {
      const bounds = HOUSE_THING_BOUNDS[id];
      const centre = houseThingCentre(id);
      expect(centre).toBeGreaterThan(bounds.x);
      expect(centre).toBeLessThan(bounds.x + bounds.width);
    }
  });
});

/** The widest span of calls painted in one colour. */
function spanOf(calls: readonly Call[], color: string) {
  const matching = calls.filter((call) => call.color === color);
  if (matching.length === 0) return null;
  return {
    left: Math.min(...matching.map((call) => call.x)),
    right: Math.max(...matching.map((call) => call.x + call.width)),
  };
}

function colorsOf(calls: readonly Call[]) {
  return new Set(calls.map((call) => call.color));
}

describe("looking at something opens it", () => {
  it("widens the map panel as it unfolds, and never narrows it", () => {
    const widths = REVEAL_STEPS.map((value) => {
      const { calls, draw } = recordingRaster();
      drawWallMap(draw, value);
      const paper = spanOf(calls, palette.cream);
      expect(paper).not.toBeNull();
      return paper!.right - paper!.left;
    });
    for (let index = 1; index < widths.length; index += 1) {
      expect(widths[index]).toBeGreaterThanOrEqual(widths[index - 1]);
    }
    expect(widths[widths.length - 1]).toBeGreaterThan(widths[0]);
  });

  it("shows the route only once the map is open enough to carry it", () => {
    const { calls: shut, draw: drawShut } = recordingRaster();
    drawWallMap(drawShut, 0);
    const { calls: open, draw: drawOpen } = recordingRaster();
    drawWallMap(drawOpen, 1);
    expect(colorsOf(shut).has(palette.orange)).toBe(false);
    expect(colorsOf(open).has(palette.orange)).toBe(true);
  });

  it("pulls the drawer further out the further it is opened", () => {
    const positions = REVEAL_STEPS.map((value) => {
      const { calls, draw } = recordingRaster();
      drawDrawers(draw, value);
      return spanOf(calls, palette.brown)!.left;
    });
    for (let index = 1; index < positions.length; index += 1) {
      expect(positions[index]).toBeLessThanOrEqual(positions[index - 1]);
    }
    expect(positions[positions.length - 1]).toBeLessThan(positions[0]);
  });

  it("lifts paper out of the drawer only once it is open", () => {
    const { calls: shut, draw: drawShut } = recordingRaster();
    drawDrawers(drawShut, 0);
    const { calls: open, draw: drawOpen } = recordingRaster();
    drawDrawers(drawOpen, 1);
    const shutPaper = shut.filter((call) => call.color === palette.cream);
    const openPaper = open.filter((call) => call.color === palette.cream);
    // Shut, the only paper on show is the tray on top of the cabinet; open,
    // there is paper standing up out of the drawer below it as well.
    expect(Math.max(...openPaper.map((call) => call.y + call.height))).toBeGreaterThan(
      Math.max(...shutPaper.map((call) => call.y + call.height)),
    );
  });

  it("brings the monitor up dark, then bright, then with something on it", () => {
    const stages = [0, 0.25, 1].map((value) => {
      const { calls, draw } = recordingRaster();
      drawComputer(draw, 0, value);
      return colorsOf(calls);
    });
    expect(stages[0].has(palette.blue3)).toBe(false);
    expect(stages[0].has(palette.glow)).toBe(false);
    // The power-on flash, before the picture arrives.
    expect(stages[1].has(palette.glow)).toBe(true);
    expect(stages[1].has(palette.blue3)).toBe(false);
    expect(stages[2].has(palette.blue3)).toBe(true);
  });

  it("wakes the gaming screen without ever drawing a rank on it", () => {
    const { calls: asleep, draw: drawAsleep } = recordingRaster();
    drawGamingRig(drawAsleep, 0, 0);
    const { calls: awake, draw: drawAwake } = recordingRaster();
    drawGamingRig(drawAwake, 0, 1);
    expect(colorsOf(asleep).has(palette.blue3)).toBe(false);
    expect(colorsOf(awake).has(palette.blue3)).toBe(true);
    // Nothing in this room spells anything: no glyph routine is reachable from
    // the rig, so a rank can only ever come from `leagueRank`, in the card.
    expect(awake.every((call) => call.width >= 1 && call.height >= 1)).toBe(true);
  });

  it("leaves the rail alone — not everything in the room needs to move", () => {
    const { calls: first, draw: drawFirst } = recordingRaster();
    drawClothingRail(drawFirst);
    const { calls: second, draw: drawSecond } = recordingRaster();
    drawClothingRail(drawSecond);
    expect(second).toEqual(first);
  });

  it("clamps a reveal that arrives out of range", () => {
    const { calls: open, draw: drawOpen } = recordingRaster();
    drawWallMap(drawOpen, 1);
    const { calls: over, draw: drawOver } = recordingRaster();
    drawWallMap(drawOver, 4);
    expect(over).toEqual(open);

    const { calls: shut, draw: drawShut } = recordingRaster();
    drawDrawers(drawShut, 0);
    const { calls: under, draw: drawUnder } = recordingRaster();
    drawDrawers(drawUnder, -2);
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
