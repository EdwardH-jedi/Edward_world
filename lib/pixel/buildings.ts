import { palette } from "@/lib/pixel/palette";
import type { ArtRoutine, Raster } from "@/lib/pixel/raster";
import {
  dashes,
  digit,
  roofPitch,
  sprite,
  wheel,
  windowPane,
} from "@/lib/pixel/raster";
import type { WorldBuildingId } from "@/types/portfolio";

/**
 * Building art, one routine per world structure.
 *
 * Every routine draws in its own local art-pixel space with the ground line at
 * the bottom edge, on a transparent background — the sky and land come from the
 * backdrop layer underneath. Detail level is taken from the concept board's
 * 96x72 location cards rather than its compressed world strip, because at 4x
 * these structures occupy far more screen than they did on the board.
 *
 * The approved building language, applied to all of them:
 *   - a charcoal sign band of dashes, never readable text at world scale
 *   - exactly one warm window per building
 *   - one identity prop at the door
 *   - a 2px stone plinth grounding every facade
 */

export interface BuildingArt {
  readonly size: { readonly width: number; readonly height: number };
  readonly draw: ArtRoutine;
}

/** The 2px stone plinth every facade stands on. */
function plinth(draw: Raster, x: number, width: number, groundY: number) {
  draw(x, groundY - 2, width, 2, palette.stone2);
}

const SMALL_PLAYER = [
  "..hhhh..",
  "..ffff..",
  ".tttttt.",
  ".tttttt.",
  "f.tttt.f",
  ".tttttt.",
  "..pppp..",
  "..p..p..",
  "..p..p..",
  "..s..s..",
];

function courtPlayer(draw: Raster, x: number, y: number, shirt: string) {
  sprite(draw, x, y, SMALL_PLAYER, {
    h: palette.hair,
    f: palette.skin,
    t: shirt,
    p: palette.denim,
    s: palette.hair,
  });
}

/** ABOUT · PERSONAL — the only building with a pitched domestic roof. */
const edwardsHouse: ArtRoutine = (draw, frame) => {
  const groundY = 50;
  plinth(draw, 9, 50, groundY);

  draw(11, 19, 46, 31, palette.brown3);
  draw(12, 20, 44, 29, palette.paper);
  draw(12, 20, 44, 1, palette.stone);

  roofPitch(draw, 6, 7, 56, 12, palette.brown3);
  draw(9, 18, 50, 1, "#6B5A4A");

  draw(47, 1, 5, 8, palette.brown2);
  draw(46, 0, 7, 2, palette.brown3);

  // The one warm window, with the desk computer glowing through it.
  windowPane(draw, 18, 26, 12, 10, palette.warm);
  draw(18, 33, 12, 1, palette.brown3);
  draw(22, 28, 4, 3, palette.blue2);
  draw(23, 29, 2, 1, frame % 2 ? palette.blue : palette.blue2);

  draw(34, 32, 9, 18, palette.brown3);
  draw(41, 41, 1, 1, palette.orange);

  // Identity props: runners by the door, a jangdok jar, the mailbox.
  draw(45, 46, 4, 2, palette.glow);
  draw(45, 46, 1, 2, palette.orange);
  draw(50, 43, 7, 7, palette.brown2);
  draw(51, 42, 5, 1, palette.brown2);
  draw(52, 41, 3, 1, palette.brown3);
  draw(62, 39, 1, 11, palette.brown3);
  draw(59, 35, 7, 5, palette.orange);
  draw(65, 33, 1, 3, palette.orange2);

  wheel(draw, 1, 41, 7, palette.char);
  wheel(draw, 10, 41, 7, palette.char);
  draw(4, 40, 8, 1, palette.char);
  draw(7, 37, 1, 3, palette.char);
  draw(3, 37, 3, 1, palette.char);

  draw(30, 46, 3, 3, palette.orange2);
  draw(30, 44, 3, 2, palette.green3);
};

