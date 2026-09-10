import {
  clamp,
  type MinigameBase,
  type MinigameInput,
  type SportResult,
} from "@/lib/game/minigames/types";

/**
 * Basketball — three shots from the same spot.
 *
 * Hold to build the shot, release to take it. Release strength maps directly to
 * how far the ball travels, and the basket is a fixed window on that scale, so
 * whether a shot drops is a plain consequence of when the player let go.
 * Holding too long is as wrong as not holding long enough.
 */

export type BasketballPhase = "READY" | "CHARGING" | "SHOT" | "FEEDBACK" | "DONE";
export type ShotOutcome = "SWISH" | "SCORED" | "SHORT" | "LONG";

/**
 * The court, in the coordinates the renderer already uses.
 *
 * `x` is `left` as a percentage of the court box and `y` is `bottom` as a
 * percentage of it, which is exactly what `.sg-play__ball` consumes. There is
 * deliberately no second coordinate model: every number below is read off the
 * stylesheet so a change there is traceable rather than silent.
 *
 * From `app/globals.css`:
 *
 * - `.sg-court__hoop`  — `left: 84%; bottom: 22%; width: 8%; height: 46%`,
 *   so the hoop box is x ∈ [84, 92], y ∈ [22, 68].
 * - `.sg-court__backboard` — inside it, `right: 0; width: 30%` → x ∈ [89.6, 92];
 *   `top: 8%; height: 34%` of 46 → 3.68 below the hoop top and 15.64 tall,
 *   so y ∈ [48.68, 64.32].
 * - `.sg-court__ring` — inside it, `left: 0; width: 72%` → x ∈ [84, 89.76];
 *   `top: 35%` of 46 → 16.1 below the hoop top, so y = 51.9.
 */
export const COURT = {
  /** Where the ball leaves the shooter's hands. */
  SHOOTER_X: 20,
  RELEASE_Y: 30,
  /** The ring's near lip, and the height a ball must drop through. */
  RIM_NEAR_X: 84,
  RIM_Y: 51.9,
  /** The board's front face — also the far side of the ring's opening. */
  BACKBOARD_X: 89.6,
  BACKBOARD_BOTTOM: 48.68,
  BACKBOARD_TOP: 64.32,
  /** The floor, and the right-hand limit past which a shot is over and gone. */
  FLOOR_Y: 22,
  OUT_X: 104,
} as const;

/**
 * The ball's own size, in the same two axes.
 *
 * `.sg-ball` is `width: clamp(15px, 3%, 30px)` of a `900 / 340` court box, so
 * at the size the physics is written for it is 3% of the width — 1.5% either
 * side of centre — and the same number of pixels vertically, which is a larger
 * share of the shorter axis. The clamp means a phone draws the ball slightly
 * bigger than the ball the physics uses; that is presentation, and the gap is
 * under a pixel at the sizes involved.
 */
const COURT_ASPECT = 900 / 340;
export const BALL_RX = 1.5;
export const BALL_RY = BALL_RX * COURT_ASPECT;

/** Downward acceleration, in court-percent per second squared. */
const GRAVITY = 150;
/**
 * How much of its approach speed the board gives back.
 *
 * A glass backboard is deadened by its mounting: a bank shot comes off slower
 * than it arrived, which is the whole reason banking works.
 *
 * This number is what keeps holding too long a mistake. A shot with a little
 * too much on it meets the board just above the ring, has almost no height to
 * fall through, and drops straight in — the bank shot. One with far too much
 * meets the board high, and comes away with enough speed to carry it back past
 * the near lip before it has fallen to ring height, which is a miss. Lower
 * than this and every overshoot banks in; higher and the makeable bank
 * disappears.
 */
const BACKBOARD_RESTITUTION = 0.88;
/**
 * How far the ball is placed clear of the face after a contact.
 *
 * Without it a ball resolved exactly onto the surface can be counted as
 * touching it again on the next step, invert its velocity a second time, and
 * sit against the board buzzing. Small enough to be invisible, large enough to
 * survive the arithmetic.
 */
const SEPARATION = 0.01;

/**
 * Longest a single shot may stay in the air before the court gives up on it.
 *
 * A backstop, not a timing constant: the slowest shot in the whole release
 * range lands in 1.4s, so nothing in ordinary play reaches this. It exists so
 * that a ball which somehow never settles still ends its shot rather than
 * hanging the session.
 */
