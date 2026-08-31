import { palette } from "@/lib/pixel/palette";
import type { ArtRect, Raster } from "@/lib/pixel/raster";
import { clipRaster, dashes, scatter, wheel } from "@/lib/pixel/raster";
import {
  drawHarbourWater,
  drawOperaHouseSilhouette,
  drawSydneySky,
} from "@/lib/pixel/sydney";

/**
 * The inside of Edward's House, as one pixel-art room.
 *
 * The other buildings say what Edward builds; this one says who he is, and it
 * says it by being walked around. The room is drawn as a single strip rather
 * than as a set of furniture cards, because the point of the location is that
 * it reads as a place someone lives in — the desk is one desk with a study end
 * and a working end, the drawers sit under the window, the runners are by the
 * door where runners end up. Six of the things in here answer a question when
 * you look at them; the rest are just the room.
 *
 * Every routine draws in absolute room coordinates on the one grid below, and
 * only ever with colours from `palette.ts`. Nothing here renders readable text:
 * the labels are DOM chips over the canvas, per the world's signage language.
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
const ROOM_H = 84;

/** The room, in art pixels. Roughly 20 Edwards wide and 6 tall. */
export const HOUSE_ART_SIZE = {
  width: 240,
  height: CEILING_H + ROOM_H,
} as const;

const { width: W } = HOUSE_ART_SIZE;

/** Skirting board, and the wall/floor junction the furniture stands on. */
const SKIRTING_Y = 58;
/** In room space. `HOUSE_STAND_Y` below is in art space, for the DOM to use. */
const FLOOR_Y = 62;
export const HOUSE_FLOOR_Y = CEILING_H + FLOOR_Y;
/**
 * Where Edward's feet go — a little in front of the furniture line, so he
 * passes between the room and the viewer instead of standing inside the desk.
 */
export const HOUSE_STAND_Y = CEILING_H + 74;

/** The desk surface both the study end and the working end share. */
const DESK_TOP = 44;

/** The six things worth looking at. */
export type HouseThingId =
  | "map"
  | "desk"
  | "computer"
  | "papers"
  | "rail"
  | "rig";

/**
 * Where each thing physically is. The component positions its hotspot and
 * proximity test from exactly these numbers, so what the visitor walks up to
 * is what was drawn — there is no second, hand-tuned copy of the layout.
 */
const ROOM_THING_BOUNDS: Readonly<Record<HouseThingId, ArtRect>> = {
  map: { x: 21, y: 6, width: 31, height: 30 },
  desk: { x: 52, y: 14, width: 46, height: 48 },
  computer: { x: 98, y: 22, width: 36, height: 24 },
  papers: { x: 136, y: 40, width: 26, height: 22 },
  rail: { x: 166, y: 18, width: 40, height: 44 },
  rig: { x: 206, y: 16, width: 32, height: 46 },
};

export const HOUSE_THING_BOUNDS: Readonly<Record<HouseThingId, ArtRect>> =
  Object.fromEntries(
    Object.entries(ROOM_THING_BOUNDS).map(([id, bounds]) => [
      id,
      { ...bounds, y: bounds.y + CEILING_H },
    ]),
  ) as Readonly<Record<HouseThingId, ArtRect>>;

/** The horizontal centre of a thing, used for the walk-up proximity test. */
export function houseThingCentre(id: HouseThingId): number {
  const bounds = HOUSE_THING_BOUNDS[id];
  return bounds.x + bounds.width / 2;
}

/**
 * How far each thing has been opened, `0` shut and `1` fully open. Inspecting
 * something ramps its own entry; everything else stays where it was.
 */
export type HouseReveal = Readonly<Partial<Record<HouseThingId, number>>>;

function revealOf(reveal: HouseReveal, id: HouseThingId): number {
  return Math.max(0, Math.min(1, reveal[id] ?? 0));
}

/* ── The room itself ─────────────────────────────────────────────────────── */

