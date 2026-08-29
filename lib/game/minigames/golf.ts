import {
  clamp,
  sweepMeter,
  type MinigameBase,
  type MinigameInput,
  type SportResult,
} from "@/lib/game/minigames/types";

/**
 * Golf — a single driver shot.
 *
 * Two stops of one moving bar, exactly as a golf game has done since the 1980s:
 * the first stop sets power, the second sets contact. Carry distance is then a
 * deterministic function of those two numbers. There is no random component
 * anywhere, so the same two presses always produce the same drive.
 */

export type GolfPhase = "POWER" | "CONTACT" | "FLIGHT" | "DONE";

export interface GolfState extends MinigameBase {
  readonly phase: GolfPhase;
  /** Position of the sweeping bar, 0..1. */
  readonly meter: number;
  readonly meterDirection: 1 | -1;
  /** Locked power, 0..1. */
  readonly power: number;
  /** Locked contact offset, -1..1, where 0 is the middle of the club face. */
  readonly contact: number;
  /** Seconds elapsed inside the current phase. */
  readonly phaseTime: number;
  /** Ball position during flight, in metres from the tee. */
  readonly carry: number;
  /** Height above the ground during flight, in metres. */
  readonly height: number;
  /** Sideways drift at landing, in metres. Negative is left. */
  readonly lateral: number;
  readonly verdict: string;
  readonly landing: string;
}

/** A well struck driver. Everything else scales down from here. */
const MAX_CARRY_METRES = 280;
/** How far off line the worst contact puts the ball. */
const MAX_LATERAL_METRES = 42;
/** Fairway is this wide either side of the target line. */
const FAIRWAY_HALF_WIDTH = 18;

const POWER_SWEEP_SPEED = 0.95;
const CONTACT_SWEEP_SPEED = 1.5;
const FLIGHT_SECONDS = 2.2;

export function createGolfState(): GolfState {
  return {
    phase: "POWER",
    meter: 0,
    meterDirection: 1,
    power: 0,
    contact: 0,
    phaseTime: 0,
    carry: 0,
    height: 0,
    lateral: 0,
    verdict: "",
    landing: "",
    done: false,
    prompt: "SET YOUR POWER",
  };
}

/** Carry is power first, then how much the mis-hit costs. Purely derived. */
export function getCarryMetres(power: number, contact: number) {
  const strike = 1 - 0.38 * Math.abs(contact);
  return Math.round(MAX_CARRY_METRES * power * strike);
}

export function getLateralMetres(contact: number) {
  return Math.round(contact * MAX_LATERAL_METRES);
}

function describeContact(contact: number) {
  const offset = Math.abs(contact);
  if (offset < 0.08) return "PURE STRIKE";
  if (offset < 0.22) return "SOLID CONTACT";
  if (offset < 0.45) return contact > 0 ? "FADED RIGHT" : "DRAWN LEFT";
  return contact > 0 ? "SLICED" : "HOOKED";
}

function describeLanding(lateral: number) {
  return Math.abs(lateral) <= FAIRWAY_HALF_WIDTH ? "FAIRWAY" : "ROUGH";
}

export function advanceGolf(
  state: GolfState,
  input: MinigameInput,
  dt: number,
): GolfState {
  if (state.phase === "DONE") return state;

  const phaseTime = state.phaseTime + dt;

  if (state.phase === "POWER") {
    if (input.pressed) {
      return {
        ...state,
        phase: "CONTACT",
        power: state.meter,
        meter: 0.5,
        meterDirection: 1,
        phaseTime: 0,
        prompt: "TIME YOUR CONTACT",
      };
    }
    const swept = sweepMeter(
      state.meter,
      state.meterDirection,
      POWER_SWEEP_SPEED,
      dt,
    );
    return { ...state, meter: swept.value, meterDirection: swept.direction, phaseTime };
  }

  if (state.phase === "CONTACT") {
    if (input.pressed) {
      // The contact bar reads as a face: 0.5 is the sweet spot.
      const contact = clamp((state.meter - 0.5) * 2, -1, 1);
      const lateral = getLateralMetres(contact);
      return {
        ...state,
        phase: "FLIGHT",
        contact,
        carry: 0,
        height: 0,
        lateral,
        verdict: describeContact(contact),
        landing: describeLanding(lateral),
        phaseTime: 0,
        prompt: describeContact(contact),
      };
    }
    const swept = sweepMeter(
      state.meter,
      state.meterDirection,
      CONTACT_SWEEP_SPEED,
      dt,
    );
    return { ...state, meter: swept.value, meterDirection: swept.direction, phaseTime };
  }

  // FLIGHT: a plain parabola, played out over a fixed time.
  const target = getCarryMetres(state.power, state.contact);
  const t = clamp(phaseTime / FLIGHT_SECONDS, 0, 1);
  const carry = Math.round(target * t);
  const height = Math.round(target * 0.22 * 4 * t * (1 - t));

  if (t >= 1) {
    return {
      ...state,
      phase: "DONE",
      phaseTime,
      carry: target,
      height: 0,
      done: true,
      prompt: `${state.verdict} · ${state.landing}`,
    };
  }

  return { ...state, phaseTime, carry, height };
}

export function getGolfResult(state: GolfState): SportResult {
  return {
    rank: { value: state.carry, display: `${state.carry} M`, better: "higher" },
    heading: "DRIVE COMPLETE",
    playerLabel: "CARRY",
    playerScore: `${state.carry} M`,
    opponentLabel: "LANDED",
    opponentScore: state.landing,
    note: `${state.verdict} · ${state.landing}`,
  };
}
