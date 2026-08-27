import { describe, expect, it } from "vitest";
import { buildings, initialPlayer, npcs, signs, WORLD_CONFIG } from "@/data/world";
import { PIXEL_UNIT } from "@/lib/game/terrain";
import { BACKDROP_ART_SIZE } from "@/lib/pixel/backdrop";
import { buildingArt, signpostArt } from "@/lib/pixel/buildings";
import {
  EDWARD_ART_SIZE,
  getWalkFrame,
  TOMODACHI_ART_SIZE,
} from "@/lib/pixel/characters";

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
