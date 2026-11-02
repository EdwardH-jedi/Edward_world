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
 * Sky rows the side-scrolling world may lose off the top of the viewport.
 *
 * The backdrop is 138 rows tall and the ground sits around row 100, so fitting
 * the whole backdrop leaves most of the screen to sky and the walk feels small.
 * The world instead fits `138 - WORLD_SKY_CROP` rows and lets the sky run off
 * the top: at 1280x800 the unit goes from 5 to 7 and Edward from 80 to 168
 * CSS px tall. 24 rows keeps the hill house's roofline (row 32) and its label
 * clear of the edge at every viewport.
 */
export const WORLD_SKY_CROP = 24;

/**
 * The fewest art columns the world should show at once — a building plus a
 * step either side — so a phone in portrait is not framed on half a facade.
 */
export const WORLD_MIN_VISIBLE_ART_WIDTH = 64;

/**
 * The unit for the side-scrolling world alone: the largest whole number at
 * which the *framed* backdrop still fits the height, capped so at least
 * `WORLD_MIN_VISIBLE_ART_WIDTH` columns are on screen. Every other scene keeps
 * `getPixelUnit`, which fits the full backdrop.
 */
export function getWorldUnit(
  viewport: { width: number; height: number },
  artHeight: number = BACKDROP_ART_SIZE.height,
) {
  const byHeight = Math.floor(viewport.height / (artHeight - WORLD_SKY_CROP));
  const byWidth = Math.floor(viewport.width / WORLD_MIN_VISIBLE_ART_WIDTH);
  return Math.min(MAX_PIXEL_UNIT, Math.max(MIN_PIXEL_UNIT, Math.min(byHeight, byWidth)));
}

/**
 * CSS pixels of the world track that run off the top of a viewport at a unit,
 * on the unit grid. Zero whenever the whole backdrop fits. The track's origin
 * is snapped down to the grid, so the viewport height is too.
 */
export function getWorldCrop(
  viewportHeight: number,
  unit: number,
  artHeight: number = BACKDROP_ART_SIZE.height,
) {
  const visible = Math.floor(viewportHeight / unit) * unit;
  return Math.max(0, artHeight * unit - visible);
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

/** Width of the court in art pixels, and the share of the stage it may take. */
const COURT_ART_WIDTH = 225;
const COURT_WIDTH_SHARE = 0.92;

/**
 * Whole CSS pixels per court art pixel: as wide as fits 92% of the stage, never
 * above the live unit and never below 2. On a stage too narrow for that the
 * court is wider than the stage and is cropped, rather than scaled by a fraction.
 */
export function courtUnit(stageWidth: number, liveUnit: number) {
  const fit = Math.floor((stageWidth * COURT_WIDTH_SHARE) / COURT_ART_WIDTH);
  return Math.max(MIN_PIXEL_UNIT, Math.floor(Math.min(fit, liveUnit)));
}