const FLIGHT_MAX_SECONDS = 3;

export interface BasketballState extends MinigameBase {
  readonly phase: BasketballPhase;
  readonly shot: number;
  /** Charge level while the button is held, 0..1. */
  readonly charge: number;
  /** The charge the player released at. */
  readonly release: number;
  readonly phaseTime: number;
  /** Ball position along its arc, 0..1. Presentation: drives the spin. */
  readonly flight: number;
  /** Where the ball actually is, and how fast. Court percent. */
  readonly ballX: number;
  readonly ballY: number;
  readonly ballVx: number;
  readonly ballVy: number;
  /** True once this shot has touched the front of the board. */
  readonly hitBoard: boolean;
  /** True once this shot has dropped through the ring. Set at most once. */
  readonly scored: boolean;
  /** Where the ball last crossed ring height going down, if it has. */
  readonly rimCrossX: number | null;
  readonly outcome: ShotOutcome | null;
  readonly made: number;
  readonly history: readonly ShotOutcome[];
}

export const BASKETBALL_SHOTS = 3;

/** Release strength that drops the ball straight through the middle. */
export const IDEAL_RELEASE = 0.62;
const SWISH_WINDOW = 0.035;
const SCORE_WINDOW = 0.085;

const CHARGE_SPEED = 0.85;
/**
 * How long the ball takes to finish its two turns of backspin.
 *
 * Presentation only. The flight used to end at this time; it now ends when the
 * ball lands, drops through, or leaves the court, so this decides nothing but
 * the `flight` number the renderer spins the seams by.
 */
const SPIN_SECONDS = 1.25;
const FEEDBACK_SECONDS = 1;

/** The ball, gathered and waiting, before any shot of the session. */
const BALL_AT_REST = {
  ballX: COURT.SHOOTER_X,
  ballY: COURT.RELEASE_Y,
  ballVx: 0,
  ballVy: 0,
  hitBoard: false,
  scored: false,
  rimCrossX: null,
} as const;

export function createBasketballState(): BasketballState {
  return {
    phase: "READY",
    shot: 0,
    charge: 0,
    release: 0,
    phaseTime: 0,
    flight: 0,
    ...BALL_AT_REST,
    outcome: null,
    made: 0,
    history: [],
    done: false,
    prompt: "HOLD TO SHOOT",
  };
}

/**
 * What the flight turned out to be.
 *
 * Read off the ball's own travel, not off the charge that started it: a shot
 * that came back off the board and dropped is a made shot, and a clean one
 * that never touched anything is a swish. `SHORT` and `LONG` say which side of
 * the ring the ball went, so the feedback still tells the player what to
 * change.
 */
function outcomeFor(flight: Flight, priorCross: number | null): ShotOutcome {
  if (flight.scored) return flight.hitBoard ? "SCORED" : "SWISH";
  // It reached the board and did not drop: there was too much on it.
  if (flight.hitBoard) return "LONG";
  const cross = flight.rimCrossX ?? priorCross;
  // It came down somewhere: which side of the ring says what to change.
  if (cross !== null) return cross >= OPENING_FAR ? "LONG" : "SHORT";
  // It never came down inside the court at all, so it went over everything.
  if (flight.x >= COURT.OUT_X) return "LONG";
  return "SHORT";
}

/**
 * What a release *strength* would be called, on its own.
 *
 * This used to be the whole game: the outcome was decided here, at the moment
 * the button came up, and the ball was a curve drawn afterwards. It is no
 * longer the judge — the flight is — and nothing in the running game calls it.
 * It is kept, and exported for the tests, because it is still the honest
 * statement of what the meter promises: the band the player is told to release
 * inside is `SWISH_WINDOW` and `SCORE_WINDOW` wide, and `getShotReach` is
 * calibrated so that band is the one the simulated ball actually drops through.
 * The two agreeing is the thing `basketball-bank.test.ts` pins.
 */
export function judgeRelease(release: number): ShotOutcome {
  const error = release - IDEAL_RELEASE;
  if (Math.abs(error) <= SWISH_WINDOW) return "SWISH";
  if (Math.abs(error) <= SCORE_WINDOW) return "SCORED";
  return error < 0 ? "SHORT" : "LONG";
}

export function isMade(outcome: ShotOutcome) {
  return outcome === "SWISH" || outcome === "SCORED";
}

