import { palette } from "@/lib/pixel/palette";
import type { ArtRect, Raster } from "@/lib/pixel/raster";
import { clipRaster, dashes, digit, scatter, sprite } from "@/lib/pixel/raster";

/**
 * The inside of Edward's House, as one pixel-art room.
 *
 * The other buildings say what Edward builds; this one says who he is when he
 * is not building anything, and it says it by being walked around. It is his
 * actual bedroom, simplified until every object is a silhouette: the mint
 * wall, the warm boards, the city windows, the glass cabinet and the black
 * open shelving on the collection side, the tall bookshelf, the dark desk and
 * the gaming chair, the bed under the far window. Not every real object is
 * here — the ones that carry a fact about him are.
 *
 * Seven of the things in here answer a question when you look at them; the
 * rest are just the room, and the room is meant to be the interesting part.
 *
 * Every routine draws in absolute room coordinates on the one grid below, and
 * only ever with colours from `palette.ts`. The only readable glyphs in the
 * whole room are the two on the football shirt — a squad number is a scoreboard
 * digit, which the world already draws. Everything else that looks like writing
 * is a dash run, and the real labels are DOM chips over the canvas.
 */

/**
 * The ceiling, and the room hanging under it.
 *
 * Everything below is authored in *room* space, measured from the top of the
 * wall — the ceiling is drawn separately and the room is stamped underneath
 * it, so the whole interior can be given more headroom without every piece of
 * furniture in the file needing a new y.
 */
const CEILING_H = 14;
const ROOM_H = 90;

/**
 * The room, in art pixels.
 *
 * Wider than a single wall of furniture, because the room has to hold four
 * zones — collection, bookshelf, desk, bed — and a bedroom that reads as one
 * dense wall reads as a shop window. At this width the room still renders at
 * roughly the world's own four-CSS-pixels-per-art-pixel density on a laptop.
 */
export const HOUSE_ART_SIZE = {
  width: 328,
  height: CEILING_H + ROOM_H,
} as const;

const { width: W } = HOUSE_ART_SIZE;

/** Skirting board, and the wall/floor junction the furniture stands on. */
const SKIRTING_Y = 62;
/** In room space. `HOUSE_FLOOR_Y` below is in art space, for the DOM to use. */
const FLOOR_Y = 66;
export const HOUSE_FLOOR_Y = CEILING_H + FLOOR_Y;
/**
 * Where Edward's feet go — a little in front of the furniture line, so he
 * passes between the room and the viewer instead of standing inside the desk.
 */
export const HOUSE_STAND_Y = CEILING_H + 78;

/** The desk surface, and the shelf line the whole collection side hangs off. */
const DESK_TOP = 46;

/** The seven things worth looking at. */
export type HouseThingId =
  | "collection"
  | "clarinet"
  | "jersey"
  | "sports"
  | "pc"
  | "closet"
  | "window";

/**
 * Where each thing physically is. The component positions its hotspot and
 * proximity test from exactly these numbers, so what the visitor walks up to
 * is what was drawn — there is no second, hand-tuned copy of the layout.
 */
const ROOM_THING_BOUNDS: Readonly<Record<HouseThingId, ArtRect>> = {
  collection: { x: 4, y: 8, width: 52, height: 58 },
  clarinet: { x: 58, y: 30, width: 16, height: 36 },
  jersey: { x: 124, y: 12, width: 26, height: 36 },
  sports: { x: 152, y: 28, width: 32, height: 38 },
  pc: { x: 220, y: 24, width: 30, height: 24 },
  closet: { x: 254, y: 20, width: 26, height: 46 },
  window: { x: 284, y: 6, width: 36, height: 36 },
};

export const HOUSE_THING_BOUNDS: Readonly<Record<HouseThingId, ArtRect>> =
  Object.fromEntries(
    Object.entries(ROOM_THING_BOUNDS).map(([id, bounds]) => [
      id,
      { ...bounds, y: bounds.y + CEILING_H },
    ]),
  ) as Readonly<Record<HouseThingId, ArtRect>>;

/**
 * How far a point is from a thing, horizontally — `0` anywhere in front of it.
 *
 * Measured to the object's *edge* rather than to its centre, because the things
 * in this room are not the same width. Standing at the left end of a cabinet
 * that is four Edwards wide is standing at the cabinet, and a centre-to-centre
 * test would say otherwise.
 */
export function houseThingDistance(id: HouseThingId, x: number): number {
  const bounds = HOUSE_THING_BOUNDS[id];
  if (x < bounds.x) return bounds.x - x;
  if (x > bounds.x + bounds.width) return x - (bounds.x + bounds.width);
  return 0;
}

/**
 * How far each thing has been opened, `0` shut and `1` fully open. Inspecting
 * something ramps its own entry; everything else stays where it was.
 */
