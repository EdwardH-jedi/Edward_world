import {
  clamp,
  type MinigameBase,
  type MinigameInput,
  type SportResult,
} from "@/lib/game/minigames/types";

/**
 * Tennis — a real match against ALEX, first to five.
 *
 * The court is the side-on one the venue already draws: Edward on the left,
 * ALEX on the right, the net between them. Everything below works in that
 * court's own coordinates — `x` is a percentage across the court box and `y` is
 * height above the playing surface in the same units — so the component can
 * position a ball by writing the numbers straight into CSS percentages and the
 * simulation never needs to know how wide the screen is.
 *
 * Two rules shape the whole module. It is pure: `advance(state, input, dt)`
 * returns the next state and touches nothing else. And it is *deterministic* —
 * every wobble in ALEX's game comes from a seed carried in the state, never
 * from `Math.random`, because the playthrough suite plays each sport three
 * times and demands identical results.
 */

/* ── Tuning ──────────────────────────────────────────────────────────────────
   Every number that decides how the match feels lives here, so the person
   deciding whether ALEX is fun to play does it in one block. */

import {
  IDLE_POSE,
  racketHeadCentre,
  racketPoseAt,
  RACKET_HEAD,
  type TennisSwing,
} from "@/lib/pixel/sg-tennis";

const COURT = {
  /** Matches `.sg-court__net` in the stylesheet. */
  NET_X: 49.6,
  /** Net height in the same units as `y`; the ball must clear this. */
  NET_TOP: 20,
  /** Clearance a shot must have over the tape before it counts as over. */
  NET_MARGIN: 1.5,
  /** A ball whose first bounce lands outside these is out. */
  BASELINE_LEFT: 4,
  BASELINE_RIGHT: 96,
  /** How far along the court each side may walk. */
  PLAYER_MIN: 6,
  PLAYER_MAX: 44,
  ALEX_MIN: 55,
  ALEX_MAX: 94,
  /**
   * Height the serve toss is thrown to, and the height the old single-anchor
   * contact model used. Retained for `buildShot` callers and the serve; it is
   * no longer where a racket meets the ball — `contactAnchor` is.
   */
  CONTACT_Y: 10.5,
  /** Service lines, matching `.sg-court__line--service-*` in the stylesheet. */
  SERVICE_NEAR: 30,
  SERVICE_FAR: 70,
  /**
   * The half of each service box a serve is actually aimed into.
   *
   * A receiver cannot walk past `ALEX_MIN` / `PLAYER_MAX`, so a ball dropped
   * against the net inside the box is an ace nobody could ever have reached —
   * three of them a match, which is not a match. Serving to the far half of
   * the box keeps it a serve and keeps it playable.
   */
  SERVE_FAR_MIN: 58,
  SERVE_NEAR_MAX: 42,
} as const;

const PHYSICS = {
  GRAVITY: 270,
  /**
   * How much speed a bounce keeps.
   *
   * Low on purpose. A lively ball skips back up through the strike zone and
   * hands the receiver a second, third and fourth chance at the same shot,
   * which is how a rally stops ending. Skidding away flat means the ball has to
   * be met on its way down — once.
   */
  RESTITUTION: 0.4,
  /** Ground friction applied to horizontal speed at each bounce. */
  BOUNCE_DRAG: 0.86,
} as const;

const MOVE = {
  PLAYER_SPEED: 46,
  PLAYER_ACCEL_SECONDS: 0.12,
  ALEX_SPEED: 34,
  ALEX_ACCEL_SECONDS: 0.16,
} as const;

const SWING = {
  /** How long the racket is actually capable of touching the ball. */
  ACTIVE_SECONDS: 0.18,
  /** Total animation length, so the arm keeps moving after the live window. */
  DURATION_SECONDS: 0.28,
  /** Enforced gap between swings. This is the anti-mash rule. */
  COOLDOWN_SECONDS: 0.34,
  /** Horizontal half-width of the racket's reach. */
  REACH_X: 8,
  /**
   * Vertical reach: the strike zone's half-height.
   *
   * This is the number that makes A and D matter. The ball is only hittable
   * while it is descending through this band, so being in the right place is a
   * real requirement rather than a formality — and the court draws the ball's
   * shadow underneath it so that requirement is something you can see rather
   * than something you have to intuit.
   */
  REACH_Y: 7.5,
  /** |offset| inside this is a clean strike. */
  PERFECT_X: 2.2,
  /** |offset| inside this is a good one; beyond it the contact is mistimed. */
  GOOD_X: 5,
} as const;


/**
 * The figure's box on screen, as the stylesheet draws it.
 *
 * `.sg-tennis__figure` is `bottom: 22%; height: 20%` of a `900/340` court, and
 * its canvas is `height: 100%; width: auto` centred with `translateX(-50%)`.
 * Those four numbers are the entire bridge between an art cell and a
 * simulation coordinate, and `tests/tennis-anchor.test.ts` pins them — if the
 * stylesheet's box changes, that test fails rather than the racket silently
 * drifting off the ball again.
 */
export const TENNIS_FIGURE = {
  artWidth: 18,
  artHeight: 16,
  /** Percent of the court box, matching `.sg-tennis__figure`. */
  boxBottom: 22,
  boxHeight: 20,
  courtAspect: 900 / 340,
} as const;

/** One art row, in simulation `y` units. */
export const PCT_PER_ART_Y = TENNIS_FIGURE.boxHeight / TENNIS_FIGURE.artHeight;

/** The drawn canvas's width, as a percentage of the court box. */
export const CANVAS_WIDTH_PCT =
  ((TENNIS_FIGURE.boxHeight / 100 / TENNIS_FIGURE.courtAspect) *
    (TENNIS_FIGURE.artWidth / TENNIS_FIGURE.artHeight)) *
  100;

/** One art column, in simulation `x` units. */
export const PCT_PER_ART_X = CANVAS_WIDTH_PCT / TENNIS_FIGURE.artWidth;

export interface ContactAnchor {
  readonly x: number;
  readonly y: number;
}

/**
 * Where a player's racket head actually is.
 *
 * This is the fix. The simulation used to contact the ball at the sprite's
 * canvas centre at a fixed height of 10.5, while the racket was drawn six art
 * columns to the right of that and three rows above it — so a contact the
 * physics called PERFECT showed the ball passing under a racket that never
 * reached it. Render and physics now read one function.
 *
 * ALEX's canvas is mirrored with `flipX`, so his racket sits on the opposite
 * side of his body and the column offset is negated.
 */
export function contactAnchor(
  side: TennisSide,
  x: number,
  swing: TennisSwing | null,
  progress: number,
): ContactAnchor {
  const pose = swing === null ? IDLE_POSE : racketPoseAt(swing, progress);
  const { col, row } = racketHeadCentre(pose);
  const dx = (col - TENNIS_FIGURE.artWidth / 2) * PCT_PER_ART_X;
  return {
    x: side === "PLAYER" ? x + dx : x - dx,
    y: TENNIS_FIGURE.boxHeight - row * PCT_PER_ART_Y,
  };
}

/**
 * Half-extents of the strike zone, in art pixels.
 *
 * The racket head is 4x5 cells. `TOLERANCE` is the whole of the generosity in
 * this game and it is one art pixel wide — deliberately small and deliberately
 * visible, because the previous reach was 8% of the court, which is 1.88x the
 * drawn sprite's half-width. A ball nearly two body-widths away counted as a
 * hit, and no amount of animation makes that look right.
 */
export const STRIKE = {
  HALF_W_ART: RACKET_HEAD.width / 2,
  HALF_H_ART: RACKET_HEAD.height / 2,
  TOLERANCE_X_ART: 1,
  TOLERANCE_Y_ART: 0.6,
  /** The ball is drawn 1.8% wide, so its own radius counts toward contact. */
  BALL_RADIUS: 0.9,
} as const;