/** Wall, skirting, floorboards, and the front of the floor falling into dark. */
function drawShell(draw: Raster) {
  draw(0, 0, W, SKIRTING_Y, palette.paper);
  draw(0, 0, W, 2, palette.stone2);
  draw(0, 2, W, 1, palette.stone);

  // Wall wear. Deterministic, so the server and the client agree on every fleck.
  for (let index = 0; index < 22; index += 1) {
    const x = scatter(index * 7 + 3) % W;
    const y = 5 + (scatter(index * 13 + 5) % 46);
    draw(x, y, 1, 1, palette.stone);
  }

  draw(0, SKIRTING_Y, W, FLOOR_Y - SKIRTING_Y, palette.brown3);

  // The floor runs away from the viewer, so the boards run across it and open
  // up as they come forward. Drawn the other way — one vertical line per board
  // — the same floor reads as a second wall of paneling behind the furniture.
  draw(0, FLOOR_Y, W, ROOM_H - FLOOR_Y, palette.brown2);
  draw(0, FLOOR_Y + 1, W, 3, palette.brown);
  draw(0, FLOOR_Y, W, 1, palette.soilDark);
  for (const y of [FLOOR_Y + 5, FLOOR_Y + 11, FLOOR_Y + 18]) {
    draw(0, y, W, 1, palette.brown3);
  }
  draw(0, ROOM_H - 3, W, 3, palette.soilDark);
}

/** The front door, a mat, and the runners that never make it to a cupboard. */
function drawDoorway(draw: Raster) {
  draw(2, 15, 18, FLOOR_Y - 15, palette.brown3);
  draw(4, 17, 14, FLOOR_Y - 17, palette.brown2);
  draw(6, 20, 10, 16, palette.brown3);
  draw(6, 39, 10, 16, palette.brown3);
  draw(16, 39, 2, 3, palette.orange);

  draw(2, FLOOR_Y + 4, 19, 5, palette.stone3);
  draw(4, FLOOR_Y + 5, 15, 3, palette.stone2);

  // Runners, in the white-and-orange of the pair parked outside the front door.
  draw(6, FLOOR_Y - 4, 9, 3, palette.glow);
  draw(10, FLOOR_Y - 6, 5, 2, palette.glow);
  draw(6, FLOOR_Y - 1, 9, 1, palette.stone3);
  draw(11, FLOOR_Y - 4, 3, 1, palette.orange);
  draw(16, FLOOR_Y - 3, 8, 2, palette.glow);
  draw(19, FLOOR_Y - 5, 5, 2, palette.glow);
  draw(16, FLOOR_Y - 1, 8, 1, palette.stone3);
  draw(20, FLOOR_Y - 3, 3, 1, palette.orange2);
}

/**
 * A jangdok jar and a plant on a low shelf — the same Korean earthenware that
 * stands by the door on the outside of this building, brought indoors.
 */
function drawShelfCorner(draw: Raster) {
  draw(24, 47, 20, 2, palette.brown2);
  draw(25, 49, 2, FLOOR_Y - 49, palette.brown3);
  draw(41, 49, 2, FLOOR_Y - 49, palette.brown3);

  draw(27, 40, 7, 7, palette.brown);
  draw(28, 39, 5, 1, palette.brown);
  draw(29, 38, 3, 1, palette.brown3);
  draw(28, 42, 5, 1, palette.brown3);

  draw(37, 43, 4, 4, palette.orange2);
  draw(36, 39, 6, 4, palette.green3);
  draw(38, 37, 2, 3, palette.green2);
}

/**
 * The pendant over the gap between the print and the shelf. A ceiling with
 * nothing hanging off it is a lid rather than a room.
 */
function drawPendant(draw: Raster) {
  draw(91, 0, 1, 8, palette.char);
  draw(87, 8, 9, 3, palette.char);
  draw(88, 11, 7, 1, palette.warm);
  draw(90, 12, 3, 1, palette.glow);
}

/** Daylight from the window, pooling on the boards. */
function drawLightSpill(draw: Raster) {
  draw(144, FLOOR_Y, 28, 9, palette.brown);
  draw(148, FLOOR_Y, 20, 6, palette.dirt);
}

/** The rug the desk chair lives on. */
function drawRug(draw: Raster) {
  draw(56, 65, 80, 14, palette.green4);
  draw(58, 66, 76, 12, palette.green3);
  draw(64, 69, 64, 6, palette.green4);
  draw(64, 71, 64, 2, palette.green3);
  for (let x = 56; x < 136; x += 3) {
    draw(x, 79, 2, 1, palette.green4);
  }
}

/**
 * The window over the drawers, showing a sliver of the harbour.
 *
 * The view is the shared `sydney.ts` strip, cropped — the module was written as
 * an ambient Sydney surface waiting for a surface to adopt it, and a window in
 * the room of someone who moved to Sydney is what it was waiting for. The crop
 * lands on the opera house sails and the waterline; the rest of the strip is
 * clipped away rather than redrawn at another size.
 */