export type HouseReveal = Readonly<Partial<Record<HouseThingId, number>>>;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function revealOf(reveal: HouseReveal, id: HouseThingId): number {
  return clamp01(reveal[id] ?? 0);
}

/* ── Small props, reused around the room ─────────────────────────────────── */

/** A studded brick — the smallest thing that still reads as LEGO. */
function brick(
  draw: Raster,
  x: number,
  y: number,
  width: number,
  colour: string,
) {
  draw(x, y + 1, width, 3, colour);
  for (let stud = 0; stud * 2 < width; stud += 1) {
    draw(x + stud * 2, y, 1, 1, colour);
  }
}

const SPINES: readonly string[] = [
  palette.blue3,
  palette.green3,
  palette.brown,
  palette.cream,
  palette.orange2,
  palette.stone2,
  palette.navy,
];

/** A run of book spines, varied but identical on every render. */
function books(
  draw: Raster,
  x: number,
  baseY: number,
  width: number,
  height: number,
  seed: number,
) {
  let cursor = x;
  let index = 0;
  while (cursor < x + width) {
    const spine = 1 + (scatter(seed + index * 17) % 2);
    if (cursor + spine > x + width) break;
    // One book in three is a little short, which is what stops a shelf of
    // equal bars reading as a barcode.
    const tall = height - (scatter(seed + index * 29) % 3 === 0 ? 1 : 0);
    draw(cursor, baseY - tall, spine, tall, SPINES[scatter(seed + index * 7) % SPINES.length]);
    cursor += spine + 1;
    index += 1;
  }
}

/** A storage or shoe box, its lid picked out. */
function box(
  draw: Raster,
  x: number,
  y: number,
  width: number,
  height: number,
  body: string,
  lid: string,
) {
  draw(x, y, width, height, body);
  draw(x, y, width, 1, lid);
}

/** A plush, sitting and slumped. Six wide, six tall. */
function plush(draw: Raster, x: number, y: number, colour: string) {
  draw(x + 1, y, 4, 2, colour);
  draw(x, y + 1, 1, 1, colour);
  draw(x + 5, y + 1, 1, 1, colour);
  draw(x, y + 2, 6, 4, colour);
  draw(x + 1, y + 1, 1, 1, palette.ink);
  draw(x + 4, y + 1, 1, 1, palette.ink);
}

/** A collectible figure on its base. Four wide, seven tall. */
function figurine(draw: Raster, x: number, y: number, colour: string) {
  draw(x + 1, y, 2, 2, palette.skin);
  draw(x, y + 2, 4, 4, colour);
  draw(x, y + 6, 4, 1, palette.char);
}

/* ── The room itself ─────────────────────────────────────────────────────── */

/** Mint wall, white skirting, and warm boards running away from the viewer. */
function drawShell(draw: Raster) {
  draw(0, 0, W, SKIRTING_Y, palette.mint);
  draw(0, 0, W, 2, palette.mint2);
  draw(0, 2, W, 1, palette.mint);

  // Wall wear. Deterministic, so the server and the client agree on every fleck.
  for (let index = 0; index < 26; index += 1) {
    const x = scatter(index * 7 + 3) % W;
    const y = 5 + (scatter(index * 13 + 5) % 50);
    draw(x, y, 1, 1, palette.mint2);
  }

  // Painted skirting. Cream rather than wood: it is the line that keeps the
  // mint off the boards, and a brown band there merges the two.
  draw(0, SKIRTING_Y, W, FLOOR_Y - SKIRTING_Y, palette.cream);
  draw(0, SKIRTING_Y, W, 1, palette.stone);

  // The floor runs away from the viewer, so the boards run across it and open
  // up as they come forward. Drawn the other way — one vertical line per board
  // — the same floor reads as a second wall of paneling behind the furniture.
  draw(0, FLOOR_Y, W, ROOM_H - FLOOR_Y, palette.brown2);
  draw(0, FLOOR_Y + 1, W, 3, palette.brown);
  draw(0, FLOOR_Y, W, 1, palette.brown3);
  for (const y of [FLOOR_Y + 5, FLOOR_Y + 11, FLOOR_Y + 18]) {
    draw(0, y, W, 1, palette.brown3);
  }
  draw(0, ROOM_H - 3, W, 3, palette.soilDark);
}

/** Boards and joists overhead, ending in the beam the wall runs up to. */
function drawCeiling(draw: Raster) {
  draw(0, 0, W, CEILING_H, palette.soilDark);
  for (let x = 8; x < W; x += 34) {
    draw(x, 0, 4, CEILING_H - 2, palette.ink);
  }
  draw(0, CEILING_H - 2, W, 2, palette.brown3);
  draw(0, CEILING_H - 2, W, 1, palette.brown2);
}

