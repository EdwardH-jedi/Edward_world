/**
 * One hole of golf, from the tee to the bottom of the cup.
 *
 * The old game was a single drive: two stops of a bar, a carry number, done.
 * This is the same two stops attached to a hole you can finish — the ball keeps
 * its position between shots, the club changes with the lie, and the run ends
 * either in the hole or against a stated shot cap.
 *
 * ## Rules the whole file is built to keep
 *
 * - **Distance is measured, never accumulated.** `distanceToHoleM` is the
 *   ground distance between two points, so running past the flag increases it.
 *   Nothing here subtracts a carry from a starting number and clamps at zero.
 * - **Height is not distance.** The ball has `x` down the hole, `y` across it
 *   and `z` above it, and the camera has neither. No screen coordinate reaches
 *   the rules.
 * - **The ball leaves at the impact event, once.** `IMPACT` is a phase, not a
 *   flag: it is entered when the club head arrives at the ball and left one
 *   dwell later, so the launch cannot fire twice and cannot fire early. The
 *   swing clock keeps running through `FLIGHT`, which is what plays the
 *   follow-through over the ball's flight instead of after it.
 * - **Nothing succeeds without input.** A player who never presses the second
 *   button gets `noContactStrike`, a fixed bad number — not whatever the bar
 *   happened to be showing, which would sometimes be a free perfect strike.
 *
 * Purity is enforced from outside: `tests/sportsgang-foundation.test.ts` reads
 * every file in this folder and fails on storage, network, a wall clock or a
 * random number. Two runs of the same presses are the same run.
 */

import {
  clubFor,
  distanceToHoleM,
  GOLF_CLUBS,
  GOLF_COURSE,
  cameraSpanFor,
  surfaceAt,
  type GolfCamera,
  type GolfClubId,
  type GolfCourse,
  type GolfPoint,
  type GolfSurface,
} from "@/lib/game/minigames/golf-course";
import {
  createGolfRunResult,
  toSportResult,
  totalStrokesOf,
  type GolfRunDraft,
  type GolfRunStatus,
  type GolfShotV1,
} from "@/lib/game/minigames/golf-result";
import {
  clamp,
  sweepMeter,
  type MinigameBase,
  type MinigameInput,
  type SportResult,
} from "@/lib/game/minigames/types";

const DEG = Math.PI / 180;

/**
 * The swing, in seconds.
 *
 * These are the only numbers that decide when the ball leaves the club face.
 * The contact bar is live for the downswing and no longer, so the press that
 * sets contact is a press made while the club is coming down at the ball.
 */
export const GOLF_SWING = {
  backswingSeconds: 0.46,
  downswingSeconds: 0.42,
  /** Club head reaches the ball. Backswing plus downswing, stated once. */
  impactAtSeconds: 0.88,
  /** How long the state sits in `IMPACT` before the ball is under way. */
  impactDwellSeconds: 1 / 30,
  followThroughSeconds: 0.45,
} as const;

/** Everything the shot model can be argued about, in one block. */
export const GOLF_TUNING = {
  /** How fast the power bar sweeps, in bar-widths per second. */
  powerSweepPerSecond: 0.95,
  /** The least power a stopped bar can lock in. */
  minPower: 0.05,
  /** Ball speed lost to a fully off-centre strike. */
  strikeLoss: 0.42,
  /** What a player who never swings gets. Deliberately worse than a bad swing. */
  noContactStrike: 0.35,
  /** And the line they get with it. */
  noContactOffset: 1,
  /** How far the aim can be walked off the flag, in degrees. */
  aimLimitDeg: 20,
  aimRateDegPerSecond: 14,
  /** Ball speed retained off each lie. The reason the fairway is worth hitting. */
  lieSpeedFactor: {
    TEE: 1,
    FAIRWAY: 1,
    ROUGH: 0.82,
    GREEN: 1,
    OUT: 0.8,
  } as Readonly<Record<GolfSurface, number>>,
  /** How long the result of a shot is held on screen before the next one. */
  shotEndSeconds: 1,
  holedSeconds: 1.4,
  /** How quickly the camera catches up with where it should be. */
  cameraLerpPerSecond: 4,
  shakeDecaySeconds: 0.25,
} as const;

