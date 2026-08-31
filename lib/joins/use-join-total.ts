"use client";

import { useSyncExternalStore } from "react";
import {
  getJoinTotal,
  getServerJoinTotal,
  subscribeToJoinTotal,
} from "@/lib/joins/client";

/**
 * The visitor's join position, or `null` until one is known.
 *
 * Read as an external store rather than mirrored into component state, which
 * is the pattern this codebase already uses for reduced motion and the
 * SportsGang standings. It also keeps the server snapshot honest: prerendered
 * markup carries no number, so there is nothing for hydration to disagree
 * about.
 */
export function useJoinTotal(): number | null {
  return useSyncExternalStore(
    subscribeToJoinTotal,
    getJoinTotal,
    getServerJoinTotal,
  );
}
