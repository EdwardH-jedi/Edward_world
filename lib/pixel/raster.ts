import { palette } from "@/lib/pixel/palette";

/**
 * Draws one axis-aligned block in **art pixels**. Every art routine in this
 * folder is written against this signature and never touches the canvas API
 * directly, which is what keeps the world on the pixel grid at any scale.
 */
export type Raster = (
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
) => void;

/** A drawing routine for one subject, in its own local art-pixel space. */
export type ArtRoutine = (draw: Raster, frame: number) => void;

/**
 * Binds a canvas context to an integer art-pixel grid. Coordinates are rounded
 * before scaling so nothing can land on a half pixel.
 */
export function createRaster(
  context: CanvasRenderingContext2D,
  unit: number,
): Raster {
  return (x, y, width, height, color) => {
    context.fillStyle = color;
    context.fillRect(
      Math.round(x) * unit,
      Math.round(y) * unit,
      Math.round(width) * unit,
      Math.round(height) * unit,
    );
  };
}

/** A sprite as rows of single-character keys, `.` meaning transparent. */
export type SpriteRows = readonly string[];
export type SpriteMap = Readonly<Record<string, string>>;

/** Stamps a keyed character-grid sprite at an art-pixel origin. */
export function sprite(
  draw: Raster,
  x: number,
  y: number,
  rows: SpriteRows,
  map: SpriteMap,
) {
  rows.forEach((row, rowIndex) => {
    for (let column = 0; column < row.length; column += 1) {
      const color = map[row[column]];
      if (color) draw(x + column, y + rowIndex, 1, 1, color);
    }
  });
}

/** Fills a silhouette under a polyline, used for layered background hills. */
export function hills(
  draw: Raster,
  points: readonly (readonly [number, number])[],
  color: string,
  baseY: number,
) {
  for (let index = 0; index < points.length - 1; index += 1) {
    const [startX, startY] = points[index];
    const [endX, endY] = points[index + 1];
    for (let x = startX; x < endX; x += 1) {
      const y = Math.round(
        startY + ((endY - startY) * (x - startX)) / (endX - startX),
      );
      draw(x, y, 1, baseY - y, color);
    }
  }
}

/** A stepped gable roof, one art pixel of inset per row. */
export function roofPitch(
  draw: Raster,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
) {
  for (let row = 0; row < height; row += 1) {
    const inset = height - 1 - row;
    draw(x + inset, y + row, width - 2 * inset, 1, color);
  }
}

/** A framed window, optionally with a mullion cross. */
export function windowPane(
  draw: Raster,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  cross = false,
) {
  draw(x - 1, y - 1, width + 2, height + 2, palette.brown3);
  draw(x, y, width, height, fill);
  if (cross) {
    draw(x + (width >> 1), y, 1, height, palette.brown3);
    draw(x, y + (height >> 1), width, 1, palette.brown3);
  }
}

/**
 * The sign-band dash run. Signage is never readable text at world scale — the
 * real labels live on the DOM label chips, per the approved building language.
 */
export function dashes(
  draw: Raster,
  x: number,
  y: number,
  width: number,
  color: string,
) {
  for (let offset = 0; offset < width - 1; offset += 4) {
    draw(x + offset, y, (offset >> 2) % 3 === 2 ? 1 : 2, 1, color);
  }
}

/** Chimney smoke, rising and dispersing on the ambient frame counter. */
export function smoke(draw: Raster, x: number, y: number, frame: number) {
  for (let puff = 0; puff < 3; puff += 1) {
    const rise = (frame * 2 + puff * 3) % 10;
    draw(
      x + (puff % 2) - (rise > 5 ? 1 : 0),
      y - rise,
      2,
      2,
      palette.smoke,
    );
  }
}

