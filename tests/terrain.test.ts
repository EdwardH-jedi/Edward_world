import { describe, expect, it } from "vitest";
import { buildings, npcs, signs, WORLD_CONFIG } from "@/data/world";
import {
  DIRT_START_X,
  getGroundY,
  getGroundYForFootprint,
  getTerraceProfile,
  HILL_GROUND_Y,
  PIXEL_UNIT,
  TOWN_GROUND_Y,
} from "@/lib/game/terrain";

describe("ground profile", () => {
  it("descends from the hill to town level without ever rising", () => {
    let previous = getGroundY(0);
    for (let x = 0; x <= WORLD_CONFIG.width; x += 4) {
      const current = getGroundY(x);
      expect(current).toBeGreaterThanOrEqual(previous);
      previous = current;
    }
    expect(getGroundY(0)).toBe(HILL_GROUND_Y);
    expect(getGroundY(WORLD_CONFIG.width)).toBe(TOWN_GROUND_Y);
  });

  it("keeps every terrace on the art pixel grid", () => {
    for (const y of getTerraceProfile()) {
      expect(y % PIXEL_UNIT).toBe(0);
    }
  });

  it("measures a footprint at its centre so wide sprites do not jitter", () => {
    // A sprite straddling the 760 terrace edge resolves to a single height.
    expect(getGroundYForFootprint(736, 48)).toBe(getGroundY(760));
    expect(getGroundYForFootprint(700, 48)).toBe(HILL_GROUND_Y);
  });

  it("turns to dirt before the construction area, not after it", () => {
    const construction = buildings.find(({ id }) => id === "construction-area");
    expect(construction).toBeDefined();
    expect(DIRT_START_X).toBeLessThan(construction!.position.x);
  });
});

describe("world geometry", () => {
  it("stands every object exactly on its ground line", () => {
    for (const object of [...buildings, ...npcs, ...signs]) {
      const groundY = getGroundYForFootprint(object.position.x, object.size.width);
      expect(object.position.y + object.size.height).toBe(groundY);
    }
  });

  it("aligns every object and the world itself to the art pixel grid", () => {
    expect(WORLD_CONFIG.width % PIXEL_UNIT).toBe(0);
    expect(WORLD_CONFIG.height % PIXEL_UNIT).toBe(0);

    for (const object of [...buildings, ...npcs, ...signs]) {
      expect(object.position.x % PIXEL_UNIT).toBe(0);
      expect(object.position.y % PIXEL_UNIT).toBe(0);
      expect(object.size.width % PIXEL_UNIT).toBe(0);
      expect(object.size.height % PIXEL_UNIT).toBe(0);
    }
  });

  it("leaves walkable space between neighbouring buildings", () => {
    const ordered = [...buildings].sort((a, b) => a.position.x - b.position.x);
    for (let index = 0; index < ordered.length - 1; index += 1) {
      const left = ordered[index];
      const right = ordered[index + 1];
      const gap = right.position.x - (left.position.x + left.size.width);
      // Wide enough that the player is never in range of two buildings at once.
      expect(gap).toBeGreaterThan(left.interactionRange * 2);
    }
  });

  it("keeps every building inside the world bounds", () => {
    for (const building of buildings) {
      expect(building.position.x).toBeGreaterThanOrEqual(0);
      expect(building.position.x + building.size.width).toBeLessThanOrEqual(
        WORLD_CONFIG.width,
      );
    }
  });
});
