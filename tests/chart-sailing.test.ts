import { describe, expect, it } from "vitest";
import {
  BOTTLES,
  CARTOUCHE,
  LANDINGS,
  ROSE,
  SEA_NAMES,
  SERPENT,
  SHEET,
} from "@/data/chart";
import {
  BOTTLE_CLEARANCE,
  bottlesInReach,
  DOCK_RANGE,
  nearestAnchorage,
} from "@/lib/game/chart/docking";
import {
  boatAt,
  COURSE_LIMIT,
  COURSE_SPACING,
  extendCourse,
  isBlocked,
  SHORE_CLEARANCE,
  steer,
  stepBoat,
  type Boat,
} from "@/lib/game/chart/sailing";
import { buildChartScene } from "@/lib/game/chart/scene";
import { distanceAt } from "@/lib/game/chart/terrain";
import type { Vec } from "@/types/chart";

const scene = buildChartScene(LANDINGS, BOTTLES, SHEET, {
  seas: SEA_NAMES,
  rose: ROSE,
  cartouche: CARTOUCHE,
  serpent: SERPENT,
});
const { terrain, anchorages } = scene;

function sailToward(start: Boat, goal: Vec, frames: number, check: (boat: Boat) => void) {
  let boat = start;
  for (let i = 0; i < frames; i++) {
    boat = stepBoat(terrain, boat, steer({ x: 0, y: 0 }, goal, boat), 1 / 60);
    check(boat);
  }
  return boat;
}

describe("sailing", () => {
  it("never lets the boat onto land, steering straight at each island", () => {
    for (const [i, landing] of LANDINGS.entries()) {
      const end = sailToward(boatAt(anchorages[i].point), landing.centre, 600, (boat) => {
        expect(distanceAt(terrain, boat.x, boat.y), landing.id).toBeGreaterThanOrEqual(SHORE_CLEARANCE);
      });
      expect(isBlocked(terrain, end.x, end.y)).toBe(false);
    }
  });

  it("keeps the boat on the sheet", () => {
    sailToward(boatAt({ x: 60, y: 900 }), { x: -400, y: 1400 }, 400, (boat) => {
      expect(boat.x).toBeGreaterThanOrEqual(8);
      expect(boat.y).toBeLessThanOrEqual(SHEET.height - 8);
    });
  });

  it("turns the bow with the helm and holds it when only steering north or south", () => {
    const west = stepBoat(terrain, boatAt({ x: 600, y: 300 }), { x: -1, y: 0 }, 1 / 60);
    expect(west.facing).toBe(-1);
    expect(stepBoat(terrain, west, { x: 0, y: 1 }, 1 / 60).facing).toBe(-1);
  });

  it("lets go of a held pointer within seven units of it", () => {
    expect(steer({ x: 0, y: 0 }, { x: 103, y: 100 }, { x: 100, y: 100 })).toEqual({ x: 0, y: 0 });
    expect(steer({ x: 0, y: 0 }, { x: 120, y: 100 }, { x: 100, y: 100 })).toEqual({ x: 1, y: 0 });
    expect(steer({ x: 0, y: -1 }, { x: 120, y: 100 }, { x: 100, y: 100 })).toEqual({ x: 0, y: -1 });
  });

  it("lays the course every few units and caps a passage", () => {
    const run = extendCourse([{ x: 0, y: 0 }], { x: COURSE_SPACING - 1, y: 0 });
    expect(run).toHaveLength(1);
    expect(extendCourse(run, { x: COURSE_SPACING + 1, y: 0 })).toHaveLength(2);
    let long: readonly Vec[] = [{ x: 0, y: 0 }];
    for (let i = 1; i <= COURSE_LIMIT + 50; i++) long = extendCourse(long, { x: i * 10, y: 0 });
    expect(long).toHaveLength(COURSE_LIMIT);
  });
});

describe("docking", () => {
  it("puts every anchorage on open water", () => {
    for (const anchorage of anchorages) {
      expect(isBlocked(terrain, anchorage.point.x, anchorage.point.y), anchorage.landing).toBe(false);
    }
  });

  it("offers the anchorage within range and not beyond it", () => {
    for (const anchorage of anchorages) {
      const { x, y } = anchorage.point;
      expect(nearestAnchorage(anchorages, { x, y })?.landing).toBe(anchorage.landing);
      expect(nearestAnchorage(anchorages, { x: x + DOCK_RANGE - 1, y })?.landing).toBe(anchorage.landing);
      expect(nearestAnchorage(anchorages, { x: x + DOCK_RANGE + 1, y })).toBeNull();
    }
  });

  it("can reach every anchorage by sea from the home port", () => {
    const step = 4;
    const cols = Math.ceil(SHEET.width / step);
    const rows = Math.ceil(SHEET.height / step);
    const seen = new Uint8Array(cols * rows);
    const cell = (p: Vec) => [Math.round(p.x / step), Math.round(p.y / step)] as const;
    const [sx, sy] = cell(anchorages[0].point);
    const queue = [sx + sy * cols];
    seen[queue[0]] = 1;
    while (queue.length) {
      const index = queue.pop()!;
      const cx = index % cols;
      const cy = (index - cx) / cols;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const next = nx + ny * cols;
        if (seen[next] || isBlocked(terrain, nx * step, ny * step)) continue;
        seen[next] = 1;
        queue.push(next);
      }
    }
    for (const anchorage of anchorages) {
      const [ax, ay] = cell(anchorage.point);
      expect(seen[ax + ay * cols], anchorage.landing).toBe(1);
    }
  });
});

describe("bottles", () => {
  it("settles every bottle on open water", () => {
    for (const bottle of scene.bottles) {
      expect(distanceAt(terrain, bottle.at.x, bottle.at.y), bottle.id).toBeGreaterThanOrEqual(BOTTLE_CLEARANCE);
    }
  });

  it("fishes out only what is within reach and not yet found", () => {
    const bottle = scene.bottles[0];
    expect(bottlesInReach(scene.bottles, bottle.at, new Set())).toEqual([bottle.id]);
    expect(bottlesInReach(scene.bottles, bottle.at, new Set([bottle.id]))).toEqual([]);
    expect(bottlesInReach(scene.bottles, { x: bottle.at.x + 20, y: bottle.at.y }, new Set())).toEqual([]);
  });
});
