import { getGarment } from "@/data/wardrobe";
import { OUTFIT_SLOTS, type Outfit, type OutfitSlot } from "@/types/wardrobe";

/**
 * The saved look, kept where the Wardrobe project keeps things: in the browser.
 *
 * This is the product's philosophy made literal rather than described. The look
 * is written to `localStorage` on this device and read back on the next visit;
 * nothing is sent anywhere. Everything here tolerates storage being missing,
 * full, blocked, or holding something it did not write — a corrupted value
 * returns null instead of taking the room down with it.
 */

export const SAVED_LOOK_KEY = "edwards-world:wardrobe:look";

/** Fired after this tab changes the stored look, so subscribers can re-read. */
export const SAVED_LOOK_EVENT = "edwards-world:wardrobe:look-changed";

function announceChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SAVED_LOOK_EVENT));
}

/** Stable snapshot: null means empty; undefined means storage cannot be read. */
export function readSavedLookRaw(): string | null | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage.getItem(SAVED_LOOK_KEY);
  } catch {
    return undefined;
  }
}

/** Parses a stored value, discarding anything that is not a usable outfit. */
export function deserializeOutfit(raw: string | null): Outfit | null {
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }

  const source = parsed as Record<string, unknown>;
  const outfit: Outfit = {};

  for (const slot of OUTFIT_SLOTS) {
    const value = source[slot];
    if (typeof value !== "string") continue;
    // The catalogue is the authority: an id it does not know is dropped.
    const garment = getGarment(value);
    if (garment?.slot === slot) outfit[slot as OutfitSlot] = value;
  }

  return Object.keys(outfit).length > 0 ? outfit : null;
}

export function serializeOutfit(outfit: Outfit) {
  return JSON.stringify(outfit);
}

export function readSavedLook(): Outfit | null {
  if (typeof window === "undefined") return null;
  try {
    return deserializeOutfit(window.localStorage.getItem(SAVED_LOOK_KEY));
  } catch {
    return null;
  }
}

/** Returns whether the write actually landed, so the UI can tell the truth. */
export function writeSavedLook(outfit: Outfit) {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(SAVED_LOOK_KEY, serializeOutfit(outfit));
    announceChange();
    return true;
  } catch {
    return false;
  }
}

/** A failed removal must never be presented as a forgotten look. */
export function clearSavedLook() {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.removeItem(SAVED_LOOK_KEY);
    announceChange();
    return true;
  } catch {
    return false;
  }
}