/** The pendant over the middle of the room, and the light it puts on the floor. */
function drawPendant(draw: Raster) {
  draw(164, 0, 1, 9, palette.char);
  draw(160, 9, 9, 3, palette.char);
  draw(161, 12, 7, 1, palette.warm);
  draw(163, 13, 3, 1, palette.glow);
  for (const [inset, depth, colour] of [
    [0, 7, palette.brown],
    [5, 5, palette.dirt],
    [11, 3, palette.brown],
  ] as const) {
    draw(146 + inset, FLOOR_Y, 40 - inset * 2, depth, colour);
  }
}

/** The rug the desk chair lives on. */
function drawRug(draw: Raster) {
  draw(190, FLOOR_Y + 4, 62, 14, palette.green4);
  draw(192, FLOOR_Y + 5, 58, 12, palette.green3);
  draw(198, FLOOR_Y + 8, 46, 6, palette.green4);
  draw(198, FLOOR_Y + 10, 46, 2, palette.green3);
  for (let x = 190; x < 252; x += 3) {
    draw(x, FLOOR_Y + 18, 2, 1, palette.green4);
  }
}

/**
 * A city at night, seen through a window.
 *
 * Sydney at ground level already exists in `sydney.ts`, but that strip is a
 * daylight harbour, and the two things this room says about its windows are
 * that they are high up and that the ideas happen late. So the view is towers
 * and lit windows: silhouettes stepping back into a navy sky, with a scatter
 * of warm squares that never lands in the same place twice across the room
 * because each window passes its own `seed`.
 *
 * `extra` lights a few more windows — the bed window uses it as its reveal,
 * which is the whole of what looking out of it does.
 */
function drawCityNight(
  draw: Raster,
  glass: ArtRect,
  frame: number,
  seed: number,
  extra = 0,
) {
  const view = clipRaster(draw, glass);
  const base = glass.y + glass.height;

  draw(glass.x, glass.y, glass.width, glass.height, palette.navy2);
  draw(glass.x, base - 8, glass.width, 8, palette.navy);

  // Towers, tallest in the middle distance, stepping down to the edges.
  for (let index = 0; index < 9; index += 1) {
    const towerWidth = 3 + (scatter(seed + index * 31) % 4);
    const x = glass.x + index * 4 + (scatter(seed + index * 11) % 3);
    const height = 8 + (scatter(seed + index * 19) % (glass.height - 12));
    const far = index % 3 === 1;
    view(x, base - height, towerWidth, height, far ? palette.navy : palette.ink);

    // Lit windows. One column of them per tower, which is enough at this size.
    for (let row = 0; row < height - 3; row += 3) {
      const roll = scatter(seed + index * 53 + row * 7) % 10;
      if (roll >= 4 + Math.round(extra * 3)) continue;
      const warm = roll === 0 ? palette.orange : palette.warm;
      view(x + 1, base - height + 2 + row, 1, 1, warm);
      if (towerWidth > 4) view(x + 3, base - height + 2 + row, 1, 1, warm);
    }
  }

  // Street glow along the bottom, and one aircraft light crossing the sky.
  view(glass.x, base - 2, glass.width, 1, palette.orange2);
  view(glass.x, base - 1, glass.width, 1, palette.brown3);
  view(glass.x + ((frame * 2 + seed) % (glass.width + 8)) - 4, glass.y + 3, 1, 1, palette.glow);
}

/**
 * A window in the wall, with the city behind it. The frames are the one dark
 * outline in the room, which is what stops two bright rectangles reading as
 * holes in the wall.
 */
function drawCityWindow(
  draw: Raster,
  frame: ArtRect,
  tick: number,
  seed: number,
  extra = 0,
) {
  const glass: ArtRect = {
    x: frame.x + 2,
    y: frame.y + 2,
    width: frame.width - 4,
    height: frame.height - 5,
  };
  draw(frame.x, frame.y, frame.width, frame.height, palette.char);
  drawCityNight(draw, glass, tick, seed, extra);

  // Mullions over the view, and a sill that catches the room's light.
  draw(frame.x + (frame.width >> 1), glass.y, 1, glass.height, palette.char);
  draw(glass.x, glass.y + (glass.height >> 1), glass.width, 1, palette.char);
  draw(frame.x - 1, frame.y + frame.height - 3, frame.width + 2, 3, palette.cream);
  draw(frame.x - 1, frame.y + frame.height - 3, frame.width + 2, 1, palette.glow);
}

/* ── 1. The collection side ──────────────────────────────────────────────── */

/** A framed photo, hung where a framed photo gets hung. */
function drawFramedPhoto(draw: Raster) {
  draw(6, 8, 14, 12, palette.brown3);
  draw(7, 9, 12, 10, palette.stone);
  draw(7, 9, 12, 4, palette.blue2);
  draw(9, 13, 3, 5, palette.navy);
  draw(14, 14, 3, 4, palette.orange2);
  draw(7, 18, 12, 1, palette.stone3);
}

