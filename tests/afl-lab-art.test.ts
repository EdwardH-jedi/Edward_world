import { describe, expect, it } from "vitest";
import {
  drawAflLab,
  drawBayStores,
  drawCableRun,
  drawFieldReference,
  drawLabShell,
  drawMatchBoard,
  drawPatchPanel,
  drawPinnedNotes,
  drawPrinter,
  drawTapeDeck,
  LAB_ART_SIZE,
  LAB_LAYOUT,
  LAB_PALETTE,
} from "@/lib/pixel/afl-lab";
import { palette } from "@/lib/pixel/palette";
import type { Raster } from "@/lib/pixel/raster";

/** A recording `Raster` that captures every draw call instead of painting. */
function recordingRaster() {
  const calls: {
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
  }[] = [];
  const draw: Raster = (x, y, width, height, color) => {
    calls.push({ x, y, width, height, color });
  };
  return { draw, calls };
}

const PALETTE_COLORS: ReadonlySet<string> = new Set<string>(Object.values(palette));

const FRAMES = [0, 1, 2, 3, 7, 40, 999, 100_001] as const;

describe("lab art size", () => {
  it("is a positive, integer art-pixel rectangle", () => {
    expect(Number.isInteger(LAB_ART_SIZE.width)).toBe(true);
    expect(Number.isInteger(LAB_ART_SIZE.height)).toBe(true);
    expect(LAB_ART_SIZE.width).toBeGreaterThan(0);
    expect(LAB_ART_SIZE.height).toBeGreaterThan(0);
  });
});

describe("layout contract", () => {
  it("orders the room's bands from ceiling down to floor", () => {
    const { trayY, wallY, boardY, benchY, bayY, floorY } = LAB_LAYOUT;
    expect(trayY).toBeLessThan(wallY);
    expect(wallY).toBeLessThan(boardY);
    expect(boardY).toBeLessThan(benchY);
    expect(benchY).toBeLessThan(bayY);
    expect(bayY).toBeLessThan(floorY);
    expect(floorY).toBeLessThan(LAB_ART_SIZE.height);
  });

  it("leaves the equipment bay a band deep enough to hold equipment", () => {
    expect(LAB_LAYOUT.floorY - LAB_LAYOUT.bayY).toBeGreaterThanOrEqual(20);
  });

  it("clears a wall band above the bench for the CRT rack and the wall props", () => {
    expect(LAB_LAYOUT.benchY - LAB_LAYOUT.boardY).toBeGreaterThanOrEqual(48);
  });
});

describe("palette discipline", () => {
  it("aliases every LAB_PALETTE entry to a real palette.ts colour", () => {
    for (const color of Object.values(LAB_PALETTE)) {
      expect(PALETTE_COLORS.has(color)).toBe(true);
    }
  });

  it("only ever draws with colours from the shared palette", () => {
    const { draw, calls } = recordingRaster();
    for (const frame of FRAMES) drawAflLab(draw, frame);
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      expect(PALETTE_COLORS.has(call.color)).toBe(true);
    }
  });
});

describe("determinism", () => {
  it("draws the identical room twice for the same frame", () => {
    for (const frame of FRAMES) {
      const a = recordingRaster();
      const b = recordingRaster();
      drawAflLab(a.draw, frame);
      drawAflLab(b.draw, frame);
      expect(a.calls).toEqual(b.calls);
    }
  });

  it("emits the same number of calls at every frame, so nothing accumulates", () => {
    const counts = FRAMES.map((frame) => {
      const { draw, calls } = recordingRaster();
      drawAflLab(draw, frame);
      return calls.length;
    });
    expect(new Set(counts).size).toBe(1);
  });
});