export type GolfHolePhase =
  | "AIM"
  | "POWER"
  | "SWING"
  | "IMPACT"
  | "FLIGHT"
  | "ROLL"
  | "SHOT_END"
  | "HOLED"
  | "RESULT";

/** The six poses of the swing. Drawn by the art layer, decided here. */
export type GolfSwingStage =
  | "ADDRESS"
  | "BACKSWING"
  | "DOWNSWING"
  | "IMPACT"
  | "FOLLOW_THROUGH"
  | "FINISH";

/**
 * The ball, on its own.
 *
 * Split out from the hole state so the physics can be driven directly from a
 * test with any starting position and speed — which is the only way to check
 * that a ball crossing the cup at pace is not holed.
 */
export interface BallMotion {
  /** Metres down the hole from the tee. */
  readonly x: number;
  /** Metres across it. Negative is left of the flag. */
  readonly y: number;
  /** Metres above the ground. */
  readonly z: number;
  readonly vx: number;
  readonly vy: number;
  readonly vz: number;
  readonly airborne: boolean;
  readonly holed: boolean;
  readonly atRest: boolean;
}

export interface GolfHoleState extends MinigameBase {
  readonly phase: GolfHolePhase;
  readonly swingStage: GolfSwingStage;
  readonly ball: BallMotion;
  /** Where the shot now in progress was struck from. */
  readonly shotStart: GolfPoint;
  readonly lie: GolfSurface;
  readonly club: GolfClubId;
  /** Degrees off the straight line from the ball to the flag. */
  readonly aimDeg: number;
  readonly power: number;
  readonly contact: number;
  readonly contactLocked: boolean;
  /** The bar: power while stopping it, club face while swinging. */
  readonly meter: number;
  readonly meterDirection: 1 | -1;
  /** True only while the contact bar is live, i.e. during the downswing. */
  readonly faceActive: boolean;
  readonly swingTime: number;
  readonly phaseTime: number;
  /** Impacts this run. One per shot, checked by test and by the view. */
  readonly impactCount: number;
  readonly shotCount: number;
  readonly penaltyStrokes: number;
  readonly totalStrokes: number;
  readonly lastShotM: number;
  readonly longestDriveM: number;
  readonly shotLog: readonly GolfShotV1[];
  readonly status: GolfRunStatus;
  readonly camera: GolfCamera;
  /** 1 at impact, decaying. The view multiplies it by zero for reduced motion. */
  readonly shake: number;
  readonly verdict: string;
  readonly landing: string;
  /** Simulated milliseconds, for the shot log. Never a wall clock. */
  readonly simulationMs: number;
  /** What the player should press next, spelled out on screen. */
  readonly nextKey: string;
}

const HOLE: GolfPoint = { x: GOLF_COURSE.holeM, y: 0 };

function ballPoint(ball: BallMotion): GolfPoint {
  return { x: ball.x, y: ball.y };
}

/** How far a point is from the flag, on the ground. */
export function remainingDistanceM(state: GolfHoleState) {
  return distanceToHoleM(GOLF_COURSE, ballPoint(state.ball));
}

/* ── The ball ─────────────────────────────────────────────────────────────── */

/**
 * Closest approach of a segment to the cup.
 *
 * A ball moving at speed covers more than its own width in a step, so testing
 * only the sampled positions lets a well struck putt jump straight over the
 * hole. The segment is what actually passed the cup.
 */
function distanceFromHoleToSegment(from: GolfPoint, to: GolfPoint) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(HOLE.x - from.x, HOLE.y - from.y);
  const t = clamp(
    ((HOLE.x - from.x) * dx + (HOLE.y - from.y) * dy) / lengthSquared,
    0,
    1,
  );
  return Math.hypot(HOLE.x - (from.x + t * dx), HOLE.y - (from.y + t * dy));
}

