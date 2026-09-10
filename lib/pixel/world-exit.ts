import { palette } from "@/lib/pixel/palette";
import type { BuildingArt } from "@/lib/pixel/buildings";

/**
 * The gate at the right-hand end of the world.
 *
 * It is the way out of Edward's World, so it has to read as a way out from a
 * distance and at a glance: two posts, a crossbeam, an open gateway you can
 * see through, and a board carrying an arrow that points off the edge of the
 * map. Same palette, same 4 px art grid and same fence language as everything
 * else — it is the end of this place, not a door into a different one.
 *
 * The gateway is deliberately *open*. A closed gate would read as something
 * that has to be unlocked, and nothing about finishing a visit is earned.
 */

const ART_WIDTH = 20;
const ART_HEIGHT = 26;

/**
 * `EXIT` in 3×5 letterforms.
 *
 * Signage in this world is normally a run of dashes, because text does not
 * survive world scale. This is the exception the whole object exists for: a
 * visitor has to be able to tell this apart from the fence beside it, and four
 * letters at three pixels wide is the smallest thing that says so. It is drawn
 * from a table rather than a font so it stays on the pixel grid at any zoom.
 */
const EXIT_LETTERS: readonly (readonly string[])[] = [
  ["###", "#..", "##.", "#..", "###"], // E
  ["#.#", "#.#", ".#.", "#.#", "#.#"], // X
  ["###", ".#.", ".#.", ".#.", "###"], // I
  ["###", ".#.", ".#.", ".#.", ".#."], // T
];

function drawExitWord(
  draw: (x: number, y: number, w: number, h: number, color: string) => void,
  originX: number,
  originY: number,
  color: string,
) {
  EXIT_LETTERS.forEach((glyph, letterIndex) => {
    const letterX = originX + letterIndex * 4;
    glyph.forEach((row, rowIndex) => {
      for (let column = 0; column < row.length; column += 1) {
        if (row[column] === "#") {
          draw(letterX + column, originY + rowIndex, 1, 1, color);
        }
      }
    });
  });
}

export const WORLD_EXIT_ART_SIZE = { width: ART_WIDTH, height: ART_HEIGHT } as const;

export const worldExitArt: BuildingArt = {
  size: WORLD_EXIT_ART_SIZE,
  draw: (draw, frame) => {
    // Two posts, standing on the ground line at the bottom of the grid.
    draw(1, 6, 3, ART_HEIGHT - 6, palette.brown2);
    draw(1, 6, 1, ART_HEIGHT - 6, palette.brown);
    draw(16, 6, 3, ART_HEIGHT - 6, palette.brown2);
    draw(16, 6, 1, ART_HEIGHT - 6, palette.brown);

    // The crossbeam, and the shadow line under it that gives it thickness.
    draw(0, 3, ART_WIDTH, 3, palette.brown2);
    draw(0, 6, ART_WIDTH, 1, palette.brown3);

    // The sign board hung from the beam.
    draw(3, 7, 14, 9, palette.paper);
    draw(3, 7, 14, 1, palette.stone);
    draw(3, 15, 14, 1, palette.brown3);
    drawExitWord(draw, 4, 9, palette.char);

    // An arrow under the word, pointing off the right-hand edge of the map.
    draw(7, 18, 6, 1, palette.brown3);
    draw(12, 17, 1, 1, palette.brown3);
    draw(12, 19, 1, 1, palette.brown3);

    // A lantern on the left post, breathing on the ambient tick like the
    // world's other lights. The only motion the gate has.
    draw(0, 8, 2, 3, palette.char);
    draw(0, 9, 2, 1, frame % 4 === 0 ? palette.warm : palette.orange);
  },
};
