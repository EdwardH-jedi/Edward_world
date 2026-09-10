/**
 * The hole, as one configuration object and one projection.
 *
 * ## What this is, and what it is not
 *
 * Every number below is a **game design value**. Nothing here reproduces a
 * real course, a real golf ball, or the Rules of Golf, and nothing claims to:
 * the hole is 300 metres and plays to a par of 4 because that makes a good
 * minute of play, not because a survey says so. What the file does guarantee
 * is that the numbers shown to the player are the numbers the simulation ran
 * on — one hole length, one set of club ranges, one friction per surface, all
 * declared in a single place that both the rules and the screen read from.
 *
 * ## Metres are the unit, percentages are the output
 *
 * The ball's position, the hole's position and every distance in the HUD are
 * in metres. The projection at the bottom of this file is the **only** place
 * metres become screen space, and it returns percentages of the play box. It
 * takes no viewport, no pixel size and no element — which is what makes
 * "220 M" mean the same thing at 1440x900 and at 390x844.
 *
 * Horizontal position along the hole (`x`), sideways error (`y`) and flight
 * height (`z`) are three separate axes with three separate projections, so a
 * ball high in the air is never mistaken for a ball far down the fairway.
 */

import { clamp } from "@/lib/game/minigames/types";
import { GOLF_RULES_VERSION } from "@/lib/game/minigames/golf-result";

/** Ground the ball can come to rest on. `OUT` is off the hole entirely. */
export type GolfSurface = "TEE" | "FAIRWAY" | "ROUGH" | "GREEN" | "OUT";

export type GolfClubId = "DRIVER" | "APPROACH" | "PUTTER";

/**
 * A club's whole behaviour, stated rather than derived.
 *
 * `launchSpeedMps` is the ball speed a perfect strike at full power produces;
 * power and strike quality scale it down and nothing scales it up.
 */
export interface GolfClub {
  readonly id: GolfClubId;
  readonly label: string;
  /** Ball speed at full power and a centred strike, in metres per second. */
  readonly launchSpeedMps: number;
  /** Launch angle above the ground. A putter never leaves it. */
  readonly loftDeg: number;
  /** How far off line a fully mis-struck face sends the ball, in degrees. */
  readonly faceErrorDeg: number;
  /** Share of landing speed that survives the bounce and becomes roll. */
  readonly rollRetention: number;
}

export const GOLF_CLUBS: Readonly<Record<GolfClubId, GolfClub>> = {
  DRIVER: {
    id: "DRIVER",
    label: "DRIVER",
    launchSpeedMps: 55,
    loftDeg: 27,
    faceErrorDeg: 9,
    rollRetention: 0.45,
  },
  APPROACH: {
    id: "APPROACH",
    label: "APPROACH",
    launchSpeedMps: 39,
    loftDeg: 34,
    faceErrorDeg: 7,
    rollRetention: 0.3,
  },
  PUTTER: {
    id: "PUTTER",
    label: "PUTTER",
    launchSpeedMps: 9.4,
    loftDeg: 0,
    faceErrorDeg: 3,
    rollRetention: 1,
  },
};

/** A point on the hole, in metres. `x` runs tee to green, `y` is sideways. */
export interface GolfPoint {
  readonly x: number;
  readonly y: number;
}

export interface GolfCourse {
  readonly courseId: string;
  /** Travels with every run, so a board never mixes two rule sets. */
  readonly rulesVersion: string;
  readonly name: string;
  readonly par: number;
  /** Tee to hole, in metres. */
  readonly holeM: number;
  /** The tee box runs from the back marker to here. */
  readonly teeToM: number;
  /** Mown fairway, between these two distances and inside its half width. */
  readonly fairwayFromM: number;
  readonly fairwayToM: number;
  readonly fairwayHalfWidthM: number;
  /** Everything inside this radius of the hole is putting surface. */
  readonly greenRadiusM: number;
  /** Past this, either side, the ball has left the hole. */
  readonly outOfBoundsHalfWidthM: number;
  /** Behind the tee and beyond the green, the same. */
  readonly behindTeeLimitM: number;
  readonly beyondGreenLimitM: number;
  /** Strokes a run may play before it is stopped and reported unfinished. */
  readonly maxShots: number;
  readonly outOfBoundsPenalty: number;
  readonly outOfBoundsRule: "stroke-and-distance";
  /** The cup. A game-scale hole, far larger than a real 108 mm one. */
  readonly holeRadiusM: number;
  /** Above this speed the ball crosses the cup instead of dropping in. */
  readonly holeCaptureSpeedMps: number;
  /** Farther out than this and the driver comes back out of the bag. */
  readonly approachRangeM: number;
  /** How quickly a rolling ball is stopped by each surface. */
  readonly surfaceFrictionMps2: Readonly<Record<GolfSurface, number>>;
  /** Quadratic air drag on the ball in flight. */
  readonly dragPerMetre: number;
  /** Gravity, in metres per second squared. */
  readonly gravityMps2: number;
  /** Below this speed a rolling ball has stopped. */
  readonly restSpeedMps: number;
}