/**
 * Advances the ball by one simulation step.
 *
 * Semi-implicit Euler with quadratic drag in the air and a per-surface
 * deceleration on the ground. The two conditions for the ball to drop are
 * both here and both required: the ball's path this step passed within the
 * cup's radius, **and** it was travelling slowly enough to fall in rather than
 * across. Nothing about the camera, the screen or how close it looks is
 * consulted.
 *
 * `rollRetention` is the share of landing speed that survives the bounce. It
 * belongs to the club and is applied here, in the one place a ball lands, so
 * the range printed beside the club and the distance the shot actually runs
 * are the same calculation.
 */
export function stepBallMotion(
  course: GolfCourse,
  motion: BallMotion,
  dt: number,
  rollRetention = 1,
): BallMotion {
  if (motion.holed || motion.atRest) return motion;

  if (motion.airborne || motion.z > 0) {
    const speed = Math.hypot(motion.vx, motion.vy, motion.vz);
    const drag = course.dragPerMetre * speed;
    const vx = motion.vx - drag * motion.vx * dt;
    const vy = motion.vy - drag * motion.vy * dt;
    const vz = motion.vz + (-course.gravityMps2 - drag * motion.vz) * dt;
    const nextZ = motion.z + vz * dt;

    if (nextZ <= 0) {
      // Land on the ground, not below it: the fraction of the step that was
      // still above it is the fraction of the travel that counts.
      const fraction = motion.z > 0 ? motion.z / (motion.z - nextZ) : 0;
      return {
        x: motion.x + vx * dt * fraction,
        y: motion.y + vy * dt * fraction,
        z: 0,
        vx: vx * rollRetention,
        vy: vy * rollRetention,
        vz: 0,
        airborne: false,
        holed: false,
        atRest: false,
      };
    }

    return {
      x: motion.x + vx * dt,
      y: motion.y + vy * dt,
      z: nextZ,
      vx,
      vy,
      vz,
      airborne: true,
      holed: false,
      atRest: false,
    };
  }

  const speed = Math.hypot(motion.vx, motion.vy);
  if (speed <= course.restSpeedMps) {
    return { ...motion, vx: 0, vy: 0, vz: 0, atRest: true };
  }

  const friction = course.surfaceFrictionMps2[surfaceAt(course, ballPoint(motion))];
  const nextSpeed = Math.max(0, speed - friction * dt);
  const scale = nextSpeed / speed;
  const vx = motion.vx * scale;
  const vy = motion.vy * scale;
  const from = ballPoint(motion);
  const to = { x: motion.x + vx * dt, y: motion.y + vy * dt };

  // Entry speed, not exit speed: a ball arriving fast is a ball that crosses.
  if (
    speed <= course.holeCaptureSpeedMps &&
    distanceFromHoleToSegment(from, to) <= course.holeRadiusM
  ) {
    return {
      x: HOLE.x,
      y: HOLE.y,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      airborne: false,
      holed: true,
      atRest: true,
    };
  }

  return {
    x: to.x,
    y: to.y,
    z: 0,
    vx,
    vy,
    vz: 0,
    airborne: false,
    holed: false,
    atRest: nextSpeed <= course.restSpeedMps,
  };
}

/**
 * How far a club carries and runs at a given power off a given lie.
 *
 * A perfect strike, run through the same physics the shot itself uses, so the
 * range shown beside the club is the range the club has. The roll is taken on
 * the surface the ball would most likely land on — green for a putt, fairway
 * for everything else — which makes it an estimate and not a promise.
 */
