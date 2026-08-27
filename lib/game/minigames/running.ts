import {
  clamp,
  type MinigameBase,
  type MinigameInput,
  type SportResult,
} from "@/lib/game/minigames/types";

/**
 * Running — a paced 200 metres.
 *
 * Not a button-masher: there is nothing to hit repeatedly. The player holds a
 * pace and the body answers. Above cruising pace stamina drains at a rate that
 * grows with the square of the excess, so a small push is affordable and a big
 * one is not. Empty the tank and pace is capped until some of it comes back.
 *
 * The finishing time is the integral of the pace the player actually held.
 * The distance is short on purpose: long enough that going out too hard has to
 * be paid for before the line, short enough to be a demonstration rather than
 * a chore.
 */

export type RunningPhase = "SET" | "RUNNING" | "FINISHED" | "DONE";

export interface RunningState extends MinigameBase {
  readonly phase: RunningPhase;
  /** Current pace, 0..1, where `CRUISE_PACE` is sustainable indefinitely. */
  readonly pace: number;
  /** Remaining stamina, 0..1. */
  readonly stamina: number;
  /** Metres covered. */
  readonly distance: number;
  /** Seconds of running elapsed. */
  readonly elapsed: number;
  readonly phaseTime: number;
  /** True once stamina has bottomed out at least once. */
  readonly blewUp: boolean;
  /** Currently capped because the tank ran dry, and not yet recovered. */
  readonly exhausted: boolean;
  /** Lowest stamina reached, for the closing summary. */
  readonly lowestStamina: number;
}

export const RACE_METRES = 200;
/** Pace that neither drains nor rebuilds stamina. */
export const CRUISE_PACE = 0.62;
/** Metres per second at full pace. */
export const TOP_SPEED_MPS = 10;

const PACE_STEP = 0.62;
const DRAIN_RATE = 0.8;
/** How sharply the cost of pushing grows with the excess over cruise. */
const DRAIN_CURVE = 3;
const RECOVER_RATE = 0.2;
/** Pace ceiling once the tank is dry — a stagger, not a run. */
const EXHAUSTED_PACE = 0.28;
/** Stamina needed before the legs come back. */
const RECOVERY_THRESHOLD = 0.45;

const SET_SECONDS = 0.9;
const FINISH_SECONDS = 1.2;

export function createRunningState(): RunningState {
  return {
    phase: "SET",
    pace: CRUISE_PACE,
    stamina: 1,
    distance: 0,
    elapsed: 0,
    phaseTime: 0,
    blewUp: false,
    exhausted: false,
    lowestStamina: 1,
    done: false,
    prompt: "ON YOUR MARKS",
  };
}

/** Stamina change per second at a given pace. Positive means recovering. */
export function getStaminaRate(pace: number) {
  const excess = pace - CRUISE_PACE;
  // Exactly at cruise the rate is zero, not negative zero.
  if (excess === 0) return 0;
  if (excess < 0) return RECOVER_RATE * -excess * 4;
  return -DRAIN_RATE * excess * excess * DRAIN_CURVE;
}

function describeRun(state: RunningState) {
  if (state.blewUp) return "WENT OUT TOO HARD";
  if (state.lowestStamina > 0.55) return "PLENTY LEFT IN THE TANK";
  return "JUDGED IT WELL";
}

export function advanceRunning(
  state: RunningState,
  input: MinigameInput,
  dt: number,
): RunningState {
  if (state.phase === "DONE") return state;

  const phaseTime = state.phaseTime + dt;

  if (state.phase === "SET") {
    if (phaseTime >= SET_SECONDS) {
      return { ...state, phase: "RUNNING", phaseTime: 0, prompt: "HOLD A SENSIBLE PACE" };
    }
    return { ...state, phaseTime };
  }

  if (state.phase === "FINISHED") {
    if (phaseTime >= FINISH_SECONDS) {
      return { ...state, phase: "DONE", phaseTime, done: true };
    }
    return { ...state, phaseTime };
  }

  // RUNNING
  let pace = state.pace;
  if (input.up || input.action) pace += PACE_STEP * dt;
  if (input.down) pace -= PACE_STEP * dt;
  pace = clamp(pace, 0.15, 1);

  // Exhaustion latches. Emptying the tank costs a spell of staggering, not a
  // single slow frame — otherwise sprinting flat out would be a free strategy.
  let exhausted = state.exhausted;
  if (state.stamina <= 0.001) exhausted = true;
  if (exhausted && state.stamina >= RECOVERY_THRESHOLD) exhausted = false;
  if (exhausted) pace = Math.min(pace, EXHAUSTED_PACE);

  const stamina = clamp(state.stamina + getStaminaRate(pace) * dt, 0, 1);
  const blewUp = state.blewUp || exhausted;

  const distance = state.distance + pace * TOP_SPEED_MPS * dt;
  const elapsed = state.elapsed + dt;
  const lowestStamina = Math.min(state.lowestStamina, stamina);

  if (distance >= RACE_METRES) {
    return {
      ...state,
      phase: "FINISHED",
      pace,
      stamina,
      blewUp,
      exhausted,
      lowestStamina,
      distance: RACE_METRES,
      elapsed,
      phaseTime: 0,
      prompt: "FINISH",
    };
  }

  const remaining = RACE_METRES - distance;
  const prompt = exhausted
    ? "EMPTY — LEGS GONE"
    : stamina < 0.3
      ? "STAMINA LOW — EASE OFF"
      : `${Math.round(remaining)} M TO GO`;

  return {
    ...state,
    pace,
    stamina,
    blewUp,
    exhausted,
    lowestStamina,
    distance,
    elapsed,
    phaseTime,
    prompt,
  };
}

export function formatRaceTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds - minutes * 60;
  return `${minutes}:${rest.toFixed(1).padStart(4, "0")}`;
}

export function getRunningResult(state: RunningState): SportResult {
  return {
    heading: "RUN COMPLETE",
    playerLabel: `${RACE_METRES} M`,
    playerScore: formatRaceTime(state.elapsed),
    opponentLabel: "STAMINA LEFT",
    opponentScore: `${Math.round(state.stamina * 100)}%`,
    note: `${describeRun(state)} · RESULT RECORDED · COUNTS TOWARDS RANKING`,
  };
}