const WINDOW_FRAME: ArtRect = { x: 136, y: 8, width: 30, height: 26 };
const WINDOW_GLASS: ArtRect = { x: 139, y: 11, width: 24, height: 17 };
const SYDNEY_CROP = { x: 148, y: 47 } as const;

function drawWindow(draw: Raster, frame: number) {
  const { x, y, width, height } = WINDOW_FRAME;
  draw(x, y, width, height, palette.brown3);
  draw(WINDOW_GLASS.x, WINDOW_GLASS.y, WINDOW_GLASS.width, WINDOW_GLASS.height, palette.sky);

  const view = clipRaster(draw, WINDOW_GLASS, {
    x: WINDOW_GLASS.x - SYDNEY_CROP.x,
    y: WINDOW_GLASS.y - SYDNEY_CROP.y,
  });
  drawSydneySky(view, frame);
  drawHarbourWater(view, frame);
  drawOperaHouseSilhouette(view);

  // Mullions last, so the glazing bars sit over the view rather than under it.
  draw(x + 14, WINDOW_GLASS.y, 1, WINDOW_GLASS.height, palette.brown3);
  draw(WINDOW_GLASS.x, y + 17, WINDOW_GLASS.width, 1, palette.brown3);
  draw(x - 1, y + height - 2, width + 2, 3, palette.stone2);
}

/* ── The six things ──────────────────────────────────────────────────────── */

const MAP_PANEL = { centreX: 39, top: 10, bottom: 34, halfWidth: 17 } as const;

/**
 * Korea and Australia, drawn once and revealed by the unfold. Inset inside the
 * paper so the sheet keeps a printed margin — edge to edge, the same rectangle
 * reads as a second window rather than as something pinned to the wall.
 */
function drawMapFace(draw: Raster) {
  draw(24, 13, 30, 18, palette.blue);
  draw(24, 27, 30, 4, palette.blue2);
  draw(24, 13, 30, 1, palette.stone2);
  draw(24, 30, 30, 1, palette.stone2);

  // Korea, upper left: a peninsula off the top edge of the sheet.
  draw(30, 15, 4, 5, palette.green2);
  draw(31, 14, 3, 1, palette.green2);
  draw(31, 20, 2, 1, palette.green3);
  draw(35, 16, 1, 2, palette.green3);

  // Australia, lower right, with the south-east corner marked.
  draw(39, 22, 12, 7, palette.green2);
  draw(41, 21, 8, 1, palette.green2);
  draw(40, 29, 9, 1, palette.green3);
  draw(49, 26, 2, 2, palette.green3);

  // The route between them, dashed the way a route is dashed on paper.
  for (let step = 0; step <= 8; step += 1) {
    const t = step / 8;
    const x = Math.round(34 + (46 - 34) * t);
    const y = Math.round(18 + (25 - 18) * t - Math.sin(Math.PI * t) * 3);
    if (step % 2 === 0) draw(x, y, 1, 1, palette.orange2);
  }

  draw(32, 16, 2, 2, palette.orange);
  draw(46, 24, 2, 2, palette.orange);
  draw(46, 23, 1, 1, palette.warm);

  // A compass, small enough to be a mark rather than a diagram.
  draw(51, 15, 1, 3, palette.stone3);
  draw(50, 16, 3, 1, palette.stone3);
}

/**
 * The wall map, folded shut and opening out.
 *
 * Closed it is a strip of paper on its hook; opening widens the panel in steps
 * and lets more of the face through the clip, which is what an unfold looks
 * like from the side.
 */
export function drawWallMap(draw: Raster, reveal: number): void {
  const open = Math.max(0, Math.min(1, reveal));
  const { centreX, top, bottom, halfWidth } = MAP_PANEL;
  const half = Math.max(4, Math.round(halfWidth * (0.32 + 0.68 * open)));
  const left = centreX - half;
  const panelWidth = half * 2;

  draw(centreX - 18, 8, 36, 1, palette.brown3);
  draw(centreX, 6, 1, 2, palette.brown3);

  draw(left, top, panelWidth, bottom - top, palette.cream);
  draw(left, top, panelWidth, 1, palette.stone2);
  draw(left, bottom - 1, panelWidth, 1, palette.stone2);

  drawMapFace(
    clipRaster(draw, {
      x: left + 1,
      y: top + 1,
      width: panelWidth - 2,
      height: bottom - top - 2,
    }),
  );

  // Creases, shown as nicks in the top and bottom edges rather than as lines
  // down the sheet — full-height lines read as glazing bars, not as folds.
  if (half > 8) {
    for (const x of [centreX - 7, centreX + 7]) {
      draw(x, top, 1, 2, palette.stone);
      draw(x, bottom - 2, 1, 2, palette.stone);
    }
  }
}