export function estimateShotDistanceM(
  course: GolfCourse,
  clubId: GolfClubId,
  power: number,
  lie: GolfSurface,
) {
  const club = GOLF_CLUBS[clubId];
  const speed =
    club.launchSpeedMps * clamp(power, 0, 1) * GOLF_TUNING.lieSpeedFactor[lie];
  const loft = club.loftDeg * DEG;

  let motion: BallMotion = {
    // Started far from the cup so an estimate can never be "holed".
    x: 0,
    y: -course.outOfBoundsHalfWidthM * 4,
    z: 0,
    vx: speed * Math.cos(loft),
    vy: 0,
    vz: speed * Math.sin(loft),
    airborne: club.loftDeg > 0,
    holed: false,
    atRest: false,
  };

  // The estimate is a straight shot, so only the surface's friction matters.
  const surface: GolfSurface = clubId === "PUTTER" ? "GREEN" : "FAIRWAY";
  const estimateCourse: GolfCourse = {
    ...course,
    surfaceFrictionMps2: {
      TEE: course.surfaceFrictionMps2[surface],
      FAIRWAY: course.surfaceFrictionMps2[surface],
      ROUGH: course.surfaceFrictionMps2[surface],
      GREEN: course.surfaceFrictionMps2[surface],
      OUT: course.surfaceFrictionMps2[surface],
    },
  };

  const dt = 1 / 60;
  for (let step = 0; step < 60 * 60 && !motion.atRest; step += 1) {
    motion = stepBallMotion(estimateCourse, motion, dt, club.rollRetention);
  }
  return motion.x;
}

/* ── The hole ─────────────────────────────────────────────────────────────── */

function describeContact(contact: number) {
  const offset = Math.abs(contact);
  if (offset < 0.08) return "PURE STRIKE";
  if (offset < 0.22) return "SOLID CONTACT";
  if (offset < 0.45) return contact > 0 ? "FADED RIGHT" : "DRAWN LEFT";
  return contact > 0 ? "SLICED" : "HOOKED";
}

function describeLie(surface: GolfSurface) {
  switch (surface) {
    case "TEE":
      return "ON THE TEE";
    case "FAIRWAY":
      return "ON THE FAIRWAY";
    case "ROUGH":
      return "IN THE ROUGH";
    case "GREEN":
      return "ON THE GREEN";
    default:
      return "OUT OF BOUNDS";
  }
}

const AIM_PROMPT = "LINE UP THE SHOT";

function cameraTargetFor(ball: BallMotion): GolfCamera {
  const remaining = distanceToHoleM(GOLF_COURSE, ballPoint(ball));
  return {
    // Halfway between the ball and the flag, with a span wide enough to hold
    // both — so the ball can never leave the frame while it is in the air, and
    // where it has to go is always on screen beside it.
    focusM: (ball.x + HOLE.x) / 2,
    spanM: cameraSpanFor(remaining),
  };
}

function easeCamera(current: GolfCamera, target: GolfCamera, dt: number): GolfCamera {
  const k = 1 - Math.exp(-GOLF_TUNING.cameraLerpPerSecond * dt);
  return {
    focusM: current.focusM + (target.focusM - current.focusM) * k,
    spanM: current.spanM + (target.spanM - current.spanM) * k,
  };
}

export function createGolfHoleState(): GolfHoleState {
  const ball: BallMotion = {
    x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
    airborne: false, holed: false, atRest: true,
  };
  const lie = surfaceAt(GOLF_COURSE, ballPoint(ball));
  return {
    phase: "AIM",
    swingStage: "ADDRESS",
    ball,
    shotStart: ballPoint(ball),
    lie,
    club: clubFor(GOLF_COURSE, lie, distanceToHoleM(GOLF_COURSE, ballPoint(ball))),
    aimDeg: 0,
    power: 0,
    contact: 0,
    contactLocked: false,
    meter: 0,
    meterDirection: 1,
    faceActive: false,
    swingTime: 0,
    phaseTime: 0,
    impactCount: 0,
    shotCount: 0,
    penaltyStrokes: 0,
    totalStrokes: 0,
    lastShotM: 0,
    longestDriveM: 0,
    shotLog: [],
    status: "abandoned",
    camera: cameraTargetFor(ball),
    shake: 0,
    verdict: "",
    landing: "",
    simulationMs: 0,
    done: false,
    prompt: AIM_PROMPT,
    nextKey: "← → AIM · SPACE TO SET POWER",
  };
}

/** Sets up the next shot from wherever the ball finished. */
function beginShot(state: GolfHoleState): GolfHoleState {
  const point = ballPoint(state.ball);
  const lie = surfaceAt(GOLF_COURSE, point);
  return {
    ...state,
    phase: "AIM",
    swingStage: "ADDRESS",
    shotStart: point,
    lie,
    club: clubFor(GOLF_COURSE, lie, distanceToHoleM(GOLF_COURSE, point)),
    aimDeg: 0,
    power: 0,
    contact: 0,
    contactLocked: false,
    meter: 0,
    meterDirection: 1,
    faceActive: false,
    swingTime: 0,
    phaseTime: 0,
    prompt: AIM_PROMPT,
    nextKey: "← → AIM · SPACE TO SET POWER",
  };
}

