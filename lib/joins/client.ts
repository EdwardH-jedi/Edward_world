"use client";

import type { JoinsSuccessBody } from "@/lib/joins/response";

/**
 * The visitor's own join, recorded once.
 *
 * Two latches, because they cover two different kinds of repeat.
 *
 * The module-level `started` flag covers one page load. Three different doors
 * lead into the world — the intro's timed unlock, SKIP INTRO, and SKIP TO
 * INDEX — and React re-mounts things freely (StrictMode mounts every component
 * twice in development). Module state survives all of that, where component
 * state would not.
 *
 * `sessionStorage` covers the reload the module latch cannot see: refresh,
 * a hard navigation to /resume and back, a restored tab. The visitor's own
 * position is written there once and read back thereafter, so a refresh shows
 * the same ordinal instantly and posts nothing. It is per-tab and clears
 * itself when the tab closes — no cookie, no identifier, no fingerprint, and
 * nothing that leaves the browser.
 *
 * A failure is not an error state here. If the counter is unreachable the
 * total simply stays `null` and the world says nothing about it, which is the
 * honest outcome: better silence than a number nobody can stand behind.
 */

/** Where this tab remembers the position it was already given. */
export const JOIN_SESSION_KEY = "edwards-world:join-position";

let total: number | null = null;
let started = false;
const listeners = new Set<() => void>();

function publish() {
  for (const listener of listeners) listener();
}

/** A position is a counting number; anything else is not a total we can show. */
function isPosition(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

/**
 * Session storage, or `null` where it is unusable.
 *
 * Safari in private browsing and any storage-blocking setting throw on mere
 * access rather than returning undefined, so this is a `try` and not a
 * `typeof` check. Losing it costs the refresh latch and nothing else.
 */
function sessionStore(): Storage | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

function readRememberedPosition(): number | null {
  const store = sessionStore();
  if (!store) return null;
  try {
    const raw = store.getItem(JOIN_SESSION_KEY);
    if (raw === null) return null;
    const parsed = Number(raw);
    return isPosition(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function rememberPosition(position: number): void {
  const store = sessionStore();
  if (!store) return;
  try {
    store.setItem(JOIN_SESSION_KEY, String(position));
  } catch {
    // Quota, private mode, or a blocked origin. The counter still works;
    // this tab just loses its memory across a refresh.
  }
}

/**
 * Records this visitor's arrival, at most once per browsing session.
 *
 * Safe to call from anywhere, any number of times; every call after the first
 * is a no-op, and a tab that has already been counted republishes its stored
 * position instead of posting again.
 */
export function recordJoinOnce(): void {
  if (started) return;
  started = true;

  const remembered = readRememberedPosition();
  if (remembered !== null) {
    total = remembered;
    publish();
    return;
  }

  void (async () => {
    try {
      const response = await fetch("/api/joins", {
        method: "POST",
        cache: "no-store",
      });
      if (!response.ok) return;

      const body: unknown = await response.json();
      const value = (body as Partial<JoinsSuccessBody> | null)?.total;
      if (!isPosition(value)) return;

      total = value;
      rememberPosition(value);
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
  try {
    sessionStore()?.removeItem(JOIN_SESSION_KEY);
  } catch {
    // Nothing to forget.
  }
}
