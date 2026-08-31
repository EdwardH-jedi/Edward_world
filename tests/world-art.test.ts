import { describe, expect, it } from "vitest";
import { buildings, initialPlayer, npcs, signs, WORLD_CONFIG } from "@/data/world";
import { PIXEL_UNIT } from "@/lib/game/terrain";
import { BACKDROP_ART_SIZE } from "@/lib/pixel/backdrop";
import { buildingArt, signpostArt } from "@/lib/pixel/buildings";
import {
  EDWARD_ART_SIZE,
  edwardPoses,
  getWalkFrame,
  TOMODACHI_ART_SIZE,
} from "@/lib/pixel/characters";
import { palette } from "@/lib/pixel/palette";
import type { Raster } from "@/lib/pixel/raster";

/** Collects every rect an art routine draws, in art-pixel space. */
function record(draw: (raster: Raster, frame: number) => void, frame: number) {
  const rects: { x: number; y: number; width: number; height: number; color: string }[] = [];
  draw((x, y, width, height, color) => rects.push({ x, y, width, height, color }), frame);
  return rects;
}

const EDWARD_POSES = ["walk", "front", "back", "inspect"] as const;

describe("art grid alignment", () => {
  it("covers the whole world with the backdrop layer", () => {
    expect(BACKDROP_ART_SIZE.width * PIXEL_UNIT).toBe(WORLD_CONFIG.width);
    expect(BACKDROP_ART_SIZE.height * PIXEL_UNIT).toBe(WORLD_CONFIG.height);
  });

  it("gives every building art sized exactly to its world footprint", () => {
    for (const building of buildings) {
      const art = buildingArt[building.id];
      expect(art, `missing art for ${building.id}`).toBeDefined();
      expect(art.size.width * PIXEL_UNIT).toBe(building.size.width);
      expect(art.size.height * PIXEL_UNIT).toBe(building.size.height);
    }
  });

  it("sizes the character and sign art to their world footprints", () => {
    expect(EDWARD_ART_SIZE.width * PIXEL_UNIT).toBe(initialPlayer.size.width);
    expect(EDWARD_ART_SIZE.height * PIXEL_UNIT).toBe(initialPlayer.size.height);
    expect(TOMODACHI_ART_SIZE.width * PIXEL_UNIT).toBe(npcs[0].size.width);
    expect(TOMODACHI_ART_SIZE.height * PIXEL_UNIT).toBe(npcs[0].size.height);
    expect(signpostArt.size.width * PIXEL_UNIT).toBe(signs[0].size.width);
    expect(signpostArt.size.height * PIXEL_UNIT).toBe(signs[0].size.height);
  });
});

describe("Edward sprite", () => {
  it("keeps every pose inside the 12x16 grid, on whole pixels", () => {
    for (const pose of EDWARD_POSES) {
      for (let frame = 0; frame < 4; frame += 1) {
        for (const rect of record(edwardPoses[pose], frame)) {
          expect(Number.isInteger(rect.x), `${pose} ${frame} x`).toBe(true);
          expect(Number.isInteger(rect.y), `${pose} ${frame} y`).toBe(true);
          expect(rect.x).toBeGreaterThanOrEqual(0);
          expect(rect.y).toBeGreaterThanOrEqual(0);
          expect(rect.x + rect.width).toBeLessThanOrEqual(EDWARD_ART_SIZE.width);
          expect(rect.y + rect.height).toBeLessThanOrEqual(EDWARD_ART_SIZE.height);
        }
      }
    }
  });

  it("draws every pose from the approved palette, plus the contact shadow", () => {
    const approved = new Set<string>(Object.values(palette));
    for (const pose of EDWARD_POSES) {
      for (const rect of record(edwardPoses[pose], 0)) {
        if (rect.color.startsWith("rgba(")) continue;
        expect(approved.has(rect.color), `${pose} uses ${rect.color}`).toBe(true);
      }
    }
  });

  it("grounds every pose with a contact shadow on the last row", () => {
    for (const pose of EDWARD_POSES) {
      const shadow = record(edwardPoses[pose], 0).filter((rect) =>
        rect.color.startsWith("rgba("),
      );
      expect(shadow.length, pose).toBeGreaterThan(0);
      for (const rect of shadow) {
        expect(rect.y + rect.height).toBe(EDWARD_ART_SIZE.height);
      }
    }
  });

  it("keeps the recognisable traits: dark hair, skin, navy coat, brown bag", () => {
    for (const pose of EDWARD_POSES) {
      const colors = new Set(record(edwardPoses[pose], 0).map((rect) => rect.color));
      expect(colors.has(palette.hair), `${pose} hair`).toBe(true);
      expect(colors.has(palette.navy), `${pose} coat`).toBe(true);
      expect(colors.has(palette.brown2), `${pose} bag`).toBe(true);
      expect(colors.has(palette.denim), `${pose} trousers`).toBe(true);
    }
    // Only the poses that show his face carry skin above the collar.
    expect(new Set(record(edwardPoses.front, 0).map((r) => r.color)).has(palette.ink)).toBe(true);
  });

  it("gives the standing poses a one pixel breath and the walk four distinct frames", () => {
    const key = (pose: (typeof EDWARD_POSES)[number], frame: number) =>
      JSON.stringify(record(edwardPoses[pose], frame));

    expect(key("front", 0)).not.toBe(key("front", 1));
    expect(key("front", 0)).toBe(key("front", 2));

    const walk = new Set([0, 1, 2, 3].map((frame) => key("walk", frame)));
    expect(walk.size).toBe(3); // frames 0 and 2 share the contact pose
  });

  it("gives every pose its own silhouette", () => {
    const shapes = EDWARD_POSES.map((pose) => key(pose));
    function key(pose: (typeof EDWARD_POSES)[number]) {
      return JSON.stringify(record(edwardPoses[pose], 0));
    }
    expect(new Set(shapes).size).toBe(EDWARD_POSES.length);
  });
});

describe("walk cycle", () => {
  it("holds the idle pose while standing still", () => {
    expect(getWalkFrame(0, PIXEL_UNIT, false)).toBe(0);
    expect(getWalkFrame(1_234, PIXEL_UNIT, false)).toBe(0);
  });

  it("advances with distance travelled rather than with time", () => {
    const frames = new Set<number>();
    for (let x = 0; x < 400; x += 4) {
      frames.add(getWalkFrame(x, PIXEL_UNIT, true));
    }
    expect(frames.size).toBe(4);
  });

  it("returns a frame that exists for any position in the world", () => {
    for (let x = 0; x <= WORLD_CONFIG.width; x += 17) {
      const frame = getWalkFrame(x, PIXEL_UNIT, true);
      expect(Number.isInteger(frame)).toBe(true);
      expect(frame).toBeGreaterThanOrEqual(0);
      expect(frame).toBeLessThan(4);
    }
  });
});