export const STRIKE_HALF_X =
  (STRIKE.HALF_W_ART + STRIKE.TOLERANCE_X_ART) * PCT_PER_ART_X + STRIKE.BALL_RADIUS;
export const STRIKE_HALF_Y =
  (STRIKE.HALF_H_ART + STRIKE.TOLERANCE_Y_ART) * PCT_PER_ART_Y + STRIKE.BALL_RADIUS;

/**
 * Per-swing timing and shape.
 *
 * Five entries with five different sets of numbers, which is what makes the
 * choice of swing matter rather than being a change of costume. `window` is
 * the fraction of the swing during which the racket can touch anything at all,
 * so swinging early now means the head is physically somewhere else when the
 * ball arrives.
 */
export interface SwingSpec {
  readonly duration: number;
  readonly windowStart: number;
  readonly windowEnd: number;
  readonly cooldown: number;
  /** Multiplies the outgoing shot's flight time. Lower is a faster ball. */
  readonly pace: number;
}

export const SWING_SPEC: Readonly<Record<TennisSwing, SwingSpec>> = {
  FOREHAND: { duration: 0.3, windowStart: 0.34, windowEnd: 0.58, cooldown: 0.34, pace: 1 },
  BACKHAND: { duration: 0.32, windowStart: 0.34, windowEnd: 0.58, cooldown: 0.36, pace: 1.05 },
  SERVE: { duration: 0.46, windowStart: 0.44, windowEnd: 0.62, cooldown: 0.4, pace: 0.92 },
  VOLLEY: { duration: 0.16, windowStart: 0.24, windowEnd: 0.52, cooldown: 0.24, pace: 0.78 },
  SMASH: { duration: 0.34, windowStart: 0.42, windowEnd: 0.6, cooldown: 0.46, pace: 0.66 },
};

/** Thresholds that choose the swing. Every one of them is a named number. */
export const SWING_CHOICE = {
  /** A ball arriving above this height can be smashed. */
  SMASH_MIN_Y: 13,
  /** ...if the player is at most this far from where it will arrive. */
  SMASH_REACH_X: 7,
  /** Un-bounced balls within this of the net are volleyed. */
  VOLLEY_NET_BAND: 18,
  /** A volley needs the ball roughly in front of the player. */
  VOLLEY_REACH_X: 9,
  /** How near the player's own x counts as "the ball has arrived". */
  ARRIVAL_BAND: 4,
} as const;

/**
 * How much a rally speeds up per shot, and the floor it cannot go below.
 *
 * Pace carries. Every exchange comes back a little quicker than it went, so a
 * long rally tightens instead of settling — which is both what a real rally
 * does and the reason this one ends. Without it two competent players simply
 * trade the ball forever, and every point runs to the safety cap.
 */
const RALLY_PACE = { PER_SHOT: 0.09, FLOOR: 0.5 } as const;

function paceFactor(rallyShots: number) {
  return Math.max(RALLY_PACE.FLOOR, 1 - rallyShots * RALLY_PACE.PER_SHOT);
}

/** Flight time of a return, by how well it was struck. Lower is faster. */
const SHOT_SECONDS: Readonly<Record<Exclude<TennisQuality, "MISS">, number>> = {
  PERFECT: 0.62,
  GOOD: 0.8,
  EARLY: 1.15,
  LATE: 1.15,
};

const ALEX = {
  /** Seconds before ALEX starts chasing a ball that has just been struck. */
  REACTION_MIN: 0.32,
  REACTION_MAX: 0.6,
  /** How wrong his read of the bounce can be, in court units. */
  PREDICTION_ERROR: 4.5,
  /** Chance a reachable ball is shanked anyway. */
  SHANK_CHANCE: 0.13,
  /**
   * His racket's half-width, deliberately narrower than Edward's.
   *
   * This is the single number that decides whether a well-placed ball can beat
   * him. Matching Edward's reach made him unbeatable by placement — every point
   * had to wait for an unforced error, and rallies ran to the safety cap.
   */
  REACH_X: 5.5,
  /**
   * Extra strike-zone half-extent, on top of the racket head.
   *
   * Edward's zone is the racket and one art pixel; ALEX's is fractionally
   * wider, which is the whole of his advantage and is still far narrower than
   * the 5.5 court units he used to swing with.
   */
  REACH_BONUS: 0.6,
  /**
   * How wrong his timing can be, as a fraction of the swing's live window.
   *
   * He starts his motion so the impact window lands where the ball will be —
   * the same thing a person does — and then misses it by this much. Zero would
   * make him metronomic; too much and he never touches a ball.
   */
  TIMING_ERROR: 0.3,
  /** Flight time of his own returns. */
  SHOT_SECONDS: 0.95,
  /**
   * How far from Edward he tries to land the ball, in court units.
   *
   * Comfortably outside a standing racket's 9.5 and comfortably inside one
   * second of running, so every rally asks the visitor to move and none of them
   * punishes them for being human about it.
   */
  PLACEMENT_REACH: 16,
} as const;

/**
 * The serve toss.
 *
 * `RELEASE_AT` and `SERVE_SWING_AT` are chosen so the ball is at the racket's
 * impact height exactly when the swing's window reaches it — the toss is real
 * physics, not a decoration played next to a ball that appears elsewhere.
 */
const TOSS = {
  RELEASE_AT: 0.12,
  /** Height the ball leaves the hand at, in simulation units. */
  HAND_Y: 7,
  /** How far to the racket side of the body the hand is. */
  HAND_DX: 2,
} as const;

/** When the serving arm starts to move. */
const SERVE_SWING_AT = 0.42;

/**
 * When the strings meet the ball — the swing start plus the middle of the
 * SERVE impact window, which is the same instant the rally is launched from.
 *
 * It is also when the SERVE phase ends, and it has to be: the toss is aimed at
 * this moment (`TOSS_FLIGHT`), so anything else leaves the ball falling on
 * past the racket and reappearing at the strings later. QA (session E) found
 * the phase running to a separate `PACE.SERVE_SECONDS` of 0.9s, which is 14
 * ticks after contact — long enough for the toss to reach y = -4, below the
 * court surface, before the served ball appeared 19 units above it.
 */
const SERVE_CONTACT_AT =
  SERVE_SWING_AT +
  ((SWING_SPEC.SERVE.windowStart + SWING_SPEC.SERVE.windowEnd) / 2) *
    SWING_SPEC.SERVE.duration;

/** Seconds from release to the racket meeting the ball. */
const TOSS_FLIGHT = SERVE_CONTACT_AT - TOSS.RELEASE_AT;

/** The height the serving racket reaches at its impact window. */
const SERVE_ANCHOR_Y = contactAnchor(
  "PLAYER",
  0,
  "SERVE",
  (SWING_SPEC.SERVE.windowStart + SWING_SPEC.SERVE.windowEnd) / 2,
).y;

/** Upward speed that puts the ball at the serve anchor as the racket arrives. */
function tossVelocity() {
  const rise = SERVE_ANCHOR_Y - TOSS.HAND_Y;
  return (rise + 0.5 * PHYSICS.GRAVITY * TOSS_FLIGHT * TOSS_FLIGHT) / TOSS_FLIGHT;
}

const PACE = {
  // The serve's length is not a free number: it is `SERVE_CONTACT_AT`, so the
  // rally starts on the frame the strings meet the ball.
  POINT_SECONDS: 1.2,
  /** How long the win banner holds before the sport reports itself. */
  BANNER_SECONDS: 1.3,
  /** How long a verdict word stays on screen. */
  VERDICT_SECONDS: 0.7,
  /** Court shake fades over this. */
  SHAKE_SECONDS: 0.28,
} as const;

export const TENNIS_TARGET_POINTS = 5;
/** Kept for the standings, which rank tennis by points won. */
export const TENNIS_POINTS = TENNIS_TARGET_POINTS;

