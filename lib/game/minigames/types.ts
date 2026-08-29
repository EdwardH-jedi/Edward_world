/**
 * Shared contract for the SportsGang mini-games.
 *
 * Every sport is a pure, tick-based simulation: `advance(state, input, dt)`
 * returns the next state and nothing else. No React, no DOM, no
 * `requestAnimationFrame` — those live in the component layer. Keeping the
 * rules here is what makes them unit-testable and what keeps the three timing
 * regimes (stage timers, scripted choreography, real-time play) from tangling.
 *
 * The honesty rule the whole feature rests on: every number a sport reports is
 * computed from what the player actually did. Nothing is sampled at random and
 * nothing is invented.
 */

import type { RankValue } from "@/lib/game/sportsgang-standings";

/** Normalised player input for one tick. */
export interface MinigameInput {
  /** Action key or pointer is currently held. */
  readonly action: boolean;
  /** Action went down during this tick. */
  readonly pressed: boolean;
  /** Action came up during this tick. */
  readonly released: boolean;
  /** Steering intent, for sports that have one. */
  readonly up: boolean;
  readonly down: boolean;
  /** Horizontal intent, for anything the player walks. */
  readonly left: boolean;
  readonly right: boolean;
}

export const IDLE_INPUT: MinigameInput = {
  action: false,
  pressed: false,
  released: false,
  up: false,
  down: false,
  left: false,
  right: false,
};

/** How a finished sport reports itself, shaped for the shared result panel. */
export interface SportResult {
  /**
   * The one number this sport can be ranked by, so the standings can compare
   * runs of the same sport without re-deriving each sport's scoring rules.
   */
  readonly rank: RankValue;
  readonly heading: string;
  readonly playerLabel: string;
  readonly playerScore: string;
  readonly opponentLabel: string | null;
  readonly opponentScore: string | null;
  readonly note: string;
}

/** Every sport state carries these so the host can drive them generically. */
export interface MinigameBase {
  /** Finished sports stop advancing and can report a result. */
  readonly done: boolean;
  /** Short line shown above the play area for the current beat. */
  readonly prompt: string;
}

/** Clamps a value into a range. Shared by every simulation. */
export function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

/**
 * A meter that sweeps back and forth between 0 and 1.
 *
 * Golf power, golf accuracy and the basketball release all read from this, so
 * "stop the moving bar" behaves identically across sports.
 */
export function sweepMeter(
  value: number,
  direction: 1 | -1,
  speed: number,
  dt: number,
): { value: number; direction: 1 | -1 } {
  let next = value + direction * speed * dt;
  let nextDirection = direction;

  if (next > 1) {
    next = 2 - next;
    nextDirection = -1;
  } else if (next < 0) {
    next = -next;
    nextDirection = 1;
  }

  return { value: clamp(next, 0, 1), direction: nextDirection };
}