/**
 * How far along the rim line the ball ends up.
 *
 * `1` is the middle of the ring, reached at `IDEAL_RELEASE`, and the curve is
 * flat enough there that the meter's own target band — `IDEAL_RELEASE` ±
 * `SCORE_WINDOW`, which is what the player is told to let go inside — is the
 * band that actually drops through. That is the whole calibration: the screen
 * says "let go in the band", so the band has to be true.
 *
 * A power curve rather than a straight line, because a straight one covers 67
 * units of court across the charge and puts the ring inside a window a fifth
 * of the width the meter draws. Its three landmarks are unchanged: nothing on
 * the shot goes nowhere, the ideal release reaches the ring, and a full charge
 * goes past it.
 */
const REACH_EXPONENT = 0.22;

export function getShotReach(release: number) {
  const ratio = clamp(release / IDEAL_RELEASE, 0, 1.6);
  return ratio === 0 ? 0 : ratio ** REACH_EXPONENT;
}

/* ── The shot itself ──────────────────────────────────────────────────────── */

/** The middle of the ring's opening: where a perfectly judged shot goes. */
const OPENING_CENTRE = (COURT.RIM_NEAR_X + BALL_RX + (COURT.BACKBOARD_X - BALL_RX)) / 2;

/**
 * How far past the ring the solve aims, so that the drawn band is the true one.
 *
 * Two things are folded into one number here, and both are measured.
 *
 * `launchFor` solves the continuous ballistic equation, but the ball is
 * integrated in whole 60Hz steps with gravity applied before the move, and
 * that lands it consistently short of the solve. And the ring is not
 * symmetrical about a made shot any more: a release with a little too much on
 * it banks in off the board, so the makeable range runs further past the ideal
 * than it does before it.
 *
 * Aiming a little long puts the meter's own target band — `SCORE_WINDOW`
 * either side, which is what the screen tells the player to release inside —
 * entirely inside the range that scores. Measured, the range is
 * `IDEAL_RELEASE` −0.086 to +0.143 against a drawn band of ±0.085. A screen
 * that says "let go in the band" has to be telling the truth, and
 * `basketball-bank.test.ts` is where that is checked.
 */
const INTEGRATION_LAG = 2.65;

const AIM_X = OPENING_CENTRE + INTEGRATION_LAG;

/**
 * The angle the ball leaves the hands at.
 *
 * Fixed, so that release strength is the only thing the player is choosing —
 * which is the mechanic this pass was told to leave alone. Steep enough that
 * the ball arrives falling rather than skimming, shallow enough that a shot
 * with too much on it meets the board instead of sailing over it. Those two
 * requirements are what pin it; `basketball-bank.test.ts` checks both ends.
 */
const LAUNCH_ANGLE = (54 * Math.PI) / 180;

/**
 * Launch velocity for a release.
 *
 * The old model had no ball: it drew a curve whose horizontal extent was
 * `release / IDEAL_RELEASE` of the way to the ring. That mapping is kept
 * exactly — the aim point still walks out along the floor in proportion to the
 * charge — and the speed that carries a ball through `(aim, RIM_Y)` at
 * `LAUNCH_ANGLE` is solved for rather than drawn. So the same charge sends the
 * ball to the same place it used to, and now it gets there by flying.
 */
export function launchFor(release: number): { vx: number; vy: number } {
  const aimX = COURT.SHOOTER_X + getShotReach(release) * (AIM_X - COURT.SHOOTER_X);
  const dx = aimX - COURT.SHOOTER_X;
  if (dx <= 0) return { vx: 0, vy: 0 };

  const dy = COURT.RIM_Y - COURT.RELEASE_Y;
  const cos = Math.cos(LAUNCH_ANGLE);
  const sin = Math.sin(LAUNCH_ANGLE);
  // How far the ball has to fall below the straight line it left on. Floored,
  // because a very short shot cannot reach ring height at any speed and the
  // honest answer there is a weak effort that drops short — not a solve.
  const drop = Math.max(dx * (sin / cos) - dy, 4);
  const speed = Math.sqrt((GRAVITY * dx * dx) / (2 * cos * cos * drop));
  return { vx: speed * cos, vy: speed * sin };
}

