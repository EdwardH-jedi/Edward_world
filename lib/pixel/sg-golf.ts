import { palette } from "@/lib/pixel/palette";
import type { ArtRoutine, Raster, SpriteMap, SpriteRows } from "@/lib/pixel/raster";
import { sprite } from "@/lib/pixel/raster";

/**
 * Golf art: Edward's swing, and the flag he is swinging at.
 *
 * `lib/pixel/sportsgang.ts` is shared and frozen, so nothing here edits it.
 * The character is still the same person — the curtain part, the slate-navy
 * jacket, the denim trousers — drawn on a taller grid, because a driver is
 * longer than a racket and needs room above his head.
 *
 * ## Why the swing is posed rather than sprited
 *
 * A golf swing is a body turning, not a limb rotating. Six sprite grids would
 * have frozen the club into six positions and left the club head's path to be
 * imagined; instead each pose states where the **hands** and the **club head**
 * are, and the shaft is drawn between them. That makes the club head's arc a
 * real path through the art — back over the shoulder, down behind the hip,
 * through the ball, up and round to the finish — and it makes one pose's club
 * head, `CLUB_HEAD_AT_IMPACT`, the exact pixel the ball has to sit on.
 *
 * The rest of the body moves with it: the shoulders turn (the torso narrows
 * when it is rotated away), the hips slide from the back foot to the front
 * one, and the back heel comes off the ground once the weight has moved. None
 * of the three shortcuts the brief rules out are used — no lone rotating arm,
 * no tilting the whole character, and no tennis pose in a different hat.
 */

export const GOLFER_ART_SIZE = { width: 26, height: 26 } as const;

/** Where the ground is inside the art, so the feet stand on it. */
const GROUND_Y = 23;

export type GolfSwingArtStage =
  | "ADDRESS"
  | "BACKSWING"
  | "DOWNSWING"
  | "IMPACT"
  | "FOLLOW_THROUGH"
  | "FINISH";

interface GolfPose {
  /** Where the hands are. The shaft starts here. */
  readonly hands: readonly [number, number];
  /** Where the club head is. The shaft ends here. */
  readonly clubHead: readonly [number, number];
  /** Centre of the shoulder line. */
  readonly shoulder: readonly [number, number];
  /** Centre of the hips. Slides across as the weight moves. */
  readonly hipsX: number;
  /**
   * Torso width.
   *
   * Narrow means turned away from the viewer, wide means chest-on. This is
   * how a shoulder turn reads at 26 pixels tall.
   */
  readonly torsoWidth: number;
  readonly head: readonly [number, number];
  /** The trailing heel leaves the ground once the weight is through. */
  readonly backHeelUp: boolean;
}

/**
 * The driver swing.
 *
 * Read the `clubHead` column on its own and it is the club head's path:
 * (20,23) at the ball, up to (16,1) behind the head, down through (3,15)
 * behind the hip, back to (20,23) at impact, then out to (22,3) and round to
 * (4,6). The club returns to the ball, which is why address and impact share
 * a club position and differ entirely in the body around it.
 */
const DRIVER_POSES: Readonly<Record<GolfSwingArtStage, GolfPose>> = {
  ADDRESS: {
    hands: [15, 13], clubHead: [20, 23], shoulder: [12, 9],
    hipsX: 12, torsoWidth: 6, head: [9, 3], backHeelUp: false,
  },
  BACKSWING: {
    hands: [8, 6], clubHead: [16, 1], shoulder: [11, 8],
    hipsX: 11, torsoWidth: 4, head: [9, 3], backHeelUp: false,
  },
  DOWNSWING: {
    hands: [10, 10], clubHead: [3, 15], shoulder: [12, 9],
    hipsX: 12, torsoWidth: 5, head: [9, 3], backHeelUp: false,
  },
  IMPACT: {
    hands: [16, 13], clubHead: [20, 23], shoulder: [13, 9],
    hipsX: 13, torsoWidth: 7, head: [9, 3], backHeelUp: true,
  },
  FOLLOW_THROUGH: {
    hands: [18, 7], clubHead: [22, 3], shoulder: [14, 8],
    hipsX: 14, torsoWidth: 6, head: [11, 3], backHeelUp: true,
  },
  FINISH: {
    hands: [13, 2], clubHead: [4, 6], shoulder: [14, 8],
    hipsX: 14, torsoWidth: 5, head: [12, 2], backHeelUp: true,
  },
};

/**
 * The putting stroke.
 *
 * The same six names, because the simulation has one swing clock — but a putt
 * is a short pendulum from the shoulders, not a turn. Nothing leaves the
 * ground and the club never goes above the hands.
 */
