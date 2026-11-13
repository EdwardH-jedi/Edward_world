import { buildTerrain, contourLoops, distanceAt, hash, type Loop, type Terrain, type Tree } from "@/lib/game/chart/terrain";
import type { IslandPlan, Landing, Place, Rect, Vec } from "@/types/chart";

/**
 * Walking on an island's harbour plan. Pure.
 *
 * A plan is the island redrawn at four times the chart's scale: one chart unit
 * is four plan units. Its coast comes from the same seed and outline as the
 * chart's, so each island is recognisably itself, with its own distance field
 * at two plan units a cell. Edward is a small square that slides along walls:
 * every place's footprint is solid, and he keeps his feet inside the coast.
 */

/** Plan units per chart unit. */
export const PLAN_SCALE = 4;
/** Plan units per cell of an island's distance field. */
export const GROUND_CELL = 2;
/** Walking speed, plan units per second. */
export const WALK_SPEED = 200;
/** Half the side of Edward's footprint. */
export const FIGURE_HALF = 7;
/** How far inside the coast his footprint must stay: the coast's ink is about this wide. */
export const COAST_CLEARANCE = 4;
/** How close to a door, or to the jetty, `E` acts. */
export const DOOR_REACH = 24;

export interface IslandGround {
  readonly terrain: Terrain;
  readonly size: Vec;
}

const grounds = new Map<string, IslandGround>();

/** The island's distance field, built once per landing and kept. */
export function groundFor(landing: Landing, plan: IslandPlan): IslandGround {
  const cached = grounds.get(landing.id);
  if (cached) return cached;
  const k = PLAN_SCALE / GROUND_CELL;
  const centre = { x: plan.size.x / 2 / GROUND_CELL, y: plan.size.y / 2 / GROUND_CELL };
  const shaped: Landing = {
    ...landing,
    centre,
    radii: { x: landing.radii.x * k, y: landing.radii.y * k },
    carve: landing.carve?.map((bay) => ({
      x: centre.x + (bay.x - landing.centre.x) * k,
      y: centre.y + (bay.y - landing.centre.y) * k,
      rx: bay.rx * k,
      ry: bay.ry * k,
    })),
  };
  const ground = {
    terrain: buildTerrain([shaped], {
      width: Math.ceil(plan.size.x / GROUND_CELL),
      height: Math.ceil(plan.size.y / GROUND_CELL),
    }),
    size: plan.size,
  };
  grounds.set(landing.id, ground);
  return ground;
}

/** Distance to the island's coast in plan units; negative ashore. */
export function groundDistance(ground: IslandGround, x: number, y: number): number {
  return distanceAt(ground.terrain, x / GROUND_CELL, y / GROUND_CELL) * GROUND_CELL;
}

/** The plan's contour levels, in plan units, with each line's hand-wobble in cells. */
export const ISLAND_CONTOURS = {
  coast: { level: 0, wobble: 1.2 },
  inner: { level: -8, wobble: 1.4 },
  waterline: { level: 10, wobble: 0.9 },
  waterline2: { level: 22, wobble: 1 },
  shoal: { level: 40, wobble: 1.2 },
  deep: { level: 72, wobble: 0 },
} as const;

export type IslandContour = keyof typeof ISLAND_CONTOURS;

const contourCache = new WeakMap<IslandGround, Record<IslandContour, Loop[]>>();

/** The plan's contours in plan units, traced once per island and kept. */
export function islandContours(ground: IslandGround): Record<IslandContour, Loop[]> {
  const cached = contourCache.get(ground);
  if (cached) return cached;
  const out = {} as Record<IslandContour, Loop[]>;
  for (const name of Object.keys(ISLAND_CONTOURS) as IslandContour[]) {
    const { level, wobble } = ISLAND_CONTOURS[name];
    out[name] = contourLoops(ground.terrain, level / GROUND_CELL, wobble).map((loop) =>
      loop.map(([x, y]) => [x * GROUND_CELL, y * GROUND_CELL] as const),
    );
  }
  contourCache.set(ground, out);
  return out;
}

export interface Walker {
  readonly x: number;
  readonly y: number;
  /** Heading in radians, for drawing. */
  readonly heading: number;
  /** Distance walked, for the stride. */
  readonly stride: number;
}

export function walkerAt(at: Vec): Walker {
  return { x: at.x, y: at.y, heading: Math.PI / 2, stride: 0 };
}