/** A tree. `size` 0 is a sapling, 1 a standard, 2 a canopy tree. */
export function tree(
  draw: Raster,
  x: number,
  groundY: number,
  size: 0 | 1 | 2,
  frame: number,
) {
  const height = size === 2 ? 16 : size === 1 ? 11 : 8;
  const crownWidth = size === 2 ? 12 : size === 1 ? 8 : 6;
  draw(x + (crownWidth >> 1) - 1, groundY - height + 5, 2, height - 5, palette.brown3);
  draw(x, groundY - height + 1, crownWidth, 5, palette.green3);
  // The crown breathes by one pixel on alternating frames.
  draw(x + 1 + (frame % 2), groundY - height - 1, crownWidth - 2, 2, palette.green3);
  draw(x + 2, groundY - height + 1, 2, 1, palette.green2);
  draw(x + crownWidth - 3, groundY - height + 3, 2, 1, palette.green2);
}

/** A street lamp with a warm head. */
export function lamp(draw: Raster, x: number, groundY: number, height = 18) {
  draw(x, groundY - height, 1, height, palette.char);
  draw(x, groundY - height, 3, 1, palette.char);
  draw(x + 2, groundY - height + 1, 2, 2, palette.warm);
}

/** A hollow wheel, used for the bicycle by Edward's door. */
export function wheel(
  draw: Raster,
  x: number,
  y: number,
  diameter: number,
  color: string,
) {
  draw(x, y, diameter, 1, color);
  draw(x, y + diameter - 1, diameter, 1, color);
  draw(x, y, 1, diameter, color);
  draw(x + diameter - 1, y, 1, diameter, color);
  draw(x + (diameter >> 1), y + (diameter >> 1), 1, 1, color);
}

const DIGIT_GLYPHS: Readonly<Record<string, SpriteRows>> = {
  "0": ["XXX", "X.X", "X.X", "X.X", "XXX"],
  "1": [".X.", "XX.", ".X.", ".X.", "XXX"],
  "2": ["XXX", "..X", "XXX", "X..", "XXX"],
  "3": ["XXX", "..X", ".XX", "..X", "XXX"],
  "4": ["X.X", "X.X", "XXX", "..X", "..X"],
  "5": ["XXX", "X..", "XXX", "..X", "XXX"],
  "6": ["XXX", "X..", "XXX", "X.X", "XXX"],
  "7": ["XXX", "..X", "..X", ".X.", ".X."],
};

/** A 3x5 scoreboard digit. */
export function digit(
  draw: Raster,
  x: number,
  y: number,
  character: string,
  color: string,
) {
  const rows = DIGIT_GLYPHS[character];
  if (!rows) return;
  sprite(draw, x, y, rows, { X: color });
}

/**
 * Deterministic pseudo-noise. The world needs scatter — pebbles, grass tufts,
 * path wear — that is identical on the server and the client and stable across
 * ambient frames, so `Math.random` is not an option.
 */
export function scatter(seed: number) {
  return ((seed * 1_103_515_245 + 12_345) >>> 8) % 1_000;
}

/** An axis-aligned rectangle in art pixels. */
export interface ArtRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Wraps a raster so every rect is translated by `offset` and then clipped to
 * `bounds`, with anything fully outside dropped rather than drawn.
 *
 * The house needs this for its windows. The night skyline behind them is
 * authored as one scene and drawn twice at different sizes; without a clip its
 * sky band and its towers would run straight out across the bedroom wall.
 */
export function clipRaster(
  draw: Raster,
  bounds: ArtRect,
  offset: { readonly x: number; readonly y: number } = { x: 0, y: 0 },
): Raster {
  const clipLeft = Math.round(bounds.x);
  const clipTop = Math.round(bounds.y);
  const clipRight = clipLeft + Math.round(bounds.width);
  const clipBottom = clipTop + Math.round(bounds.height);

  return (x, y, width, height, color) => {
    const left = Math.max(clipLeft, Math.round(x) + offset.x);
    const top = Math.max(clipTop, Math.round(y) + offset.y);
    const right = Math.min(clipRight, Math.round(x) + offset.x + Math.round(width));
    const bottom = Math.min(clipBottom, Math.round(y) + offset.y + Math.round(height));
    if (right <= left || bottom <= top) return;
    draw(left, top, right - left, bottom - top, color);
  };
}
