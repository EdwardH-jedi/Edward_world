import { DIRT_START_X, getGroundY, PIXEL_UNIT } from "@/lib/game/terrain";
import { palette } from "@/lib/pixel/palette";
import type { ArtRoutine, Raster } from "@/lib/pixel/raster";
import { dashes, hills, lamp, scatter, smoke, tree } from "@/lib/pixel/raster";

/**
 * The world backdrop: sky, land, water, path and the connective props that turn
 * a line of buildings into a place.
 *
 * Drawn as one full-width layer beneath the building canvases. Everything here
 * is scenery — nothing in this file is interactive, and the interactive objects
 * are positioned over it by `data/world.ts`.
 */

/** World size in art pixels. Mirrors `WORLD_CONFIG` divided by the pixel unit. */
export const BACKDROP_ART_SIZE = { width: 960, height: 138 } as const;

const DIRT_START_ART_X = DIRT_START_X / PIXEL_UNIT;

/** Ground line in art pixels at an art-pixel x. */
function groundArtY(artX: number) {
  return getGroundY(artX * PIXEL_UNIT) / PIXEL_UNIT;
}

const { width: W, height: H } = BACKDROP_ART_SIZE;

function sky(draw: Raster, frame: number) {
  draw(0, 0, W, 54, palette.sky);
  draw(0, 54, W, 18, "#E4D9BF");
  draw(0, 72, W, H - 72, palette.sky2);

  // Clouds drift; the world is wide, so they wrap rather than pile up.
  const clouds = [
    [40, 14, 16],
    [170, 30, 11],
    [250, 21, 16],
    [370, 9, 12],
    [470, 26, 16],
    [560, 16, 10],
    [640, 34, 16],
    [750, 12, 13],
    [830, 24, 16],
    [910, 38, 11],
  ] as const;
  for (const [startX, y, width] of clouds) {
    // Higher cloud banks drift a little slower, which reads as depth.
    const drift = y < 20 ? frame >> 2 : frame >> 1;
    const x = ((startX + drift) % (W + 40)) - 20;
    draw(x, y, width, 3, "#F2EAD6");
    draw(x + 3, y - 2, Math.max(5, width - 7), 2, "#F2EAD6");
  }

  // A loose skein of birds crossing, spread across the width.
  const birds = [
    [0, 34],
    [330, 41],
    [346, 38],
    [700, 27],
  ] as const;
  for (const [offset, y] of birds) {
    const x = ((frame * 3 + offset) % (W + 40)) - 20;
    draw(x, y + (frame % 2), 2, 1, palette.brown3);
    draw(x + 3, y - 1 + (frame % 2), 2, 1, palette.brown3);
  }
}

function distantLand(draw: Raster) {
  hills(
    draw,
    [
      [0, 84],
      [120, 76],
      [260, 83],
      [420, 74],
      [580, 82],
      [740, 77],
      [880, 84],
      [960, 80],
    ],
    palette.farHill,
    100,
  );
  hills(
    draw,
    [
      [0, 90],
      [160, 85],
      [360, 91],
      [600, 84],
      [840, 91],
      [960, 88],
    ],
    palette.midHill,
    100,
  );

  // Treeline sitting behind the town, broken so it never reads as a wall.
  for (let x = 236; x < 720; x += 7) {
    if (x > 400 && x < 520) continue;
    const height = 5 + (scatter(x) % 4);
    draw(x, 99 - height, 7, height, palette.treeline);
  }
}

