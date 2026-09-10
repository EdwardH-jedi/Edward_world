import { palette } from "@/lib/pixel/palette";
import type { ArtRoutine, Raster, SpriteMap, SpriteRows } from "@/lib/pixel/raster";
import { sprite } from "@/lib/pixel/raster";

/**
 * Tennis swing art, and the pose geometry the simulation hits with.
 *
 * The important thing in this file is not the drawing — it is that the racket
 * head's position is **data**, and both the renderer and `advanceTennis` read
 * the same table. Before this, the simulation contacted the ball at the
 * sprite's canvas centre while the racket was drawn six art pixels to the
 * right and three above it, so a "PERFECT" strike showed the ball passing
 * under a racket it never touched. There is now one number for where the
 * racket is, and the picture and the physics are both derived from it.
 *
 * ## Why the body sprite is duplicated here
 *
 * `lib/pixel/sportsgang.ts` is frozen for this pass and keeps `EDWARD_BODY`,
 * `OPPONENT_BODY` and `withReadyStance` module-private, so posing the racket
 * freely is impossible from outside it. The rows below are copied **verbatim**
 * so the players stay the same two people, and `HANDOFF-A.md` carries the
 * request to export them so this copy can be deleted.
 */

/* ── Bodies, copied verbatim from lib/pixel/sportsgang.ts ─────────────────── */

