import { coastAlong, distanceAt, type Terrain } from "@/lib/game/chart/terrain";
import type { Bottle, Landing, LandingId, Vec } from "@/types/chart";

/** How close the boat must be to an anchorage for `E` to drop anchor. */
export const DOCK_RANGE = 30;

/** How close the boat must pass to fish a bottle out. */
export const BOTTLE_REACH = 11;

/** Bottles are nudged until at least this far from any coast. */
export const BOTTLE_CLEARANCE = 6;

export interface Anchorage {
  readonly landing: LandingId;
  /** Where the jetty meets the coast, and the outward direction along it. */
  readonly coast: { readonly x: number; readonly y: number; readonly ux: number; readonly uy: number };
  /** Where the boat waits. */
  readonly point: Vec;
}

/** The landing's fixed anchorage, and where its jetty meets the coast on the way there. */
export function anchorageFor(terrain: Terrain, landing: Landing): Anchorage {
  return {
    landing: landing.id,
    coast: coastAlong(terrain, landing.centre, landing.dockAngle),
    point: landing.anchorage,
  };
}

/** The anchorage closest to `at`, if any is within `range`. */
export function nearestAnchorage(
  anchorages: readonly Anchorage[],
  at: Vec,
  range = DOCK_RANGE,
): Anchorage | null {
  let best: Anchorage | null = null;
  let bestDistance = range;
  for (const anchorage of anchorages) {
    const d = Math.hypot(anchorage.point.x - at.x, anchorage.point.y - at.y);
    if (d < bestDistance) {
      bestDistance = d;
      best = anchorage;
    }
  }
  return best;
}

/** Ids of bottles within reach of `at` that have not been found yet. */
export function bottlesInReach(
  bottles: readonly Bottle[],
  at: Vec,
  found: ReadonlySet<string>,
): string[] {
  return bottles
    .filter((b) => !found.has(b.id) && Math.hypot(b.at.x - at.x, b.at.y - at.y) <= BOTTLE_REACH)
    .map((b) => b.id);
}

/** Moves any bottle that was authored too close to a coast south, out to sea. */
export function settleBottles(terrain: Terrain, bottles: readonly Bottle[]): Bottle[] {
  return bottles.map((bottle) => {
    let y = bottle.at.y;
    let guard = 0;
    while (distanceAt(terrain, bottle.at.x, y) < BOTTLE_CLEARANCE && guard++ < 200) y += 2;
    return y === bottle.at.y ? bottle : { ...bottle, at: { x: bottle.at.x, y } };
  });
}