/** The one place a run ends. */
function finishRun(state: GolfHoleState, status: GolfRunStatus): GolfHoleState {
  return {
    ...state,
    phase: "RESULT",
    status,
    done: true,
    prompt:
      status === "completed"
        ? `HOLED IN ${state.totalStrokes}`
        : `HOLE NOT COMPLETED · ${state.totalStrokes} STROKES`,
    nextKey: "",
  };
}

/**
 * Ends the run where it stands.
 *
 * Conceding is an ending, not a score: the run is reported `abandoned` and the
 * result panel says so rather than pretending the hole was finished.
 */
export function abandonGolfHole(state: GolfHoleState): GolfHoleState {
  if (state.phase === "RESULT") return state;
  // The ball is in the cup and the run is only waiting on a dwell. Leaving now
  // finished the hole; reporting it abandoned would lose a hole that was holed.
  if (state.phase === "HOLED") return finishRun(state, "completed");
  return finishRun(state, "abandoned");
}

function launch(state: GolfHoleState): GolfHoleState {
  const club = GOLF_CLUBS[state.club];
  const contact = state.contactLocked ? state.contact : GOLF_TUNING.noContactOffset;
  const strike = state.contactLocked
    ? 1 - GOLF_TUNING.strikeLoss * Math.abs(contact)
    : GOLF_TUNING.noContactStrike;

  const speed =
    club.launchSpeedMps *
    Math.max(state.power, GOLF_TUNING.minPower) *
    strike *
    GOLF_TUNING.lieSpeedFactor[state.lie];

  // Aim is relative to the line from the ball to the flag, so zero always
  // means "straight at it" — including from behind the green.
  const bearing = Math.atan2(HOLE.y - state.ball.y, HOLE.x - state.ball.x);
  const direction =
    bearing + (state.aimDeg + contact * club.faceErrorDeg) * DEG;
  const loft = club.loftDeg * DEG;
  const ground = speed * Math.cos(loft);

  const shot: GolfShotV1 = {
    index: state.shotCount + 1,
    atSimulationMs: state.simulationMs,
    carryM: 0,
    penalty: 0,
  };

  return {
    ...state,
    phase: "IMPACT",
    swingStage: "IMPACT",
    phaseTime: 0,
    faceActive: false,
    contact,
    ball: {
      ...state.ball,
      vx: ground * Math.cos(direction),
      vy: ground * Math.sin(direction),
      vz: speed * Math.sin(loft),
      airborne: club.loftDeg > 0,
      atRest: false,
    },
    shotCount: state.shotCount + 1,
    totalStrokes: totalStrokesOf(state.shotCount + 1, state.penaltyStrokes),
    impactCount: state.impactCount + 1,
    shotLog: [...state.shotLog, shot],
    shake: 1,
    verdict: state.contactLocked ? describeContact(contact) : "NO CONTACT",
    prompt: state.contactLocked ? describeContact(contact) : "NO CONTACT",
    nextKey: "",
  };
}