const EDWARD_MAP: SpriteMap = {
  h: palette.hair,
  f: palette.skin,
  e: palette.ink,
  c: palette.navy,
  k: palette.navy2,
  H: palette.hairLift,
  g: palette.skinShade,
  w: palette.shirt,
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

const EDWARD_BODY: SpriteRows = [
  ".....hhhh.........",
  "....hHhhhh........",
  "...hhHhhhhh.......",
  "...hhhhhffh.......",
  "...hhhffeff.......",
  "...hhhffffg.......",
  "....hffffg........",
  "....kwcccck.......",
  "...cccccccck......",
  "...cccccccck......",
  "...ccccccccf......",
  "...cccccccck......",
  "....pppppp........",
  "....pp.pp.........",
  "....pp.pp.........",
  "...sss.sss........",
];

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

const READY_LEGS: SpriteRows = [
  "...pppppp.........",
  "...pp...pp........",
  "..pp.....pp.......",
  "..sss...sss.......",
];

/** Legs apart, weight shifted. Every swing is played from this stance. */
function withReadyStance(body: SpriteRows): SpriteRows {
  return [...body.slice(0, 12), ...READY_LEGS];
}

/** Braced wide and low — the split-step a smash or a serve is hit from. */
const REACH_LEGS: SpriteRows = [
  "...pppppp.........",
  "..pp.....pp.......",
  ".pp.......pp......",
  "sss.......sss.....",
];

function withReachStance(body: SpriteRows): SpriteRows {
  return [...body.slice(0, 12), ...REACH_LEGS];
}

/* ── Swing geometry ───────────────────────────────────────────────────────── */

export const TENNIS_SWINGS = [
  "FOREHAND",
  "BACKHAND",
  "SERVE",
  "VOLLEY",
  "SMASH",
] as const;

export type TennisSwing = (typeof TENNIS_SWINGS)[number];

/** One racket head placement. `headX`/`headY` are the head's top-left cell. */
export interface RacketPose {
  /** Where in the swing this pose sits, 0 at the first frame, 1 at recovery. */
  readonly at: number;
  readonly headX: number;
  readonly headY: number;
  /** Grip cells from the hand to the throat of the racket. */
  readonly grip: readonly (readonly [number, number])[];
}

/** The racket head is a 4x5 hoop; these are its half-extents in art pixels. */
export const RACKET_HEAD = { width: 4, height: 5 } as const;

/**
 * Five swings, each a path rather than a frame.
 *
 * Every entry runs prep → accelerate → impact → follow-through → recover, and
 * the poses are chosen so the five are told apart at a glance while stopped:
 * the prep positions are all different, and so are the follow-throughs.
 *
 *  - **FOREHAND** waits low beside the racket arm, meets the ball in front,
 *    and finishes high across the body.
 *  - **BACKHAND** prepares across the body on the far side, meets the ball
 *    slightly lower, and finishes high on the racket side — the mirror of the
 *    forehand, not a re-timed copy of it.
 *  - **SERVE** goes straight up behind the head and comes down through the
 *    ball. It is the only swing with a toss.
 *  - **VOLLEY** barely prepares at all: a short punch forward and a stop. Its
 *    whole duration is half a forehand's.
 *  - **SMASH** is the serve's shape with more of everything — highest prep,
 *    overhead contact, and a follow-through that finishes past the knee.
 */
export const SWING_POSES: Readonly<Record<TennisSwing, readonly RacketPose[]>> = {
  // Groundstrokes are struck low, because that is where a bounced ball is: a
  // serve peaks at about 6.9 after its bounce, and a racket posed at chest
  // height simply passes over every one of them. The impact rows below put
  // the strings where the ball actually arrives.
  FOREHAND: [
    { at: 0.0, headX: 14, headY: 11, grip: [[12, 11], [13, 11], [13, 10]] },
    { at: 0.3, headX: 14, headY: 9, grip: [[12, 10], [13, 10], [13, 9]] },
    { at: 0.45, headX: 13, headY: 8, grip: [[12, 10], [12, 10], [13, 10], [13, 9]] },
    { at: 0.72, headX: 7, headY: 3, grip: [[11, 8], [10, 7], [9, 6], [8, 5]] },
    { at: 1.0, headX: 13, headY: 7, grip: [[11, 10], [12, 10], [13, 9]] },
  ],
  // The backhand is struck across the body, which is the whole point of it:
  // its strings meet the ball to the *left* of centre, so a ball that arrives
  // on the far side from the racket arm is reachable at all. With every
  // impact pose on the racket side, as they were, no swing could ever meet a
  // ball on that side and the backhand was a backhand only by name.
  BACKHAND: [
    { at: 0.0, headX: 2, headY: 7, grip: [[7, 9], [6, 9], [5, 8], [4, 8]] },
    { at: 0.3, headX: 2, headY: 9, grip: [[7, 10], [6, 10], [5, 10], [4, 10]] },
    { at: 0.45, headX: 4, headY: 9, grip: [[8, 11], [7, 10], [7, 10], [6, 10]] },
    { at: 0.72, headX: 1, headY: 2, grip: [[7, 9], [6, 8], [5, 6], [4, 4]] },
    { at: 1.0, headX: 13, headY: 7, grip: [[11, 10], [12, 10], [13, 9]] },
  ],
  SERVE: [
    { at: 0.0, headX: 12, headY: 3, grip: [[12, 8], [12, 7], [12, 6], [12, 5]] },
    { at: 0.35, headX: 12, headY: 0, grip: [[12, 8], [12, 7], [12, 6], [12, 5]] },
    { at: 0.52, headX: 13, headY: 1, grip: [[12, 9], [12, 8], [13, 7], [13, 6]] },
    { at: 0.78, headX: 14, headY: 9, grip: [[12, 9], [13, 9], [14, 8]] },
    { at: 1.0, headX: 13, headY: 7, grip: [[11, 10], [12, 10], [13, 9]] },
  ],
  VOLLEY: [
    { at: 0.0, headX: 13, headY: 6, grip: [[11, 9], [12, 9], [12, 8]] },
    { at: 0.28, headX: 13, headY: 5, grip: [[11, 9], [12, 8], [12, 8]] },
    { at: 0.4, headX: 14, headY: 5, grip: [[12, 9], [13, 8], [13, 8]] },
    { at: 0.62, headX: 14, headY: 4, grip: [[12, 8], [13, 7], [14, 6]] },
    { at: 1.0, headX: 13, headY: 7, grip: [[11, 10], [12, 10], [13, 9]] },
  ],
  SMASH: [
    { at: 0.0, headX: 12, headY: 1, grip: [[12, 8], [12, 7], [12, 6], [12, 5]] },
    { at: 0.32, headX: 13, headY: 0, grip: [[12, 8], [12, 7], [13, 6], [13, 5]] },
    { at: 0.5, headX: 14, headY: 1, grip: [[12, 9], [13, 8], [13, 7], [14, 6]] },
    { at: 0.75, headX: 14, headY: 10, grip: [[12, 9], [13, 10], [14, 10]] },
    { at: 1.0, headX: 13, headY: 7, grip: [[11, 10], [12, 10], [13, 9]] },
  ],
};

/** The resting racket, used whenever nobody is mid-swing. */
export const IDLE_POSE: RacketPose = {
  at: 0,
  headX: 13,
  headY: 7,
  grip: [[11, 10], [12, 10], [13, 9]],
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/**
 * The racket head's top-left cell at any point in a swing.
 *
 * Interpolated between key poses so the arm travels rather than snapping, and
 * so the contact anchor the simulation reads is continuous — a stepped anchor
 * would make the hit box jump between frames.
 */
export function racketPoseAt(swing: TennisSwing, progress: number): RacketPose {
  const poses = SWING_POSES[swing];
  const t = Math.min(1, Math.max(0, progress));

  if (t <= poses[0].at) return poses[0];
  const last = poses[poses.length - 1];
  if (t >= last.at) return last;

  for (let i = 1; i < poses.length; i += 1) {
    const from = poses[i - 1];
    const to = poses[i];
    if (t <= to.at) {
      const span = to.at - from.at;
      const local = span <= 0 ? 0 : (t - from.at) / span;
      return {
        at: t,
        headX: lerp(from.headX, to.headX, local),
        headY: lerp(from.headY, to.headY, local),
        // The grip is decoration; the nearer key pose's is close enough and
        // avoids interpolating a variable-length list.
        grip: local < 0.5 ? from.grip : to.grip,
      };
    }
  }
  return last;
}

/** Centre of the racket head, in art cells. This is the contact point. */
export function racketHeadCentre(pose: RacketPose) {
  return {
    col: pose.headX + RACKET_HEAD.width / 2,
    row: pose.headY + RACKET_HEAD.height / 2,
  };
}

/* ── Drawing ──────────────────────────────────────────────────────────────── */

function drawRacket(draw: Raster, pose: RacketPose) {
  const headX = Math.round(pose.headX);
  const headY = Math.round(pose.headY);
  const { width, height } = RACKET_HEAD;

  draw(headX, headY, width, 1, palette.char);
  draw(headX, headY + height - 1, width, 1, palette.char);
  draw(headX, headY + 1, 1, height - 2, palette.char);
  draw(headX + width - 1, headY + 1, 1, height - 2, palette.char);
  draw(headX + 1, headY + 1, width - 2, height - 2, palette.cream);
  draw(headX + 1, headY + 2, width - 2, 1, palette.stone2);
  for (const [x, y] of pose.grip) draw(x, y, 1, 1, palette.brown3);
}

/** Swings played from the braced, feet-apart stance rather than the ready one. */
const OVERHEAD: ReadonlySet<TennisSwing> = new Set<TennisSwing>(["SERVE", "SMASH"]);

function drawSwingPlayer(
  draw: Raster,
  body: SpriteRows,
  map: SpriteMap,
  swing: TennisSwing | null,
  progress: number,
) {
  const overhead = swing !== null && OVERHEAD.has(swing) && progress < 0.8;
  sprite(draw, 0, 0, overhead ? withReachStance(body) : withReadyStance(body), map);
  drawRacket(draw, swing === null ? IDLE_POSE : racketPoseAt(swing, progress));
}

/** Which side of the court a figure belongs to; ALEX's art is mirrored. */
export type TennisFigure = "PLAYER" | "ALEX";

export function makeTennisRoutine(
  figure: TennisFigure,
  swing: TennisSwing | null,
  progress: number,
): ArtRoutine {
  const body = figure === "PLAYER" ? EDWARD_BODY : OPPONENT_BODY;
  const map = figure === "PLAYER" ? EDWARD_MAP : OPPONENT_MAP;
  return (draw) => drawSwingPlayer(draw, body, map, swing, progress);
}

/**
 * How finely a swing is sampled for drawing.
 *
 * The routine identity has to be stable between renders or `PixelCanvas`
 * re-rasterises the sprite on every frame. Quantising progress into steps
 * gives a fixed set of routines to cache while still reading as motion — at
 * this pixel scale twelve samples across a quarter-second is smooth.
 */
export const SWING_SAMPLES = 12;

export function quantiseProgress(progress: number) {
  return Math.min(
    SWING_SAMPLES,
    Math.max(0, Math.round(progress * SWING_SAMPLES)),
  );
}

const routineCache = new Map<string, ArtRoutine>();

/** Cached routine for one figure at one quantised point in one swing. */
export function tennisRoutine(
  figure: TennisFigure,
  swing: TennisSwing | null,
  progress: number,
): ArtRoutine {
  const sample = swing === null ? 0 : quantiseProgress(progress);
  const key = `${figure}:${swing ?? "IDLE"}:${sample}`;
  const cached = routineCache.get(key);
  if (cached) return cached;
  const routine = makeTennisRoutine(figure, swing, sample / SWING_SAMPLES);
  routineCache.set(key, routine);
  return routine;
}