/**
 * The glass display cabinet, and the black open shelving beside it.
 *
 * Shut it is a dark case you can just make out shapes in. Looking at it turns
 * the cabinet's own strip lights on, one shelf at a time, which is the entire
 * point of putting things behind glass.
 */
export function drawCollection(draw: Raster, reveal: number): void {
  const lit = clamp01(reveal);
  const shelves = [30, 40, 50] as const;

  // ── The cabinet.
  draw(4, 22, 22, FLOOR_Y - 22, palette.char);
  draw(5, 23, 20, FLOOR_Y - 25, palette.ink);
  draw(5, FLOOR_Y - 2, 20, 2, palette.char);

  for (const [index, boardY] of [24, ...shelves].entries()) {
    if (index > 0) draw(5, boardY - 1, 20, 1, palette.char);
    if (lit > index / 4) draw(6, boardY, 18, 1, palette.warm);
  }

  // What is in it: LEGO on top, figures under, a plush that would not fit.
  brick(draw, 8, 26, 6, palette.orange2);
  brick(draw, 16, 26, 4, palette.blue2);
  figurine(draw, 7, 33, palette.blue3);
  figurine(draw, 13, 33, palette.orange);
  figurine(draw, 19, 33, palette.green3);
  brick(draw, 7, 46, 8, palette.green2);
  brick(draw, 17, 46, 4, palette.cream);
  plush(draw, 8, 58, palette.brown);
  draw(17, 59, 6, 5, palette.stone2);
  draw(17, 59, 6, 1, palette.cream);

  // Glass, last, so it sits over the contents.
  //
  // Unlit, what you mostly see in a dark case is the room in it, so the pane
  // carries two raked bands of the wall's own mint. They narrow to nothing as
  // the strip lights come up, which is exactly what happens to a reflection
  // when there is something brighter behind the glass than in front of it.
  const band = Math.round(7 * (1 - lit));
  for (let y = 24; y < FLOOR_Y - 3 && band > 0; y += 2) {
    const rake = Math.round((y - 24) * 0.35);
    for (const [offset, colour] of [
      [0, palette.mint3],
      [11, palette.mint2],
    ] as const) {
      const left = Math.max(5, 5 + rake + offset);
      const right = Math.min(25, 5 + rake + offset + (offset === 0 ? band : 2));
      if (right > left) draw(left, y, right - left, 2, colour);
    }
  }
  draw(14, 23, 1, FLOOR_Y - 25, palette.char);

  // ── The black open shelving.
  draw(30, 14, 2, FLOOR_Y - 14, palette.char);
  draw(54, 14, 2, FLOOR_Y - 14, palette.char);
  for (const shelfY of [14, 26, 38, 50, 62]) {
    draw(30, shelfY, 26, 2, palette.char);
  }

  brick(draw, 33, 22, 8, palette.orange);
  brick(draw, 43, 22, 6, palette.blue3);
  draw(50, 22, 4, 4, palette.green2);

  figurine(draw, 33, 31, palette.orange2);
  plush(draw, 39, 32, palette.stone2);
  box(draw, 47, 33, 7, 5, palette.brown2, palette.brown);

  brick(draw, 32, 46, 10, palette.blue2);
  figurine(draw, 44, 43, palette.cream);
  draw(50, 44, 4, 6, palette.green3);
  draw(51, 43, 2, 1, palette.orange);

  box(draw, 32, 55, 9, 7, palette.stone2, palette.cream);
  box(draw, 43, 56, 6, 6, palette.brown3, palette.brown);
  brick(draw, 50, 58, 4, palette.orange2);

  // The overflow: what did not fit on a shelf, stacked on the boards.
  box(draw, 26, FLOOR_Y - 7, 5, 7, palette.stone2, palette.cream);
  box(draw, 26, FLOOR_Y - 11, 4, 4, palette.brown3, palette.brown);
}

/* ── 2. Clarinet ─────────────────────────────────────────────────────────── */

/**
 * The clarinet on its stand, by the bookshelf.
 *
 * Looking at it lifts it clear of the stand, the way an instrument you played
 * for eight years gets picked up rather than admired.
 */
