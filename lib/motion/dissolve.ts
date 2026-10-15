/** Six hard steps, ~350 ms in all. Stepped on purpose: an eased fade is not pixel art. */
export const DISSOLVE_STEPS = 6;
export const DISSOLVE_MS = 350;
export const DISSOLVE_STEP_MS = Math.round(DISSOLVE_MS / DISSOLVE_STEPS);

/**
 * Which step (0-5) a block is revealed on. A checkerboard splits the grid in
 * two by parity, and a diagonal stripe splits each half in three, so every step
 * lifts an even, scattered sixth of the screen and the result is the same every
 * time.
 */
export function dissolveRank(col: number, row: number) {
  return ((col + row) % 2) * 3 + ((col + 2 * row) % 3);
}

/** A block is still covering the scene while the dissolve has not reached its rank. */
export function isCovered(col: number, row: number, step: number) {
  return dissolveRank(col, row) >= step;
}
