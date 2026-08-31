import { palette } from "@/lib/pixel/palette";
import type { ArtRoutine, Raster, SpriteMap, SpriteRows } from "@/lib/pixel/raster";
import { sprite } from "@/lib/pixel/raster";

/**
 * Character sprites, authored on the approved 12x16 grid.
 *
 * Edward is drawn from the concept board's approved `AVATAR` model sheet: a
 * full, rounded head of near-black hair parted in the middle into a curtain
 * fringe, a slim youthful face with two dark eyes and no mouth at this scale,
 * and a slim body. The outfit is the approved direction — dark slate-navy
 * outerwear over a light shirt, dark trousers, dark shoes, and a brown
 * messenger bag worn across the body.
 *
 * Everything is authored as whole art pixels on the 12x16 grid, so the sprite
 * scales by integers only and never picks up a soft edge.
 */

export const EDWARD_ART_SIZE = { width: 12, height: 16 } as const;
export const TOMODACHI_ART_SIZE = { width: 12, height: 11 } as const;

/** Poses the world actually asks for. `walk` doubles as the standing side idle. */
export type EdwardPose = "walk" | "front" | "back" | "inspect";

const EDWARD_MAP: SpriteMap = {
  h: palette.hair,
  H: palette.hairLift,
  f: palette.skin,
  g: palette.skinShade,
  e: palette.ink,
  c: palette.navy,
  C: palette.navy2,
  w: palette.shirt,
  p: palette.denim,
  s: palette.ink,
  t: palette.brown2,
  b: palette.brown3,
};

/**
 * Contact shadow. Translucent rather than a flat swatch so the same sprite
 * grounds itself on grass, dirt, a floorboard or an arcade carpet without the
 * world having to tell it what it is standing on.
 */
const SHADOW_WIDE = "rgba(30, 27, 23, 0.12)";
const SHADOW_CORE = "rgba(30, 27, 23, 0.14)";

/* ── Front ──────────────────────────────────────────────────────────────── */

/**
 * The canonical pose, straight off the approved model sheet. The middle part
 * only reads from the front — the two hair highlights either side of an
 * unlit centre are what make it a curtain fringe and not a helmet.
 */
const EDWARD_FRONT: SpriteRows = [
  "....hhhh....",
  "...HHhhHH...",
  "..hHHhhHHh..",
  "..hhffffhh..",
  "..hffffffh..",
  "..hfeffefh..",
  "...ffffff...",
  "...cwffwc...",
  "..tccwwccc..",
  ".cctcwwcccC.",
  ".ccctccccCC.",
  ".fccctcccCf.",
  "..pppppppp..",
  "..ppp..ppp..",
  "..ppp..ppp..",
  "..sss..sss..",
];

/* ── Back ───────────────────────────────────────────────────────────────── */

/** Walking away: all hair, no face, and the bag now clearly on his back. */
const EDWARD_BACK: SpriteRows = [
  "....hhhh....",
  "...HHhhHH...",
  "..hHHhhHHh..",
  "..hhhhhhhh..",
  "..hhhhhhhh..",
  "..hhhhhhhh..",
  "...hhhhhh...",
  "...cchhcc...",
  "..cctcccccc.",
  ".ccctttccCC.",
  ".ccctbbbbCC.",
  ".fcctbbbbCf.",
  "..pppppppp..",
  "..ppp..ppp..",
  "..ppp..ppp..",
  "..sss..sss..",
];

/* ── Side ───────────────────────────────────────────────────────────────── */

/**
 * Head, neck and shoulders for every side frame, turned three-quarters to the
 * right. `flipX` on the canvas gives the left-facing walk, which also swaps
 * the bag to the other shoulder — the ordinary cost of a mirrored 2D sprite.
 */
const EDWARD_SIDE_UPPER: SpriteRows = [
  "....hhhh....",
  "...hHhhhh...",
  "..hhHhhhhh..",
  "..hhhhhffh..",
  "..hhhffeff..",
  "..hhhffffg..",
  "...hffffg...",
  "...cwffc....",
  "..cccccctc..",
  ".cccccctccC.",
];

/**
 * Rows 10 and 11: the messenger bag riding on the back hip, and the near arm.
 * Rest, swung forward, swung back.
 */
const EDWARD_ARMS: readonly SpriteRows[] = [
  ["ttbcccccccc.", ".tbbcccccccf"],
  ["ttbccccccccf", ".tbbccccccc."],
  ["ttbcccccccc.", ".tbbccccccc."],
];

/** Contact, passing and reach poses for the legs. */
const EDWARD_LEGS: readonly SpriteRows[] = [
  ["..pppppppp..", "..ppp..ppp..", "..ppp..ppp..", "..sss..sss.."],
  ["..pppppppp..", "...ppppp....", "..pp...pp...", ".sss...sss.."],
  ["..pppppppp..", "..ppp..ppp..", "..ppp..ppp..", "..sss..sss.."],
  ["..pppppppp..", "....ppppp...", "...pp...pp..", "..sss...sss."],
];