describe("draw call bounds", () => {
  it("stays inside the art rectangle at every frame", () => {
    for (const frame of FRAMES) {
      const { draw, calls } = recordingRaster();
      drawAflLab(draw, frame);
      for (const call of calls) {
        expect(call.x).toBeGreaterThanOrEqual(0);
        expect(call.y).toBeGreaterThanOrEqual(0);
        expect(call.x + call.width).toBeLessThanOrEqual(LAB_ART_SIZE.width);
        expect(call.y + call.height).toBeLessThanOrEqual(LAB_ART_SIZE.height);
      }
    }
  });

  it("draws on integer art pixels only", () => {
    const { draw, calls } = recordingRaster();
    drawAflLab(draw, 5);
    for (const call of calls) {
      expect(Number.isInteger(call.x)).toBe(true);
      expect(Number.isInteger(call.y)).toBe(true);
      expect(Number.isInteger(call.width)).toBe(true);
      expect(Number.isInteger(call.height)).toBe(true);
    }
  });

  it("keeps the whole room within a sane call budget", () => {
    const { draw, calls } = recordingRaster();
    drawAflLab(draw, 0);
    expect(calls.length).toBeGreaterThan(120);
    expect(calls.length).toBeLessThan(700);
  });
});

describe("individual routines", () => {
  it("renders every layer at frame 0 without throwing", () => {
    const { draw } = recordingRaster();
    expect(() => drawLabShell(draw)).not.toThrow();
    expect(() => drawCableRun(draw, 0)).not.toThrow();
    expect(() => drawMatchBoard(draw)).not.toThrow();
    expect(() => drawPinnedNotes(draw)).not.toThrow();
    expect(() => drawFieldReference(draw)).not.toThrow();
    expect(() => drawTapeDeck(draw, 0)).not.toThrow();
    expect(() => drawPrinter(draw)).not.toThrow();
    expect(() => drawBayStores(draw)).not.toThrow();
    expect(() => drawPatchPanel(draw, 0)).not.toThrow();
  });

  it("keeps the wall props clear of the bench, so nothing floats over the rack", () => {
    for (const routine of [drawMatchBoard, drawPinnedNotes, drawFieldReference]) {
      const { draw, calls } = recordingRaster();
      routine(draw);
      for (const call of calls) {
        expect(call.y + call.height).toBeLessThanOrEqual(LAB_LAYOUT.benchY);
      }
    }
  });

  it("keeps every piece of bay equipment inside the bay", () => {
    for (const routine of [drawTapeDeck, drawPatchPanel]) {
      const { draw, calls } = recordingRaster();
      routine(draw, 3);
      for (const call of calls) {
        expect(call.y).toBeGreaterThanOrEqual(LAB_LAYOUT.bayY);
        expect(call.y + call.height).toBeLessThanOrEqual(LAB_LAYOUT.floorY);
      }
    }
    for (const routine of [drawPrinter, drawBayStores]) {
      const { draw, calls } = recordingRaster();
      routine(draw);
      for (const call of calls) {
        expect(call.y).toBeGreaterThanOrEqual(LAB_LAYOUT.bayY);
        expect(call.y + call.height).toBeLessThanOrEqual(LAB_LAYOUT.floorY);
      }
    }
  });

  it("animates the tape reels and the meter rather than holding a still frame", () => {
    const still = recordingRaster();
    const moved = recordingRaster();
    drawTapeDeck(still.draw, 0);
    drawTapeDeck(moved.draw, 1);
    expect(moved.calls).not.toEqual(still.calls);

    const meterA = recordingRaster();
    const meterB = recordingRaster();
    drawPatchPanel(meterA.draw, 0);
    drawPatchPanel(meterB.draw, 1);
    expect(meterB.calls).not.toEqual(meterA.calls);
  });

  it("draws the field reference as a closed shape with a boundary line", () => {
    const { draw, calls } = recordingRaster();
    drawFieldReference(draw);
    const turf = calls.filter((call) => call.color === LAB_PALETTE.turf);
    const lines = calls.filter((call) => call.color === LAB_PALETTE.line);
    expect(turf.length).toBeGreaterThan(10);
    expect(lines.length).toBeGreaterThan(20);
    // Every turf row is bracketed by boundary pixels on the same row.
    for (const row of turf) {
      expect(lines.some((line) => line.y === row.y)).toBe(true);
    }
  });
});