export function drawClarinet(draw: Raster, reveal: number): void {
  const lift = Math.round(clamp01(reveal) * 5);

  // The stand: a post, three legs splayed off it, and the peg the bell drops
  // over. Drawn wide enough to read as a tripod rather than as a spider.
  draw(66, 54, 1, 11, palette.char);
  draw(63, 53, 7, 1, palette.char);
  for (let step = 0; step < 6; step += 1) {
    draw(66 - step, FLOOR_Y - 1 - (5 - step), 1, 1, palette.char);
    draw(66 + step, FLOOR_Y - 1 - (5 - step), 1, 1, palette.char);
  }
  draw(60, FLOOR_Y - 1, 13, 1, palette.char);

  const bellBottom = 58 - lift;
  const top = bellBottom - 26;

  // Bell, body, barrel, mouthpiece — each section a little wider than the one
  // above it, which is the whole silhouette of a clarinet.
  draw(63, bellBottom - 3, 7, 3, palette.ink);
  draw(64, bellBottom - 5, 5, 2, palette.ink);
  draw(64, top + 3, 4, bellBottom - top - 8, palette.ink);
  draw(64, top + 1, 4, 2, palette.char);
  draw(64, top, 4, 1, palette.stone3);
  draw(65, top - 3, 2, 3, palette.char);
  draw(65, top - 4, 2, 1, palette.ink);

  // Keywork: levers down the sides and one ring across the joint. Kept off the
  // body's full width — banded end to end, the instrument reads as a stack.
  for (let key = 0; key < 6; key += 1) {
    draw(key % 2 === 0 ? 63 : 68, top + 6 + key * 3, 1, 2, palette.stone);
  }
  draw(64, top + 13, 4, 1, palette.stone2);
  draw(64, top + 20, 4, 1, palette.stone2);
  if (lift > 0) draw(63, top + 9, 1, 2, palette.glow);

  // Sheet music, left on the floor where sheet music ends up.
  draw(70, FLOOR_Y - 2, 6, 2, palette.cream);
  dashes(draw, 71, FLOOR_Y - 2, 5, palette.stone2);
}

/* ── 3. The bookshelf, which is only the room ────────────────────────────── */

/**
 * The tall bookshelf. Not interactive — it is the anchor the hobby corner is
 * arranged around, and a room where every large object opens a card is a menu.
 */
export function drawBookshelf(draw: Raster): void {
  draw(78, 12, 44, FLOOR_Y - 12, palette.brown3);
  draw(80, 14, 40, FLOOR_Y - 17, palette.brown2);
  draw(78, FLOOR_Y - 3, 44, 3, palette.brown3);

  const shelves = [26, 38, 50, 62] as const;
  for (const shelfY of shelves) {
    draw(80, shelfY, 40, 1, palette.brown3);
  }

  books(draw, 81, 26, 24, 11, 11);
  box(draw, 108, 20, 11, 6, palette.stone2, palette.cream);

  books(draw, 81, 38, 17, 11, 29);
  figurine(draw, 100, 31, palette.blue3);
  box(draw, 106, 32, 13, 6, palette.brown, palette.orange2);

  box(draw, 81, 44, 12, 6, palette.stone3, palette.stone2);
  books(draw, 95, 50, 24, 11, 47);

  books(draw, 81, 62, 14, 11, 61);
  box(draw, 97, 55, 11, 7, palette.stone2, palette.cream);
  box(draw, 109, 56, 10, 6, palette.brown3, palette.brown);

  // On top: the two boxes that never went back inside it.
  box(draw, 84, 6, 12, 6, palette.stone2, palette.cream);
  box(draw, 100, 7, 9, 5, palette.brown2, palette.brown);
  plush(draw, 112, 6, palette.orange2);
}

/* ── 4. The football shirt ───────────────────────────────────────────────── */

/**
 * The shirt on the wall — the one readable thing in the room.
 *
 * The number is drawn with the world's scoreboard digits, because that is what
 * a squad number is. The name above it stays a dash run: it is a name at four
 * art pixels tall, and the card underneath says it properly.
 */
export function drawJersey(draw: Raster): void {
  // Hanger.
  draw(136, 12, 1, 3, palette.stone3);
  draw(130, 15, 14, 1, palette.stone3);

  // Body and sleeves. A pale kit, so the number reads at this size.
  draw(128, 17, 18, 26, palette.cream);
  draw(124, 18, 5, 8, palette.cream);
  draw(145, 18, 5, 8, palette.cream);
  draw(124, 25, 5, 1, palette.stone);
  draw(145, 25, 5, 1, palette.stone);

  // Collar and trim, in the world's one accent.
  draw(133, 16, 8, 2, palette.navy);
  draw(135, 17, 4, 2, palette.mint);
  draw(128, 42, 18, 1, palette.navy);
  draw(124, 25, 5, 1, palette.navy);
  draw(145, 25, 5, 1, palette.navy);

  // The name, unreadable on purpose, and the number, readable on purpose.
  dashes(draw, 130, 22, 14, palette.stone3);
  digit(draw, 131, 26, "6", palette.navy);
  digit(draw, 136, 26, "7", palette.navy);

  // Creases, so a flat kit hangs.
  draw(129, 34, 1, 8, palette.stone);
  draw(144, 34, 1, 8, palette.stone);
  draw(131, 40, 12, 1, palette.stone);
}

/* ── 5. The sports corner ────────────────────────────────────────────────── */