/**
 * A rally this long is not a rally, it is a stalemate. Never reached in normal
 * play; it exists so a pathological exchange cannot hang the game loop.
 */
const RALLY_SHOT_CAP = 20;

/* ── State ───────────────────────────────────────────────────────────────── */

export type TennisPhase = "SERVE" | "RALLY" | "POINT" | "DONE";
export type TennisQuality = "PERFECT" | "GOOD" | "EARLY" | "LATE" | "MISS";
export type TennisSide = "PLAYER" | "ALEX";

/**
 * One racket-on-ball event.
 *
 * `t` is where inside the simulation step the contact happened, which is what
 * lets the ball be reflected from the point it actually met the racket rather
 * than from wherever it had already travelled to by the end of the step.
 */
export interface TennisContact {
  readonly tick: number;
  /** Fraction of the step at which the racket met the ball, 0..1. */
  readonly t: number;
  readonly x: number;
  readonly y: number;
  readonly by: TennisSide;
  readonly swing: TennisSwing;
  readonly quality: TennisQuality;
  /** Swing progress at the moment of contact, for the timing verdict. */
  readonly progress: number;
}

/** The ball in the air before a serve, thrown by hand and clearly visible. */
export interface TossBall {
  readonly x: number;
  readonly y: number;
}

export interface TennisBall {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  /** Bounces since the last racket touched it. Two is a lost point. */
  readonly bounces: number;
  readonly lastHitBy: TennisSide | null;
}

/**
 * A swing in flight.
 *
 * The kind is chosen once, when the key goes down, and never re-read — the
 * brief is explicit that a swing must not change into a different motion
 * half-way through. `elapsed / duration` is the progress the racket pose and
 * the contact anchor are both derived from.
 */
export interface SwingInFlight {
  readonly kind: TennisSwing;
  readonly elapsed: number;
  readonly duration: number;
  /** Cleared once this swing has touched a ball, so one swing is one hit. */
  readonly spent: boolean;
}

interface Racket {
  readonly swing: SwingInFlight | null;
  readonly cooldown: number;
}

/** Progress through the swing, 0 before it starts and 1 at recovery. */
export function swingProgress(swing: SwingInFlight | null) {
  if (!swing) return 0;
  return clamp(swing.elapsed / swing.duration, 0, 1);
}

/** Is the racket capable of touching a ball at this instant? */
export function swingIsLive(swing: SwingInFlight | null) {
  if (!swing || swing.spent) return false;
  const spec = SWING_SPEC[swing.kind];
  const progress = swingProgress(swing);
  return progress >= spec.windowStart && progress <= spec.windowEnd;
}

export interface TennisState extends MinigameBase {
  readonly phase: TennisPhase;
  readonly phaseTime: number;
  readonly playerX: number;
  readonly playerVx: number;
  readonly alexX: number;
  readonly alexVx: number;
  readonly ball: TennisBall;
  readonly playerRacket: Racket;
  readonly alexRacket: Racket;
  readonly playerPoints: number;
  readonly alexPoints: number;
  readonly server: TennisSide;
  readonly rallyShots: number;
  readonly longestRally: number;
  readonly perfects: number;
  /** The last contact Edward made, and how long ago, for the banner. */
  readonly quality: TennisQuality | null;
  readonly qualityAge: number;
  readonly pointWinner: TennisSide | null;
  readonly pointReason: string;
  readonly matchWinner: TennisSide | null;
  /** Where the last contact happened, so the component can spark it. */
  readonly impactX: number;
  readonly impactY: number;
  readonly impactAge: number;
  /**
   * The one record of the last racket-on-ball event.
   *
   * Reflection, spark, shake, verdict and score all derive from this single
   * object, so the picture cannot disagree with the physics about when or
   * where the ball was struck.
   */
  readonly lastContact: TennisContact | null;
  /** Simulation steps since the match began. Fixed-rate, so it is a clock. */
  readonly tick: number;
  /** The serve toss, visible before the ball is live. Null outside a serve. */
  readonly toss: TossBall | null;
  /** Decays to zero; the court shakes by this much on a clean strike. */
  readonly shake: number;
  /** ALEX's private timers, kept in state so the whole match stays pure. */
  readonly alexReaction: number;
  readonly alexTargetX: number;
  /**
   * The rally shot ALEX has already read. Comparing it against `rallyShots` is
   * what makes him re-read exactly once per ball — a countdown alone could not
   * tell "not started" from "finished", and he answered serves instantly.
   */
  readonly alexReadShot: number;
  readonly seed: number;
}

/* ── Seeded randomness ───────────────────────────────────────────────────── */

/** mulberry32. A plain number in, a plain number out, so state stays comparable. */
function nextRandom(seed: number): { value: number; seed: number } {
  const next = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(next ^ (next >>> 15), 1 | next);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, seed: next };
}

function randomBetween(seed: number, low: number, high: number) {
  const roll = nextRandom(seed);
  return { value: low + roll.value * (high - low), seed: roll.seed };
}

const INITIAL_SEED = 0x5eed7e11;

/* ── Construction ────────────────────────────────────────────────────────── */

const RESTING_BALL: TennisBall = {
  x: COURT.NET_X,
  y: 0,
  vx: 0,
  vy: 0,
  bounces: 0,
  lastHitBy: null,
};

const COLD: Racket = { swing: null, cooldown: 0 };

export function createTennisState(): TennisState {
  return {
    phase: "SERVE",
    phaseTime: 0,
    playerX: 20,
    playerVx: 0,
    // Edward serves first, so ALEX opens standing where a receiver stands.
    alexX: 66,
    alexVx: 0,
    ball: RESTING_BALL,
    playerRacket: COLD,
    alexRacket: COLD,
    playerPoints: 0,
    alexPoints: 0,
    server: "PLAYER",
    rallyShots: 0,
    longestRally: 0,
    perfects: 0,
    quality: null,
    qualityAge: 0,
    pointWinner: null,
    pointReason: "",
    matchWinner: null,
    impactX: 0,
    impactY: 0,
    impactAge: 99,
    lastContact: null,
    tick: 0,
    toss: null,
    shake: 0,
    alexReaction: 0,
    alexTargetX: 80,
    alexReadShot: -1,
    seed: INITIAL_SEED,
    done: false,
    prompt: "FIRST TO 5",
  };
}

/* ── Shot construction ───────────────────────────────────────────────────── */

/**
 * Builds the velocity for a shot from `x0,y0` that lands on `targetX` after
 * `seconds`, lifting the arc until it genuinely clears the net.
 *
 * The lift is the one deliberate kindness in the physics. A shot that clipped
 * the tape would punish a mistimed swing twice — once with a weak ball and
 * again with the point — and the brief is explicit that the point is fun rather
 * than difficulty. ALEX gets no such help, which is what keeps the net honest:
 * when you see a ball die in the tape, it is his.
 */
export function buildShot(
  x0: number,
  y0: number,
  targetX: number,
  seconds: number,
  { lift = true }: { lift?: boolean } = {},
): { vx: number; vy: number; clearsNet: boolean } {
  // A shot with nowhere to go cannot be lifted anywhere either.
  if (targetX === x0) return { vx: 0, vy: 0, clearsNet: false };
  let flight = Math.max(0.05, seconds);

  for (let attempt = 0; attempt < 32; attempt += 1) {
    const vx = (targetX - x0) / flight;
    const vy = (0.5 * PHYSICS.GRAVITY * flight * flight - y0) / flight;
    const clears = clearsNet(x0, y0, vx, vy);
    if (clears || !lift) return { vx, vy, clearsNet: clears };
    // A longer flight for the same target is a higher arc.
    flight *= 1.12;
  }

  const vx = (targetX - x0) / flight;
  const vy = (0.5 * PHYSICS.GRAVITY * flight * flight - y0) / flight;
  return { vx, vy, clearsNet: clearsNet(x0, y0, vx, vy) };
}