/** LOCAL ARCHIVE — restrained charcoal signage, rack and mannequin behind glass. */
const wardrobe: ArtRoutine = (draw) => {
  const groundY = 44;
  plinth(draw, 1, 74, groundY);

  draw(2, 8, 72, 36, palette.brown3);
  draw(3, 9, 70, 34, palette.paper);
  draw(3, 9, 70, 1, palette.stone);

  draw(2, 1, 72, 7, palette.char);
  dashes(draw, 8, 4, 48, palette.cream);
  draw(64, 3, 4, 4, palette.cream);
  draw(65, 4, 2, 2, palette.char);

  for (let index = 0; index < 14; index += 1) {
    draw(5 + index * 5, 14, 4, 3, index % 2 ? palette.stone : palette.cream);
  }
  draw(5, 17, 68, 1, "#B5AB92");

  windowPane(draw, 7, 21, 40, 21, "#DED7C2");
  draw(10, 26, 30, 1, palette.brown3);
  const garments = [
    [12, palette.orange],
    [20, palette.blue2],
    [28, palette.green3],
    [36, palette.cream],
  ] as const;
  for (const [x, colour] of garments) {
    draw(x, 27, 5, 7, colour);
    draw(x + 2, 26, 1, 1, palette.brown3);
    if (colour === palette.cream) {
      draw(x, 27, 5, 1, palette.stone2);
      draw(x, 33, 5, 1, palette.stone2);
    }
  }

  draw(42, 23, 3, 3, palette.cream);
  draw(41, 26, 5, 9, palette.cream);
  draw(43, 35, 1, 6, palette.brown3);
  draw(41, 41, 5, 1, palette.brown3);

  draw(53, 22, 10, 22, palette.char);
  draw(54, 23, 8, 8, "#4A4438");
  draw(61, 35, 1, 1, palette.orange);

  // Archive boxes stacked at the door.
  const boxes = [
    [66, 38, 8, 4],
    [67, 33, 7, 4],
    [68, 29, 6, 3],
  ] as const;
  for (const [x, y, width, height] of boxes) {
    draw(x, y, width, height, palette.brown);
    draw(x, y, width, 1, palette.brown2);
    draw(x + 2, y + 1, 3, 1, palette.paper);
  }
};

/** PEER COMPETITION — an open community court, caught mid-match at 3–2. */
const sportsgang: ArtRoutine = (draw, frame) => {
  draw(4, 40, 84, 4, "#A97F52");
  draw(45, 40, 2, 4, palette.cream);
  draw(8, 40, 1, 4, palette.cream);
  draw(83, 40, 1, 4, palette.cream);

  for (let x = 4; x <= 88; x += 8) draw(x, 22, 1, 18, palette.brown2);
  draw(4, 24, 84, 1, palette.brown2);
  draw(4, 31, 84, 1, palette.brown2);

  draw(11, 17, 2, 7, palette.char);
  draw(19, 17, 2, 7, palette.char);
  draw(6, 3, 20, 14, palette.char);
  draw(7, 4, 18, 12, "#37332B");
  digit(draw, 10, 7, "3", palette.cream);
  draw(15, 9, 1, 1, palette.stone3);
  digit(draw, 18, 7, "2", palette.orange);
  dashes(draw, 9, 14, 14, palette.stone3);

  courtPlayer(draw, 32, 30, palette.orange2);
  courtPlayer(draw, 58, 30, palette.blue2);

  // The ball arcs between them on the ambient tick.
  const ballY = 26 + (frame % 3 === 1 ? 2 : 0);
  draw(47, ballY, 3, 3, palette.orange);
  draw(46, ballY + 2, 1, 1, "#DBA06B");

  draw(72, 24, 1, 20, palette.brown3);
  draw(82, 24, 1, 20, palette.brown3);
  draw(69, 12, 17, 12, palette.paper);
  draw(69, 12, 17, 1, palette.brown3);
  const notes = [
    [71, 15, palette.cream],
    [76, 15, palette.orange],
    [81, 15, palette.cream],
    [73, 19, palette.cream],
    [78, 19, palette.blue2],
  ] as const;
  for (const [x, y, colour] of notes) {
    draw(x, y, 3, 3, colour);
    draw(x + 1, y, 1, 1, palette.ink);
  }

  draw(90, 22, 1, 22, palette.char);
  draw(86, 22, 4, 3, palette.orange);
};