/**
 * A racket, as a sprite. An oval of rim with a crosshatch inside it and a shaft
 * running to a grip — drawn as a grid rather than as rectangles, because at
 * nine art pixels across the difference between a racket and a hand mirror is
 * three or four individual pixels.
 */
const TENNIS_RACKET: readonly string[] = [
  "..RRRRR..",
  ".R.....R.",
  "R...S...R",
  "R.SSSSS.R",
  "R...S...R",
  "R.SSSSS.R",
  "R...S...R",
  ".R.....R.",
  "..RRRRR..",
  "...R.R...",
  "...R.R...",
  "....S....",
  "....S....",
  "....S....",
  "...HH....",
  "...HH....",
  "...HH....",
  "...HH....",
  "...HH....",
  "...HH....",
  "...HH....",
  "...HH....",
];

const BADMINTON_RACKET: readonly string[] = [
  "..RRR..",
  ".R...R.",
  "R..S..R",
  "R.SSS.R",
  "R..S..R",
  "R.SSS.R",
  "R..S..R",
  ".R...R.",
  "..RRR..",
  "..R.R..",
  "...S...",
  "...S...",
  "...S...",
  "...S...",
  "...S...",
  "...S...",
  "..HH...",
  "..HH...",
  "..HH...",
  "..HH...",
  "..HH...",
  "..HH...",
  "..HH...",
  "..HH...",
];

/** One object per sport, leaned into the corner the way they get leaned. */
export function drawSportsCorner(draw: Raster): void {
  // Golf bag, with four clubs out of the top of it.
  draw(152, 36, 12, FLOOR_Y - 36, palette.green4);
  draw(153, 37, 10, FLOOR_Y - 39, palette.green3);
  draw(152, 44, 12, 3, palette.cream);
  draw(152, 52, 12, 2, palette.brown3);
  draw(163, 40, 2, 16, palette.brown2);
  for (const [index, x] of [153, 156, 159, 162].entries()) {
    draw(x, 28 + index, 1, 9 - index, palette.stone3);
    draw(x - 1, 27 + index, 2, 2, palette.stone2);
  }

  sprite(draw, 166, FLOOR_Y - 22, TENNIS_RACKET, {
    R: palette.blue3,
    S: palette.cream,
    H: palette.char,
  });
  sprite(draw, 177, FLOOR_Y - 24, BADMINTON_RACKET, {
    R: palette.orange2,
    S: palette.cream,
    H: palette.char,
  });

  // A ball and a shuttle on the boards, because they never go in the bag.
  draw(172, FLOOR_Y - 2, 2, 2, palette.turf);
  draw(175, FLOOR_Y - 2, 2, 2, palette.glow);
  draw(175, FLOOR_Y - 3, 2, 1, palette.stone);
}

/* ── 6. The desk, and the machine on it ──────────────────────────────────── */

/**
 * The desk end of the room: the dark desk, the lamp, the speaker, the chair,
 * and the monitor that comes up when it is looked at.
 *
 * The screen never spells anything. It shows a client: a queue panel, a row of
 * lanes with one of them picked, and a minimap — the words that go with it are
 * in the card, which is also where a rank would go if there were ever one.
 */