/** Whether a ball launched like this is above the tape when it gets there. */
export function clearsNet(x0: number, y0: number, vx: number, vy: number) {
  if (vx === 0) return false;
  const t = (COURT.NET_X - x0) / vx;
  if (t <= 0) return true; // Never crosses; not a net problem.
  const y = y0 + vy * t - 0.5 * PHYSICS.GRAVITY * t * t;
  return y > COURT.NET_TOP + COURT.NET_MARGIN;
}

/** Where a ball in flight will first touch the ground. */
export function predictLandingX(ball: TennisBall) {
  const { y, vy, vx, x } = ball;
  const disc = vy * vy + 2 * PHYSICS.GRAVITY * y;
  if (disc < 0) return x;
  const t = (vy + Math.sqrt(disc)) / PHYSICS.GRAVITY;
  return x + vx * t;
}

/* ── Judgement ───────────────────────────────────────────────────────────── */

/**
 * How well a swing met the ball, from horizontal offset alone.
 *
 * Edward stands to the left of the net, so a ball with a greater `x` than his
 * has not arrived yet — swinging at it is EARLY. One with a smaller `x` has
 * already gone past, which is LATE.
 */
/**
 * @deprecated Superseded by `judgeSwingTiming` + the `STRIKE` box, which judge
 * the same contact the racket geometry produces. Kept only because
 * `tests/minigames.test.ts` (not owned by this session) pins it.
 */
export function judgeContact(offsetX: number): TennisQuality {
  const distance = Math.abs(offsetX);
  if (distance > SWING.REACH_X) return "MISS";
  if (distance <= SWING.PERFECT_X) return "PERFECT";
  if (distance <= SWING.GOOD_X) return "GOOD";
  return offsetX > 0 ? "EARLY" : "LATE";
}

/** A return that commits to nothing lands here, in the middle of ALEX's half. */
const NEUTRAL_TARGET = 75;

/** How much of the intended placement each quality of contact actually gets. */
const ACCURACY: Readonly<Record<Exclude<TennisQuality, "MISS">, number>> = {
  PERFECT: 1,
  GOOD: 0.72,
  EARLY: 0.35,
  LATE: 0.35,
};

/**
 * Where a return goes.
 *
 * Two separate things decide it, which is the whole design of the game in one
 * function. *Where Edward is standing* decides what he is trying to do: deep in
 * his own half he can only push the ball long, up near the net he can drop it
 * short. *How well he met it* decides how much of that intention survives — a
 * clean strike goes where he meant it, a mistimed one drifts back to the middle
 * of the court, which is exactly where ALEX is waiting.
 *
 * So the two skills stay honest and separate: position chooses the shot, timing
 * earns it. Nothing on screen explains this. It is consistent, so it is
 * learnable, which is the only tutorial a game this size should need.
 */
export function aimReturn(
  playerX: number,
  offsetX: number,
  quality: Exclude<TennisQuality, "MISS">,
  opponentX: number,
): number {
  const depth = (playerX - COURT.PLAYER_MIN) / (COURT.PLAYER_MAX - COURT.PLAYER_MIN);
  // Standing back sends it long; standing up sends it short.
  const intended = clamp(92 - depth * 34 + offsetX * 1.8, 58, 92);
  const landed = NEUTRAL_TARGET + (intended - NEUTRAL_TARGET) * ACCURACY[quality];
  // Finally, lean away from ALEX rather than through him.
  const away = landed + (landed >= opponentX ? 1 : -1) * 2.5;
  return clamp(away, 58, 92);
}

/* ── Simulation ──────────────────────────────────────────────────────────── */

function stepAxis(
  position: number,
  velocity: number,
  direction: number,
  dt: number,
  topSpeed: number,
  accelSeconds: number,
  min: number,
  max: number,
) {
  const target = direction * topSpeed;
  const rate = (topSpeed / accelSeconds) * dt;
  let nextV: number;
  if (Math.abs(target - velocity) <= rate) nextV = target;
  else nextV = velocity + Math.sign(target - velocity) * rate;

  const proposed = position + nextV * dt;
  const clamped = clamp(proposed, min, max);
  // Walking into the tramline stops, rather than storing speed against it.
  return { position: clamped, velocity: clamped === proposed ? nextV : 0 };
}

function coolRacket(racket: Racket, dt: number): Racket {
  const swing = racket.swing;
  const advanced =
    swing === null
      ? null
      : swing.elapsed + dt >= swing.duration
        ? null
        : { ...swing, elapsed: swing.elapsed + dt };
  return { swing: advanced, cooldown: Math.max(0, racket.cooldown - dt) };
}

function startSwing(kind: TennisSwing): Racket {
  const spec = SWING_SPEC[kind];
  return {
    swing: { kind, elapsed: 0, duration: spec.duration, spent: false },
    cooldown: spec.cooldown,
  };
}

/**
 * Picks the swing for the ball on its way, in the brief's priority order.
 *
 * Chosen once at the press and then frozen on the racket. Forehand and
 * backhand are decided by which side of the **body** the ball will arrive on,
 * with ALEX's mirrored sprite taken into account — not by a screen-side rule,
 * which would give the two players opposite-handed swings for the same ball.
 */
export function selectSwing(
  side: TennisSide,
  phase: TennisPhase,
  x: number,
  ball: TennisBall,
): TennisSwing {
  if (phase === "SERVE") return "SERVE";

  // What the ball will be doing when it gets here — not what it is doing now.
  // Choosing from the current height picked a smash for every ball ALEX
  // lifted over the net, because they are all high at the moment they cross
  // it and low by the time they arrive.
  const arrival = predictArrival(ball, x);
  const arrivalX = arrival ? arrival.x : predictLandingX(ball);

  /** Could this swing's strings actually meet this ball? */
  const reaches = (kind: TennisSwing, bonus = 0) => {
    const spec = SWING_SPEC[kind];
    const centre = (spec.windowStart + spec.windowEnd) / 2;
    const anchor = contactAnchor(side, x, kind, centre);
    return (
      timeToStrike(ball, anchor.x, anchor.y, STRIKE_HALF_X + bonus, STRIKE_HALF_Y + bonus) !==
      null
    );
  };

  // Still up and coming down when it reaches the racket: an overhead.
  if (
    arrival !== null &&
    arrival.y >= SWING_CHOICE.SMASH_MIN_Y &&
    arrival.falling &&
    Math.abs(arrivalX - x) <= SWING_CHOICE.SMASH_REACH_X &&
    reaches("SMASH")
  ) {
    return "SMASH";
  }

  // Taken out of the air before it lands, close to the net: a volley.
  if (
    arrival !== null &&
    arrival.bounces === 0 &&
    Math.abs(arrival.x - COURT.NET_X) <= SWING_CHOICE.VOLLEY_NET_BAND &&
    Math.abs(arrival.x - x) <= SWING_CHOICE.VOLLEY_REACH_X &&
    reaches("VOLLEY")
  ) {
    return "VOLLEY";
  }

  // The racket arm is on the +x side of Edward's art and, because ALEX's
  // canvas is mirrored, on the -x side of his. A ball reaching a player on
  // their racket side is a forehand; one they must bring the racket across
  // the body for is a backhand.
  const racketSide = side === "PLAYER" ? 1 : -1;
  const towardRacket = (arrivalX - x) * racketSide;
  const ground: TennisSwing = towardRacket >= 0 ? "FOREHAND" : "BACKHAND";

  // The two groundstrokes are struck at different heights, so a ball the
  // natural one sails over is played with the other. That is a footwork
  // decision a player makes without thinking about it, and without it a ball
  // arriving between the two heights could not be returned at all.
  if (reaches(ground)) return ground;
  const other: TennisSwing = ground === "FOREHAND" ? "BACKHAND" : "FOREHAND";
  return reaches(other) ? other : ground;
}

