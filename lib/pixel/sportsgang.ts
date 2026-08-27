import { palette } from "@/lib/pixel/palette";
import type { ArtRoutine, Raster, SpriteMap, SpriteRows } from "@/lib/pixel/raster";
import { dashes, hills, scatter, sprite, tree } from "@/lib/pixel/raster";

/**
 * Art for the SportsGang location.
 *
 * Same palette, same 12x16 character grid and same building language as the
 * world — this is a place inside Edward's World, not a separate visual system.
 * The only concession is a slightly wider canvas per character (18 columns) so
 * a racket has room to swing without changing anyone's proportions.
 */

export const PLAYER_ART_SIZE = { width: 18, height: 16 } as const;
export const VENUE_ART_SIZE = { width: 240, height: 135 } as const;

/** Court surface, the one place SportsGang is allowed its own accent. */
export const COURT_SURFACE = "#A97F52";
export const COURT_SURFACE_DARK = "#8E6A44";

const EDWARD_MAP: SpriteMap = {
  h: palette.hair,
  f: palette.skin,
  e: palette.ink,
  c: palette.hoodie,
  k: palette.stone3,
  p: palette.denim,
  s: palette.hair,
};

const OPPONENT_MAP: SpriteMap = {
  q: palette.blue3,
  h: palette.char,
  f: palette.skin,
  e: palette.ink,
  t: palette.blue2,
  k: palette.blue3,
  p: palette.denim,
  s: palette.char,
};

/** Edward, unchanged from the world: dark hair, oversized neutral hoodie. */
const EDWARD_BODY: SpriteRows = [
  ".....hhhh.........",
  "....hhhhhhh.......",
  "...hhhhhhhhh......",
  "...hhhfffff.......",
  "...hhhffeff.......",
  "...hhhfffff.......",
  "....ffffff........",
  "....kccccck.......",
  "...cccccccck......",
  "...cccccccck......",
  "...ccccccccf......",
  "...cccccccck......",
  "....pppppp........",
  "....pp.pp.........",
  "....pp.pp.........",
  "...sss.sss........",
];

/** Player 02: same build, a cap and a faded blue shirt so they read apart. */
const OPPONENT_BODY: SpriteRows = [
  ".....qqqq.........",
  "....qqqqqqq.......",
  "...qqqqqqqqq......",
  "...hhhfffff.......",
  "...hhhffeff.......",
  "....hfffff........",
  "....ffffff........",
  "....ktttttk.......",
  "...ttttttttk......",
  "...ttttttttk......",
  "...ttttttttf......",
  "...ttttttttk......",
  "....pppppp........",
  "....pp.pp.........",
  "....pp.pp.........",
  "...sss.sss........",
];

/** Legs apart, weight shifted — used while waiting for the ball. */
const READY_LEGS: SpriteRows = [
  "...pppppp.........",
  "...pp...pp........",
  "..pp.....pp.......",
  "..sss...sss.......",
];

function withReadyStance(body: SpriteRows): SpriteRows {
  return [...body.slice(0, 12), ...READY_LEGS];
}

/**
 * Racket poses. The racket is drawn as geometry rather than baked into the
 * sprite grid so the swing can be posed without four near-identical sprites.
 */
type RacketPose = "ready" | "back" | "contact";

interface RacketGeometry {
  readonly headX: number;
  readonly headY: number;
  readonly grip: readonly (readonly [number, number])[];
}

const RACKET_POSES: Readonly<Record<RacketPose, RacketGeometry>> = {
  ready: { headX: 13, headY: 7, grip: [[11, 10], [12, 10], [13, 9]] },
  back: { headX: 9, headY: 0, grip: [[12, 8], [12, 7], [11, 6], [10, 5]] },
  contact: { headX: 13, headY: 2, grip: [[12, 9], [12, 8], [13, 7], [13, 6]] },
};

