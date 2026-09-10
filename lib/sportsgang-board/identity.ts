"use client";

/**
 * What this device remembers about publishing to the golf board.
 *
 * Three separate things, in three separate keys, because they mean three
 * different things and are given up at three different moments:
 *
 * | key | what it is | when it appears |
 * |---|---|---|
 * | `…:anon-id` | who a board row belongs to | first submission |
 * | `…:nickname` | what that row is labelled | when a name is typed |
 * | `…:consent` | that publishing was agreed to | when submit is pressed |
 *
 * **The id is the identity; the name is a label.** Two visitors may pick the
 * same nickname and they remain two players, because the board is keyed by the
 * id. Renaming changes the label on this device's own entry and cannot merge
 * it into anyone else's.
 *
 * None of this is an account and none of it is claimed to be tamper-proof.
 * Clearing site data, or opening a private window, produces a new anonymous id
 * and therefore a new player — see HANDOFF-D.md, which says so plainly rather
 * than implying the board resists abuse.
 *
 * Nothing here is read or written until a visitor asks to publish. Playing,
 * including playing as `GUEST`, touches none of it.
 */

const PREFIX = "edwards-world:sg-golf";

/** Distinct from the counter's `edwards-world:join-position`, and from BGM's. */
export const ANON_ID_KEY = `${PREFIX}:anon-id`;
export const NICKNAME_KEY = `${PREFIX}:nickname`;
export const CONSENT_KEY = `${PREFIX}:consent`;
/** Which runs this device has already sent, so a reload cannot resend one. */
export const SUBMITTED_RUNS_KEY = `${PREFIX}:submitted-runs`;

/** The consent value stored, versioned so wording changes can re-ask. */
export const CONSENT_VERSION = "public-golf-board-1";

/**
 * Every access is wrapped: storage throws outright in some privacy modes, and
 * a visitor who has blocked it should still be able to play.
 */
function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // A device that cannot remember the name will be asked again next time.
  }
}

/**
 * This device's anonymous id, created on first use.
 *
 * `crypto.randomUUID()` — the same source the golf run's `runId` uses. Called
 * only from the submit path, so a visitor who never publishes never gets one.
 */
export function getOrCreateAnonId(): string {
  const existing = read(ANON_ID_KEY);
  if (existing !== null && existing.length > 0) return existing;
  const minted = crypto.randomUUID();
  write(ANON_ID_KEY, minted);
  return minted;
}

/** The id if this device already has one, without creating one. */
export function peekAnonId(): string | null {
  return read(ANON_ID_KEY);
}

export function getStoredNickname(): string | null {
  const stored = read(NICKNAME_KEY);
  return stored !== null && stored.length > 0 ? stored : null;
}

export function storeNickname(name: string): void {
  write(NICKNAME_KEY, name);
}

export function hasConsented(): boolean {
  return read(CONSENT_KEY) === CONSENT_VERSION;
}

export function storeConsent(): void {
  write(CONSENT_KEY, CONSENT_VERSION);
}

/**
 * Runs this device has already submitted.
 *
 * The server is the real guard — it refuses a repeated `runId` atomically —
 * but remembering here means a reload or a re-render does not even ask, so the
 * panel can say "already submitted" without a round trip. Capped so the list
 * cannot grow without bound.
 */
const REMEMBERED_RUNS = 50;

export function wasSubmitted(runId: string): boolean {
  const raw = read(SUBMITTED_RUNS_KEY);
  if (raw === null) return false;
  return raw.split(",").includes(runId);
}

export function rememberSubmitted(runId: string): void {
  const raw = read(SUBMITTED_RUNS_KEY);
  const existing = raw === null ? [] : raw.split(",").filter(Boolean);
  if (existing.includes(runId)) return;
  const next = [...existing, runId].slice(-REMEMBERED_RUNS);
  write(SUBMITTED_RUNS_KEY, next.join(","));
}