/** FORECASTING — a working shed bristling with antennas. No metrics on show. */
const aflLab: ArtRoutine = (draw, frame) => {
  const groundY = 48;
  plinth(draw, 6, 60, groundY);

  draw(6, 14, 60, 4, palette.brown3);
  draw(8, 18, 56, 30, palette.stone2);
  draw(8, 18, 56, 1, palette.stone);

  draw(18, 2, 1, 16, palette.char);
  draw(15, 4, 7, 1, palette.char);
  draw(16, 8, 5, 1, palette.char);
  draw(17, 12, 3, 1, palette.char);
  draw(18, 1, 1, 1, frame % 2 ? palette.orange : palette.stone3);

  draw(38, 7, 1, 11, palette.char);
  draw(36, 9, 5, 1, palette.char);

  draw(48, 10, 7, 4, palette.stone);
  draw(51, 14, 1, 4, palette.char);
  draw(49, 9, 5, 1, palette.cream);

  // Three CRTs flicker in rotation.
  const screens = [12, 26, 40] as const;
  screens.forEach((x, index) => {
    windowPane(draw, x, 24, 8, 7, palette.blue2);
    if (frame % 3 === index) {
      draw(x + 1, 25, 6, 1, palette.blue);
      draw(x + 1, 28, 6, 1, "#7E97A1");
    }
  });

  // The one warm window: the desk lamp still on inside.
  draw(26, 34, 6, 5, palette.warm);
  draw(25, 33, 8, 1, palette.brown3);

  draw(52, 30, 8, 18, palette.char);
  draw(58, 39, 1, 1, palette.orange);

  draw(68, 22, 1, 26, palette.char);
  draw(64, 16, 6, 6, palette.paper);
  draw(64, 16, 6, 1, palette.brown3);
  dashes(draw, 65, 18, 4, palette.ink);
};

/** PLAYABLE EXPERIMENT — the loudest colour in the world, and still muted. */
const arcade: ArtRoutine = (draw, frame) => {
  const groundY = 46;
  plinth(draw, 4, 68, groundY);

  draw(6, 16, 64, 30, "#37332B");
  draw(6, 16, 64, 1, "#4A4438");

  draw(2, 6, 72, 10, palette.orange);
  draw(2, 6, 72, 1, "#DBA06B");
  draw(2, 15, 72, 1, palette.orange2);
  dashes(draw, 8, 9, 60, palette.ink);
  dashes(draw, 14, 12, 48, palette.ink);

  // Marquee bulbs chase along the underside.
  for (let index = 0; index < 17; index += 1) {
    draw(
      4 + index * 4,
      17,
      1,
      1,
      (index + frame) % 2 ? palette.warm : palette.orange2,
    );
  }

  windowPane(draw, 12, 24, 18, 18, palette.warm);
  draw(15, 27, 11, 14, palette.char);
  const screenColours = [palette.blue2, palette.orange, palette.green3] as const;
  draw(16, 28, 8, 6, screenColours[frame % 3]);
  draw(18, 30, 3, 1, palette.cream);
  draw(18, 36, 2, 1, palette.orange);
  draw(22, 36, 2, 1, palette.cream);

  draw(38, 24, 14, 22, "#14110D");
  draw(38, 24, 1, 22, "#6B5A3C");
  draw(51, 24, 1, 22, "#6B5A3C");
  draw(41, 30, 7, 10, "#26221D");
  draw(42, 31, 5, 4, frame % 2 ? palette.blue3 : "#3A4A52");

  // Pennant string over the frontage.
  for (let index = 0; index < 6; index += 1) {
    const x = 56 + index * 3;
    draw(x, 20, 3, 3, index % 2 ? palette.orange : palette.cream);
    draw(x + 1, 23, 1, 1, palette.char);
  }

  // A-frame sign at the door.
  draw(58, 36, 1, 10, palette.brown3);
  draw(64, 36, 1, 10, palette.brown3);
  draw(56, 28, 12, 8, palette.cream);
  draw(56, 28, 12, 1, palette.brown3);
  dashes(draw, 58, 31, 8, palette.orange2);
  dashes(draw, 58, 33, 6, palette.ink);
};