function drawRacket(draw: Raster, pose: RacketPose) {
  const { headX, headY, grip } = RACKET_POSES[pose];
  // Head: a 4x5 hoop with two strung pixels.
  draw(headX, headY, 4, 1, palette.char);
  draw(headX, headY + 4, 4, 1, palette.char);
  draw(headX, headY + 1, 1, 3, palette.char);
  draw(headX + 3, headY + 1, 1, 3, palette.char);
  draw(headX + 1, headY + 1, 2, 3, palette.cream);
  draw(headX + 1, headY + 2, 2, 1, palette.stone2);
  for (const [x, y] of grip) draw(x, y, 1, 1, palette.brown3);
}

type PlayerFrame = "idle" | "ready" | "back" | "contact" | "greet";

function drawPlayer(
  draw: Raster,
  body: SpriteRows,
  map: SpriteMap,
  frame: PlayerFrame,
) {
  const stance = frame === "idle" || frame === "greet" ? body : withReadyStance(body);
  sprite(draw, 0, 0, stance, map);

  if (frame === "greet") {
    // A raised hand: the whole acknowledgement, nothing more.
    draw(12, 4, 2, 5, map.f ?? palette.skin);
    draw(12, 3, 2, 1, map.f ?? palette.skin);
    return;
  }

  drawRacket(draw, frame === "idle" ? "ready" : (frame as RacketPose));
}

/** Frame order the rally choreography steps through. */
export const PLAYER_FRAMES: readonly PlayerFrame[] = [
  "idle",
  "ready",
  "back",
  "contact",
  "greet",
];

export function makeEdwardRoutine(frame: PlayerFrame): ArtRoutine {
  return (draw) => drawPlayer(draw, EDWARD_BODY, EDWARD_MAP, frame);
}

export function makeOpponentRoutine(frame: PlayerFrame): ArtRoutine {
  return (draw) => drawPlayer(draw, OPPONENT_BODY, OPPONENT_MAP, frame);
}

/** Pre-built routines, so component effects get a stable function identity. */
export const edwardRoutines = Object.fromEntries(
  PLAYER_FRAMES.map((frame) => [frame, makeEdwardRoutine(frame)]),
) as Readonly<Record<PlayerFrame, ArtRoutine>>;

export const opponentRoutines = Object.fromEntries(
  PLAYER_FRAMES.map((frame) => [frame, makeOpponentRoutine(frame)]),
) as Readonly<Record<PlayerFrame, ArtRoutine>>;

export type { PlayerFrame };

/* ── Backdrops ────────────────────────────────────────────────────────────── */

const { width: VW, height: VH } = VENUE_ART_SIZE;
const HORIZON = 96;

function skyAndLand(draw: Raster, frame: number) {
  draw(0, 0, VW, 54, palette.sky);
  draw(0, 54, VW, 16, "#E4D9BF");
  draw(0, 70, VW, VH - 70, palette.sky2);

  for (const [startX, y, width] of [
    [20, 16, 16],
    [96, 28, 12],
    [150, 12, 14],
    [206, 30, 11],
  ] as const) {
    const x = ((startX + (frame >> 1)) % (VW + 30)) - 15;
    draw(x, y, width, 3, "#F2EAD6");
    draw(x + 3, y - 2, Math.max(5, width - 7), 2, "#F2EAD6");
  }

  hills(
    draw,
    [
      [0, 80],
      [70, 72],
      [140, 79],
      [200, 71],
      [240, 78],
    ],
    palette.farHill,
    HORIZON,
  );
  hills(
    draw,
    [
      [0, 87],
      [90, 82],
      [180, 88],
      [240, 84],
    ],
    palette.midHill,
    HORIZON,
  );

  for (let x = 0; x < VW; x += 7) {
    const height = 5 + (scatter(x) % 4);
    draw(x, HORIZON - 1 - height, 7, height, palette.treeline);
  }

  for (let x = 0; x < VW; x += 1) {
    draw(x, HORIZON, 1, 1, palette.green);
    draw(x, HORIZON + 1, 1, 3, palette.green2);
    draw(x, HORIZON + 4, 1, VH - HORIZON - 4, palette.soil);
    const noise = scatter(x);
    if (noise % 17 < 2) draw(x, HORIZON + 7 + (noise % 5), 1, 1, "#7A6252");
    if (noise % 29 < 3) draw(x, HORIZON + 14 + (noise % 9), 2, 1, palette.soilDark);
  }
  draw(0, VH - 3, VW, 3, "#40332A");
}