/**
 * Where and how the ball will be when it reaches this player.
 *
 * "Reaches" means the first time it is inside a generous band around the
 * player's own x — the moment they would have to play it. Returns null for a
 * ball that never gets there, which is how a player knows not to swing.
 */
export function predictArrival(
  ball: TennisBall,
  x: number,
  seconds = 2,
): { readonly t: number; readonly x: number; readonly y: number; readonly falling: boolean; readonly bounces: number } | null {
  let bounces = ball.bounces;
  let previousY = ball.y;
  for (const point of flightPreview(ball, seconds)) {
    if (point.y === 0 && previousY > 0) bounces += 1;
    if (Math.abs(point.x - x) <= SWING_CHOICE.ARRIVAL_BAND) {
      return { t: point.t, x: point.x, y: point.y, falling: point.y <= previousY, bounces };
    }
    previousY = point.y;
  }
  return null;
}

/**
 * Earliest fraction of a step at which a moving point enters a moving box.
 *
 * The ball travels up to 29.6 units in one 60Hz step against a strike zone
 * about 4.6 wide, so a point test at the end of the step misses cleanly-timed
 * shots outright — the ball is simply on the other side by the time anything
 * is checked. Both the ball and the racket are swept, in the racket's frame,
 * and the returned `t` is where they actually met.
 */
export function sweptHit(
  ballFrom: ContactAnchor,
  ballTo: ContactAnchor,
  anchorFrom: ContactAnchor,
  anchorTo: ContactAnchor,
  halfX: number,
  halfY: number,
): number | null {
  const ax = ballFrom.x - anchorFrom.x;
  const ay = ballFrom.y - anchorFrom.y;
  const bx = ballTo.x - anchorTo.x;
  const by = ballTo.y - anchorTo.y;

  let tMin = 0;
  let tMax = 1;

  for (const [start, end, half] of [
    [ax, bx, halfX],
    [ay, by, halfY],
  ] as const) {
    const delta = end - start;
    if (Math.abs(delta) < 1e-9) {
      if (Math.abs(start) > half) return null;
      continue;
    }
    const t1 = (-half - start) / delta;
    const t2 = (half - start) / delta;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
    if (tMin > tMax) return null;
  }

  return tMin <= tMax ? tMin : null;
}

/**
 * The part of one step during which the swing was genuinely inside its timing
 * window.
 *
 * `swingIsLive` asks about the state at the *end* of a step, so a window that
 * opens part-way through would otherwise let the whole step count as live —
 * measured, up to half a step of hit window that no constant declares and no
 * player can see. Clamping the sweep to the live sub-interval keeps each
 * window exactly as wide as SWING_SPEC says it is.
 */
function liveInterval(
  kind: TennisSwing,
  progressBefore: number,
  progressAfter: number,
): readonly [number, number] | null {
  const { windowStart, windowEnd } = SWING_SPEC[kind];
  const delta = progressAfter - progressBefore;
  if (Math.abs(delta) < 1e-9) {
    return progressBefore >= windowStart && progressBefore <= windowEnd ? [0, 1] : null;
  }
  const a = (windowStart - progressBefore) / delta;
  const b = (windowEnd - progressBefore) / delta;
  const from = Math.max(0, Math.min(a, b));
  const to = Math.min(1, Math.max(a, b));
  return from <= to ? [from, to] : null;
}

function lerpPoint(from: ContactAnchor, to: ContactAnchor, t: number): ContactAnchor {
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
}

/**
 * `sweptHit`, restricted to the live part of the step. Returns the fraction of
 * the whole step at which contact happened, so callers keep one timebase.
 */
function sweptHitLive(
  kind: TennisSwing,
  ballFrom: ContactAnchor,
  ballTo: ContactAnchor,
  anchorFrom: ContactAnchor,
  anchorTo: ContactAnchor,
  halfX: number,
  halfY: number,
  progressBefore: number,
  progressAfter: number,
): number | null {
  const live = liveInterval(kind, progressBefore, progressAfter);
  if (!live) return null;
  const [from, to] = live;
  const t = sweptHit(
    lerpPoint(ballFrom, ballTo, from),
    lerpPoint(ballFrom, ballTo, to),
    lerpPoint(anchorFrom, anchorTo, from),
    lerpPoint(anchorFrom, anchorTo, to),
    halfX,
    halfY,
  );
  return t === null ? null : from + t * (to - from);
}


/**
 * Steps a ball forward on its own, without the players.
 *
 * Used to answer "when will this be hittable?" — the question a receiver
 * actually asks. Pure, deterministic, and it uses the same integration and the
 * same bounce as the live step, so the answer it gives is the one that happens.
 */
export function flightPreview(
  ball: TennisBall,
  seconds: number,
  step = 1 / 60,
): readonly { readonly t: number; readonly x: number; readonly y: number }[] {
  const path: { t: number; x: number; y: number }[] = [];
  let { x, y, vx, vy } = ball;
  for (let t = 0; t < seconds; t += step) {
    x += vx * step;
    y += vy * step - 0.5 * PHYSICS.GRAVITY * step * step;
    vy -= PHYSICS.GRAVITY * step;
    if (y <= 0) {
      y = 0;
      vy = -vy * PHYSICS.RESTITUTION;
      vx *= PHYSICS.BOUNCE_DRAG;
    }
    path.push({ t: t + step, x, y });
  }
  return path;
}

/**
 * The first moment this ball is inside a racket-sized box at `anchor`.
 *
 * Returns null when it never is, which is how a receiver knows the ball is
 * past them rather than something to swing at.
 */
export function timeToStrike(
  ball: TennisBall,
  anchorX: number,
  anchorY: number,
  halfX: number,
  halfY: number,
  seconds = 2,
): number | null {
  for (const point of flightPreview(ball, seconds)) {
    if (Math.abs(point.x - anchorX) <= halfX && Math.abs(point.y - anchorY) <= halfY) {
      return point.t;
    }
  }
  return null;
}

/**
 * How well the ball was timed, from where in the impact window it was met.
 *
 * Position is no longer the graded quantity — the strike zone is the racket
 * head, so being in the wrong place is a miss rather than a poor hit. What is
 * left to grade is timing, and swinging early now genuinely means the head is
 * elsewhere when the ball arrives.
 */
export function judgeSwingTiming(
  kind: TennisSwing,
  progress: number,
): Exclude<TennisQuality, "MISS"> {
  const spec = SWING_SPEC[kind];
  const centre = (spec.windowStart + spec.windowEnd) / 2;
  const half = (spec.windowEnd - spec.windowStart) / 2;
  if (half <= 0) return "GOOD";
  const error = (progress - centre) / half;
  if (Math.abs(error) <= 0.34) return "PERFECT";
  if (Math.abs(error) <= 0.78) return "GOOD";
  // Contact late in the swing means the arm was already on its way before the
  // ball arrived — the press was EARLY. Contact at the very start of the
  // window is the opposite. The verdict names what the player did, not where
  // in the animation the strings happened to be.
  return error > 0 ? "EARLY" : "LATE";
}

function serveState(state: TennisState, server: TennisSide): TennisState {
  return {
    ...state,
    phase: "SERVE",
    phaseTime: 0,
    // The receiver stands to receive: behind the service box the serve must
    // land in, not out on the baseline where it cannot be reached in time.
    playerX: server === "PLAYER" ? 20 : 34,
    playerVx: 0,
    alexX: server === "ALEX" ? 80 : 66,
    alexVx: 0,
    ball: { ...RESTING_BALL, x: server === "PLAYER" ? 20 : 80, y: COURT.CONTACT_Y },
    playerRacket: COLD,
    alexRacket: COLD,
    lastContact: null,
    toss: null,
    server,
    rallyShots: 0,
    quality: null,
    qualityAge: 0,
    pointWinner: null,
    pointReason: "",
    alexReaction: 0,
    alexTargetX: 80,
    alexReadShot: -1,
    shake: 0,
    prompt: promptForScore(state.playerPoints, state.alexPoints),
  };
}