/**
 * The study end of the desk: a lamp, a stack of books, an open notebook, a mug
 * going cold, and a crate of more books underneath.
 */
export function drawStudyDesk(draw: Raster, frame: number, reveal: number): void {
  const lit = Math.max(0, Math.min(1, reveal));

  // A framed print on the wall above it. Never readable — dashes, per the
  // world's rule that art at this scale suggests text rather than spelling it.
  draw(64, 14, 16, 12, palette.brown3);
  draw(65, 15, 14, 10, palette.stone);
  draw(65, 15, 14, 4, palette.blue);
  draw(70, 18, 4, 6, palette.stone3);
  dashes(draw, 66, 23, 12, palette.stone3);

  draw(100, 20, 28, 2, palette.brown2);
  draw(102, 15, 4, 5, palette.blue3);
  draw(106, 14, 3, 6, palette.brown);
  draw(109, 16, 4, 4, palette.green3);
  draw(120, 16, 5, 4, palette.brown3);
  draw(121, 15, 3, 1, palette.orange2);

  draw(52, DESK_TOP, 82, 3, palette.brown);
  draw(52, DESK_TOP + 3, 82, 1, palette.brown2);
  draw(54, DESK_TOP + 4, 3, FLOOR_Y - DESK_TOP - 4, palette.brown2);
  draw(128, DESK_TOP + 4, 3, FLOOR_Y - DESK_TOP - 4, palette.brown2);
  draw(56, 57, 73, 1, palette.brown3);

  // The crate of books that did not fit on the desk.
  draw(60, FLOOR_Y - 11, 15, 11, palette.brown3);
  draw(61, FLOOR_Y - 10, 13, 4, palette.blue3);
  draw(61, FLOOR_Y - 5, 13, 4, palette.green3);

  // Desk lamp. On all the time; looking at the desk pushes the pool wider.
  draw(56, 42, 6, 2, palette.char);
  draw(58, 34, 1, 8, palette.char);
  draw(54, 30, 9, 3, palette.char);
  draw(55, 33, 7, 1, palette.warm);
  draw(56, 41, 5, 1, palette.warm);
  if (lit > 0) {
    const pool = 6 + Math.round(lit * 10);
    draw(54, 43, pool, 1, palette.warm);
    draw(56, 33, 5, 1, palette.glow);
  }

  // Books, a notebook left open, a mug with the last of the coffee in it.
  draw(66, 41, 12, 3, palette.blue3);
  draw(67, 38, 10, 3, palette.green3);
  draw(66, 35, 11, 3, palette.brown);
  draw(68, 34, 7, 1, palette.orange2);

  draw(82, 42, 14, 2, palette.cream);
  draw(82, 41, 6, 1, palette.glow);
  draw(89, 41, 6, 1, palette.glow);
  dashes(draw, 83, 42, 12, palette.stone2);

  draw(91, 40, 5, 4, palette.cream);
  draw(91, 40, 5, 1, palette.stone2);
  draw(96, 41, 1, 2, palette.cream);
  draw(92 + (frame % 2), 38 - (frame % 3), 1, 2, palette.smoke);
}

/**
 * The working end of the desk. The monitor is dark until it is looked at, then
 * comes up the way a monitor comes up: a band of light, a fill, then lines.
 */