export function drawDeskPc(draw: Raster, frame: number, reveal: number): void {
  const on = clamp01(reveal);

  // Desk. Dark, and the only large slab of char below eye level.
  draw(188, DESK_TOP, 64, 3, palette.char);
  draw(188, DESK_TOP + 3, 64, 1, palette.ink);
  draw(190, DESK_TOP + 4, 3, FLOOR_Y - DESK_TOP - 4, palette.ink);
  draw(247, DESK_TOP + 4, 3, FLOOR_Y - DESK_TOP - 4, palette.ink);
  draw(192, FLOOR_Y - 3, 56, 1, palette.char);
  draw(188, DESK_TOP, 64, 1, palette.stone3);

  // Desk lamp, on all the time; looking at the machine widens the pool.
  draw(191, DESK_TOP - 2, 6, 2, palette.char);
  draw(193, 36, 1, 8, palette.char);
  draw(190, 32, 8, 3, palette.char);
  draw(191, 35, 6, 1, palette.warm);
  draw(190, DESK_TOP - 3, 8 + Math.round(on * 8), 1, palette.warm);

  // A small speaker, a mug, and a figure that migrated over from the shelves.
  draw(201, 39, 5, 7, palette.ink);
  draw(202, 41, 3, 3, palette.stone3);
  draw(202, 40, 3, 1, palette.orange2);
  draw(209, 42, 4, 4, palette.cream);
  draw(213, 43, 1, 2, palette.cream);
  figurine(draw, 216, 39, palette.orange);

  // Tower under the desk, its fan, and the one LED that never turns off.
  draw(236, FLOOR_Y - 16, 10, 16, palette.ink);
  draw(238, FLOOR_Y - 13, 6, 6, palette.char);
  draw(240, FLOOR_Y - 11, 2, 2, palette.stone3);
  draw(244, FLOOR_Y - 14, 1, 11, frame % 4 < 2 ? palette.orange : palette.orange2);

  // Monitor.
  draw(220, 24, 30, 22, palette.ink);
  draw(221, 25, 28, 20, palette.char);
  draw(233, 45, 4, 2, palette.ink);

  const screen: ArtRect = { x: 222, y: 26, width: 26, height: 17 };
  if (on <= 0) {
    draw(screen.x, screen.y, screen.width, screen.height, palette.char);
    draw(screen.x + 2, screen.y + 2, 6, 1, palette.stone3);
  } else if (on < 0.45) {
    draw(screen.x, screen.y, screen.width, screen.height, palette.ink);
    draw(screen.x, screen.y + 7, screen.width, 2, palette.glow);
  } else {
    draw(screen.x, screen.y, screen.width, screen.height, palette.navy2);
    draw(screen.x, screen.y, screen.width, 3, palette.navy);
    draw(screen.x + 1, screen.y + 1, 8, 1, palette.stone2);

    // Five lanes along the top, with the middle one taken.
    for (let lane = 0; lane < 5; lane += 1) {
      const filled = on >= 1 || lane < Math.round((on - 0.45) * 9);
      draw(
        screen.x + 2 + lane * 4,
        screen.y + 5,
        3,
        4,
        filled ? (lane === 2 ? palette.orange : palette.blue2) : palette.navy,
      );
    }

    // A minimap, and a queue bar filling under it.
    draw(screen.x + 2, screen.y + 11, 9, 5, palette.blue3);
    draw(screen.x + 4, screen.y + 13, 2, 1, palette.warm);
    draw(screen.x + 8, screen.y + 12, 2, 1, palette.orange2);
    draw(screen.x + 13, screen.y + 11, 11, 2, palette.navy);
    draw(screen.x + 13, screen.y + 11, on >= 1 ? 11 : 6, 2, palette.blue2);
    dashes(draw, screen.x + 13, screen.y + 14, 11, palette.blue);
    if (on >= 1 && frame % 2 === 0) {
      draw(screen.x + 24, screen.y + 1, 1, 1, palette.warm);
    }
  }

  // Keyboard and mouse, in front of it.
  draw(221, DESK_TOP - 2, 22, 2, palette.stone3);
  draw(222, DESK_TOP - 2, 20, 1, palette.stone2);
  draw(245, DESK_TOP - 2, 3, 2, palette.stone2);

  // The gaming chair, drawn last so it stands between the desk and the viewer.
  draw(206, 32, 16, 22, palette.ink);
  draw(207, 34, 14, 19, palette.char);
  draw(208, 30, 12, 4, palette.ink);
  draw(209, 31, 10, 2, palette.char);
  draw(207, 36, 2, 15, palette.orange2);
  draw(219, 36, 2, 15, palette.orange2);
  draw(204, 54, 20, 4, palette.ink);
  draw(205, 55, 18, 2, palette.char);
  draw(213, 58, 2, FLOOR_Y - 58, palette.ink);
  draw(206, FLOOR_Y, 16, 1, palette.ink);
  draw(205, FLOOR_Y + 1, 2, 2, palette.char);
  draw(221, FLOOR_Y + 1, 2, 2, palette.char);
}

/* ── 7. The closet ───────────────────────────────────────────────────────── */

/**
 * The clothing rack. Not a wardrobe application — a rail, a folded stack, and
 * the shoe boxes underneath.
 *
 * Looking at it slides one garment out along the rail, which is the entire
 * gesture of standing in front of your own clothes.
 */
