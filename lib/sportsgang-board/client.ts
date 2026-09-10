"use client";

import type { GolfRunResultV1 } from "@/lib/game/minigames/golf-result";
import type { RankedEntry } from "@/lib/sportsgang-board/rank";
import type { BoardMode } from "@/lib/sportsgang-board/store";

/**
 * Talking to the golf board.
 *
 * Every call can fail, and a failure is always reported as one: nothing here
 * ever resolves with an empty board, a guessed rank, or a "saved" that did not
 * happen. The panel renders whatever comes back, including the failures.
 */

const ENDPOINT = "/api/sportsgang/golf-board";
const TIMEOUT_MS = 6_000;

export interface BoardView {
  readonly mode: BoardMode;
  readonly verification: "client-reported";
  readonly courseId: string;
  readonly rulesVersion: string;
  readonly par: number;
  readonly holeM: number;
  readonly entries: readonly RankedEntry[];
}

/** Server's answer to a submission. `rank` is null when it was not a best. */
export interface SubmitResult {
  readonly outcome: "RECORDED" | "NOT_BETTER" | "DUPLICATE";
  readonly mode: BoardMode;
  readonly rank: number | null;
  readonly displayName: string;
  readonly entries: readonly RankedEntry[];
}

export type BoardError =
  | { readonly kind: "UNAVAILABLE" }
  | { readonly kind: "RATE_LIMITED" }
  | { readonly kind: "REJECTED"; readonly code: string }
  | { readonly kind: "OFFLINE" };

export type BoardOutcome<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: BoardError };

async function call(path: string, init?: RequestInit): Promise<Response> {
  return fetch(path, {
    ...init,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
}

export async function fetchBoard(anonId?: string | null): Promise<BoardOutcome<BoardView>> {
  const query = anonId ? `?anonId=${encodeURIComponent(anonId)}` : "";
  try {
    const response = await call(`${ENDPOINT}${query}`);
    if (response.status === 503) return { ok: false, error: { kind: "UNAVAILABLE" } };
    if (!response.ok) {
      return { ok: false, error: { kind: "REJECTED", code: String(response.status) } };
    }
    return { ok: true, value: (await response.json()) as BoardView };
  } catch {
    // A network failure, a timeout, or an abort. Not an empty board.
    return { ok: false, error: { kind: "OFFLINE" } };
  }
}

export async function submitRun(input: {
  run: GolfRunResultV1;
  anonId: string;
  displayName?: string;
}): Promise<BoardOutcome<SubmitResult>> {
  try {
    const response = await call(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (response.status === 503) return { ok: false, error: { kind: "UNAVAILABLE" } };
    if (response.status === 429) return { ok: false, error: { kind: "RATE_LIMITED" } };
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      return {
        ok: false,
        error: { kind: "REJECTED", code: body.error ?? String(response.status) },
      };
    }
    return { ok: true, value: (await response.json()) as SubmitResult };
  } catch {
    return { ok: false, error: { kind: "OFFLINE" } };
  }
}

/** What to tell a visitor when something went wrong. Never "saved". */
export function describeBoardError(error: BoardError): string {
  if (error.kind === "UNAVAILABLE") {
    return "The public board is not available right now. Your run was not submitted.";
  }
  if (error.kind === "RATE_LIMITED") {
    return "That is a lot of submissions in a short time. Try again in a minute.";
  }
  if (error.kind === "OFFLINE") {
    return "Could not reach the board. Your run was not submitted.";
  }
  return `The board would not accept that run (${error.code}).`;
}
