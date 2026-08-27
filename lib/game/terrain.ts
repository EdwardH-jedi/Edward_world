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

/** Ground line under the town, the projects and the construction area. */
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

/** World x at which grass gives way to bare dirt at the construction fence. */
export const DIRT_START_X = 3_240;

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

/** Every distinct ground height, left to right. Useful for drawing and tests. */
export function getTerraceProfile() {
  return [...TERRACES.map(({ y }) => y), TOWN_GROUND_Y];
}
