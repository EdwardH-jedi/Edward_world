import { palette } from "@/lib/pixel/palette";
import type { ArtRoutine, Raster, SpriteMap, SpriteRows } from "@/lib/pixel/raster";
import { sprite } from "@/lib/pixel/raster";

/**
 * Character sprites, authored on the 16x24 grid the character asset spec
 * recommends (`docs/CHARACTER_ASSET_SPEC.md`).
 *
 * Edward is drawn from photo reference. At this scale a likeness is carried by
 * hair silhouette, outfit shape and palette, so those are what the sprite
 * commits to: a full, near-black two-block cut with a straight fringe that
 * sits on the eyebrows, a white earbud in the ear, a black zip-collar shirt
 * with the zip read as a single lighter seam, dark slate jeans and white
 * sneakers. The shirt sits one step above the outline and the hair one step
 * below it, so the upper body is one dark silhouette against the cream sky
 * that still separates from a dark facade, and the face, the earbud, the zip
 * and the shoes are the only light reads.
 *
 * Everything is authored as whole art pixels, so the sprite scales by integers
 * only and never picks up a soft edge. The hitbox is `player.size` in
 * `data/world.ts` and is not this grid; `getAvatarAnchor` places the art on it.
 */

export const EDWARD_ART_SIZE = { width: 16, height: 24 } as const;

/**
 * The column at the middle of Edward's head, by the way he faces: the head
 * spans columns 5-11 in profile, and the sprite is mirrored to face left. The
 * prompt bubble's tail points here, and the head reaches the sprite's top row
 * (or the one under it, on the breathing frame) in this column in every pose.
 */
export const EDWARD_HEAD_COLUMN = { right: 8, left: 7 } as const;

/** Poses the world actually asks for. `walk` doubles as the standing side idle. */
export type EdwardPose = "walk" | "front" | "back" | "inspect";

const EDWARD_MAP: SpriteMap = {
  h: palette.hair,
  H: palette.hairLift,
  f: palette.skin,
  g: palette.skinShade,
  m: palette.skinShade,
  e: palette.ink,
  w: palette.glow,
  j: palette.jacketLift,
  J: palette.char,
  z: palette.stone3,
  p: palette.navy,
  P: palette.navy2,
  s: palette.cream,
  S: palette.stone2,
  o: palette.playerOutline,
};

const { width: W, height: H } = EDWARD_ART_SIZE;
const EMPTY_ROW = ".".repeat(W);

/**
 * Contact shadow. Translucent rather than a flat swatch so the same sprite
 * grounds itself on grass, dirt, a floorboard or an arcade carpet without the
 * world having to tell it what it is standing on.
 */
const SHADOW_WIDE = "rgba(30, 27, 23, 0.12)";
const SHADOW_CORE = "rgba(30, 27, 23, 0.14)";

/* ── Front ──────────────────────────────────────────────────────────────── */

/**
 * The canonical pose, facing the visitor. The fringe is a straight band with
 * two notches of forehead showing through its tips, which is what separates
 * a cut fringe from a helmet; the earbuds sit on both ears.
 */
const EDWARD_FRONT: SpriteRows = [
  ".....hhhhhh.....",
  "....hhhhhhhh....",
  "...hhHHhhhhhhh..",
  "...hhhhhhhhhhh..",
  "..hhhhhhhhhhhhh.",
  "..hhhhhhhhhhhhh.",
  "..hhhffhhhhffhh.",
  ".hwffffffffffwh.",
  "..hffeffffffeff.",
  "...gffffffffffg.",
  "....gffffmfffg..",
  ".....gffffffg...",
  "......jjzzjj....",
  "....jjjjjzzjjjj.",
  "...jjjjjjzjjjjjj",
  "...jJjjjjzjjjjjj",
  "...jJjjjjzjjjjjj",
  "...fjjjjjzjjjjjf",
  "....ppppppppppp.",
  "....pppppPppppp.",
  "....ppppp.ppppp.",
  "....ppppp.ppppp.",
  "....sssss.sssss.",
  "....SSSSS.SSSSS.",
];

/* ── Back ───────────────────────────────────────────────────────────────── */

/** Walking away: all hair, the ears just showing under the two-block. */
const EDWARD_BACK: SpriteRows = [
  ".....hhhhhh.....",
  "....hhhhhhhh....",
  "...hhhhhhHHhhh..",
  "...hhhhhhhhhhh..",
  "..hhhhhhhhhhhhh.",
  "..hhhhhhhhhhhhh.",
  "..hhhhhhhhhhhhh.",
  "..hhhhhhhhhhhhh.",
  "..hhhhhhhhhhhhh.",
  "...hhhhhhhhhhhh.",
  "....ffhhhhhhff..",
  ".....gffffffg...",
  "......jjjjjj....",
  "....jjjjjjjjjjj.",
  "...jjjjjjjjjjjjj",
  "...jJjjjjjjjjjjj",
  "...jJjjjjjjjjjjj",
  "...fjjjjjjjjjjjf",
  "....ppppppppppp.",
  "....pppppPppppp.",
  "....ppppp.ppppp.",
  "....ppppp.ppppp.",
  "....sssss.sssss.",
  "....SSSSS.SSSSS.",
];

