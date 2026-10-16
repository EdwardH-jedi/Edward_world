import { PIXEL_UNIT } from "@/lib/game/terrain";
import { BACKDROP_ART_SIZE } from "@/lib/pixel/backdrop";

export const MIN_PIXEL_UNIT = 2;
export const MAX_PIXEL_UNIT = 8;

/**
 * CSS pixels per art pixel for a viewport: the largest whole number whose
 * scaled world still fits the height, so the scene fills the screen without a
 * single fractional pixel. Falls back to the minimum on a viewport too short
 * for even that.
 */
export function getPixelUnit(
  viewportHeight: number,
  artHeight: number = BACKDROP_ART_SIZE.height,
) {
  const fit = Math.floor(viewportHeight / artHeight);
  return Math.min(MAX_PIXEL_UNIT, Math.max(MIN_PIXEL_UNIT, fit));
}

/**
 * World values are authored at `PIXEL_UNIT`; these two bring them to a live
 * unit. `toCss` is exact for anything already on the art grid (every authored
 * position and size). `snapToCss` floors first, for continuous values such as
 * the player and camera, so they always land on a whole art pixel.
 */
export function toCss(authored: number, unit: number) {
  return (authored / PIXEL_UNIT) * unit;
}

export function snapToCss(authored: number, unit: number) {
  return Math.floor(authored / PIXEL_UNIT) * unit;
}

/**
 * The live unit, stepped down to the largest whole unit at which `art` still
 * fits `space` (both in CSS pixels). For scenes wider than the world is tall,
 * such as a room strip, so they shrink a whole unit at a time instead of
 * stretching by a fraction. Never below one CSS pixel per art pixel.
 */
export function fitPixelUnit(
  unit: number,
  space: { width: number; height: number },
  art: { width: number; height: number },
) {
  const fit = Math.min(
    Math.floor(space.width / art.width),
    Math.floor(space.height / art.height),
  );
  return Math.max(1, Math.min(unit, fit));
}