function sideFrame(armIndex: number, legIndex: number): SpriteRows {
  return [
    ...EDWARD_SIDE_UPPER,
    ...EDWARD_ARMS[armIndex],
    ...EDWARD_LEGS[legIndex],
  ];
}

/** Four-step walk cycle. Index 0 doubles as the standing side idle. */
const EDWARD_WALK: readonly SpriteRows[] = [
  sideFrame(0, 0),
  sideFrame(1, 1),
  sideFrame(0, 2),
  sideFrame(2, 3),
];

/** Side view with the near hand raised, for looking something over. */
const EDWARD_INSPECT: SpriteRows = [
  ...EDWARD_SIDE_UPPER.slice(0, 8),
  "..cccccctcf.",
  ".cccccctccf.",
  "ttbcccccccc.",
  ".tbbccccccc.",
  ...EDWARD_LEGS[0],
];

/* ── Drawing ────────────────────────────────────────────────────────────── */

/** Art pixels of travel per walk frame. Tied to distance, not to time. */
const WALK_FRAME_DISTANCE = 5;

/**
 * Selects a walk frame from distance travelled so the feet stay in step with
 * the ground no matter the frame rate. Standing still resolves to the idle pose.
 */
export function getWalkFrame(worldX: number, unit: number, moving: boolean) {
  if (!moving) return 0;
  const artX = Math.floor(worldX / unit);
  return Math.floor(artX / WALK_FRAME_DISTANCE) % EDWARD_WALK.length;
}

function shadow(draw: Raster) {
  draw(1, 15, 10, 1, SHADOW_WIDE);
  draw(2, 15, 8, 1, SHADOW_CORE);
}

/**
 * The standing poses breathe on the ambient tick: the whole upper body drops
 * one pixel on every other beat while the feet stay planted. One pixel at
 * 450ms is deliberately below the threshold of looking animated.
 */
function drawStanding(rows: SpriteRows, draw: Raster, frame: number) {
  const bob = frame % 2 === 1 ? 1 : 0;
  shadow(draw);
  sprite(draw, 0, bob, rows.slice(0, 12), EDWARD_MAP);
  sprite(draw, 0, 12, rows.slice(12), EDWARD_MAP);
}

function drawSide(draw: Raster, frame: number) {
  const index = frame % EDWARD_WALK.length;
  shadow(draw);
  sprite(draw, 0, 0, EDWARD_WALK[index], EDWARD_MAP);
  // Passing frames get the coat hem lifting off the leg and the bag catching
  // up half a beat late. Two pixels is the whole of the secondary motion.
  if (index % 2 === 1) {
    draw(10, 12, 1, 1, palette.navy);
    draw(1, 12, 1, 1, palette.brown3);
  }
}

/**
 * Every pose Edward can be drawn in, as stable module-level routines so the
 * canvas only redraws when the pose or the frame actually changes.
 *
 * `walk` reads its frame as a walk-cycle index; the standing poses read theirs
 * as the ambient tick.
 */
export const edwardPoses: Readonly<Record<EdwardPose, ArtRoutine>> = {
  walk: drawSide,
  front: (draw, frame) => drawStanding(EDWARD_FRONT, draw, frame),
  back: (draw, frame) => drawStanding(EDWARD_BACK, draw, frame),
  inspect: (draw, frame) => drawStanding(EDWARD_INSPECT, draw, frame),
};

/** The side walk cycle, for the surfaces that only ever walk him left and right. */
export const drawEdward: ArtRoutine = edwardPoses.walk;

/* ── TOMODACHI ──────────────────────────────────────────────────────────── */

const TOMODACHI_MAP: SpriteMap = {
  b: palette.crtShell,
  z: palette.cream,
  s: palette.char,
  E: palette.cream,
  o: palette.cream,
  e: palette.cream,
  m: palette.stone3,
  f: palette.hair,
};

/** Chunky beige CRT, one small eye and one big. Never dominates the frame. */
const TOMODACHI_ROWS: SpriteRows = [
  ".bbbbbbbbbb.",
  "bzzzzzzzzzzb",
  "bzsssssssszb",
  "bzsEEE..e.zb",
  "bzsEoE....zb",
  "bzsEEE.mm.zb",
  "bzzzzzzzzzzb",
  ".bbbbbbbbbb.",
  "..f......f..",
  "..f......f..",
  ".fff....fff.",
];

export const drawTomodachi: ArtRoutine = (draw, frame) => {
  // Idles with a one pixel bob, so it reads as alive without pulling focus.
  const bob = frame % 4 < 2 ? 0 : 1;
  sprite(draw, 0, bob, TOMODACHI_ROWS, TOMODACHI_MAP);
  if (frame % 5 === 0) draw(3, 3 + bob, 3, 3, palette.char);
  if (frame % 7 === 0) draw(8, 3 + bob, 1, 1, palette.char);
};
