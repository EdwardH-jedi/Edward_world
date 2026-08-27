"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  deserializeOutfit,
  readSavedLookRaw,
  SAVED_LOOK_EVENT,
} from "@/lib/storage/saved-look";

function subscribe(onChange: () => void) {
  window.addEventListener(SAVED_LOOK_EVENT, onChange);
  // Another tab writing the same key counts too.
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(SAVED_LOOK_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * The look saved on this device, read as an external store.
 *
 * The snapshot is the raw string rather than a parsed outfit: React compares
 * snapshots by identity, and a freshly parsed object every read would never
 * settle. Parsing happens once per distinct stored value.
 */
export function useSavedLook() {
  const raw = useSyncExternalStore(
    subscribe,
    readSavedLookRaw,
    () => null,
  );
  return useMemo(() => deserializeOutfit(raw), [raw]);
}
