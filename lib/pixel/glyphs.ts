import { palette } from "@/lib/pixel/palette";
import type { ArtRoutine, SpriteRows } from "@/lib/pixel/raster";
import { sprite } from "@/lib/pixel/raster";

/**
 * The glyph creatures.
 *
 * Original letterforms — ancient language crossed with code and forgotten
 * interfaces — not a borrowed alphabet. Each has one glowing eye, and there are
 * six because there are six letters in EDWARD.
 */

export const GLYPH_ART_SIZE = { width: 7, height: 9 } as const;

const GLYPH_MAP = { X: palette.ink, o: palette.cream };

const GLYPH_FORMS: readonly SpriteRows[] = [
  [".XXXXX.", ".X...X.", ".X.o.X.", ".XXXXX.", "...X...", "...X...", "..XX...", "..X....", ".XX...."],
  ["..XXX..", ".X...X.", ".X.o.X.", "..XXX..", "....X..", "...X...", "..X....", ".X.....", "XX....."],
  [".XXXXX.", ".X.....", ".X.o...", ".XXXX..", "....X..", "....X..", ".XXXX..", ".X.....", ".XX...."],
  [".XX.XX.", ".X...X.", ".X.o.X.", ".X...X.", ".X...X.", ".XX.XX.", "..X.X..", "..X.X..", ".XX.XX."],
  ["...X...", "..XX...", ".XXXXX.", ".X...X.", ".X.o.X.", ".XXXX..", "...X...", "..XX...", "..X.X.."],
  [".XXXXX.", ".X...X.", ".X.o.X.", ".X...X.", ".XXXXX.", "..X.X..", "..X.X..", ".XX.XX.", ".X...X."],
];

/** The word they assemble into, one creature per letter. */
export const GLYPH_WORD = "EDWARD";

export const GLYPH_COUNT = GLYPH_FORMS.length;

function makeRoutine(index: number): ArtRoutine {
  return (draw) => sprite(draw, 0, 0, GLYPH_FORMS[index % GLYPH_FORMS.length], GLYPH_MAP);
}

/** Stable routines, one per creature, so canvas effects do not churn. */
export const glyphRoutines: readonly ArtRoutine[] = GLYPH_FORMS.map((_, index) =>
  makeRoutine(index),
);
