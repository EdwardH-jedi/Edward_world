"use client";

import type { JoinsSuccessBody } from "@/lib/joins/response";

/**
 * The visitor's own join, recorded once.
 *
 * Module state rather than component state, deliberately. Three different
 * doors lead into the world — the intro's timed unlock, SKIP INTRO, and SKIP
 * TO INDEX — and React re-mounts things freely (StrictMode mounts every
 * component twice in development). A module-level latch is the only thing
 * that survives all of that, so the counter cannot be nudged twice by one
 * visitor arriving once.
 *
 * A failure is not an error state here. If the counter is unreachable the
 * total simply stays `null` and the world says nothing about it, which is the
 * honest outcome: better silence than a number nobody can stand behind.
 */

let total: number | null = null;
let started = false;
const listeners = new Set<() => void>();

function publish() {
  for (const listener of listeners) listener();
}

/**
 * Records this visitor's arrival, at most once per page load.
 *
 * Safe to call from anywhere, any number of times; every call after the first
 * is a no-op.
 */
export function recordJoinOnce(): void {
  if (started) return;
  started = true;

  void (async () => {
    try {
      const response = await fetch("/api/joins", {
        method: "POST",
        cache: "no-store",
      });
      if (!response.ok) return;

      const body: unknown = await response.json();
      const value = (body as Partial<JoinsSuccessBody> | null)?.total;
      if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
        return;
      }

      total = value;
      publish();
    } catch {
      // Offline, blocked, timed out, or no counter provisioned. Say nothing.
    }
  })();
}

export function subscribeToJoinTotal(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function getJoinTotal(): number | null {
  return total;
}

/**
 * The server renders no number at all.
 *
 * The total is not knowable at prerender time and must not be guessed, so the
 * markup the server produces and the markup the client first produces are
 * identical — the line appears only once a real total has arrived.
 */
export function getServerJoinTotal(): null {
  return null;
}

/** Test seam: forget this page's join so the next call starts over. */
export function resetJoinClientForTests(): void {
  total = null;
  started = false;
  listeners.clear();
}