/** The path runs out here. Deliberately unfinished, deliberately honest. */
const constructionArea: ArtRoutine = (draw, frame) => {
  const groundY = 38;

  // Scaffold frame.
  draw(20, 4, 1, 34, palette.brown3);
  draw(34, 4, 1, 34, palette.brown3);
  draw(48, 4, 1, 34, palette.brown3);
  draw(20, 10, 29, 1, palette.brown3);
  draw(20, 22, 29, 1, palette.brown3);
  draw(20, 9, 29, 1, palette.brown);
  draw(20, 21, 29, 1, palette.brown);

  // A first wall going up behind it.
  draw(24, 26, 21, 12, palette.paper);
  draw(24, 26, 8, 1, palette.dirt);
  draw(37, 26, 4, 1, palette.dirt);
  draw(24, 36, 21, 2, palette.stone2);

  // Hazard barrier.
  for (let x = 56; x < 80; x += 3) draw(x, 28, 2, 8, palette.stone);
  draw(56, 29, 24, 1, palette.stone3);
  draw(56, 34, 24, 1, palette.stone3);
  draw(60, 24, 10, 3, palette.orange);
  draw(61, 24, 2, 3, palette.cream);
  draw(66, 24, 2, 3, palette.cream);

  // Notice on a post, with the one warm lamp clipped to it.
  draw(11, 22, 1, 16, palette.brown3);
  draw(4, 12, 14, 10, palette.cream);
  draw(4, 12, 14, 1, palette.brown3);
  dashes(draw, 6, 15, 10, palette.ink);
  dashes(draw, 6, 18, 8, palette.ink);
  draw(4, 20, 14, 2, palette.orange);
  draw(17, 10, 2, 2, frame % 3 === 0 ? palette.warm : palette.orange2);

  // Spoil heap and a stray pebble or two.
  draw(50, 34, 5, 4, palette.dirt);
  draw(51, 33, 3, 1, palette.dirt);
  draw(81, 36, 2, 2, palette.stone);
  draw(0, 37, 2, 1, palette.stone2);
  void groundY;
};

/** The directions post by the start of the path. */
export const signpostArt: BuildingArt = {
  size: { width: 11, height: 15 },
  draw: (draw) => {
    draw(5, 5, 1, 10, palette.brown3);
    draw(0, 0, 11, 6, palette.paper);
    draw(0, 0, 11, 1, palette.brown3);
    draw(0, 5, 11, 1, palette.brown3);
    dashes(draw, 2, 2, 7, palette.ink);
    draw(2, 4, 5, 1, palette.stone3);
    draw(3, 14, 5, 1, palette.green3);
  },
};

export const buildingArt: Readonly<Record<WorldBuildingId, BuildingArt>> = {
  "edwards-house": { size: { width: 68, height: 50 }, draw: edwardsHouse },
  wardrobe: { size: { width: 76, height: 44 }, draw: wardrobe },
  sportsgang: { size: { width: 92, height: 44 }, draw: sportsgang },
  "afl-lab": { size: { width: 72, height: 48 }, draw: aflLab },
  arcade: { size: { width: 76, height: 46 }, draw: arcade },
  "construction-area": { size: { width: 84, height: 38 }, draw: constructionArea },
};