function overlapsRect(x: number, y: number, rect: Rect) {
  return (
    x + FIGURE_HALF > rect.x &&
    x - FIGURE_HALF < rect.x + rect.w &&
    y + FIGURE_HALF > rect.y &&
    y - FIGURE_HALF < rect.y + rect.h
  );
}

/** Whether Edward's footprint at (x, y) would be inside a place or off the land. */
export function isWalkBlocked(ground: IslandGround, places: readonly Place[], x: number, y: number): boolean {
  if (places.some((place) => overlapsRect(x, y, place.rect))) return true;
  const h = FIGURE_HALF;
  for (const [ox, oy] of [[0, 0], [-h, -h], [h, -h], [-h, h], [h, h]]) {
    if (groundDistance(ground, x + ox, y + oy) > -COAST_CLEARANCE) return true;
  }
  return false;
}

/** One step of walking toward the unit direction `input`; each axis is resolved alone, so he slides along walls. */
export function stepWalker(
  ground: IslandGround,
  places: readonly Place[],
  walker: Walker,
  input: Vec,
  dt: number,
): Walker {
  if (!input.x && !input.y) return walker;
  let { x, y } = walker;
  const nx = x + input.x * WALK_SPEED * dt;
  if (!isWalkBlocked(ground, places, nx, y)) x = nx;
  const ny = y + input.y * WALK_SPEED * dt;
  if (!isWalkBlocked(ground, places, x, ny)) y = ny;
  return {
    x,
    y,
    heading: Math.atan2(input.y, input.x),
    stride: walker.stride + Math.hypot(x - walker.x, y - walker.y),
  };
}

/** Places `E` can act on: everything but scenery and reserved plots. */
export function isActionable(place: Place): boolean {
  return place.action.type !== "NONE";
}

/** The actionable place whose door is closest to `at`, within reach. */
export function nearestDoor(places: readonly Place[], at: Vec): Place | null {
  let best: Place | null = null;
  let bestDistance = DOOR_REACH;
  for (const place of places) {
    if (!isActionable(place)) continue;
    const d = Math.hypot(place.door.x - at.x, place.door.y - at.y);
    if (d < bestDistance) {
      bestDistance = d;
      best = place;
    }
  }
  return best;
}

export function atJetty(plan: IslandPlan, at: Vec): boolean {
  return Math.hypot(plan.jetty.x - at.x, plan.jetty.y - at.y) < DOOR_REACH;
}

function segmentDistance(p: Vec, a: Vec, b: Vec) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}

const treeCache = new WeakMap<IslandGround, Tree[]>();

/** Trees on the plan: sparse, inland, off the paths, clear of every place and the jetty. Planted once per island. */
export function plantIsland(ground: IslandGround, plan: IslandPlan, landing: Landing): Tree[] {
  const cached = treeCache.get(ground);
  if (cached) return cached;
  const trees: Tree[] = [];
  const density = landing.woodland.density;
  for (let gy = 12; gy < plan.size.y; gy += 24) {
    for (let gx = 12; gx < plan.size.x; gx += 24) {
      if (hash(gx + landing.seed, gy) > density) continue;
      const x = gx + hash(gx, gy + 3) * 14 - 7;
      const y = gy + hash(gx + 5, gy) * 14 - 7;
      if (groundDistance(ground, x, y) > -14) continue;
      if (Math.hypot(x - plan.jetty.x, y - plan.jetty.y) < 50) continue;
      const near = (r: Rect) => x > r.x - 14 && x < r.x + r.w + 14 && y > r.y - 22 && y < r.y + r.h + 14;
      if (plan.places.some((place) => near(place.rect))) continue;
      const onPath = plan.paths.some((path) =>
        path.some((point, i) => i > 0 && segmentDistance({ x, y }, path[i - 1], point) < 16),
      );
      if (onPath) continue;
      trees.push({ x, y, r: 5 + hash(gx, gy) * 2.4, fruit: Boolean(landing.woodland.fruit) && hash(gy, gx) < 0.4 });
    }
  }
  treeCache.set(ground, trees);
  return trees;
}

/**
 * Does the slow part of going ashore ahead of time: the island's distance
 * field, its contours and its trees. Called while the boat waits at the
 * anchorage, so `E` finds them ready.
 */
export function prepareIsland(landing: Landing, plan: IslandPlan) {
  const ground = groundFor(landing, plan);
  islandContours(ground);
  plantIsland(ground, plan, landing);
}