function terrain(draw: Raster) {
  for (let x = 0; x < W; x += 1) {
    const ground = groundArtY(x);
    // A dithered band lets the grass die back towards the construction fence.
    const intoDirt = x - (DIRT_START_ART_X - 26);
    const isDirt =
      intoDirt > 0 && (intoDirt >= 26 || scatter(x) % 26 < intoDirt);
    draw(x, ground, 1, 1, isDirt ? palette.dirt : palette.green);
    draw(x, ground + 1, 1, 3, isDirt ? palette.brown2 : palette.green2);
    // Three strata rather than one slab, so the cutaway reads as ground.
    draw(x, ground + 4, 1, 6, palette.soil);
    draw(x, ground + 10, 1, 12, palette.soilDark);
    draw(x, ground + 22, 1, H - ground - 22, "#4E3F33");

    // Buried stones and grass tufts, deterministic so the land never shimmers.
    const noise = scatter(x);
    if (noise % 17 < 2) {
      draw(x, ground + 6 + (noise % 4), 1, 1, "#7A6252");
    }
    if (noise % 29 < 3) {
      draw(x, ground + 12 + (noise % 8), 2, 1, palette.soil);
    }
    if (noise % 41 < 2) {
      draw(x, ground + 24 + (noise % 10), 2, 1, palette.soilDark);
    }
    if (!isDirt && noise % 23 === 0) {
      draw(x, ground - 1, 1, 1, palette.green3);
    }
  }
  draw(0, H - 3, W, 3, "#40332A");
}

/** Stream and footbridge, in the gap between SportsGang and the AFL Lab. */
const STREAM = { left: 512, right: 538 } as const;

function stonePath(draw: Raster) {
  for (let x = 14; x < DIRT_START_ART_X + 26; x += 1) {
    if (x >= STREAM.left - 7 && x <= STREAM.right + 7) continue;
    const ground = groundArtY(x);
    const noise = scatter(x);
    draw(x, ground, 1, 2, noise % 23 < 7 ? palette.stone2 : palette.stone);
    draw(x, ground + 2, 1, 1, noise % 11 < 4 ? palette.stone3 : palette.stone2);
  }
}

function stream(draw: Raster, frame: number) {
  const ground = groundArtY(STREAM.left);
  const width = STREAM.right - STREAM.left;
  const depth = 15;

  // Cut banks, then water to a fixed depth — soil continues underneath, so the
  // stream reads as a channel through the land rather than a wall of blue.
  draw(STREAM.left - 2, ground, 2, depth + 2, palette.brown3);
  draw(STREAM.right, ground, 2, depth + 2, palette.brown3);
  draw(STREAM.left, ground, width, depth, palette.blue3);
  draw(STREAM.left, ground, width, 2, palette.blue2);
  draw(STREAM.left, ground + depth, width, 2, "#3E5560");

  // Stone lip where the bank meets the grass.
  draw(STREAM.left - 4, ground - 1, 4, 2, palette.stone2);
  draw(STREAM.right + 1, ground - 1, 4, 2, palette.stone2);

  // Flat highlights drifting downstream, not diagonal scratches.
  for (let index = 0; index < 5; index += 1) {
    const x = STREAM.left + 2 + ((index * 7 + frame * 2) % (width - 6));
    draw(x, ground + 3 + index * 2, 4, 1, palette.blue);
  }

  // Footbridge: a deck wide enough to carry the path, with rails and posts.
  const deckY = ground - 3;
  draw(STREAM.left - 7, deckY, width + 14, 1, palette.brown);
  draw(STREAM.left - 7, deckY + 1, width + 14, 2, palette.brown2);
  for (let x = STREAM.left - 6; x < STREAM.right + 7; x += 4) {
    draw(x, deckY + 1, 1, 2, palette.brown3);
  }
  draw(STREAM.left - 7, deckY - 5, width + 14, 1, palette.brown2);
  for (const x of [STREAM.left - 6, STREAM.left + 4, STREAM.right - 5, STREAM.right + 5]) {
    draw(x, deckY - 5, 1, 5, palette.brown3);
  }
  draw(STREAM.left - 2, deckY + 3, 2, 5, palette.brown3);
  draw(STREAM.right, deckY + 3, 2, 5, palette.brown3);
}

/** The backyard oval behind the AFL Lab, with its four posts. */
function aflOval(draw: Raster) {
  const ground = groundArtY(660);
  draw(630, ground, 80, 3, palette.turf);
  for (let x = 634; x < 706; x += 6) draw(x, ground, 2, 1, palette.cream);
  const posts = [
    [648, 9],
    [656, 14],
    [664, 14],
    [672, 9],
  ] as const;
  for (const [x, height] of posts) {
    draw(x, ground - height, 1, height, palette.glow);
    draw(x + 1, ground - height, 1, 1, palette.brown3);
  }
}

