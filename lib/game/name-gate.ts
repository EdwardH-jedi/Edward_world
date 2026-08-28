import { LINES } from "@/lib/pixel/monolith";

/**
 * The name gate: prove the chosen name to open the stone.
 *
 * A ritual, not a form. The board's rules, all of them enforced here so the
 * component never has to decide anything:
 *
 *   - thirteen carved sockets, one per letter, gaps where the spaces are
 *   - each correct letter sets a lit letter into stone
 *   - a wrong letter flashes the socket dark and sets nothing
 *   - backspace lifts the last letter back out
 *   - case-insensitive; spaces are free, so nobody has to type them and
 *     stray leading or trailing whitespace cannot fail the gate
 *   - anything that is not a letter is ignored outright — digits, punctuation
 *     and the keys a keyboard sends for itself are not mistakes
 *
 * Modelled as a **text reducer** rather than a keystroke machine: the whole
 * typed string goes in, the matched prefix comes out. That is what lets one
 * code path serve a physical keyboard, a phone's native keyboard, a swipe
 * keyboard and an IME — none of which emit a clean key per letter — and it
 * makes pasting the name work without a special case.
 *
 * Pure: no React, no DOM, no timers. The wrong-letter flash is recorded as
 * data (`missAt` plus a monotonic `misses`) so the view can key an animation
 * off it without any timing living in here.
 */

/** The name, letters only, in the order the sockets take them. */
export const NAME_LETTERS = LINES.join("");

/** How the name is written, with its spaces. The canonical value to match. */
export const NAME_TEXT = LINES.join(" ");

export const SOCKET_COUNT = NAME_LETTERS.length;

export interface NameGateState {
  /** What the visitor has actually typed, and what the input should show. */
  readonly text: string;
  /** How many sockets are filled. */
  readonly typed: number;
  /** Socket the last wrong letter hit, for the flash. Cleared by the next edit. */
  readonly missAt: number | null;
  /** Monotonic count of wrong letters, so a repeat miss still reads as new. */
  readonly misses: number;
  readonly solved: boolean;
}

export function createNameGateState(): NameGateState {
  return { text: "", typed: 0, missAt: null, misses: 0, solved: false };
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

function isLetter(ch: string) {
  return /[a-z]/i.test(ch);
}

/**
 * Reads a typed string against the name.
 *
 * Walks it letter by letter, ignoring spaces and anything that is not a
 * letter, and stops at the first letter that is not the one the stone is
 * waiting for. Returns how much was accepted, the text worth keeping, and
 * where the refusal happened.
 */
export function readTypedText(raw: string) {
  let accepted = 0;
  let kept = "";
  for (const ch of raw) {
    if (ch === " ") {
      kept += ch;
      continue;
    }
    if (!isLetter(ch)) continue;
    if (accepted >= SOCKET_COUNT || ch.toUpperCase() !== NAME_LETTERS[accepted]) {
      return { accepted, kept, rejectedAt: accepted };
    }
    accepted += 1;
    kept += ch;
  }
  return { accepted, kept, rejectedAt: null as number | null };
}

/**
 * Applies whatever the visitor has typed so far.
 *
 * Only the matched prefix is kept, so a wrong letter simply never lands — the
 * text the input shows and the letters in the stone can never disagree.
 * Returns the same object when nothing changed, so a caller can skip a render.
 */
export function applyText(state: NameGateState, raw: string): NameGateState {
  if (state.solved) return state;

  const { accepted, kept, rejectedAt } = readTypedText(raw);
  const missed = rejectedAt !== null;

  if (!missed && kept === state.text && accepted === state.typed) {
    return state.missAt === null ? state : { ...state, missAt: null };
  }

  return {
    text: kept,
    typed: accepted,
    missAt: missed ? rejectedAt : null,
    misses: missed ? state.misses + 1 : state.misses,
    solved: accepted >= SOCKET_COUNT,
  };
}

/**
 * Applies a single key, for the bridge that catches typing when the input has
 * lost focus. Everything still goes through the one reducer.
 */
export function pressKey(state: NameGateState, key: string): NameGateState {
  if (state.solved) return state;
  if (key === "Backspace") return applyText(state, state.text.slice(0, -1));
  if (key !== " " && !(key.length === 1 && isLetter(key))) return state;
  return applyText(state, state.text + key);
}

/** Whether the gate takes this key at all — the bridge uses it to decide. */
export function consumesKey(key: string) {
  return key === "Backspace" || key === " " || (key.length === 1 && isLetter(key));
}
