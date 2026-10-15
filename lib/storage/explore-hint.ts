/**
 * The EXPLORE hint is for a first arrival in the world, so it is remembered in
 * the browser, on this device, like the saved look. Storage that is missing,
 * blocked or full must never take the world down: the hint then simply shows
 * on every visit, which is the harmless way to fail.
 */

export const EXPLORE_HINT_KEY = "edwards-world:explore-hint-seen";

/** How long the hint stays up, in ambient frames (450ms each). */
export const EXPLORE_HINT_FRAMES = 4;

/** Latched per page load, so every render of the world agrees on the answer. */
let claimed: boolean | undefined;

/** True the first time it is asked on this device, and remembers having been. */
export function claimExploreHint(): boolean {
  if (claimed !== undefined) return claimed;
  claimed = true;
  try {
    if (window.localStorage.getItem(EXPLORE_HINT_KEY) !== null) claimed = false;
    else window.localStorage.setItem(EXPLORE_HINT_KEY, "1");
  } catch {
    // Unreadable or unwritable: show it rather than guess.
  }
  return claimed;
}

/** `useSyncExternalStore` plumbing: the answer never changes after the claim. */
export const subscribeExploreHint = () => () => {};
export const getExploreHintServerSnapshot = () => false;