/**
 * The venue you arrive at: the SportsGang court seen from the approach, gated
 * and quiet. This is what sits behind the phone for the whole matchmaking flow.
 */
export const drawVenue: ArtRoutine = (draw, frame) => {
  skyAndLand(draw, frame);

  // Perimeter fence with the court beyond it.
  draw(28, 84, 184, 3, COURT_SURFACE_DARK);
  draw(28, 87, 184, 9, COURT_SURFACE);
  for (let x = 34; x < 208; x += 12) draw(x, 88, 6, 1, palette.cream);
  for (let x = 24; x <= 216; x += 8) draw(x, 66, 1, 30, palette.brown2);
  draw(24, 68, 193, 1, palette.brown2);
  draw(24, 80, 193, 1, palette.brown2);
  draw(24, 92, 193, 1, palette.brown2);

  // Clubhouse.
  draw(40, 44, 46, 4, palette.brown3);
  draw(43, 48, 40, 22, palette.paper);
  draw(43, 48, 40, 1, palette.stone);
  draw(43, 40, 40, 6, palette.char);
  dashes(draw, 47, 43, 30, palette.cream);
  draw(48, 54, 10, 8, palette.warm);
  draw(47, 53, 12, 1, palette.brown3);
  draw(66, 56, 8, 14, palette.brown3);
  draw(72, 63, 1, 1, palette.orange);
  draw(41, 68, 44, 2, palette.stone2);

  // Scoreboard on posts, blank between matches.
  draw(140, 54, 2, 12, palette.char);
  draw(152, 54, 2, 12, palette.char);
  draw(134, 40, 26, 15, palette.char);
  draw(135, 41, 24, 13, "#37332B");
  dashes(draw, 138, 45, 18, palette.stone3);
  dashes(draw, 138, 50, 12, palette.stone3);

  // Floodlights.
  for (const x of [30, 206] as const) {
    draw(x, 30, 1, 36, palette.char);
    draw(x - 3, 27, 7, 4, palette.stone2);
    draw(x - 2, 28, 5, 2, frame % 3 === 0 ? palette.warm : palette.stone);
  }

  tree(draw, 6, HORIZON, 2, frame);
  tree(draw, 224, HORIZON, 1, frame);
  tree(draw, 232, HORIZON, 0, frame);

  // Edward, arrived and standing at the gate. Drawn into the scene so he stays
  // planted on the ground line at every viewport aspect.
  sprite(draw, 98, HORIZON - 16, EDWARD_BODY, EDWARD_MAP);
};

/**
 * Court-side: the same place with the fence pushed back and the camera down at
 * playing level. Cross-faded in underneath the court as it expands.
 */
export const drawCourtside: ArtRoutine = (draw, frame) => {
  skyAndLand(draw, frame);

  // Fence line behind the baseline, lower and further away than at the venue.
  for (let x = 8; x <= 232; x += 10) draw(x, 72, 1, 24, palette.brown2);
  draw(8, 74, 225, 1, palette.brown2);
  draw(8, 84, 225, 1, palette.brown2);

  // Benches and a windbreak banner, so the far side is not empty.
  draw(26, 88, 16, 1, palette.brown);
  draw(26, 89, 16, 2, palette.brown2);
  draw(27, 91, 1, 3, palette.brown3);
  draw(40, 91, 1, 3, palette.brown3);

  draw(150, 76, 40, 10, palette.char);
  dashes(draw, 155, 80, 30, palette.cream);

  draw(200, 88, 16, 1, palette.brown);
  draw(200, 89, 16, 2, palette.brown2);
  draw(201, 91, 1, 3, palette.brown3);
  draw(214, 91, 1, 3, palette.brown3);

  for (const x of [14, 220] as const) {
    draw(x, 40, 1, 56, palette.char);
    draw(x - 3, 37, 7, 4, palette.stone2);
    draw(x - 2, 38, 5, 2, frame % 3 === 0 ? palette.warm : palette.stone);
  }

  tree(draw, 100, 72, 1, frame);
  tree(draw, 120, 72, 0, frame);
};
