import { getGroundY, PIXEL_UNIT, TIMELINE_STREET } from "@/lib/game/terrain";
import { drawBird, drawClouds } from "@/lib/pixel/ambient";
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

/**
 * The two scenery layers behind the near backdrop, and the share of the
 * camera's travel each one follows. The far layer carries the sky, the city
 * across the water and the far hills; the mid layer the nearer hills and the
 * treeline. Both end at the town ground line, below which the near terrain is
 * opaque, so they are never drawn taller than that.
 */
export const BACKDROP_LAYERS = { far: 0.25, mid: 0.5 } as const;
export const BACKDROP_LAYER_HEIGHT = 100;

/**
 * Art columns a parallax layer needs for a viewport that many columns wide.
 * The layer scrolls `factor` of the camera, and the camera travels at most
 * the world's width minus the viewport's, so a narrower viewport needs less
 * of the layer — which keeps the far canvas a fraction of the world's size.
 */
export function backdropLayerWidth(factor: number, viewportArtWidth: number) {
  const { width } = BACKDROP_ART_SIZE;
  const visible = Math.min(width, Math.max(1, viewportArtWidth));
  return Math.min(width, Math.ceil(visible + (width - visible) * factor));
}

/** Ground line in art pixels at an art-pixel x. */
function groundArtY(artX: number) {
  return getGroundY(artX * PIXEL_UNIT) / PIXEL_UNIT;
}

const { width: W, height: H } = BACKDROP_ART_SIZE;

function sky(draw: Raster, frame: number, width: number) {
  draw(0, 0, width, 54, palette.sky);
  draw(0, 54, width, 18, "#E4D9BF");
  draw(0, 72, width, BACKDROP_LAYER_HEIGHT - 72, palette.sky2);

  drawClouds(draw, frame, width);
  drawBird(draw, frame, width);
}

/**
 * The city across the water, low on the horizon and a shade off the sky, so
 * it reads as Sydney a long way off rather than as more town. `[x, width,
 * height]` blocks on a shared base line; the far hills are drawn over their
 * feet, which is what puts them behind the hills.
 *
 * The far layer follows a quarter of the camera, so only its first ~380
 * columns are ever on screen (`backdropLayerWidth`): everything here sits in
 * that span, with the main cluster coming into view as the town does.
 */
const CITY_BASE = 84;
const CITY_BLOCKS: readonly (readonly [number, number, number])[] = [
  [142, 6, 9],
  [149, 5, 14],
  [155, 7, 11],
  [163, 4, 17],
  [168, 6, 10],
  [175, 8, 13],
  [184, 5, 8],
  [190, 6, 12],
  [197, 4, 19],
  [202, 7, 9],
  [210, 5, 11],
  [216, 6, 7],
  // A second, smaller cluster further round the harbour.
  [330, 5, 8],
  [336, 4, 11],
  [341, 6, 7],
  [348, 5, 10],
  [354, 4, 6],
];

function distantCity(draw: Raster) {
  for (const [x, width, height] of CITY_BLOCKS) {
    draw(x, CITY_BASE - height, width, height, palette.stone);
  }
  // Sydney Tower: a needle with its turret, the one silhouette that names the city.
  draw(232, CITY_BASE - 24, 1, 24, palette.stone2);
  draw(230, CITY_BASE - 18, 5, 3, palette.stone2);
  // The bridge arch, out over the water between the two clusters.
  const arch = { left: 258, right: 314, deck: CITY_BASE - 1, rise: 8 } as const;
  draw(arch.left, arch.deck, arch.right - arch.left, 1, palette.stone2);
  for (let x = arch.left; x <= arch.right; x += 1) {
    const t = (x - arch.left) / (arch.right - arch.left);
    draw(x, Math.round(arch.deck - 1 - arch.rise * 4 * t * (1 - t)), 1, 1, palette.stone2);
  }
  draw(arch.left - 1, arch.deck - 4, 2, 5, palette.stone2);
  draw(arch.right, arch.deck - 4, 2, 5, palette.stone2);
}

function farHills(draw: Raster) {
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
    BACKDROP_LAYER_HEIGHT,
  );
}

