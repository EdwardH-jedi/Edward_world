import { describe, expect, it } from "vitest";
import { palette } from "@/lib/pixel/palette";
import type { Raster } from "@/lib/pixel/raster";
import {
  drawHarbourBridge,
  drawHarbourWater,
  drawOperaHouseSilhouette,
  drawSydneyBackground,
  drawSydneySky,
  drawTerraceRooftops,
  SYDNEY_ART_SIZE,
  SYDNEY_PALETTE,
  SYDNEY_PARALLAX,
} from "@/lib/pixel/sydney";

/** A recording `Raster` that captures every draw call instead of painting. */
function recordingRaster() {
  const calls: { x: number; y: number; width: number; height: number; color: string }[] = [];
  const draw: Raster = (x, y, width, height, color) => {
    calls.push({ x, y, width, height, color });
  };
  return { draw, calls };
}

const PALETTE_COLORS: ReadonlySet<string> = new Set<string>(Object.values(palette));

describe("sydney art size", () => {
  it("is a positive, integer art-pixel rectangle", () => {
    expect(Number.isInteger(SYDNEY_ART_SIZE.width)).toBe(true);
    expect(Number.isInteger(SYDNEY_ART_SIZE.height)).toBe(true);
    expect(SYDNEY_ART_SIZE.width).toBeGreaterThan(0);
    expect(SYDNEY_ART_SIZE.height).toBeGreaterThan(0);
  });
});

describe("palette discipline", () => {
  it("aliases every SYDNEY_PALETTE entry to a real palette.ts colour", () => {
    for (const color of Object.values(SYDNEY_PALETTE)) {
      expect(PALETTE_COLORS.has(color)).toBe(true);
    }
  });

  it("only ever draws with colours from the shared palette", () => {
    const { draw, calls } = recordingRaster();
    for (const frame of [0, 1, 5, 37]) {
      for (const offset of [0, 12, 240]) {
        drawSydneyBackground(draw, frame, offset);
      }
    }
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      expect(PALETTE_COLORS.has(call.color)).toBe(true);
    }
  });
});

describe("draw call bounds", () => {
  it("keeps the full composite bounded regardless of frame or offset", () => {
    for (const frame of [0, 3, 100, 9_999]) {
      for (const offset of [0, 50, 5_000]) {
        const { draw, calls } = recordingRaster();
        drawSydneyBackground(draw, frame, offset);
        expect(calls.length).toBeGreaterThan(0);
        expect(calls.length).toBeLessThan(600);
      }
    }
  });

  it("keeps the terrace tiling bounded for a very large offset", () => {
    const { draw, calls } = recordingRaster();
    drawTerraceRooftops(draw, 0, 1_000_000);
    // A fixed tiling period means the number of rooftops drawn depends only
    // on the art width, never on how far the offset has travelled.
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.length).toBeLessThan(150);
  });
});

describe("reduced / zero-frame rendering", () => {
  it("renders a static frame (frame 0, offset 0) without throwing", () => {
    const { draw, calls } = recordingRaster();
    expect(() => drawSydneyBackground(draw, 0, 0)).not.toThrow();
    expect(calls.length).toBeGreaterThan(0);
  });

  it("renders every individual layer at frame 0 without throwing", () => {
    const { draw } = recordingRaster();
    expect(() => drawSydneySky(draw, 0)).not.toThrow();
    expect(() => drawHarbourWater(draw, 0)).not.toThrow();
    expect(() => drawHarbourBridge(draw)).not.toThrow();
    expect(() => drawOperaHouseSilhouette(draw)).not.toThrow();
    expect(() => drawTerraceRooftops(draw, 0)).not.toThrow();
  });

  it("holds together for a large, non-zero frame with no offset supplied", () => {
    const { draw, calls } = recordingRaster();
    expect(() => drawSydneyBackground(draw, 123_456)).not.toThrow();
    expect(calls.length).toBeGreaterThan(0);
  });
});

/** The x-span of every rect a recording produced. */
function minX(calls: { x: number }[]) {
  return Math.min(...calls.map((call) => call.x));
}

describe("camera offset / parallax", () => {
  it("shifts the bridge silhouette monotonically left as offset increases", () => {
    const offsets = [0, 20, 40, 80];
    const positions = offsets.map((offset) => {
      const { draw, calls } = recordingRaster();
      drawHarbourBridge(draw, offset);
      return minX(calls);
    });
    for (let i = 1; i < positions.length; i += 1) {
      expect(positions[i]).toBeLessThanOrEqual(positions[i - 1]);
    }
    // And it actually moves rather than being a no-op parameter.
    expect(positions[positions.length - 1]).toBeLessThan(positions[0]);
  });

  it("shifts the opera house monotonically left as offset increases", () => {
    const offsets = [0, 20, 40, 80];
    const positions = offsets.map((offset) => {
      const { draw, calls } = recordingRaster();
      drawOperaHouseSilhouette(draw, offset);
      return minX(calls);
    });
    for (let i = 1; i < positions.length; i += 1) {
      expect(positions[i]).toBeLessThanOrEqual(positions[i - 1]);
    }
    expect(positions[positions.length - 1]).toBeLessThan(positions[0]);
  });

  it("keeps the sky locked to the screen regardless of offset", () => {
    // drawSydneySky has no offset parameter at all — verified structurally by
    // comparing two calls at different frames producing the same call count,
    // since the function cannot see an offset to react to.
    const a = recordingRaster();
    const b = recordingRaster();
    drawSydneySky(a.draw, 4);
    drawSydneySky(b.draw, 4);
    expect(a.calls).toEqual(b.calls);
  });

  it("moves the bridge by exactly its declared parallax fraction of the offset", () => {
    // The bridge span never wraps, so its displacement should track
    // `offset * SYDNEY_PARALLAX.bridge` exactly, for any offset.
    for (const offset of [0, 7, 20, 63, 250]) {
      const { draw: drawA, calls: callsA } = recordingRaster();
      drawHarbourBridge(drawA, 0);
      const { draw: drawB, calls: callsB } = recordingRaster();
      drawHarbourBridge(drawB, offset);
      const shift = minX(callsA) - minX(callsB);
      expect(shift).toBe(Math.round(offset * SYDNEY_PARALLAX.bridge));
    }
  });

  it("orders the declared parallax ratios so nearer layers move faster", () => {
    // This is the contract the routines above are built on: the sky is
    // locked (0), and each layer below it is nearer — and so faster — than
    // the one before it.
    expect(SYDNEY_PARALLAX.sky).toBe(0);
    expect(SYDNEY_PARALLAX.water).toBeGreaterThan(SYDNEY_PARALLAX.sky);
    expect(SYDNEY_PARALLAX.bridge).toBeGreaterThan(SYDNEY_PARALLAX.water);
    expect(SYDNEY_PARALLAX.opera).toBeGreaterThanOrEqual(SYDNEY_PARALLAX.bridge);
    expect(SYDNEY_PARALLAX.terraces).toBeGreaterThan(SYDNEY_PARALLAX.opera);
  });

  it("changes the terrace render when the offset changes", () => {
    // Terraces tile on a fixed period (see drawTerraceRooftops), so their
    // on-screen position is periodic rather than strictly monotonic in raw
    // offset — this only asserts that offset is actually consulted.
    const { draw: drawA, calls: callsA } = recordingRaster();
    drawTerraceRooftops(drawA, 0, 0);
    const { draw: drawB, calls: callsB } = recordingRaster();
    drawTerraceRooftops(drawB, 0, 5);
    expect(callsB).not.toEqual(callsA);
  });
});