export function drawComputer(draw: Raster, frame: number, reveal: number): void {
  const on = Math.max(0, Math.min(1, reveal));

  draw(102, 26, 22, 16, palette.char);
  draw(103, 27, 20, 14, palette.ink);
  draw(111, 42, 4, 2, palette.char);

  const screen: ArtRect = { x: 104, y: 28, width: 18, height: 12 };
  if (on <= 0) {
    draw(screen.x, screen.y, screen.width, screen.height, palette.ink);
    draw(screen.x + 2, screen.y + 2, 6, 1, palette.char);
  } else if (on < 0.45) {
    draw(screen.x, screen.y, screen.width, screen.height, palette.ink);
    draw(screen.x, screen.y + 6, screen.width, 2, palette.glow);
  } else {
    draw(screen.x, screen.y, screen.width, screen.height, palette.blue3);
    draw(screen.x, screen.y, screen.width, 2, palette.blue2);
    const rows = Math.min(3, Math.floor((on - 0.45) / 0.18));
    for (let row = 0; row < rows; row += 1) {
      dashes(
        draw,
        screen.x + 2,
        screen.y + 3 + row * 3,
        14 - (row % 3) * 4,
        row % 2 === 0 ? palette.warm : palette.blue,
      );
    }
    if (on >= 1 && frame % 2 === 0) {
      draw(screen.x + 2, screen.y + 3 + rows * 3, 2, 1, palette.warm);
    }
  }

  // Keyboard, mouse, and a bare sensor board propped against the wall.
  draw(103, 42, 19, 2, palette.stone3);
  draw(104, 42, 17, 1, palette.stone2);
  draw(125, 42, 3, 2, palette.stone2);
  draw(128, 36, 6, 8, palette.green4);
  draw(129, 38, 4, 1, palette.orange2);
  draw(129, 41, 2, 1, palette.blue2);
  draw(128, 44, 6, 1, palette.char);
}

/**
 * The drawers under the window. Looking pulls the top one out and lifts the
 * paper in it far enough to see there is paper in it.
 */
export function drawDrawers(draw: Raster, reveal: number): void {
  const open = Math.max(0, Math.min(1, reveal));
  const pull = Math.round(open * 6);
  const rise = Math.round(open * 5);

  draw(136, DESK_TOP, 26, FLOOR_Y - DESK_TOP, palette.brown3);
  draw(137, DESK_TOP + 1, 24, FLOOR_Y - DESK_TOP - 2, palette.brown2);

  // A tray of paper on the top, and a pen across it.
  draw(140, DESK_TOP - 4, 15, 4, palette.cream);
  draw(140, DESK_TOP - 5, 12, 1, palette.glow);
  draw(143, DESK_TOP - 3, 9, 1, palette.stone2);
  draw(150, DESK_TOP - 6, 6, 1, palette.orange2);

  // Papers first, then the drawer front over them, so they read as inside it.
  if (rise > 0) {
    draw(140 - pull, DESK_TOP + 3 - rise, 16, rise + 2, palette.cream);
    draw(140 - pull, DESK_TOP + 3 - rise, 16, 1, palette.glow);
    dashes(draw, 142 - pull, DESK_TOP + 2 - Math.max(0, rise - 2), 11, palette.stone2);
  }

  draw(138 - pull, DESK_TOP + 3, 22, 6, palette.brown);
  draw(138 - pull, DESK_TOP + 3, 22, 1, palette.stone2);
  draw(145 - pull, DESK_TOP + 5, 8, 2, palette.brown3);
  if (pull > 0) draw(160 - pull, DESK_TOP + 3, 1, 6, palette.brown3);

  draw(138, DESK_TOP + 11, 22, 6, palette.brown);
  draw(138, DESK_TOP + 11, 22, 1, palette.stone2);
  draw(145, DESK_TOP + 13, 8, 2, palette.brown3);
}

/** The rail: what is worn, what is folded, and what is kicked off underneath. */
export function drawClothingRail(draw: Raster): void {
  const railY = 24;
  draw(168, railY, 36, 1, palette.char);
  draw(168, railY - 3, 1, 4, palette.char);
  draw(203, railY - 3, 1, 4, palette.char);

  const garments: readonly (readonly [number, number, number, string])[] = [
    [170, 7, 20, palette.hoodie],
    [178, 6, 15, palette.denim],
    [185, 7, 22, palette.green3],
    [193, 6, 17, palette.brown],
    [200, 5, 13, palette.stone2],
  ];
  for (const [x, garmentWidth, length, colour] of garments) {
    draw(x + (garmentWidth >> 1), railY - 2, 1, 3, palette.stone3);
    draw(x + 1, railY + 1, garmentWidth - 2, 2, colour);
    draw(x, railY + 3, garmentWidth, length, colour);
    draw(x, railY + 3, 1, length, palette.brown3);
  }

  // A stool with a folded stack on it, and a second pair of shoes below.
  draw(192, FLOOR_Y - 6, 13, 2, palette.brown2);
  draw(193, FLOOR_Y - 4, 2, 4, palette.brown3);
  draw(202, FLOOR_Y - 4, 2, 4, palette.brown3);
  draw(194, FLOOR_Y - 10, 10, 2, palette.blue3);
  draw(194, FLOOR_Y - 8, 10, 2, palette.stone2);

  draw(170, FLOOR_Y - 4, 8, 4, palette.brown3);
  draw(170, FLOOR_Y - 5, 5, 1, palette.brown3);
  draw(179, FLOOR_Y - 3, 7, 3, palette.char);
  draw(179, FLOOR_Y - 4, 4, 1, palette.char);
}

