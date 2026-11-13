import { describe, expect, it } from "vitest";
import { LANDINGS, SHEET } from "@/data/chart";
import {
  buildTerrain,
  coastWobble,
  contourLoops,
  CONTOURS,
  distanceAt,
  OPEN_SEA,
} from "@/lib/game/chart/terrain";

const terrain = buildTerrain(LANDINGS, SHEET);

describe("chart terrain", () => {
  it("is deterministic: the same landings build the same field", () => {
    const again = buildTerrain(LANDINGS, SHEET);
    expect(again.field.length).toBe(terrain.field.length);
    expect(again.field.every((value, i) => value === terrain.field[i])).toBe(true);
  });

  it("gives each seed its own coastline", () => {
    const bearings = Array.from({ length: 24 }, (_, i) => (i / 24) * Math.PI * 2);
    const a = bearings.map(coastWobble(11));
    const b = bearings.map(coastWobble(23));
    expect(a).not.toEqual(b);
    expect(bearings.map(coastWobble(11))).toEqual(a);
  });

  it("puts every island centre on land and the open sea far from any coast", () => {
    for (const landing of LANDINGS) {
      expect(distanceAt(terrain, landing.centre.x, landing.centre.y), landing.id).toBeLessThan(0);
    }
    expect(distanceAt(terrain, 40, 900)).toBe(OPEN_SEA);
    expect(distanceAt(terrain, -5, -5)).toBe(OPEN_SEA);
  });

  it("cuts Sydney's bay out of the land", () => {
    const sydney = LANDINGS.find((landing) => landing.id === "sydney")!;
    const bay = sydney.carve![0];
    expect(distanceAt(terrain, bay.x, bay.y)).toBeGreaterThan(0);
  });

  it("traces at least one closed coastline per island", () => {
    const coast = contourLoops(terrain, CONTOURS.coast.level, CONTOURS.coast.wobble);
    expect(coast.length).toBeGreaterThanOrEqual(LANDINGS.length);
    for (const loop of coast) expect(loop.length).toBeGreaterThanOrEqual(16);
  });
});