function promptForScore(playerPoints: number, alexPoints: number) {
  if (playerPoints === TENNIS_TARGET_POINTS - 1 && alexPoints === TENNIS_TARGET_POINTS - 1) {
    return "MATCH POINT — BOTH";
  }
  if (playerPoints === TENNIS_TARGET_POINTS - 1) return "MATCH POINT";
  if (alexPoints === TENNIS_TARGET_POINTS - 1) return "MATCH POINT — ALEX";
  return "FIRST TO 5";
}

function awardPoint(
  state: TennisState,
  winner: TennisSide,
  reason: string,
): TennisState {
  const playerPoints = state.playerPoints + (winner === "PLAYER" ? 1 : 0);
  const alexPoints = state.alexPoints + (winner === "ALEX" ? 1 : 0);
  const matchWinner =
    playerPoints >= TENNIS_TARGET_POINTS
      ? "PLAYER"
      : alexPoints >= TENNIS_TARGET_POINTS
        ? "ALEX"
        : null;

  return {
    ...state,
    phase: matchWinner ? "DONE" : "POINT",
    phaseTime: 0,
    playerPoints,
    alexPoints,
    pointWinner: winner,
    pointReason: reason,
    matchWinner,
    longestRally: Math.max(state.longestRally, state.rallyShots),
    prompt: matchWinner
      ? matchWinner === "PLAYER"
        ? "YOU WIN!"
        : "GOOD GAME!"
      : reason,
  };
}