/**
 * The town cluster between Wardrobe and SportsGang: lamps with a sagging cable,
 * a notice board, a bench and a small fountain. This stretch carries no
 * interaction — it exists so the walk between projects feels inhabited.
 */
function townCluster(draw: Raster, frame: number) {
  const ground = groundArtY(360);
  lamp(draw, 334, ground);
  lamp(draw, 398, ground);
  for (let x = 336; x <= 398; x += 2) {
    const t = (x - 336) / 62;
    draw(x, ground - 17 + Math.round(14 * t * (1 - t)), 1, 1, palette.char);
  }

  // Notice board.
  draw(348, 88, 1, 12, palette.brown3);
  draw(356, 88, 1, 12, palette.brown3);
  draw(345, 80, 15, 8, palette.paper);
  draw(345, 80, 15, 1, palette.brown3);
  dashes(draw, 347, 82, 11, palette.ink);
  dashes(draw, 347, 85, 8, palette.ink);

  // Bench.
  draw(364, 96, 12, 1, palette.brown);
  draw(364, 97, 12, 1, palette.brown2);
  draw(365, 98, 1, 2, palette.brown3);
  draw(374, 98, 1, 2, palette.brown3);

  // Fountain, with the water catching the light on alternating frames.
  draw(382, 94, 12, 6, palette.stone2);
  draw(382, 94, 12, 1, palette.stone);
  draw(384, 96, 8, 2, palette.blue2);
  draw(386 + (frame % 2), 95, 1, 1, palette.blue);
  draw(388, 92, 1, 3, palette.blue3);
}

/** Trees, kept out of the building footprints and off the bare dirt. */
const TREES: readonly (readonly [number, 0 | 1 | 2])[] = [
  [4, 2],
  [70, 1],
  [156, 1],
  [186, 2],
  [196, 1],
  [214, 0],
  [228, 1],
  [238, 1],
  [332, 0],
  [404, 1],
  [542, 1],
  [626, 1],
  [714, 2],
  [806, 1],
];

function foliage(draw: Raster, frame: number) {
  for (const [x, size] of TREES) {
    tree(draw, x, groundArtY(x + 4), size, frame);
  }
}

/**
 * Motes drifting through the open air.
 *
 * Deterministic by construction: each mote's lane and phase come from
 * `scatter`, so the same frame always paints the same sky and nothing
 * shimmers between redraws. Placement is derived rather than authored
 * because the world is 960 art pixels wide and hand-placing dust across it
 * would be neither maintainable nor evenly spread.
 *
 * Drift is a whole number of art pixels per ambient tick — at this scale a
 * sub-pixel rate would round to a stutter. Under reduced motion the shared
 * frame counter stops advancing, so these settle into a fixed constellation
 * rather than freezing mid-drift.
 */
const MOTE_COUNT = 26;

function motes(draw: Raster, frame: number) {
  const width = BACKDROP_ART_SIZE.width;

  for (let i = 0; i < MOTE_COUNT; i += 1) {
    const noise = scatter(i * 61 + 7);
    // Kept above the rooflines and below the top edge, so motes read as air
    // rather than as specks on the buildings.
    const y = 12 + (noise % 22);
    const speed = 1 + (noise % 3);
    const x = (noise * 7 + frame * speed) % width;

    // Two thirds sit back in the haze; the rest catch a little more light.
    draw(x, y, 1, 1, noise % 3 === 0 ? palette.cream : palette.sky2);
  }
}

/** Chimney smoke, drawn here so it can rise into open sky above the roofline. */
function houseSmoke(draw: Raster, frame: number) {
  smoke(draw, 133, 31, frame);
}

export const drawBackdrop: ArtRoutine = (draw, frame) => {
  sky(draw, frame);
  distantLand(draw);
  terrain(draw);
  stonePath(draw);
  stream(draw, frame);
  aflOval(draw);
  townCluster(draw, frame);
  foliage(draw, frame);
  houseSmoke(draw, frame);
  motes(draw, frame);
};
