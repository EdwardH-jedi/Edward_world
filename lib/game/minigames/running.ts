import {
  clamp,
  type MinigameBase,
  type MinigameInput,
  type SportResult,
} from "@/lib/game/minigames/types";

/**
 * Running — a paced 200 metres the player actually steers.
 *
 * The body model is the one that was already here and is deliberately
 * unchanged: above cruising pace stamina drains at a rate that grows with the
 * square of the excess, so a small push is affordable and a big one is not;
 * empty the tank and pace is capped until enough of it comes back. Every
 * number behind that — `CRUISE_PACE`, `TOP_SPEED_MPS`, the drain curve, the
 * recovery rate, the exhaustion floor and its hysteresis threshold — is the
 * value it was, because that economy is the part of this sport that worked.
 *
 * What changed is the *input*, which used to be an accelerator: `up` nudged
 * pace up, `down` nudged it down, and the runner moved forward forever whether
 * or not anyone was pressing anything. That is not running, it is a throttle.
 * Now:
 *
 * - **Left and right are movement.** Pace is a speed the runner accelerates
 *   towards, and with no direction held the target is zero, so letting go
 *   coasts to a stop. Holding the opposite direction brakes, and the runner
 *   turns round only once actually stopped.
 * - **Up and down are the track's width**, not the throttle. They move the
 *   runner between lanes and touch nothing else.
 * - **`S` is the spurt**, held. It raises the target from cruise to flat out
 *   for as long as it is down, and costs what flat out has always cost.
 *
 * Two consequences are load-bearing rather than incidental, and both are
 * tested. **Distance is a position, not a total**: it is where the runner is on
 * the track's forward axis, so running backwards subtracts and crossing the
 * width adds nothing. And **the lane never touches the forward speed**, so
 * moving diagonally cannot outrun moving straight.
 *
 * The distance is short on purpose: long enough that going out too hard has to
 * be paid for before the line, short enough to be a demonstration rather than
 * a chore.
 */

export type RunningPhase = "SET" | "RUNNING" | "FINISHED" | "DONE";