export function advanceTennis(
  state: TennisState,
  input: MinigameInput,
  dt: number,
): TennisState {
  if (state.done) return state;

  const step = clamp(dt, 0, 0.05);
  const phaseTime = state.phaseTime + step;
  const tick = state.tick + 1;

  if (state.phase === "DONE") {
    if (phaseTime >= PACE.BANNER_SECONDS) {
      return { ...state, phaseTime, tick, done: true };
    }
    return { ...state, phaseTime, tick, shake: Math.max(0, state.shake - step * 4) };
  }

  if (state.phase === "POINT") {
    if (phaseTime >= PACE.POINT_SECONDS) {
      // The loser of the point serves the next one, so a run of lost points
      // always hands the initiative back.
      return serveState({ ...state, phaseTime }, state.pointWinner === "PLAYER" ? "ALEX" : "PLAYER");
    }
    return {
      ...state,
      phaseTime,
      tick,
      shake: Math.max(0, state.shake - step * 4),
      qualityAge: state.qualityAge + step,
      impactAge: state.impactAge + step,
    };
  }

  if (state.phase === "SERVE") {
    const server = state.server;
    const from = server === "PLAYER" ? state.playerX : state.alexX;

    if (phaseTime < SERVE_CONTACT_AT) {
      // The toss, and the swing that meets it. A serve whose ball simply
      // appears at contact height is the thing this pass exists to stop, so
      // the ball is thrown from the hand and travels under gravity to the
      // racket — the contact you see is the contact that launches it.
      const sinceRelease = phaseTime - TOSS.RELEASE_AT;
      const racket =
        phaseTime >= SERVE_SWING_AT && state.playerRacket.swing === null &&
        state.alexRacket.swing === null
          ? startSwing("SERVE")
          : null;

      const serverRacket = racket
        ? racket
        : coolRacket(server === "PLAYER" ? state.playerRacket : state.alexRacket, step);

      const toss =
        sinceRelease >= 0
          ? {
              x: from + (server === "PLAYER" ? TOSS.HAND_DX : -TOSS.HAND_DX),
              y:
                TOSS.HAND_Y +
                tossVelocity() * sinceRelease -
                0.5 * PHYSICS.GRAVITY * sinceRelease * sinceRelease,
            }
          : null;

      return {
        ...state,
        phaseTime,
        tick,
        toss,
        qualityAge: state.qualityAge + step,
        playerRacket: server === "PLAYER" ? serverRacket : coolRacket(state.playerRacket, step),
        alexRacket: server === "ALEX" ? serverRacket : coolRacket(state.alexRacket, step),
      };
    }
    // Serve launches itself. The brief asks for no extra control just to start
    // a rally, and a rally that begins on its own is a rally you are already in.
    const placement = randomBetween(state.seed, 0.3, 0.7);
    // Into the service box, which is where a serve is allowed to land — the
    // court draws its service lines at 28% and 72%. It used to be aimed at up
    // to 92, past the far service line and most of the way to the baseline: a
    // fault in the real game, and unreturnable here once the strike zone was
    // the racket rather than a fifth of the court.
    const targetX =
      server === "PLAYER"
        ? COURT.SERVE_FAR_MIN + placement.value * (COURT.SERVICE_FAR - COURT.SERVE_FAR_MIN)
        : COURT.SERVE_NEAR_MAX - placement.value * (COURT.SERVE_NEAR_MAX - COURT.SERVICE_NEAR);
    // Struck from where the serving racket actually is at its impact window,
    // so the ball leaves the strings rather than the middle of the player.
    const serveSpec = SWING_SPEC.SERVE;
    const serveProgress = (serveSpec.windowStart + serveSpec.windowEnd) / 2;
    const anchor = contactAnchor(server, from, "SERVE", serveProgress);
    const shot = buildShot(anchor.x, anchor.y, targetX, 1.02);

    return {
      ...state,
      phase: "RALLY",
      phaseTime: 0,
      tick,
      seed: placement.seed,
      rallyShots: 1,
      toss: null,
      lastContact: {
        tick,
        t: 0,
        x: anchor.x,
        y: anchor.y,
        by: server,
        swing: "SERVE",
        quality: "GOOD",
        progress: serveProgress,
      },
      impactX: anchor.x,
      impactY: anchor.y,
      impactAge: 0,
      ball: {
        x: anchor.x,
        y: anchor.y,
        vx: shot.vx,
        vy: shot.vy,
        bounces: 0,
        lastHitBy: server,
      },
      prompt: promptForScore(state.playerPoints, state.alexPoints),
    };
  }

  /* ── RALLY ─────────────────────────────────────────────────────────────── */

  let next: TennisState = {
    ...state,
    phaseTime,
    tick,
    qualityAge: state.qualityAge + step,
    impactAge: state.impactAge + step,
    shake: Math.max(0, state.shake - step * 4),
    playerRacket: coolRacket(state.playerRacket, step),
    alexRacket: coolRacket(state.alexRacket, step),
  };

  /* Movement. Left and right only — the brief is firm that there is nothing
     else to learn. */
  const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const player = stepAxis(
    next.playerX,
    next.playerVx,
    direction,
    step,
    MOVE.PLAYER_SPEED,
    MOVE.PLAYER_ACCEL_SECONDS,
    COURT.PLAYER_MIN,
    COURT.PLAYER_MAX,
  );
  next = { ...next, playerX: player.position, playerVx: player.velocity };

  /* ALEX. Reaction first, then chase, then swing. */
  next = updateAlex(next, step);

  /* The swing. A press picks the shot for the ball on its way and freezes it:
     the racket cannot change into a different motion half-way through. */
  if (input.pressed && next.playerRacket.cooldown <= 0 && next.playerRacket.swing === null) {
    const kind = selectSwing("PLAYER", next.phase, next.playerX, next.ball);
    next = { ...next, playerRacket: startSwing(kind) };
  }

  /* Ball integration. */
  const ball = next.ball;
  const bx = ball.x + ball.vx * step;
  let by = ball.y + ball.vy * step - 0.5 * PHYSICS.GRAVITY * step * step;
  let bvy = ball.vy - PHYSICS.GRAVITY * step;
  let bvx = ball.vx;
  let bounces = ball.bounces;

  /* Did it cross the net below the tape? */
  const crossedNet =
    (ball.x < COURT.NET_X && bx >= COURT.NET_X) ||
    (ball.x > COURT.NET_X && bx <= COURT.NET_X);
  if (crossedNet) {
    const t = (COURT.NET_X - ball.x) / (ball.vx || 1);
    const heightAtNet = ball.y + ball.vy * t - 0.5 * PHYSICS.GRAVITY * t * t;
    if (heightAtNet <= COURT.NET_TOP) {
      const hitter = ball.lastHitBy ?? "ALEX";
      return awardPoint(
        { ...next, ball: { ...ball, x: COURT.NET_X, y: heightAtNet, vx: 0, vy: 0 } },
        hitter === "PLAYER" ? "ALEX" : "PLAYER",
        hitter === "PLAYER" ? "INTO THE NET" : "ALEX FINDS THE NET",
      );
    }
  }

  /* Ground contact. */
  if (by <= 0) {
    by = 0;
    bounces += 1;

    if (bounces === 1 && ball.lastHitBy) {
      const inPlay =
        ball.lastHitBy === "PLAYER"
          ? bx >= COURT.NET_X && bx <= COURT.BASELINE_RIGHT
          : bx <= COURT.NET_X && bx >= COURT.BASELINE_LEFT;
      if (!inPlay) {
        return awardPoint(
          { ...next, ball: { ...ball, x: bx, y: 0, vx: 0, vy: 0, bounces } },
          ball.lastHitBy === "PLAYER" ? "ALEX" : "PLAYER",
          ball.lastHitBy === "PLAYER" ? "LONG" : "ALEX GOES LONG",
        );
      }
    }

    if (bounces >= 2) {
      // Two bounces on a side means that side did not get there.
      const loser: TennisSide = bx < COURT.NET_X ? "PLAYER" : "ALEX";
      return awardPoint(
        { ...next, ball: { ...ball, x: bx, y: 0, vx: 0, vy: 0, bounces } },
        loser === "PLAYER" ? "ALEX" : "PLAYER",
        loser === "PLAYER" ? "ALEX TAKES IT" : "POINT TO EDWARD",
      );
    }

    bvy = -bvy * PHYSICS.RESTITUTION;
    bvx *= PHYSICS.BOUNCE_DRAG;
  }

  let moved: TennisBall = { ...ball, x: bx, y: by, vx: bvx, vy: bvy, bounces };
  next = { ...next, ball: moved };

  /* Contact. Edward first — his racket is the one the visitor is holding.

     The ball is tested along the segment it travelled this step, against the
     racket head swept along its own arc. A point test at the end of the step
     missed cleanly-struck balls outright: the ball moves up to 29.6 units in
     one step and the strike zone is under five wide, so it was routinely on
     the far side of the racket by the time anything was checked. */
  const playerSwing = next.playerRacket.swing;
  const ballIsEdwards = moved.x < COURT.NET_X && moved.lastHitBy !== "PLAYER";
  if (swingIsLive(playerSwing) && playerSwing && ballIsEdwards) {
    const progressBefore = swingProgress(state.playerRacket.swing);
    const progressAfter = swingProgress(playerSwing);
    const t = sweptHitLive(
      playerSwing.kind,
      { x: ball.x, y: ball.y },
      { x: moved.x, y: moved.y },
      contactAnchor("PLAYER", state.playerX, playerSwing.kind, progressBefore),
      contactAnchor("PLAYER", next.playerX, playerSwing.kind, progressAfter),
      STRIKE_HALF_X,
      STRIKE_HALF_Y,
      progressBefore,
      progressAfter,
    );

    if (t !== null) {
      // One event. The reflection, the spark, the shake and the verdict are
      // all derived from it, so nothing can disagree about where or when.
      const progressAt = progressBefore + (progressAfter - progressBefore) * t;
      const quality = judgeSwingTiming(playerSwing.kind, progressAt);
      const hitX = ball.x + (moved.x - ball.x) * t;
      const hitY = ball.y + (moved.y - ball.y) * t;
      const offset = hitX - next.playerX;
      const targetX = aimReturn(next.playerX, offset, quality, next.alexX);
      const shot = buildShot(
        hitX,
        hitY,
        targetX,
        SHOT_SECONDS[quality] * paceFactor(next.rallyShots) * SWING_SPEC[playerSwing.kind].pace,
      );

      moved = {
        x: hitX,
        y: hitY,
        vx: shot.vx,
        vy: shot.vy,
        bounces: 0,
        lastHitBy: "PLAYER",
      };
      next = {
        ...next,
        ball: moved,
        // The swing is spent, so one swing is one ball however long it runs.
        playerRacket: {
          ...next.playerRacket,
          swing: { ...playerSwing, spent: true },
        },
        quality,
        qualityAge: 0,
        perfects: next.perfects + (quality === "PERFECT" ? 1 : 0),
        rallyShots: next.rallyShots + 1,
        lastContact: {
          tick,
          t,
          x: hitX,
          y: hitY,
          by: "PLAYER",
          swing: playerSwing.kind,
          quality,
          progress: progressAt,
        },
        impactX: hitX,
        impactY: hitY,
        impactAge: 0,
        shake: quality === "PERFECT" ? 1 : next.shake,
      };
    }
  }

  /* ALEX's racket. The same contract, the same swept test, the same anchor —
     mirrored, because his sprite is. */
  const alexBall = next.ball;
  const alexSwing = next.alexRacket.swing;
  if (swingIsLive(alexSwing) && alexSwing && alexBall.x > COURT.NET_X && alexBall.lastHitBy !== "ALEX") {
    const alexBefore = swingProgress(state.alexRacket.swing);
    const alexAfter = swingProgress(alexSwing);
    const t = sweptHitLive(
      alexSwing.kind,
      { x: ball.x, y: ball.y },
      { x: alexBall.x, y: alexBall.y },
      contactAnchor("ALEX", state.alexX, alexSwing.kind, alexBefore),
      contactAnchor("ALEX", next.alexX, alexSwing.kind, alexAfter),
      STRIKE_HALF_X + ALEX.REACH_BONUS,
      STRIKE_HALF_Y + ALEX.REACH_BONUS,
      alexBefore,
      alexAfter,
    );
    if (t !== null) {
      next = returnFromAlex(next, t, alexSwing, tick, { x: ball.x, y: ball.y });
    }
  }

  /* Safety valve. A rally this long is not something the physics produces; it
     is something a bug would produce, and it must not hang the loop. */
  if (next.rallyShots > RALLY_SHOT_CAP) {
    const winner: TennisSide = next.ball.lastHitBy === "ALEX" ? "ALEX" : "PLAYER";
    return awardPoint(next, winner, "RALLY GOES THE DISTANCE");
  }

  return next;
}

/**
 * ALEX.
 *
 * Not a tracker: he waits before he reacts, reads the bounce slightly wrong,
 * runs a little slower than Edward, and shanks roughly one reachable ball in
 * eight. Those four numbers together are what make him beatable by someone who
 * has been playing for thirty seconds, which is the only difficulty this is
 * supposed to have.
 */
