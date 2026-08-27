/**
 * TOMODACHI.
 *
 * A small NPC with a chunky beige CRT for a head, who wanders near the house
 * and has opinions about how long you have been walking around. Deliberately
 * incidental: it is not a project, it never blocks anything, and it never
 * explains the portfolio.
 *
 * Pure — no React, no DOM.
 */

/** What it says, in order, as you keep coming back. The last line repeats. */
export const TOMODACHI_LINES: readonly (readonly string[])[] = [
  [
    "hello.",
    "you've been walking around for a while.",
    "that's nice.",
  ],
  [
    "back again.",
    "the buildings open with E.",
    "the index opens with the button up there. no walking required.",
  ],
  [
    "i live near the house.",
    "i don't do much.",
    "someone has to not do much.",
  ],
  [
    "there's a construction fence at the end of the path.",
    "it has been under construction the whole time i've been here.",
    "i'm told that's normal.",
  ],
  [
    "you've talked to me more than most.",
    "i'll be honest, i'm the easter egg.",
    "that's the whole bit.",
  ],
];

/** Lines for the nth conversation, counting from zero. */
export function getTomodachiLines(visits: number): readonly string[] {
  const index = Math.min(Math.max(visits, 0), TOMODACHI_LINES.length - 1);
  return TOMODACHI_LINES[index];
}

/** How far it has wandered from its post, in CSS pixels. */
export const WANDER_RANGE = 18;

/**
 * A slow drift back and forth, driven by the world's shared ambient frame.
 *
 * Visual only: the interaction range is measured from where it lives, so the
 * wander can never move the prompt out from under someone standing next to it.
 */
export function getWanderOffset(frame: number) {
  const period = 24;
  const phase = ((frame % period) + period) % period;
  const t = phase / period;
  const triangle = t < 0.5 ? t * 2 : 2 - t * 2;
  return Math.round((triangle * 2 - 1) * WANDER_RANGE);
}
