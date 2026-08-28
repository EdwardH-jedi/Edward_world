import { LINES } from "@/lib/pixel/monolith";

/**
 * The name gate: prove the chosen name to open the stone.
 *
 * A ritual, not a form. The board's rules, all of them enforced here so the
 * component never has to decide anything:
 *
 *   - thirteen carved sockets, one per letter, gaps where the spaces are
 *   - each correct keystroke sets a lit letter into stone
 *   - a wrong key flashes the socket dark and types nothing
 *   - backspace lifts the last letter back out
 *   - case-insensitive; spaces auto-skip, so nobody has to type them
 *   - anything that is not a letter is ignored outright — Shift, Tab, arrows
 *     and function keys are not mistakes, they are simply not letters
 *
 * Pure: no React, no DOM, no timers. The wrong-key flash is recorded as data
 * (`missAt` plus a monotonic `misses`) so the view can key an animation off it
 * without any timing living in here.
 */

/** The name, letters only, in the order the sockets take them. */
export const NAME_LETTERS = LINES.join("");

/** How the name is written, with its spaces. */
export const NAME_TEXT = LINES.join(" ");

export const SOCKET_COUNT = NAME_LETTERS.length;

export interface NameGateState {
  /** How many sockets are filled. */
  readonly typed: number;
  /** Socket the last wrong key hit, for the flash. Cleared by the next event. */
  readonly missAt: number | null;
  /** Monotonic count of wrong keys, so a repeat miss still reads as new. */
  readonly misses: number;
  readonly solved: boolean;
}

export function createNameGateState(): NameGateState {
  return { typed: 0, missAt: null, misses: 0, solved: false };
}

/** Which word a socket belongs to, counting from zero. */
export function wordIndexOf(socket: number) {
  let remaining = socket;
  for (let line = 0; line < LINES.length; line += 1) {
    if (remaining < LINES[line].length) return line;
    remaining -= LINES[line].length;
  }
  return LINES.length - 1;
}

/**
 * The monument's answer, derived from the name rather than hardcoded.
 *
 * Channels brighten a step every third letter, the apex ring wakes at halfway,
 * and the gate braziers catch as typing reaches the final word.
 */
export const CHANNEL_STEP = 3;
export const APEX_AT = Math.ceil(SOCKET_COUNT / 2);
export const BRAZIER_AT = SOCKET_COUNT - (LINES.at(-1)?.length ?? 0);

export interface MonumentResponse {
  readonly channelSteps: number;
  readonly apexAwake: boolean;
  readonly braziersLit: boolean;
  readonly open: boolean;
}

export function getMonumentResponse(typed: number): MonumentResponse {
  return {
    channelSteps: Math.floor(typed / CHANNEL_STEP),
    apexAwake: typed >= APEX_AT,
    braziersLit: typed >= BRAZIER_AT,
    open: typed >= SOCKET_COUNT,
  };
}

/** A single key, as the gate sees it. */
export type GateKey = string;

function isLetter(key: GateKey) {
  return key.length === 1 && /[a-z]/i.test(key);
}

/**
 * Whether the gate takes this key at all.
 *
 * The view calls this before `preventDefault`, so a space cannot scroll the
 * page out from under the ritual and a stray quote cannot open a browser's
 * find-as-you-type — while Tab, the arrows and the shortcuts keep working.
 */
export function consumesKey(key: GateKey) {
  return key === "Backspace" || key === " " || key === "Spacebar" || isLetter(key);
}

/**
 * Applies one key.
 *
 * Returns the same object when nothing happened, so a caller can skip a render
 * on keys the gate ignores.
 */
export function pressKey(state: NameGateState, key: GateKey): NameGateState {
  if (state.solved) return state;

  if (key === "Backspace") {
    if (state.typed === 0) {
      return state.missAt === null ? state : { ...state, missAt: null };
    }
    // Lifting a letter back out steps across a word gap without comment.
    return { ...state, typed: state.typed - 1, missAt: null };
  }

  // Spaces are already in the stone; pressing one is a silent no-op.
  if (key === " " || key === "Spacebar") return state;

  // Not a letter at all: not a mistake, just not input.
  if (!isLetter(key)) return state;

  const expected = NAME_LETTERS[state.typed];
  if (key.toUpperCase() !== expected) {
    return { ...state, missAt: state.typed, misses: state.misses + 1 };
  }

  const typed = state.typed + 1;
  return { typed, missAt: null, misses: state.misses, solved: typed >= SOCKET_COUNT };
}

/** Types a whole string, for tests and for anything that pastes. */
export function pressAll(state: NameGateState, keys: string): NameGateState {
  let next = state;
  for (const key of keys) next = pressKey(next, key);
  return next;
}