function midHills(draw: Raster) {
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
    BACKDROP_LAYER_HEIGHT,
  );

  // Treeline sitting behind the town, broken so it never reads as a wall.
  for (let x = 236; x < 720; x += 7) {
    if (x > 400 && x < 520) continue;
    const height = 5 + (scatter(x) % 4);
    draw(x, 99 - height, 7, height, palette.treeline);
  }
}

/**
 * The far layer, for a canvas `width` columns wide: sky, clouds, the bird, the
 * city across the water and the far hills. Follows a quarter of the camera.
 */
export function drawBackdropFar(width: number): ArtRoutine {
  return (draw, frame) => {
    sky(draw, frame, width);
    distantCity(draw);
    farHills(draw);
  };
}

/** The mid layer: the nearer hills and the treeline. Follows half the camera. */
export const drawBackdropMid: ArtRoutine = (draw) => {
  midHills(draw);
};

function terrain(draw: Raster) {
  for (let x = 0; x < W; x += 1) {
    const ground = groundArtY(x);
    // Grass all the way to the exit: the timeline street is town, not a site.
    draw(x, ground, 1, 1, palette.green);
    draw(x, ground + 1, 1, 3, palette.green2);
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
    if (noise % 23 === 0) {
      draw(x, ground - 1, 1, 1, palette.green3);
    }
  }
  draw(0, H - 3, W, 3, "#40332A");
}

/** Stream and footbridge, in the gap between SportsGang and the AFL Lab. */
const STREAM = { left: 512, right: 538 } as const;

/** The stone path runs from the hill to the world's edge, out through the gate. */
function stonePath(draw: Raster) {
  for (let x = 14; x < W; x += 1) {
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
  lamp(draw, 334, ground, 18, frame);
  lamp(draw, 398, ground, 18, frame);
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

/**
 * The timeline street's low wall, which is what makes four separate plaques
 * read as one street: a dry-stone run behind the stations from just past the
 * Arcade to just short of the exit gate, with a pier at each end.
 *
 * Four rows tall, so it stops below every plaque and the plaques' accent rails
 * only ever stand against open sky. Scenery, so it is stone throughout and
 * spends no accent.
 */
const STREET_WALL = {
  left: TIMELINE_STREET.startX / PIXEL_UNIT - 6,
  right: TIMELINE_STREET.endX / PIXEL_UNIT + 6,
  height: 4,
} as const;

function timelineStreet(draw: Raster) {
  const { left, right, height } = STREET_WALL;
  const ground = groundArtY(left);
  const top = ground - height;
  draw(left, top + 1, right - left, height - 1, palette.stone2);
  draw(left, top, right - left, 1, palette.stone);
  // Running bond: the joints of one course sit over the middle of the stones below.
  for (let x = left + 2; x < right - 2; x += 1) {
    if ((x - left) % 6 === 0) draw(x, top + 1, 1, 1, palette.stone3);
    if ((x - left) % 6 === 3) draw(x, top + 3, 1, 1, palette.stone3);
    // A few weathered faces in the middle course, placed by `scatter`.
    if (scatter(x * 3 + 1) % 9 === 0) draw(x, top + 2, 1, 1, palette.stone3);
  }
  // End piers, two stones taller than the run, each with a cap.
  for (const x of [left - 2, right]) {
    draw(x, top - 2, 2, height + 2, palette.stone2);
    draw(x, top - 2, 2, 1, palette.stone);
    draw(x + 1, top - 1, 1, height + 1, palette.stone3);
  }
}

/** Trees, kept out of the building footprints and clear of the street wall. */
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
  // None past the Arcade: the street wall's left pier is what marks the
  // timeline street's start, and a crown over it would hide the pier.
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

/**
 * The near layer, in world space: everything from the ground line down, plus
 * the props that stand on it. Transparent above the ground, where the mid and
 * far layers show through.
 */
export const drawBackdrop: ArtRoutine = (draw, frame) => {
  terrain(draw);
  stonePath(draw);
  timelineStreet(draw);
  stream(draw, frame);
  aflOval(draw);
  townCluster(draw, frame);
  foliage(draw, frame);
  houseSmoke(draw, frame);
  motes(draw, frame);
};
