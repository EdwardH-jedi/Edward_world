import { palette } from "@/lib/pixel/palette";
import type { ArtRoutine, SpriteMap, SpriteRows } from "@/lib/pixel/raster";
import { sprite } from "@/lib/pixel/raster";

/**
 * Character sprites, authored on the approved 12x16 grid.
 *
 * Edward is deliberately ordinary: dark hair, an oversized neutral hoodie, no
 * weapon and no franchise prop. He is a normal person inside a strange world.
 */

export const EDWARD_ART_SIZE = { width: 12, height: 16 } as const;
export const TOMODACHI_ART_SIZE = { width: 12, height: 11 } as const;

const EDWARD_MAP: SpriteMap = {
  h: palette.hair,
  f: palette.skin,
  e: palette.ink,
  c: palette.hoodie,
  k: palette.stone3,
  p: palette.denim,
  s: palette.hair,
};

/** Head and torso are shared by every frame; only the limbs animate. */
const EDWARD_UPPER: SpriteRows = [
  "....hhhh....",
  "...hhhhhhh..",
  "..hhhhhhhhh.",
  "..hhhfffff..",
  "..hhhffeff..",
  "..hhhfffff..",
  "...ffffff...",
  "...kccccck..",
  "..cccccccck.",
  "..cccccccck.",
];

/** Arm at rest, arm swung forward, arm swung back. */
const EDWARD_ARMS: readonly SpriteRows[] = [
  ["..ccccccccf.", "..cccccccck."],
  ["..cccccccff.", "..cccccccck."],
  ["..fccccccck.", "..cccccccck."],
];

/** Contact, passing and reach poses for the legs. */
const EDWARD_LEGS: readonly SpriteRows[] = [
  ["...pppppp...", "...pp.pp....", "...pp.pp....", "..sss.sss..."],
  ["...pppppp...", "...ppppp....", "..pp...pp...", ".sss...sss.."],
  ["...pppppp...", "...pp.pp....", "...pp.pp....", "..sss.sss..."],
  ["...pppppp...", "....ppppp...", "...pp...pp..", "..sss...sss."],
];

function edwardFrame(armIndex: number, legIndex: number): SpriteRows {
  return [
    ...EDWARD_UPPER,
    ...EDWARD_ARMS[armIndex],
    ...EDWARD_LEGS[legIndex],
  ];
}

/** Four-step walk cycle. Index 0 doubles as the idle pose. */
const EDWARD_WALK: readonly SpriteRows[] = [
  edwardFrame(0, 0),
  edwardFrame(1, 1),
  edwardFrame(0, 2),
  edwardFrame(2, 3),
];

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

export function drawEdward(draw: Parameters<ArtRoutine>[0], frame: number) {
  sprite(draw, 0, 0, EDWARD_WALK[frame % EDWARD_WALK.length], EDWARD_MAP);
}

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