export interface RunningState extends MinigameBase {
  readonly phase: RunningPhase;
  /** Current speed as a fraction of flat out, 0..1. Never negative. */
  readonly pace: number;
  /** Which way along the track the runner is facing and moving. */
  readonly heading: 1 | -1;
  /** Remaining stamina, 0..1. */
  readonly stamina: number;
  /**
   * Where the runner is on the track's forward axis, in metres from the start
   * line. A position, not a distance travelled: running back down the track
   * lowers it, and moving across the track does not change it at all.
   */
  readonly distance: number;
  /** Across the track's width, -1 at the far lane to 1 at the near one. */
  readonly lane: number;
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
/**
 * The target pace while the spurt is held.
 *
 * `1` was already the ceiling the old accelerator clamped to, so holding `S`
 * asks for exactly the pace the old game's fastest input reached — and pays
 * exactly what that pace has always cost.
 */
export const SPRINT_PACE = 1;

/**
 * How fast pace closes on its target, per second.
 *
 * This is the old `PACE_STEP`: the same 0.62 the accelerator moved pace by, now
 * spent getting up to speed and settling back down instead. Reaching cruise
 * from a standing start therefore takes the second it always took to wind the
 * old throttle up to cruise.
 */
const PACE_STEP = 0.62;
/**
 * Braking is twice that.
 *
 * Turning round has to be a decision the player can carry out inside the length
 * of the track, not a three-second arc, but it still has to be a cost — you
 * stop before you turn, which is what makes a wrong turn hurt.
 */
const BRAKE_STEP = PACE_STEP * 2;

const DRAIN_RATE = 0.8;
/** How sharply the cost of pushing grows with the excess over cruise. */
const DRAIN_CURVE = 3;
const RECOVER_RATE = 0.2;
/** Pace ceiling once the tank is dry — a stagger, not a run. */
const EXHAUSTED_PACE = 0.28;
/** Stamina needed before the legs come back. */
const RECOVERY_THRESHOLD = 0.45;

/** Lane units per second, so crossing the full width takes about 1.2s. */
const LANE_SPEED = 1.6;
/** The track's edges, in lane units. Exported so the view maps to the same. */
export const LANE_LIMIT = 1;

const SET_SECONDS = 0.9;
const FINISH_SECONDS = 1.2;

export function createRunningState(): RunningState {
  return {
    phase: "SET",
    // On the blocks: stopped, facing down the track, in the middle lane.
    pace: 0,
    heading: 1,
    stamina: 1,
    distance: 0,
    lane: 0,
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

/**
 * Where the pacer is at a given point in the run.
 *
 * Scripted and nothing else: an even `CRUISE_PACE` from the gun, so the player
 * can see what an even pace looks like. It is a function of the simulation's
 * own elapsed time, which is what keeps it on the same clock as the runner
 * rather than drifting on a second one.
 */
export function getPacerDistance(elapsed: number) {
  return clamp(elapsed * CRUISE_PACE * TOP_SPEED_MPS, 0, RACE_METRES);
}

/** -1, 0 or 1 along the track. Both directions held cancels, as it should. */
function movementIntent(input: MinigameInput) {
  return (input.right ? 1 : 0) - (input.left ? 1 : 0);
}

/** -1 towards the far lane, 1 towards the near one. Both held cancels. */
function laneIntent(input: MinigameInput) {
  return (input.down ? 1 : 0) - (input.up ? 1 : 0);
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
    // Nothing the player presses on the blocks moves anybody. The gun does.
    if (phaseTime >= SET_SECONDS) {
      return { ...state, phase: "RUNNING", phaseTime: 0, prompt: "RUN — HOLD S TO SPURT" };
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
  const intent = movementIntent(input);
  let heading = state.heading;
  let pace = state.pace;

  if (intent !== 0 && intent !== heading) {
    // Asking for the other way: slow down first, and only turn once stopped.
    // The spurt does not help you brake, so it is not read here.
    pace = Math.max(0, pace - BRAKE_STEP * dt);
    if (pace === 0) heading = intent as 1 | -1;
  } else {
    // Standing still asks for nothing, so the target is zero and the runner
    // coasts down — which is also why holding the spurt on the spot neither
    // moves anybody nor burns anything.
    const target = intent === 0 ? 0 : input.sprint ? SPRINT_PACE : CRUISE_PACE;
    pace = pace < target
      ? Math.min(target, pace + PACE_STEP * dt)
      : Math.max(target, pace - PACE_STEP * dt);
  }

  // Exhaustion latches. Emptying the tank costs a spell of staggering, not a
  // single slow frame — otherwise sprinting flat out would be a free strategy.
  let exhausted = state.exhausted;
  if (state.stamina <= 0.001) exhausted = true;
  if (exhausted && state.stamina >= RECOVERY_THRESHOLD) exhausted = false;
  if (exhausted) pace = Math.min(pace, EXHAUSTED_PACE);

  const stamina = clamp(state.stamina + getStaminaRate(pace) * dt, 0, 1);
  const blewUp = state.blewUp || exhausted;

  // The width of the track. Its own speed, independent of pace and never added
  // to the forward axis: that is what stops a diagonal outrunning a straight
  // line, and what stops crossing and re-crossing from counting as progress.
  const lane = clamp(
    state.lane + laneIntent(input) * LANE_SPEED * dt,
    -LANE_LIMIT,
    LANE_LIMIT,
  );

  const travelled = heading * pace * TOP_SPEED_MPS * dt;
  const distance = clamp(state.distance + travelled, 0, RACE_METRES);
  // Backed into the start line: it is a wall, so the runner stops against it
  // rather than grinding stamina away going nowhere.
  if (distance === 0 && heading === -1) pace = 0;

  const elapsed = state.elapsed + dt;
  const lowestStamina = Math.min(state.lowestStamina, stamina);

  // Only the line at the far end finishes the race, and only by reaching it.
  if (distance >= RACE_METRES) {
    return {
      ...state,
      phase: "FINISHED",
      pace,
      heading,
      stamina,
      lane,
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
    heading,
    stamina,
    lane,
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
    rank: {
      value: Math.round(state.elapsed * 10) / 10,
      display: formatRaceTime(state.elapsed),
      better: "lower",
    },
    heading: "RUN COMPLETE",
    playerLabel: `${RACE_METRES} M`,
    playerScore: formatRaceTime(state.elapsed),
    opponentLabel: "STAMINA LEFT",
    opponentScore: `${Math.round(state.stamina * 100)}%`,
    note: describeRun(state),
  };
}