export function drawCloset(draw: Raster, reveal: number): void {
  const pull = Math.round(clamp01(reveal) * 3);
  const railY = 26;

  draw(254, railY, 26, 1, palette.char);
  draw(254, railY - 6, 1, 7, palette.char);
  draw(279, railY - 6, 1, 7, palette.char);
  draw(254, railY - 6, 26, 1, palette.char);

  // A shirt that only shows once the rail is pushed along, so the reveal
  // uncovers something rather than growing the rack sideways into the bed.
  if (pull > 0) {
    draw(271, railY - 2, 1, 3, palette.stone3);
    draw(269, railY + 1, 4, 2, palette.cream);
    draw(268, railY + 3, 6, 17, palette.cream);
    draw(268, railY + 3, 1, 17, palette.stone);
    draw(269, railY + 12, 4, 1, palette.orange2);
  }

  const garments: readonly (readonly [number, number, number, string])[] = [
    [255, 6, 18, palette.hoodie],
    [261, 5, 14, palette.denim],
    [266, 6, 20, palette.navy],
    [272, 5, 16, palette.brown],
  ];
  for (const [index, [x, garmentWidth, length, colour]] of garments.entries()) {
    // The two on the right slide along to make room for the one being looked at.
    const shift = index >= 2 ? pull : 0;
    draw(x + shift + (garmentWidth >> 1), railY - 2, 1, 3, palette.stone3);
    draw(x + shift + 1, railY + 1, garmentWidth - 2, 2, colour);
    draw(x + shift, railY + 3, garmentWidth, length, colour);
    draw(x + shift, railY + 3, 1, length, palette.brown3);
  }

  // Folded stack and shoe boxes on the floor under the rail.
  draw(255, FLOOR_Y - 6, 11, 2, palette.blue3);
  draw(255, FLOOR_Y - 4, 11, 2, palette.stone2);
  draw(255, FLOOR_Y - 2, 11, 2, palette.brown);
  box(draw, 268, FLOOR_Y - 10, 11, 5, palette.stone2, palette.cream);
  box(draw, 268, FLOOR_Y - 5, 11, 5, palette.brown3, palette.brown);
}

/* ── 8. The bed, and the window over it ──────────────────────────────────── */

/**
 * The quiet end. A bed, a bedside stack, and the big window — the only part of
 * this end that answers anything, and it answers with one line.
 *
 * Looking out lights a few more windows in the towers. Nothing else happens:
 * the window is atmosphere, and atmosphere that does something is a system.
 */
export function drawBedCorner(draw: Raster, frame: number, reveal: number): void {
  drawCityWindow(
    draw,
    { x: 284, y: 6, width: 36, height: 36 },
    frame,
    317,
    clamp01(reveal),
  );

  // Headboard against the far wall, then the bed running back out of it.
  draw(318, 38, 8, FLOOR_Y - 38, palette.brown3);
  draw(319, 40, 6, 18, palette.brown2);
  draw(319, 40, 6, 1, palette.brown);

  // Base, then mattress, then the duvet over most of it — each one a band
  // clear of the one under it, so the bed does not read as a stack of shelves.
  draw(283, 58, 35, FLOOR_Y - 58, palette.brown3);
  draw(283, 58, 35, 1, palette.brown2);
  draw(283, 52, 35, 6, palette.stone2);
  draw(283, 52, 35, 1, palette.stone);

  draw(283, 47, 21, 11, palette.blue3);
  draw(283, 47, 21, 1, palette.blue2);
  draw(286, 51, 15, 1, palette.blue2);
  draw(301, 47, 5, 11, palette.cream);
  draw(301, 47, 5, 1, palette.glow);

  // Pillow, propped against the headboard and standing clear of the mattress.
  draw(307, 43, 11, 9, palette.glow);
  draw(307, 43, 11, 1, palette.stone);
  draw(307, 43, 1, 9, palette.stone);
  draw(309, 47, 7, 1, palette.stone);

  // Feet, and the shadow the bed casts back onto its own boards.
  draw(284, FLOOR_Y, 2, 2, palette.soilDark);
  draw(315, FLOOR_Y, 2, 2, palette.soilDark);
  draw(283, FLOOR_Y - 1, 35, 1, palette.soilDark);

  // A plush sitting on the duvet, and a pair of slippers on the open boards —
  // the only two things in this end of the room, because it is the quiet end.
  plush(draw, 287, 41, palette.brown);
  draw(292, FLOOR_Y + 3, 5, 2, palette.stone2);
  draw(298, FLOOR_Y + 4, 5, 2, palette.stone2);
}

/* ── The whole room ──────────────────────────────────────────────────────── */

export function drawHouseRoom(
  draw: Raster,
  frame: number,
  reveal: HouseReveal = {},
): void {
  drawCeiling(draw);
  // Everything from here down is authored in room space.
  const room: Raster = (x, y, width, height, color) =>
    draw(x, y + CEILING_H, width, height, color);
  drawHouseInterior(room, frame, reveal);
}

function drawHouseInterior(
  draw: Raster,
  frame: number,
  reveal: HouseReveal,
): void {
  drawShell(draw);
  drawPendant(draw);
  drawRug(draw);

  // The desk window is decorative — the interactive one is over the bed, and
  // two windows that both open a card would be one idea told twice.
  drawCityWindow(draw, { x: 190, y: 8, width: 32, height: 32 }, frame, 101);

  drawFramedPhoto(draw);
  drawBookshelf(draw);

  drawCollection(draw, revealOf(reveal, "collection"));
  drawClarinet(draw, revealOf(reveal, "clarinet"));
  drawJersey(draw);
  drawSportsCorner(draw);
  drawDeskPc(draw, frame, revealOf(reveal, "pc"));
  drawCloset(draw, revealOf(reveal, "closet"));
  drawBedCorner(draw, frame, revealOf(reveal, "window"));
}
