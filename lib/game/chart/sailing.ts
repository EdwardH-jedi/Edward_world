import { distanceAt, type Terrain } from "@/lib/game/chart/terrain";
import type { Vec } from "@/types/chart";

/**
 * The boat. Pure: positions in, positions out.
 *
 * The hull is five probe points; the boat may not bring any of them within
 * `SHORE_CLEARANCE` of a coast, nor leave the sheet. Each axis is resolved on
 * its own, so sailing into a coast at an angle slides along it.
 */

/** Top speed, in chart units per second. */
export const MAX_SPEED = 118;
/** How close to a coast any part of the hull may come. */
export const SHORE_CLEARANCE = 1.5;
/** How close to the sheet's edge the boat may sail. */
export const SHEET_MARGIN = 8;
const HULL: readonly (readonly [number, number])[] = [
  [0, 0],
  [-4, 0],
  [4, 0],
  [0, -3],
  [0, 3],
];

/** Points on the course line are laid this far apart. */
export const COURSE_SPACING = 5;
/** A single passage keeps at most this many points; the oldest are dropped. */
export const COURSE_LIMIT = 1_600;

export interface Boat {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  /** Which way the bow points: 1 east, -1 west. */
  readonly facing: 1 | -1;
}

export function boatAt(at: Vec): Boat {
  return { x: at.x, y: at.y, vx: 0, vy: 0, facing: 1 };
}

export function isBlocked(terrain: Terrain, x: number, y: number): boolean {
  if (x < SHEET_MARGIN || y < SHEET_MARGIN) return true;
  if (x > terrain.width - SHEET_MARGIN || y > terrain.height - SHEET_MARGIN) return true;
  return HULL.some(([ox, oy]) => distanceAt(terrain, x + ox, y + oy) < SHORE_CLEARANCE);
}

/**
 * The unit direction the visitor is asking for. Keys win; a held pointer
 * steers toward its point on the chart, and lets go within seven units of it.
 */
export function steer(keys: Vec, pointer: Vec | null, boat: Vec): Vec {
  let ix = keys.x;
  let iy = keys.y;
  if (!ix && !iy && pointer) {
    const dx = pointer.x - boat.x;
    const dy = pointer.y - boat.y;
    if (Math.hypot(dx, dy) > 7) {
      ix = dx;
      iy = dy;
    }
  }
  const length = Math.hypot(ix, iy);
  return length ? { x: ix / length, y: iy / length } : { x: 0, y: 0 };
}

/** One step of sailing: ease toward the asked-for velocity, then move unless blocked. */
export function stepBoat(terrain: Terrain, boat: Boat, input: Vec, dt: number): Boat {
  const moving = input.x !== 0 || input.y !== 0;
  const k = Math.min(1, dt * (moving ? 2.6 : 1.5));
  let vx = boat.vx + (input.x * MAX_SPEED - boat.vx) * k;
  let vy = boat.vy + (input.y * MAX_SPEED - boat.vy) * k;
  const facing: 1 | -1 = Math.abs(input.x) > 0.2 ? (input.x > 0 ? 1 : -1) : boat.facing;

  let { x, y } = boat;
  const nx = x + vx * dt;
  if (!isBlocked(terrain, nx, y)) x = nx;
  else vx = 0;
  const ny = y + vy * dt;
  if (!isBlocked(terrain, x, ny)) y = ny;
  else vy = 0;

  return { x, y, vx, vy, facing };
}

export function speedOf(boat: Boat): number {
  return Math.hypot(boat.vx, boat.vy);
}

/** The current passage with the boat's position appended, if it has moved far enough. */
export function extendCourse(run: readonly Vec[], boat: Vec): readonly Vec[] {
  const last = run[run.length - 1];
  if (last && Math.hypot(boat.x - last.x, boat.y - last.y) <= COURSE_SPACING) return run;
  const next = [...run, { x: boat.x, y: boat.y }];
  return next.length > COURSE_LIMIT ? next.slice(next.length - COURSE_LIMIT) : next;
}

export interface Ripple {
  readonly x: number;
  readonly y: number;
  /** 1 when spawned, fading to 0. */
  readonly life: number;
}

/** Seconds between wake ripples, and the speed below which none are left. */
export const RIPPLE_EVERY = 0.22;
export const RIPPLE_MIN_SPEED = 30;

/** A ripple just astern of a boat under way. */
export function rippleBehind(boat: Boat): Ripple {
  const speed = speedOf(boat) || 1;
  return { x: boat.x - (boat.vx / speed) * 7, y: boat.y + 2 - (boat.vy / speed) * 7, life: 1 };
}

export function ageRipples(ripples: readonly Ripple[], dt: number): Ripple[] {
  return ripples.map((r) => ({ ...r, life: r.life - dt * 0.9 })).filter((r) => r.life > 0);
}