const PUTTER_POSES: Readonly<Record<GolfSwingArtStage, GolfPose>> = {
  ADDRESS: {
    hands: [15, 13], clubHead: [20, 23], shoulder: [12, 9],
    hipsX: 12, torsoWidth: 6, head: [9, 4], backHeelUp: false,
  },
  BACKSWING: {
    hands: [14, 13], clubHead: [16, 22], shoulder: [12, 9],
    hipsX: 12, torsoWidth: 6, head: [9, 4], backHeelUp: false,
  },
  DOWNSWING: {
    hands: [14, 13], clubHead: [17, 22], shoulder: [12, 9],
    hipsX: 12, torsoWidth: 6, head: [9, 4], backHeelUp: false,
  },
  IMPACT: {
    hands: [15, 13], clubHead: [20, 23], shoulder: [12, 9],
    hipsX: 12, torsoWidth: 6, head: [9, 4], backHeelUp: false,
  },
  FOLLOW_THROUGH: {
    hands: [16, 13], clubHead: [22, 22], shoulder: [13, 9],
    hipsX: 12, torsoWidth: 6, head: [9, 4], backHeelUp: false,
  },
  FINISH: {
    hands: [16, 13], clubHead: [23, 22], shoulder: [13, 9],
    hipsX: 12, torsoWidth: 6, head: [10, 4], backHeelUp: false,
  },
};

/**
 * The pixel the ball sits on at impact.
 *
 * The component anchors the whole figure by this point, so the club head and
 * the ball are the same place on screen rather than two things that look
 * about right. It is read from the pose table, not written down twice.
 */
export const CLUB_HEAD_AT_IMPACT = {
  x: DRIVER_POSES.IMPACT.clubHead[0],
  y: DRIVER_POSES.IMPACT.clubHead[1],
} as const;

/**
 * The same anchor as a share of the figure's own box.
 *
 * Percentages of the element resolve against its rendered size, so the figure
 * stays pinned to the ball at any scale and on any screen.
 */
export const GOLFER_ANCHOR_PERCENT = {
  x: (CLUB_HEAD_AT_IMPACT.x / GOLFER_ART_SIZE.width) * 100,
  y: ((GOLFER_ART_SIZE.height - CLUB_HEAD_AT_IMPACT.y) / GOLFER_ART_SIZE.height) * 100,
} as const;

/** Edward's head. The curtain part is the whole point of drawing it at all. */
const HEAD_ROWS: SpriteRows = [
  ".hhh.",
  "hHhHh",
  "hffff",
  ".fefg",
  ".ffg.",
];

const HEAD_MAP: SpriteMap = {
  h: palette.hair,
  H: palette.hairLift,
  f: palette.skin,
  g: palette.skinShade,
  e: palette.ink,
};

/** A one-pixel-wide line between two art-pixel points. */
function line(
  draw: Raster,
  from: readonly [number, number],
  to: readonly [number, number],
  color: string,
  thickness = 1,
) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  if (steps === 0) {
    draw(from[0], from[1], thickness, thickness, color);
    return;
  }
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    draw(from[0] + dx * t, from[1] + dy * t, thickness, thickness, color);
  }
}

/** How far the trailing heel comes off the ground once the weight is through. */
const GOLF_HEEL_LIFT_Y = GROUND_Y - 3;

function drawLegs(draw: Raster, pose: GolfPose) {
  const backFootX = pose.hipsX - 5;
  const frontFootX = pose.hipsX + 3;
  const hipY = 15;

  // Trailing leg. Its heel comes up once the weight has gone through.
  const backFootY = pose.backHeelUp ? GOLF_HEEL_LIFT_Y : GROUND_Y - 1;
  line(draw, [pose.hipsX - 1, hipY], [backFootX + 1, backFootY], palette.denim, 2);
  if (pose.backHeelUp) {
    draw(backFootX + 1, backFootY + 1, 2, 1, palette.hair);
    draw(backFootX + 2, backFootY + 2, 2, 1, palette.hair);
  } else {
    draw(backFootX, backFootY + 1, 4, 1, palette.hair);
  }

  // Leading leg: straight and loaded once the weight arrives on it.
  line(draw, [pose.hipsX + 1, hipY], [frontFootX, GROUND_Y - 1], palette.denim, 2);
  draw(frontFootX - 1, GROUND_Y, 4, 1, palette.hair);
}

