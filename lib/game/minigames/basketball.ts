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

export interface BasketballState extends MinigameBase {
  readonly phase: BasketballPhase;
  readonly shot: number;
  /** Charge level while the button is held, 0..1. */
  readonly charge: number;
  /** The charge the player released at. */
  readonly release: number;
  readonly phaseTime: number;
  /** Ball position along its arc, 0..1. */
  readonly flight: number;
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
const SHOT_SECONDS = 1.25;
const FEEDBACK_SECONDS = 1;

export function createBasketballState(): BasketballState {
  return {
    phase: "READY",
    shot: 0,
    charge: 0,
    release: 0,
    phaseTime: 0,
    flight: 0,
    outcome: null,
    made: 0,
    history: [],
    done: false,
    prompt: "HOLD TO SHOOT",
  };
}

/** The only place a shot is judged. Derived from release strength alone. */
export function judgeRelease(release: number): ShotOutcome {
  const error = release - IDEAL_RELEASE;
  if (Math.abs(error) <= SWISH_WINDOW) return "SWISH";
  if (Math.abs(error) <= SCORE_WINDOW) return "SCORED";
  return error < 0 ? "SHORT" : "LONG";
}

export function isMade(outcome: ShotOutcome) {
  return outcome === "SWISH" || outcome === "SCORED";
}

/** How far along the rim line the ball ends up, for drawing the arc. */
export function getShotReach(release: number) {
  return clamp(release / IDEAL_RELEASE, 0, 1.6);
}

function promptFor(outcome: ShotOutcome) {
  if (outcome === "SWISH") return "SWISH — NOTHING BUT NET";
  if (outcome === "SCORED") return "SCORED OFF THE RIM";
  if (outcome === "SHORT") return "SHORT — NOT ENOUGH ON IT";
  return "LONG — OVER THE BACKBOARD";
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
      const outcome = judgeRelease(charge);
      return {
        ...state,
        phase: "SHOT",
        release: charge,
        charge,
        flight: 0,
        outcome,
        phaseTime: 0,
        prompt: "",
      };
    }

    return { ...state, charge, phaseTime };
  }

  if (state.phase === "SHOT") {
    const flight = clamp(phaseTime / SHOT_SECONDS, 0, 1);
    if (flight >= 1) {
      const outcome = state.outcome ?? judgeRelease(state.release);
      return {
        ...state,
        phase: "FEEDBACK",
        flight: 1,
        phaseTime: 0,
        made: state.made + (isMade(outcome) ? 1 : 0),
        history: [...state.history, outcome],
        prompt: promptFor(outcome),
      };
    }
    return { ...state, phaseTime, flight };
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
    heading: "SESSION COMPLETE",
    playerLabel: "MADE",
    playerScore: `${state.made} / ${BASKETBALL_SHOTS}`,
    opponentLabel: "SWISHES",
    opponentScore: `${swishes}`,
    note: "RESULT RECORDED · COUNTS TOWARDS RANKING",
  };
}
