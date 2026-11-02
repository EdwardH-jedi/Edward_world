/**
 * Ground profile for the side-view world.
 *
 * The approved concept board draws the ground as a stepped function rather than
 * a smooth slope: Edward's House sits on a raised hill on the left, and the
 * land drops in discrete terraces down to town level. Keeping the steps on the
 * pixel grid is what preserves the "no sub-pixel positions, ever" rule from the
 * design system — every value here is a whole number of art pixels.
 *
 * Pure module: no React, no browser APIs.
 */

/** CSS pixels per authored art pixel. The world renders at 4x. */
export const PIXEL_UNIT = 4;

/** Ground line under Edward's House, in CSS pixels from the top of the world. */
export const HILL_GROUND_Y = 328;

/** Ground line under the town, the projects and the timeline street. */
export const TOWN_GROUND_Y = 400;

/** Height of one terrace, in CSS pixels. */
export const TERRACE_HEIGHT = 12;

/**
 * Terrace boundaries, ordered left to right. Each entry is the exclusive world
 * x at which the ground drops to the next `y`.
 */
const TERRACES: readonly { readonly untilX: number; readonly y: number }[] = [
  { untilX: 760, y: HILL_GROUND_Y },
  { untilX: 792, y: HILL_GROUND_Y + TERRACE_HEIGHT },
  { untilX: 824, y: HILL_GROUND_Y + TERRACE_HEIGHT * 2 },
  { untilX: 856, y: HILL_GROUND_Y + TERRACE_HEIGHT * 3 },
  { untilX: 888, y: HILL_GROUND_Y + TERRACE_HEIGHT * 4 },
  { untilX: 920, y: HILL_GROUND_Y + TERRACE_HEIGHT * 5 },
];

/**
 * The timeline street, between the Arcade and the exit gate: the world x of
 * the first station's left edge and of the last station's right edge.
 *
 * Shared so the station layout (`data/timeline.ts`) and the wall drawn behind
 * it (`lib/pixel/backdrop.ts`) cannot drift apart. Both ends sit 52px clear of
 * their neighbours — the Arcade ends at 3204 and the gate starts at 3720 —
 * which is more than the player's 48px width, so Edward can never stand over
 * a station and a neighbour at once.
 */
export const TIMELINE_STREET = { startX: 3_256, endX: 3_668 } as const;

/**
 * Ground line at a given world x, in CSS pixels from the top of the world.
 * Values are constant within a terrace, so anything standing on the ground
 * lands on the pixel grid.
 */
export function getGroundY(x: number) {
  for (const terrace of TERRACES) {
    if (x < terrace.untilX) return terrace.y;
  }
  return TOWN_GROUND_Y;
}

/**
 * Ground line under an object of a given width, measured at its centre so a
 * sprite straddling a terrace edge does not jitter between two heights.
 */
export function getGroundYForFootprint(x: number, width: number) {
  return getGroundY(x + width / 2);
}

/** test contract */
/** Every distinct ground height, left to right. Useful for drawing and tests. */
export function getTerraceProfile() {
  return [...TERRACES.map(({ y }) => y), TOWN_GROUND_Y];
}