function drawTorso(draw: Raster, pose: GolfPose) {
  const [shoulderX, shoulderY] = pose.shoulder;
  const hipY = 15;
  for (let y = shoulderY; y <= hipY; y += 1) {
    const t = (y - shoulderY) / Math.max(1, hipY - shoulderY);
    const centre = shoulderX + (pose.hipsX - shoulderX) * t;
    // Narrower at the hips than the shoulders, and narrower overall when the
    // torso is turned away from the viewer.
    const width = pose.torsoWidth - (t > 0.7 ? 1 : 0);
    draw(centre - width / 2, y, width, 1, palette.navy);
    draw(centre + width / 2 - 1, y, 1, 1, palette.navy2);
  }
  // The open collar, where the world sprite shows it too.
  draw(shoulderX - 1, shoulderY, 2, 1, palette.shirt);
}

function drawArms(draw: Raster, pose: GolfPose) {
  const [shoulderX, shoulderY] = pose.shoulder;
  // Two arms, not one: the trailing arm runs from the far shoulder, so the
  // pair form the triangle a swing is actually made of.
  line(draw, [shoulderX - 1, shoulderY + 1], pose.hands, palette.skin);
  line(draw, [shoulderX + 1, shoulderY + 1], pose.hands, palette.skinShade);
  draw(pose.hands[0], pose.hands[1], 2, 2, palette.brown3);
}

function drawClub(draw: Raster, pose: GolfPose, putter: boolean) {
  line(draw, pose.hands, pose.clubHead, palette.stone2);
  const [headX, headY] = pose.clubHead;
  if (putter) {
    draw(headX - 1, headY, 3, 1, palette.char);
    return;
  }
  // A driver head has real volume, which is how you can see where it is.
  draw(headX - 1, headY - 1, 4, 2, palette.char);
  draw(headX, headY - 1, 2, 1, palette.stone3);
}

function drawGolfer(draw: Raster, pose: GolfPose, putter: boolean) {
  drawLegs(draw, pose);
  drawTorso(draw, pose);
  sprite(draw, pose.head[0], pose.head[1], HEAD_ROWS, HEAD_MAP);
  drawArms(draw, pose);
  drawClub(draw, pose, putter);
}

export function makeGolferRoutine(
  stage: GolfSwingArtStage,
  putter: boolean,
): ArtRoutine {
  const pose = (putter ? PUTTER_POSES : DRIVER_POSES)[stage];
  return (draw) => drawGolfer(draw, pose, putter);
}

const STAGES: readonly GolfSwingArtStage[] = [
  "ADDRESS",
  "BACKSWING",
  "DOWNSWING",
  "IMPACT",
  "FOLLOW_THROUGH",
  "FINISH",
];

/** Pre-built, so a component effect gets a stable function identity. */
export const golferRoutines = {
  DRIVER: Object.fromEntries(
    STAGES.map((stage) => [stage, makeGolferRoutine(stage, false)]),
  ) as Readonly<Record<GolfSwingArtStage, ArtRoutine>>,
  PUTTER: Object.fromEntries(
    STAGES.map((stage) => [stage, makeGolferRoutine(stage, true)]),
  ) as Readonly<Record<GolfSwingArtStage, ArtRoutine>>,
} as const;

export const GOLF_SWING_ART_STAGES = STAGES;

/* ── The flag ─────────────────────────────────────────────────────────────── */

export const FLAG_ART_SIZE = { width: 14, height: 24 } as const;

/**
 * The bottom of the flagstick, in art pixels.
 *
 * The stick is drawn hard against the left edge and the cloth flies to the
 * right of it, so anchoring this pixel on the cup puts nothing at all over the
 * hole itself — which is the one thing on the green the player has to see.
 */
export const FLAG_BASE_ANCHOR = { x: 1, y: 23 } as const;

export const FLAG_ANCHOR_PERCENT = {
  x: (FLAG_BASE_ANCHOR.x / FLAG_ART_SIZE.width) * 100,
  y: ((FLAG_ART_SIZE.height - FLAG_BASE_ANCHOR.y) / FLAG_ART_SIZE.height) * 100,
} as const;

/** The pin. `frame` ripples the cloth by a pixel, the way the trees breathe. */
export const drawFlag: ArtRoutine = (draw, frame) => {
  draw(1, 0, 1, 24, palette.stone2);
  draw(1, 1, 1, 22, palette.stone);

  const lift = frame % 2;
  draw(2, 2 + lift, 8, 4, palette.orange);
  draw(2, 2 + lift, 8, 1, palette.orange2);
  draw(9, 3 + lift, 3, 2, palette.orange2);
  // A knuckle of shade where the cloth meets the pin.
  draw(2, 5 + lift, 6, 1, palette.orange2);
};