export const GOLF_COURSE: GolfCourse = {
  courseId: "sg-meadow-hole-1",
  rulesVersion: GOLF_RULES_VERSION,
  name: "MEADOW · HOLE 1",
  par: 4,
  holeM: 300,
  teeToM: 20,
  fairwayFromM: 20,
  fairwayToM: 285,
  fairwayHalfWidthM: 18,
  greenRadiusM: 16,
  outOfBoundsHalfWidthM: 40,
  behindTeeLimitM: -10,
  beyondGreenLimitM: 60,
  maxShots: 8,
  outOfBoundsPenalty: 1,
  outOfBoundsRule: "stroke-and-distance",
  holeRadiusM: 0.6,
  holeCaptureSpeedMps: 3,
  approachRangeM: 160,
  surfaceFrictionMps2: {
    TEE: 6.5,
    FAIRWAY: 6.5,
    ROUGH: 11,
    GREEN: 2.3,
    OUT: 9,
  },
  dragPerMetre: 0.0013,
  gravityMps2: 9.81,
  restSpeedMps: 0.15,
};

/** Where the cup is. The one point every distance is measured against. */
export const HOLE_POSITION: GolfPoint = { x: GOLF_COURSE.holeM, y: 0 };

/**
 * What the ball is sitting on.
 *
 * Checked outward-in: off the hole first, then the green, then the tee, so a
 * ball that is both past the fairway and on the green is never called rough.
 */
export function surfaceAt(course: GolfCourse, point: GolfPoint): GolfSurface {
  if (Math.abs(point.y) > course.outOfBoundsHalfWidthM) return "OUT";
  if (point.x < course.behindTeeLimitM) return "OUT";
  if (point.x > course.holeM + course.beyondGreenLimitM) return "OUT";

  if (distanceToHoleM(course, point) <= course.greenRadiusM) return "GREEN";
  if (point.x < course.teeToM && Math.abs(point.y) <= course.fairwayHalfWidthM) {
    return "TEE";
  }
  if (
    point.x >= course.fairwayFromM &&
    point.x <= course.fairwayToM &&
    Math.abs(point.y) <= course.fairwayHalfWidthM
  ) {
    return "FAIRWAY";
  }
  return "ROUGH";
}

/**
 * How far the ball still has to travel, measured on the ground between two
 * points.
 *
 * Never `startDistance - carry`, which cannot go back up and so reports a
 * ball twenty metres past the flag as holed. Overshooting increases this
 * number, because it is a distance and not a running total.
 */
export function distanceToHoleM(course: GolfCourse, point: GolfPoint) {
  return Math.hypot(course.holeM - point.x, 0 - point.y);
}

/**
 * The club for the shot in front of you.
 *
 * One rule, no menu: on the green it is the putter, out of approach range it
 * is the driver, and everything between is the approach. The tee shot needs no
 * special case — 300 metres is past approach range, so it is a driver.
 */
export function clubFor(
  course: GolfCourse,
  surface: GolfSurface,
  remainingM: number,
): GolfClubId {
  if (surface === "GREEN") return "PUTTER";
  return remainingM > course.approachRangeM ? "DRIVER" : "APPROACH";
}

/* ── Projection: metres in, percentages out ───────────────────────────────── */

/** The window of the hole currently on screen, in metres. */
export interface GolfCamera {
  /** Distance down the hole at the centre of the frame. */
  readonly focusM: number;
  /** How many metres wide the frame is. */
  readonly spanM: number;
}

export const GOLF_VIEW = {
  /** The ground line, as a percentage up from the bottom of the play box. */
  groundPercent: 26,
  /**
   * The play box's width divided by its height.
   *
   * Height uses the same metres-per-percent as distance does, corrected by
   * this, so a flight drawn 30 metres up is drawn 30 metres up.
   */
  boxAspect: 900 / 340,
  /** Tightest and widest the camera will ever be, in metres of hole. */
  minSpanM: 12,
  maxSpanM: 340,
  /** How much of the frame a metre of sideways error is worth. */
  depthPercentPerMetre: 0.18,
  maxDepthPercent: 7,
} as const;

/** Where a distance down the hole falls across the frame, 0..100. */
export function xPercent(metres: number, camera: GolfCamera) {
  return ((metres - camera.focusM) / camera.spanM) * 100 + 50;
}

/** The inverse, so the projection is provably one definition and not two. */
export function metresAtPercent(percent: number, camera: GolfCamera) {
  return ((percent - 50) / 100) * camera.spanM + camera.focusM;
}

/** Flight height above the ground line, as a percentage of the box height. */
export function heightPercent(metres: number, camera: GolfCamera) {
  return (metres / camera.spanM) * 100 * GOLF_VIEW.boxAspect;
}

/**
 * Sideways error, drawn as depth.
 *
 * The view is side-on, so a sliced ball has nowhere to go but up or down the
 * screen. It is deliberately a small, bounded nudge rather than a true
 * perspective: the little course map above the HUD is where line is actually
 * read, and this only has to stop a shot in the rough from looking like a
 * shot on the fairway.
 */
export function depthPercent(lateralMetres: number) {
  return clamp(
    lateralMetres * GOLF_VIEW.depthPercentPerMetre,
    -GOLF_VIEW.maxDepthPercent,
    GOLF_VIEW.maxDepthPercent,
  );
}

/**
 * How wide the frame should be for a ball this far from the hole.
 *
 * Wide enough from the tee to see where you are going, tight enough over a
 * two metre putt that the cup is a hole you can see into rather than a dot.
 */
export function cameraSpanFor(distanceM: number) {
  return clamp(distanceM * 2.2 + 8, GOLF_VIEW.minSpanM, GOLF_VIEW.maxSpanM);
}

/** Tee to hole across the little course map, 0..100. */
export function mapPercent(course: GolfCourse, metres: number) {
  return clamp((metres / course.holeM) * 100, 0, 100);
}
