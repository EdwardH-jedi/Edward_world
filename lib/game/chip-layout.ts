/**
 * Where the world's DOM chips go — the name sign over each object and the
 * prompt bubble over Edward — worked out in whole units, so every edge the
 * stylesheet draws lands on the art grid. Pure: the component measures the
 * text, this decides the geometry, and the tests can check it without a DOM.
 */

/**
 * The prompt bubble over Edward, from his sprite's top row up: a clear unit,
 * then the two units its tail hangs below its bottom edge (`.world-prompt` in
 * `app/globals.css` draws the same three).
 */
export const BUBBLE_GAP_UNITS = 1;
export const BUBBLE_TAIL_UNITS = 2;

/** A chip's width and its left edge relative to its anchor, both in units. */
export interface ChipPlacement {
  readonly width: number;
  readonly left: number;
}

/** A rectangle in whole units, in any one shared space. */
export interface UnitRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Snaps a chip to the unit grid and centres it on its anchor.
 *
 * Text decides a chip's width, and glyph advances are not unit multiples, so a
 * chip centred on its anchor would otherwise land on a fractional pixel. The
 * width is rounded up to whole units, and to the same parity as the anchor's
 * width in units, so centring it is a whole number of units. Centring with
 * `translateX(-50%)` instead would leave a half pixel, because the pop
 * animation owns the transform.
 *
 * Given where the anchor is on screen, the chip is also clamped into the
 * visible strip a unit in from each edge, still in whole units. When it is
 * wider than that strip its left edge wins.
 */
export function placeChip({
  naturalWidth,
  unit,
  anchorUnits,
  screenLeft,
  viewportWidth,
}: {
  /** The chip's laid-out width, in CSS px. */
  naturalWidth: number;
  unit: number;
  /** The anchor's width in units, which the chip is centred on. */
  anchorUnits: number;
  /** The anchor's left edge on screen, in CSS px (a unit multiple). */
  screenLeft?: number;
  /** The viewport's width, in CSS px. */
  viewportWidth?: number;
}): ChipPlacement {
  const units = Math.ceil(naturalWidth / unit);
  const width = (units - anchorUnits) % 2 === 0 ? units : units + 1;
  let left = (anchorUnits - width) / 2;
  if (screenLeft !== undefined && viewportWidth) {
    const min = Math.ceil((unit - screenLeft) / unit);
    const max = Math.floor((viewportWidth - unit * 2 - screenLeft - width * unit) / unit);
    left = Math.max(min, Math.min(max, left));
  }
  return { width, left };
}

/**
 * The column of a chip's one-unit tail or stem, in units from the chip's own
 * left edge: under `targetColumn` (given in anchor units) where the chip
 * reaches it, otherwise the chip's nearest column that is not a border.
 */
export function placeTail(chip: ChipPlacement, targetColumn: number) {
  return Math.max(1, Math.min(chip.width - 2, targetColumn - chip.left));
}

function overlaps(a: UnitRect, b: UnitRect, gap: number) {
  return (
    a.left < b.left + b.width + gap &&
    b.left < a.left + a.width + gap &&
    a.top < b.top + b.height + gap &&
    b.top < a.top + a.height + gap
  );
}

/**
 * The top `rect` should take so that it keeps `gap` units clear of every
 * obstacle: unchanged when it already does, otherwise lifted, never lowered
 * and never moved sideways, until it sits above everything it would have
 * covered. The obstacles stay where they are; this only ever moves `rect`.
 */
export function clearOf(rect: UnitRect, obstacles: readonly UnitRect[], gap = 1) {
  let top = rect.top;
  // Each pass lifts above at least one obstacle it has not cleared yet, and a
  // lifted rect never comes back down, so it settles within one pass apiece.
  for (let pass = 0; pass <= obstacles.length; pass += 1) {
    const current = { ...rect, top };
    const hit = obstacles.find((obstacle) => overlaps(current, obstacle, gap));
    if (!hit) return top;
    top = Math.min(top, hit.top - gap - rect.height);
  }
  return top;
}