/** Resolves the shot once the ball has stopped: distance, penalty, lie. */
function settle(state: GolfHoleState): GolfHoleState {
  const rest = ballPoint(state.ball);
  const travelled = Math.hypot(rest.x - state.shotStart.x, rest.y - state.shotStart.y);
  const surface = surfaceAt(GOLF_COURSE, rest);
  const outOfBounds = surface === "OUT";

  const penalty = outOfBounds ? GOLF_COURSE.outOfBoundsPenalty : 0;
  const shotLog = state.shotLog.map((shot, index) =>
    index === state.shotLog.length - 1
      ? { ...shot, carryM: travelled, penalty }
      : shot,
  );

  // Stroke and distance: the stroke is added and the ball goes back to where
  // it was played from. Both halves, or it is not the rule it claims to be.
  const ball: BallMotion = outOfBounds
    ? {
        x: state.shotStart.x, y: state.shotStart.y, z: 0,
        vx: 0, vy: 0, vz: 0, airborne: false, holed: false, atRest: true,
      }
    : state.ball;

  const penaltyStrokes = state.penaltyStrokes + penalty;
  const settled: GolfHoleState = {
    ...state,
    phase: "SHOT_END",
    phaseTime: 0,
    ball,
    shotLog,
    penaltyStrokes,
    totalStrokes: totalStrokesOf(state.shotCount, penaltyStrokes),
    lastShotM: travelled,
    longestDriveM: Math.max(state.longestDriveM, travelled),
    lie: surfaceAt(GOLF_COURSE, ballPoint(ball)),
    landing: outOfBounds
      ? `OUT OF BOUNDS · +${GOLF_COURSE.outOfBoundsPenalty} PENALTY`
      : describeLie(surface),
    prompt: outOfBounds
      ? `OUT OF BOUNDS · +${GOLF_COURSE.outOfBoundsPenalty} PENALTY`
      : `${Math.round(travelled)} M · ${describeLie(surface)}`,
    nextKey: "SPACE FOR THE NEXT SHOT",
  };
  return settled;
}

export function advanceGolfHole(
  state: GolfHoleState,
  input: MinigameInput,
  dt: number,
): GolfHoleState {
  // A finished hole is finished: the same object back means the host cannot
  // report the same run twice however many frames arrive after it.
  if (state.phase === "RESULT") return state;

  const phaseTime = state.phaseTime + dt;
  const simulationMs = state.simulationMs + dt * 1000;
  const shake = Math.max(0, state.shake - dt / GOLF_TUNING.shakeDecaySeconds);
  const base = { ...state, phaseTime, simulationMs, shake };

  switch (state.phase) {
    case "AIM": {
      if (input.pressed) {
        return {
          ...base,
          phase: "POWER",
          phaseTime: 0,
          meter: 0,
          meterDirection: 1,
          prompt: "SET YOUR POWER",
          nextKey: "SPACE TO STOP THE BAR",
        };
      }
      const steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
      const aimDeg = clamp(
        state.aimDeg + steer * GOLF_TUNING.aimRateDegPerSecond * dt,
        -GOLF_TUNING.aimLimitDeg,
        GOLF_TUNING.aimLimitDeg,
      );
      return { ...base, aimDeg, camera: easeCamera(state.camera, cameraTargetFor(state.ball), dt) };
    }

    case "POWER": {
      if (input.pressed) {
        return {
          ...base,
          phase: "SWING",
          swingStage: "BACKSWING",
          power: Math.max(state.meter, GOLF_TUNING.minPower),
          swingTime: 0,
          phaseTime: 0,
          meter: 0,
          faceActive: false,
          contactLocked: false,
          prompt: "TIME THE CONTACT",
          nextKey: "SPACE AS THE FACE SQUARES",
        };
      }
      const swept = sweepMeter(
        state.meter,
        state.meterDirection,
        GOLF_TUNING.powerSweepPerSecond,
        dt,
      );
      return { ...base, meter: swept.value, meterDirection: swept.direction };
    }

    case "SWING": {
      const swingTime = state.swingTime + dt;
      const faceActive = swingTime >= GOLF_SWING.backswingSeconds;
      // The bar is the club face crossing the ball through the downswing: one
      // pass, middle is square, early draws it and late fades it.
      const meter = faceActive
        ? clamp(
            (swingTime - GOLF_SWING.backswingSeconds) / GOLF_SWING.downswingSeconds,
            0,
            1,
          )
        : 0;

      const locking = input.pressed && faceActive && !state.contactLocked;
      const contactLocked = state.contactLocked || locking;
      const contact = locking ? clamp((meter - 0.5) * 2, -1, 1) : state.contact;

      const swung: GolfHoleState = {
        ...base,
        swingTime,
        swingStage: faceActive ? "DOWNSWING" : "BACKSWING",
        faceActive,
        meter,
        contact,
        contactLocked,
      };

      // The club head has arrived. This is the only place a ball is launched.
      if (swingTime >= GOLF_SWING.impactAtSeconds) return launch(swung);
      return swung;
    }

    case "IMPACT": {
      const swingTime = state.swingTime + dt;
      if (phaseTime < GOLF_SWING.impactDwellSeconds) {
        return { ...base, swingTime };
      }
      return {
        ...base,
        swingTime,
        swingStage: "FOLLOW_THROUGH",
        phase: state.ball.airborne ? "FLIGHT" : "ROLL",
        phaseTime: 0,
      };
    }

    case "FLIGHT":
    case "ROLL": {
      const swingTime = state.swingTime + dt;
      const swingStage: GolfSwingStage =
        swingTime < GOLF_SWING.impactAtSeconds + GOLF_SWING.followThroughSeconds
          ? "FOLLOW_THROUGH"
          : "FINISH";
      const ball = stepBallMotion(
        GOLF_COURSE,
        state.ball,
        dt,
        GOLF_CLUBS[state.club].rollRetention,
      );
      const moving: GolfHoleState = {
        ...base,
        ball,
        swingTime,
        swingStage,
        camera: easeCamera(state.camera, cameraTargetFor(ball), dt),
      };

      if (ball.holed) {
        const holed: GolfHoleState = {
          ...settle(moving),
          phase: "HOLED",
          prompt: "IN THE HOLE",
          nextKey: "SPACE FOR THE CARD",
        };
        return holed;
      }
      if (ball.atRest) return settle(moving);
      // Airborne to rolling is a phase change the view reads for its shadow.
      return { ...moving, phase: ball.airborne ? "FLIGHT" : "ROLL" };
    }

    case "SHOT_END": {
      const ready = phaseTime >= GOLF_TUNING.shotEndSeconds || input.pressed;
      const eased = { ...base, camera: easeCamera(state.camera, cameraTargetFor(state.ball), dt) };
      if (!ready) return eased;
      // The cap is an ending, and an unfinished one. It is never a win.
      if (state.shotCount >= GOLF_COURSE.maxShots) return finishRun(eased, "abandoned");
      return beginShot(eased);
    }

    case "HOLED": {
      const ready = phaseTime >= GOLF_TUNING.holedSeconds || input.pressed;
      const eased = { ...base, camera: easeCamera(state.camera, cameraTargetFor(state.ball), dt) };
      return ready ? finishRun(eased, "completed") : eased;
    }

    default:
      return base;
  }
}