/* ── Side ───────────────────────────────────────────────────────────────── */

/**
 * Head, neck and torso for every side frame, turned three-quarters to the
 * right. `flipX` on the canvas gives the left-facing walk. Seventeen rows;
 * the last three carry the arms and are swapped per frame.
 */
const EDWARD_SIDE_UPPER: SpriteRows = [
  ".....hhhhhhh....",
  "....hhhhhhhhhh..",
  "...hhHHhhhhhhhh.",
  "...hhhhhhhhhhhhh",
  "...hhhhhhhhhhhhh",
  "...hhhhhhhhhfhfh",
  "...hhhwhhfefffef",
  "....hhhgffffffff",
  ".....gfffffffff.",
  "......ggffffmg..",
  ".......jzffzj...",
  ".....jjjjzzjjjj.",
  "....jjjjjjzjjjjj",
  "....jJjjjjzjjjjj",
  "....jJjjjjzjjjjj",
  "....jJjjjjzjjjjj",
  "....fjjjjjzjjjj.",
];

/** Rows 14–16 of the side upper: the near arm at rest, swung forward, swung back. */
const EDWARD_ARMS: Readonly<Record<"rest" | "forward" | "back", SpriteRows>> = {
  rest: ["....jJjjjjzjjjjj", "....jJjjjjzjjjjf", "....fjjjjjzjjjj."],
  forward: ["....jJjjjjzjjjjj", "....jJjjjjzjjjJf", "....jjjjjjzjjjj."],
  back: ["...jJjjjjjzjjjjj", "...fjJjjjjzjjjjj", "....jjjjjjzjjjj."],
};

function sideUpper(arm: keyof typeof EDWARD_ARMS): SpriteRows {
  return [...EDWARD_SIDE_UPPER.slice(0, 14), ...EDWARD_ARMS[arm]];
}

/**
 * Legs. The passing frames stand tall on seven rows; the contact frames
 * spread the stride over six, so the whole body sits one pixel lower on
 * them — the bob of a walk, done with the feet rather than the head.
 */
const LEGS_PASSING: readonly SpriteRows[] = [
  [
    ".....ppppppppp..",
    ".....ppppPpppp..",
    ".....pppp.pppp..",
    ".....pppp.pppp..",
    ".....pppp.pppp..",
    ".....ssss.ssss..",
    ".....SSSS.SSSS..",
  ],
  [
    ".....ppppppppp..",
    ".....ppppPpppp..",
    ".....pppp.pppp..",
    ".....pppp.pppp..",
    "......ppp..ppp..",
    ".....ssss.ssss..",
    ".....SSSS.SSSS..",
  ],
];

const LEGS_CONTACT: readonly SpriteRows[] = [
  // Near leg forward.
  [
    ".....ppppppppp..",
    "....ppppP.pppp..",
    "....ppp...pppp..",
    "...ppp.....ppp..",
    "...ssss....ssss.",
    "...SSSS....SSSS.",
  ],
  // Far leg forward.
  [
    ".....ppppppppp..",
    "....pppp.Ppppp..",
    "....pppp...ppp..",
    "...ppp.....ppp..",
    "...ssss....ssss.",
    "...SSSS....SSSS.",
  ],
];

function sideFrame(arm: keyof typeof EDWARD_ARMS, legs: SpriteRows): SpriteRows {
  const upper = sideUpper(arm);
  const drop = H - upper.length - legs.length;
  return [...Array<string>(drop).fill(EMPTY_ROW), ...upper, ...legs];
}

/**
 * Four-step walk cycle: contact, pass, contact, pass. Index 0 doubles as the
 * standing side idle. Every frame is distinct — the arms swing against the
 * legs and the two passing frames differ in the trailing foot.
 */
const EDWARD_WALK: readonly SpriteRows[] = [
  sideFrame("forward", LEGS_CONTACT[0]),
  sideFrame("rest", LEGS_PASSING[0]),
  sideFrame("back", LEGS_CONTACT[1]),
  sideFrame("rest", LEGS_PASSING[1]),
];

/** Side view with the near hand raised, for looking something over. */
const EDWARD_INSPECT: SpriteRows = [
  ...EDWARD_SIDE_UPPER.slice(0, 10),
  ".......jzffzj..f",
  ".....jjjjzzjjjjf",
  "....jJjjjjzjjjjf",
  "....jJjjjjzjjjjJ",
  "....jJjjjjzjjjJ.",
  "....jJjjjjzjjjj.",
  "....fjjjjjzjjjj.",
  ...LEGS_PASSING[0],
];

/* ── Outline ────────────────────────────────────────────────────────────── */