/**
 * The ball's centre may pass through the ring only between these.
 *
 * Horizontal only, by design: the ring is a line at `RIM_Y` in this projection,
 * so the crossing test is "was above it, is below it" and the only question
 * left is whether the centre was inside the opening when it crossed. The
 * anisotropic `BALL_RY` belongs to the board, which is a *vertical* face and
 * therefore has a vertical extent the ball can miss over the top of.
 */
const OPENING_NEAR = COURT.RIM_NEAR_X + BALL_RX;
const OPENING_FAR = COURT.BACKBOARD_X - BALL_RX;
/** The plane the ball's centre stops at when it meets the board's face. */
const BOARD_FACE = COURT.BACKBOARD_X - BALL_RX;
/**
 * The vertical span of board the ball can actually touch.
 *
 * The bottom is the **ring**, not the board's drawn lower edge. The ring is
 * bolted to the board at `RIM_Y` and the panel continues a little below it; a
 * ball that has already dropped through cannot come back out and hit that
 * strip, and one arriving under the ring is behind the hoop rather than in
 * front of it. Colliding there made every made shot register a board contact,
 * so nothing could ever be a swish.
 */
const BOARD_LOW = COURT.RIM_Y;
const BOARD_HIGH = COURT.BACKBOARD_TOP + BALL_RY;

interface Flight {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hitBoard: boolean;
  scored: boolean;
  /** Where the ball last crossed ring height on its way down, if it did. */
  rimCrossX: number | null;
}

/**
 * Does this straight piece of travel drop through the ring?
 *
 * A crossing, not an overlap: the ball has to be above ring height at one end
 * and below it at the other. That is what stops a ball resting against the rim
 * scoring, and what stops one coming back up through the net scoring at all.
 */
function checkRim(flight: Flight, fromX: number, fromY: number, toX: number, toY: number) {
  if (flight.scored) return;
  if (!(fromY > COURT.RIM_Y && toY <= COURT.RIM_Y)) return;
  const span = fromY - toY;
  const t = span === 0 ? 0 : (fromY - COURT.RIM_Y) / span;
  const x = fromX + (toX - fromX) * t;
  flight.rimCrossX = x;
  if (x > OPENING_NEAR && x < OPENING_FAR) flight.scored = true;
}

/**
 * One step of ball travel, with the board treated as a solid face.
 *
 * The board is checked as a **swept** crossing of the plane between where the
 * ball was and where it is going, not as an overlap at the end of the step. A
 * shot released at the top of the meter covers about two board-widths in a
 * single 60Hz step, and five of those in one frame after a stall, so an
 * overlap test would let it through — which is exactly what "passes straight
 * through it" would have meant, had there been a board to pass through.
 */
export function stepFlight(flight: Flight, dt: number) {
  const fromX = flight.x;
  const fromY = flight.y;
  const vy = flight.vy - GRAVITY * dt;
  const toX = fromX + flight.vx * dt;
  const toY = fromY + vy * dt;

  const crossesFace = flight.vx > 0 && fromX <= BOARD_FACE && toX >= BOARD_FACE;
  const span = toX - fromX;
  const t = crossesFace && span !== 0 ? (BOARD_FACE - fromX) / span : 0;
  const faceY = fromY + (toY - fromY) * t;
  const onBoard = crossesFace && faceY >= BOARD_LOW && faceY <= BOARD_HIGH;

  if (!onBoard) {
    checkRim(flight, fromX, fromY, toX, toY);
    flight.x = toX;
    flight.y = toY;
    flight.vy = vy;
    return;
  }

  // The ball reached the face. Everything before the contact still counts.
  checkRim(flight, fromX, fromY, BOARD_FACE, faceY);

  // Reflect only the component going into the surface, and place the ball
  // clear of it, so an overlapping ball cannot be turned round again next step
  // and sit against the board buzzing.
  flight.hitBoard = true;
  flight.vx = -flight.vx * BACKBOARD_RESTITUTION;
  flight.vy = vy;
  // The frame you hit the board is a frame spent on the board. Carrying the
  // rest of the step out with the new velocity is more exact, but it draws the
  // ball turning round a few tenths of a unit short of the face and the touch
  // is never visible — which is the whole thing being fixed here. The
  // remainder is a fraction of one 60Hz step and is simply given up.
  flight.x = BOARD_FACE - SEPARATION;
  flight.y = faceY;
}