/* ── What leaves the hole ─────────────────────────────────────────────────── */

export interface GolfRunIdentity {
  /** Made by the component layer, never in here. */
  readonly runId: string;
  /** From the fixed stepper's run clock, never from a wall clock. */
  readonly elapsedSimulationMs: number;
  readonly playerDisplayName?: string;
}

/**
 * The run, ready for `createGolfRunResult`.
 *
 * `totalStrokes` is deliberately absent: the constructor derives it, so there
 * is exactly one place the score is worked out.
 */
export function draftGolfRun(
  state: GolfHoleState,
  identity: GolfRunIdentity,
): GolfRunDraft {
  return {
    runId: identity.runId,
    courseId: GOLF_COURSE.courseId,
    rulesVersion: GOLF_COURSE.rulesVersion,
    status: state.status,
    shotCount: state.shotCount,
    penaltyStrokes: state.penaltyStrokes,
    elapsedSimulationMs: identity.elapsedSimulationMs,
    remainingDistanceM: remainingDistanceM(state),
    longestDriveM: state.longestDriveM,
    ...(identity.playerDisplayName ? { playerDisplayName: identity.playerDisplayName } : {}),
    shotLog: state.shotLog,
  };
}

/**
 * The result panel's view of the hole.
 *
 * Goes through the same constructor the submitted run does, so the number on
 * the panel and the number on the record cannot drift apart.
 */
export function getGolfHoleResult(state: GolfHoleState): SportResult {
  return toSportResult(
    createGolfRunResult(
      draftGolfRun(state, {
        runId: "local",
        elapsedSimulationMs: state.simulationMs,
      }),
    ),
  );
}