/**
 * The gaming corner. The screen wakes when it is looked at, but it never
 * displays a rank — there is no number here to display, and the room does not
 * invent one. What it shows is a lobby, and the card beside it says the rest.
 */
export function drawGamingRig(draw: Raster, frame: number, reveal: number): void {
  const on = Math.max(0, Math.min(1, reveal));

  // A headset on a wall hook above the desk.
  draw(210, 17, 1, 3, palette.char);
  draw(207, 20, 8, 1, palette.char);
  draw(207, 20, 2, 3, palette.char);
  draw(213, 20, 2, 3, palette.char);

  draw(206, DESK_TOP, 32, 3, palette.brown2);
  draw(207, DESK_TOP + 3, 2, FLOOR_Y - DESK_TOP - 3, palette.brown3);
  draw(235, DESK_TOP + 3, 2, FLOOR_Y - DESK_TOP - 3, palette.brown3);

  draw(215, 28, 20, 14, palette.ink);
  draw(216, 29, 18, 12, palette.char);
  draw(223, 42, 3, 2, palette.ink);

  const screen: ArtRect = { x: 217, y: 30, width: 16, height: 10 };
  if (on <= 0) {
    draw(screen.x, screen.y, screen.width, screen.height, palette.char);
    draw(screen.x + 1, screen.y + 1, 5, 1, palette.stone3);
  } else if (on < 0.45) {
    draw(screen.x, screen.y, screen.width, screen.height, palette.ink);
    draw(screen.x, screen.y + 5, screen.width, 2, palette.glow);
  } else {
    draw(screen.x, screen.y, screen.width, screen.height, palette.blue3);
    // A lobby: five slots along the top, one of them yours, and a map below.
    for (let slot = 0; slot < 5; slot += 1) {
      const filled = on >= 1 || slot < Math.round((on - 0.45) * 9);
      draw(
        screen.x + 1 + slot * 3,
        screen.y + 1,
        2,
        3,
        filled ? (slot === 2 ? palette.orange : palette.blue2) : palette.blue3,
      );
    }
    draw(screen.x + 1, screen.y + 5, 14, 4, palette.blue2);
    draw(screen.x + 3, screen.y + 7, 3, 1, palette.warm);
    draw(screen.x + 10, screen.y + 6, 3, 1, palette.orange2);
  }

  // The tower, its fan, and the one LED that never turns off.
  draw(206, FLOOR_Y - 15, 9, 15, palette.ink);
  wheel(draw, 207, FLOOR_Y - 12, 5, palette.stone3);
  draw(213, FLOOR_Y - 13, 1, 10, frame % 4 < 2 ? palette.orange : palette.orange2);
  draw(216, FLOOR_Y - 1, 12, 1, palette.char);
  draw(226, FLOOR_Y - 2, 8, 1, palette.char);
}

/**
 * The whole room, back to front: shell, window and props, then the six things
 * in the state the visitor has left them in.
 */
/** Boards and joists overhead, ending in the beam the wall runs up to. */
function drawCeiling(draw: Raster) {
  draw(0, 0, W, CEILING_H, palette.soilDark);
  for (let x = 8; x < W; x += 34) {
    draw(x, 0, 4, CEILING_H - 2, palette.ink);
  }
  draw(0, CEILING_H - 2, W, 2, palette.brown3);
  draw(0, CEILING_H - 2, W, 1, palette.brown2);
}

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
  drawWindow(draw, frame);
  drawLightSpill(draw);
  drawRug(draw);
  drawDoorway(draw);
  drawShelfCorner(draw);

  drawWallMap(draw, revealOf(reveal, "map"));
  drawStudyDesk(draw, frame, revealOf(reveal, "desk"));
  drawComputer(draw, frame, revealOf(reveal, "computer"));
  drawDrawers(draw, revealOf(reveal, "papers"));
  drawClothingRail(draw);
  drawGamingRig(draw, frame, revealOf(reveal, "rig"));
}
