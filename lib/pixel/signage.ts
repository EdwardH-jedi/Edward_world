import type { ArtRoutine } from "@/lib/pixel/raster";

/**
 * Where an object's name sign hangs, read from the object's own art.
 *
 * An object's box is not its silhouette: the Arcade's box starts six rows
 * above its roof, SportsGang's tower stands at one end of a roof twenty rows
 * lower, and the House's chimney is the only thing in its top row. A chip
 * placed by the box alone floats in the sky over all three. So each sign is
 * placed against the art under it instead.
 */

/**
 * Every ambient cycle the world's art uses (2, 3 and 4 frames) repeats within
 * twelve, so these frames show every pixel any of them ever draws.
 */
const AMBIENT_CYCLE = 12;

/** Solid colours only: shadows and glows are translucent and never carry a sign. */
const SOLID = /^#[0-9a-f]{6}$/i;

/**
 * The first solid row of each column of an art routine, over every ambient
 * frame; `Infinity` where a column is never drawn.
 */
export function topProfile(draw: ArtRoutine, width: number): number[] {
  const profile = new Array<number>(width).fill(Infinity);
  for (let frame = 0; frame < AMBIENT_CYCLE; frame += 1) {
    draw((x, y, w, h, colour) => {
      if (h <= 0 || !SOLID.test(colour)) return;
      for (let column = Math.max(0, x); column < Math.min(width, x + w); column += 1) {
        profile[column] = Math.min(profile[column], y);
      }
    }, frame);
  }
  return profile;
}

/**
 * How many rows below its box top an object's sign hangs: the highest art
 * under the chip and under its one-unit shadow. Measured for the chip centred
 * on the object, so the sign keeps one height whether or not it is later
 * clamped sideways onto the screen and never jumps when the player arrives.
 */
export function signDrop(
  profile: readonly number[],
  chip: { readonly width: number; readonly left: number },
) {
  let drop = Infinity;
  // `left + width` is the shadow's column, one unit right of the chip.
  for (let column = chip.left; column <= chip.left + chip.width; column += 1) {
    const top = profile[column];
    if (top !== undefined) drop = Math.min(drop, top);
  }
  return Number.isFinite(drop) ? drop : 0;
}

/**
 * The row the sign's stem stands on at `column`, or `null` where nothing is
 * drawn there for it to touch.
 */
export function stemFoot(profile: readonly number[], column: number) {
  const top = profile[column];
  return top !== undefined && Number.isFinite(top) ? top : null;
}