/**
 * Turns the outermost ring of a sprite into the 1px player outline.
 *
 * Done inside the grid, replacing edge pixels rather than adding a ring
 * outside them, so the silhouette — and with it the hitbox, the anchor and
 * every bounds test — is exactly what it was. A pixel is "edge" when any of
 * its four neighbours is transparent or off the sprite.
 */
function outlined(rows: SpriteRows): SpriteRows {
  const solid = (x: number, y: number) => (rows[y]?.[x] ?? ".") !== ".";
  return rows.map((row, y) =>
    Array.from(row, (cell, x) =>
      cell !== "." &&
      !(solid(x - 1, y) && solid(x + 1, y) && solid(x, y - 1) && solid(x, y + 1))
        ? "o"
        : cell,
    ).join(""),
  );
}

/* ── Drawing ────────────────────────────────────────────────────────────── */

/**
 * Art pixels travelled per walk-cycle frame.
 *
 * Scaled with the walking speed (5 at 280px/s, 8 at 480) so the legs keep
 * their original ~15 steps a second. Left at 5 the speed rise alone would have
 * turned the walk into a sprint without anyone choosing that.
 */
const WALK_FRAME_DISTANCE = 8;

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
  draw(2, H - 1, W - 4, 1, SHADOW_WIDE);
  draw(3, H - 1, W - 6, 1, SHADOW_CORE);
}

/** Row at which a standing pose's legs begin: everything above it breathes. */
const STANDING_LEG_ROW = 18;

/**
 * Eyes closed: the eye pixels take the skin's shade for one tick. Every eighth
 * ambient frame (3.6s), which is a blink, not a twitch; it is never on frames
 * 0–3 so the breath and outline contracts are unaffected.
 */
const BLINK_EVERY = 8;
const BLINK_FRAME = 6;
const EDWARD_MAP_BLINK: SpriteMap = { ...EDWARD_MAP, e: palette.skinShade };

/**
 * The standing poses breathe on the ambient tick: the whole upper body drops
 * one pixel on every other beat while the feet stay planted, and he blinks
 * now and then. One pixel at 450ms is deliberately below the threshold of
 * looking animated.
 */
function drawStanding(source: SpriteRows, draw: Raster, frame: number) {
  const rows = outlined(source);
  const bob = frame % 2 === 1 ? 1 : 0;
  const map = frame % BLINK_EVERY === BLINK_FRAME ? EDWARD_MAP_BLINK : EDWARD_MAP;
  shadow(draw);
  sprite(draw, 0, bob, rows.slice(0, STANDING_LEG_ROW), map);
  sprite(draw, 0, STANDING_LEG_ROW, rows.slice(STANDING_LEG_ROW), map);
}

function drawSide(draw: Raster, frame: number) {
  const rows = EDWARD_WALK[frame % EDWARD_WALK.length];
  shadow(draw);
  sprite(draw, 0, 0, outlined(rows), EDWARD_MAP);
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

/**
 * Which pose and frame to draw. Standing animation (inspect, breathing) waits
 * for him to settle: an Edward who has only just stopped holds the walk's idle
 * frame, even beside something he could look over.
 */
export function selectEdwardLook(state: {
  moving: boolean;
  settled: boolean;
  nearBuildingLocked: boolean;
  nearObject: boolean;
  walkFrame: number;
  ambientFrame: number;
}): { pose: EdwardPose; frame: number } {
  if (state.moving) return { pose: "walk", frame: state.walkFrame };
  if (state.nearBuildingLocked) return { pose: "back", frame: state.ambientFrame };
  if (!state.settled) return { pose: "walk", frame: 0 };
  return {
    pose: state.nearObject ? "inspect" : "front",
    frame: state.ambientFrame,
  };
}

/** The side walk cycle, for the surfaces that only ever walk him left and right. */
export const drawEdward: ArtRoutine = edwardPoses.walk;

/* ── Anchoring ──────────────────────────────────────────────────────────── */

/**
 * Where a character sprite sits inside its *gameplay* footprint.
 *
 * The two are not the same rectangle and must not be assumed to be. `size` in
 * `data/world.ts` is the hitbox — the only rectangle movement, world bounds,
 * the camera and proximity ever read. This returns the rectangle the art is
 * drawn into: anchored feet-down and centred horizontally, so art on a taller
 * or wider grid grows upward and outward from the same standing point instead
 * of shifting where the player actually is.
 *
 * With the 16x24 art on the 48x64 footprint at unit 4 the sprite overhangs by
 * 8 CSS px each side and 32 above; the feet and the standing point agree.
 */
export function getAvatarAnchor(
  art: { readonly width: number; readonly height: number },
  hitbox: { readonly width: number; readonly height: number },
  unit: number,
) {
  const width = art.width * unit;
  const height = art.height * unit;
  return {
    width,
    height,
    // Snapped to the art grid: a half-art-pixel offset would put the whole
    // sprite off the grid the rest of the world is drawn on.
    left: Math.round((hitbox.width - width) / 2 / unit) * unit,
    top: hitbox.height - height,
  };
}