function promptFor(outcome: ShotOutcome) {
  if (outcome === "SWISH") return "SWISH — NOTHING BUT NET";
  if (outcome === "SCORED") return "SCORED OFF THE RIM";
  if (outcome === "SHORT") return "SHORT — NOT ENOUGH ON IT";
  return "LONG — TOO MUCH ON IT";
}

export function advanceBasketball(
  state: BasketballState,
  input: MinigameInput,
  dt: number,
): BasketballState {
  if (state.phase === "DONE") return state;

  const phaseTime = state.phaseTime + dt;

  if (state.phase === "READY") {
    if (input.pressed || input.action) {
      return { ...state, phase: "CHARGING", charge: 0, phaseTime: 0, prompt: "RELEASE" };
    }
    return { ...state, phaseTime };
  }

  if (state.phase === "CHARGING") {
    const charge = clamp(state.charge + CHARGE_SPEED * dt, 0, 1);

    // Releasing, or over-holding to the top of the scale, takes the shot.
    if (input.released || !input.action || charge >= 1) {
      const launch = launchFor(charge);
      return {
        ...state,
        phase: "SHOT",
        release: charge,
        charge,
        flight: 0,
        ...BALL_AT_REST,
        ballVx: launch.vx,
        ballVy: launch.vy,
        // Decided by where the ball goes, not here.
        outcome: null,
        phaseTime: 0,
        prompt: "",
      };
    }

    return { ...state, charge, phaseTime };
  }

  if (state.phase === "SHOT") {
    const flight: Flight = {
      x: state.ballX,
      y: state.ballY,
      vx: state.ballVx,
      vy: state.ballVy,
      hitBoard: state.hitBoard,
      scored: state.scored,
      rimCrossX: null,
    };
    stepFlight(flight, dt);

    const spin = clamp(phaseTime / SPIN_SECONDS, 0, 1);
    // Through the ring is the end of the shot: the ball has gone where it was
    // going, and letting it run on would send it out under the board.
    const dropped = flight.scored && flight.y < COURT.RIM_Y - 6;
    const settled = dropped || flight.y <= COURT.FLOOR_Y || flight.x >= COURT.OUT_X;
    const overdue = phaseTime >= FLIGHT_MAX_SECONDS;

    if (settled || overdue) {
      const outcome = outcomeFor(flight, state.rimCrossX);
      return {
        ...state,
        phase: "FEEDBACK",
        flight: 1,
        ballX: flight.x,
        ballY: Math.max(flight.y, COURT.FLOOR_Y),
        ballVx: 0,
        ballVy: 0,
        hitBoard: flight.hitBoard,
        scored: flight.scored,
        rimCrossX: flight.rimCrossX ?? state.rimCrossX,
        outcome,
        phaseTime: 0,
        made: state.made + (isMade(outcome) ? 1 : 0),
        history: [...state.history, outcome],
        prompt: promptFor(outcome),
      };
    }

    return {
      ...state,
      phaseTime,
      flight: spin,
      ballX: flight.x,
      ballY: flight.y,
      ballVx: flight.vx,
      ballVy: flight.vy,
      hitBoard: flight.hitBoard,
      scored: flight.scored,
      rimCrossX: flight.rimCrossX ?? state.rimCrossX,
    };
  }

  // FEEDBACK
  if (phaseTime >= FEEDBACK_SECONDS) {
    const nextShot = state.shot + 1;
    if (nextShot >= BASKETBALL_SHOTS) {
      return { ...state, phase: "DONE", phaseTime, done: true, prompt: "SESSION COMPLETE" };
    }
    return {
      ...state,
      phase: "READY",
      shot: nextShot,
      charge: 0,
      release: 0,
      flight: 0,
      ...BALL_AT_REST,
      outcome: null,
      phaseTime: 0,
      prompt: "HOLD TO SHOOT",
    };
  }

  return { ...state, phaseTime };
}

export function getBasketballResult(state: BasketballState): SportResult {
  const swishes = state.history.filter((entry) => entry === "SWISH").length;
  return {
    rank: {
      value: state.made,
      display: `${state.made} / ${BASKETBALL_SHOTS}`,
      better: "higher",
    },
    heading: "SESSION COMPLETE",
    playerLabel: "MADE",
    playerScore: `${state.made} / ${BASKETBALL_SHOTS}`,
    opponentLabel: "SWISHES",
    opponentScore: `${swishes}`,
    note: swishes === 1 ? "1 CLEAN SWISH" : `${swishes} CLEAN SWISHES`,
  };
}
