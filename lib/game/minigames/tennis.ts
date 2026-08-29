import {
  clamp,
  type MinigameBase,
  type MinigameInput,
  type SportResult,
} from "@/lib/game/minigames/types";

/**
 * Tennis — three timed returns.
 *
 * The opponent's shot crosses the court on a fixed schedule; the player presses
 * to swing. The verdict is the absolute timing error at the moment of the
 * press, so PERFECT and GOOD are measured, not awarded. Missing the window
 * entirely — or never pressing — loses the point.
 *
 * Deliberately not a tennis game: one decision per point, three points, done.
 */

export type TennisVerdict = "PERFECT" | "GOOD" | "MISS";
export type TennisPhase = "SERVE" | "INCOMING" | "FEEDBACK" | "DONE";

export interface TennisState extends MinigameBase {
  readonly phase: TennisPhase;
  readonly point: number;
  /** Ball travel across the court, 0 at the opponent, 1 at the player. */
  readonly ballT: number;
  readonly phaseTime: number;
  readonly verdict: TennisVerdict | null;
  readonly playerPoints: number;
  readonly opponentPoints: number;
  readonly history: readonly TennisVerdict[];
}

export const TENNIS_POINTS = 3;

/** Contact happens when the ball reaches the player. */
const CONTACT_T = 1;
const PERFECT_WINDOW = 0.07;
const GOOD_WINDOW = 0.18;

const SERVE_SECONDS = 0.75;
const FEEDBACK_SECONDS = 1.1;
/** Each point is a little quicker than the last. */
const APPROACH_SECONDS = [1.5, 1.3, 1.15] as const;

export function getApproachSeconds(point: number) {
  return APPROACH_SECONDS[Math.min(point, APPROACH_SECONDS.length - 1)];
}

export function createTennisState(): TennisState {
  return {
    phase: "SERVE",
    point: 0,
    ballT: 0,
    phaseTime: 0,
    verdict: null,
    playerPoints: 0,
    opponentPoints: 0,
    history: [],
    done: false,
    prompt: "GET READY",
  };
}

/** Timing error to verdict. The only place the judgement is made. */
export function judgeTiming(ballT: number): TennisVerdict {
  const error = Math.abs(ballT - CONTACT_T);
  if (error <= PERFECT_WINDOW) return "PERFECT";
  if (error <= GOOD_WINDOW) return "GOOD";
  return "MISS";
}

function promptFor(verdict: TennisVerdict) {
  if (verdict === "PERFECT") return "PERFECT — CLEAN WINNER";
  if (verdict === "GOOD") return "GOOD — RETURNED";
  return "MISS — POINT TO PLAYER 02";
}

export function advanceTennis(
  state: TennisState,
  input: MinigameInput,
  dt: number,
): TennisState {
  if (state.phase === "DONE") return state;

  const phaseTime = state.phaseTime + dt;

  if (state.phase === "SERVE") {
    if (phaseTime >= SERVE_SECONDS) {
      return {
        ...state,
        phase: "INCOMING",
        phaseTime: 0,
        ballT: 0,
        prompt: "TIME YOUR RETURN",
      };
    }
    return { ...state, phaseTime };
  }

  if (state.phase === "INCOMING") {
    const approach = getApproachSeconds(state.point);
    // Let the ball run a little past the player so a late press still reads.
    const ballT = clamp(phaseTime / approach, 0, 1 + GOOD_WINDOW * 2);

    if (input.pressed) {
      return settlePoint(state, judgeTiming(ballT), ballT);
    }

    // Never swung: the ball goes by.
    if (ballT >= 1 + GOOD_WINDOW * 2) {
      return settlePoint(state, "MISS", ballT);
    }

    return { ...state, phaseTime, ballT };
  }

  // FEEDBACK
  if (phaseTime >= FEEDBACK_SECONDS) {
    const nextPoint = state.point + 1;
    if (nextPoint >= TENNIS_POINTS) {
      return { ...state, phase: "DONE", phaseTime, done: true, prompt: "MATCH COMPLETE" };
    }
    return {
      ...state,
      phase: "SERVE",
      point: nextPoint,
      phaseTime: 0,
      ballT: 0,
      verdict: null,
      prompt: "GET READY",
    };
  }

  return { ...state, phaseTime };
}

function settlePoint(
  state: TennisState,
  verdict: TennisVerdict,
  ballT: number,
): TennisState {
  const won = verdict !== "MISS";
  return {
    ...state,
    phase: "FEEDBACK",
    phaseTime: 0,
    ballT,
    verdict,
    playerPoints: state.playerPoints + (won ? 1 : 0),
    opponentPoints: state.opponentPoints + (won ? 0 : 1),
    history: [...state.history, verdict],
    prompt: promptFor(verdict),
  };
}

export function getTennisResult(state: TennisState): SportResult {
  const perfects = state.history.filter((entry) => entry === "PERFECT").length;
  return {
    rank: {
      value: state.playerPoints,
      display: `${state.playerPoints} PT`,
      better: "higher",
    },
    heading: "MATCH COMPLETE",
    playerLabel: "EDWARD",
    playerScore: `${state.playerPoints}`,
    opponentLabel: "PLAYER 02",
    opponentScore: `${state.opponentPoints}`,
    note: `${perfects} PERFECT ${perfects === 1 ? "RETURN" : "RETURNS"}`,
  };
}