function updateAlex(state: TennisState, dt: number): TennisState {
  let next = state;
  const ball = state.ball;
  const incoming = ball.lastHitBy === "PLAYER";

  // A ball has just been struck at him: start the clock and pick a read. Once
  // per shot, which is what `alexReadShot` is for.
  if (incoming && state.alexReadShot !== state.rallyShots) {
    const delay = randomBetween(state.seed, ALEX.REACTION_MIN, ALEX.REACTION_MAX);
    const error = randomBetween(delay.seed, -ALEX.PREDICTION_ERROR, ALEX.PREDICTION_ERROR);
    const predicted = predictLandingX(ball) + error.value;
    next = {
      ...next,
      seed: error.seed,
      alexReaction: delay.value,
      alexReadShot: state.rallyShots,
      alexTargetX: clamp(predicted, COURT.ALEX_MIN, COURT.ALEX_MAX),
    };
  }

  if (!incoming) {
    // Nothing to chase: drift back toward the middle of his half.
    next = { ...next, alexTargetX: 78, alexReaction: 0 };
  }

  const reaction = Math.max(0, next.alexReaction - dt);
  // He only moves once his reaction has run out.
  const direction =
    reaction > 0 || Math.abs(next.alexTargetX - next.alexX) < 1
      ? 0
      : Math.sign(next.alexTargetX - next.alexX);

  const moved = stepAxis(
    next.alexX,
    next.alexVx,
    direction,
    dt,
    MOVE.ALEX_SPEED,
    MOVE.ALEX_ACCEL_SECONDS,
    COURT.ALEX_MIN,
    COURT.ALEX_MAX,
  );

  next = {
    ...next,
    alexX: moved.position,
    alexVx: moved.velocity,
    alexReaction: reaction,
  };

  // Swings when the ball is genuinely his to hit, and his racket is cool. He
  // begins the motion while the ball is still approaching — the same as
  // Edward, who has to press before the ball arrives rather than on top of it.
  if (
    incoming &&
    next.alexRacket.cooldown <= 0 &&
    next.alexRacket.swing === null &&
    ball.x > COURT.NET_X &&
    ball.vx > 0
  ) {
    const kind = selectSwing("ALEX", next.phase, next.alexX, ball);
    const spec = SWING_SPEC[kind];
    const centre = (spec.windowStart + spec.windowEnd) / 2;
    // Start the motion so the live window opens when the ball is genuinely
    // reachable. Reading forward is what a receiver does — the ball may still
    // have to bounce and come back up before it is anything he can hit, and
    // swinging the moment it is merely *near* him is how he missed every serve.
    const anchor = contactAnchor("ALEX", next.alexX, kind, centre);
    const strike = timeToStrike(
      ball,
      anchor.x,
      anchor.y,
      STRIKE_HALF_X + ALEX.REACH_BONUS,
      STRIKE_HALF_Y + ALEX.REACH_BONUS,
    );
    const lead = centre * spec.duration;
    const wobble = randomBetween(next.seed, -1, 1);
    const error = wobble.value * ALEX.TIMING_ERROR * (spec.windowEnd - spec.windowStart) * spec.duration;

    if (strike !== null && strike <= lead + error) {
      next = { ...next, seed: wobble.seed, alexRacket: startSwing(kind) };
    } else {
      next = { ...next, seed: wobble.seed };
    }
  }

  return next;
}

/** ALEX meets the ball — or does not, roughly one time in eight. */
function returnFromAlex(
  state: TennisState,
  t: number,
  swing: SwingInFlight,
  tick: number,
  /** Where the ball was before this step's integration — the swept test's origin. */
  from: ContactAnchor,
): TennisState {
  /*
   * Struck where the swept test says the racket met it, not wherever the ball
   * had already reached by the end of the step.
   *
   * This is what the comment always claimed and what Edward's own contact block
   * does, but the code took `state.ball` — the end-of-step position — so the
   * spark, the reflection origin and `lastContact` were all placed up to a full
   * step of travel past the strings. QA (session E, second pass) measured it
   * over 84 of ALEX's returns: a median 1.65 and a maximum 5.53 court units
   * beyond the contact, and on 12 of them the ball was *drawn clear of the
   * racket head* — outside even ALEX's widened strike box — while Edward's own
   * contacts were never drawn outside his. That is the late reflection the
   * brief asks about, and it was only ever on this side of the net.
   *
   * `t` is the swept parameter the hit test returned, so this is the same
   * interpolation Edward's block performs. `state.ball` here is always the
   * integrated ball: Edward's strike leaves it at `x < NET_X` and this branch
   * requires `x > NET_X`, so the two can never claim the same step.
   */
  const travelled = state.ball;
  const ball: TennisBall = {
    ...travelled,
    x: from.x + (travelled.x - from.x) * t,
    y: from.y + (travelled.y - from.y) * t,
  };
  const shank = nextRandom(state.seed);
  const spentRacket = {
    ...state.alexRacket,
    swing: { ...swing, spent: true },
  };
  const contact = (quality: Exclude<TennisQuality, "MISS">): TennisContact => ({
    tick,
    t,
    x: ball.x,
    y: ball.y,
    by: "ALEX" as const,
    swing: swing.kind,
    quality,
    progress: swingProgress(swing),
  });

  if (shank.value < ALEX.SHANK_CHANCE) {
    /* A genuine error, and visibly one.
       Half of them die in the tape, half sail past Edward's baseline. This is
       the only place the net is allowed to end a point, and it is always ALEX
       who finds it — Edward's shots are lifted over it on purpose, because
       punishing a mistimed swing with a weak ball *and* the point would make
       the match about difficulty rather than about playing. */
    const mode = randomBetween(shank.seed, 0, 1);
    const intoNet = mode.value < 0.5;
    const wild = randomBetween(mode.seed, 0, 1);
    const shot = intoNet
      ? // Flat and low: it cannot get over.
        buildShot(ball.x, Math.min(ball.y, 6), COURT.NET_X - 4, 0.42, { lift: false })
      : // Long: past the baseline and out.
        buildShot(ball.x, ball.y, COURT.BASELINE_LEFT - 4 - wild.value * 6, 1.05, {
          lift: false,
        });
    return {
      ...state,
      seed: wild.seed,
      ball: {
        x: ball.x,
        y: intoNet ? Math.min(ball.y, 6) : ball.y,
        vx: shot.vx,
        vy: shot.vy,
        bounces: 0,
        lastHitBy: "ALEX",
      },
      alexRacket: spentRacket,
      rallyShots: state.rallyShots + 1,
      lastContact: contact("EARLY"),
      impactX: ball.x,
      impactY: ball.y,
      impactAge: 0,
    };
  }

  // A real return, placed away from wherever Edward is standing — far enough
  // that standing still is not a strategy, close enough that one honest run
  // gets there. This single number is what makes A and D matter.
  const spread = randomBetween(shank.seed, -1, 1);
  const middle = (COURT.PLAYER_MIN + COURT.PLAYER_MAX) / 2;
  const away = state.playerX + (state.playerX <= middle ? 1 : -1) * ALEX.PLACEMENT_REACH;
  const targetX = clamp(away + spread.value * 6, COURT.PLAYER_MIN + 2, COURT.PLAYER_MAX - 1);
  const shot = buildShot(
    ball.x,
    ball.y,
    targetX,
    ALEX.SHOT_SECONDS * paceFactor(state.rallyShots),
  );

  return {
    ...state,
    seed: spread.seed,
    ball: { x: ball.x, y: ball.y, vx: shot.vx, vy: shot.vy, bounces: 0, lastHitBy: "ALEX" },
    alexRacket: spentRacket,
    rallyShots: state.rallyShots + 1,
    lastContact: contact(judgeSwingTiming(swing.kind, swingProgress(swing))),
    impactX: ball.x,
    impactY: ball.y,
    impactAge: 0,
  };
}

/* ── Reporting ───────────────────────────────────────────────────────────── */

export function getTennisResult(state: TennisState): SportResult {
  const won = state.matchWinner === "PLAYER";
  return {
    rank: {
      value: state.playerPoints,
      display: `${state.playerPoints} PT`,
      better: "higher",
    },
    heading: won ? "YOU WIN!" : "GOOD GAME!",
    playerLabel: "EDWARD",
    playerScore: `${state.playerPoints}`,
    opponentLabel: "ALEX",
    opponentScore: `${state.alexPoints}`,
    note: `${state.perfects} PERFECT ${state.perfects === 1 ? "STRIKE" : "STRIKES"} · LONGEST RALLY ${state.longestRally}`,
  };
}

/** Exposed for the component's HUD and for tests. */
export const TENNIS_COURT = COURT;
export const TENNIS_SWING = SWING;
export const TENNIS_PACE = PACE;
