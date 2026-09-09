/**
 * The golf run contract.
 *
 * One hole produces a record that outlives the screen it was played on: it is
 * the thing D will submit to the public board. That is a different job from
 * `SportResult`, which exists to fill the result panel and give the standings
 * one comparable number, so this is a separate, versioned shape rather than a
 * widening of `SportResult`.
 *
 * The boundary that matters: **B produces this, D transmits it.** Nothing in
 * this file, and nothing in the simulation that fills it, may touch storage,
 * the network, `crypto`, or `Math.random` — `tests/sportsgang-foundation.test.ts`
 * enforces that by reading the simulation sources. Identity comes in from the
 * component layer as `runId`; a submitted name comes in as
 * `playerDisplayName`, and is `GUEST` until D has one.
 */

import type { SportResult } from "@/lib/game/minigames/types";

/** Bumped when the meaning of a field changes, never for an added field. */
export const GOLF_RESULT_VERSION = 1 as const;

/** The name a run carries when nobody has entered one. */
export const GUEST_DISPLAY_NAME = "GUEST";

/**
 * Identifies the rules a score was achieved under.
 *
 * A board that mixes runs from different rule sets is not a leaderboard, so
 * this travels with every run and is bumped whenever the hole plays
 * differently.
 *
 * `-2` is the one hole: 300 m, par 4, three clubs, stroke-and-distance out of
 * bounds and an eight-shot cap. `-1` named the single drive that preceded it,
 * which was scored on carry distance and ranked the other way up. They are not
 * the same game and their scores must never share a board, which is why the
 * public board keys on this string — see `lib/sportsgang-board/`.
 *
 * Bumped by D at integration on B's request (REQUESTS.md B-4): the constant
 * lives in this frozen file, so B could not move it itself and the string was
 * left describing rules it no longer described.
 */
export const GOLF_RULES_VERSION = "golf-1h-2026-09-2" as const;

/** How a run ended. An abandoned run is still a fact worth recording. */
export type GolfRunStatus = "completed" | "abandoned";

/**
 * One shot, for a server that wants to re-derive the total rather than trust
 * it. Optional and deliberately small: the extension point exists now so B
 * does not have to change the version to add it later.
 */
export interface GolfShotV1 {
  /** 1-based, in the order played. */
  readonly index: number;
  /** Simulated milliseconds from the start of the run to this shot. */
  readonly atSimulationMs: number;
  /**
   * How far this shot finished from where it was played, in metres.
   *
   * **Carry plus roll**, not carry alone: it is the number the HUD shows as
   * `LAST SHOT`, and the one a player would recognise. The name predates the
   * hole and is kept only because changing it would change the wire format for
   * no gain; the comment is the correction (REQUESTS.md B-4). A true carry with
   * roll excluded is not recorded anywhere.
   */
  readonly carryM: number;
  /** Penalty strokes this shot incurred, if any. */
  readonly penalty: number;
}

export interface GolfRunResultV1 {
  readonly version: typeof GOLF_RESULT_VERSION;
  /** Unique per attempt. Injected by the component layer, never generated here. */
  readonly runId: string;
  /** Which hole was played. */
  readonly courseId: string;
  /** Which rules produced these numbers. */
  readonly rulesVersion: string;
  readonly status: GolfRunStatus;
  /** Shots the player actually struck. */
  readonly shotCount: number;
  /** Strokes added by penalties, not struck. */
  readonly penaltyStrokes: number;
  /** `shotCount + penaltyStrokes`. The score. */
  readonly totalStrokes: number;
  /** Simulated time, from the fixed stepper — not wall clock. */
  readonly elapsedSimulationMs: number;
  /** Distance still between ball and hole when the run ended. 0 if holed. */
  readonly remainingDistanceM: number;
  /** Longest single carry of the run. */
  readonly longestDriveM: number;
  /** `GUEST` until D supplies one. */
  readonly playerDisplayName: string;
  /** Present only when B chooses to emit it. */
  readonly shotLog?: readonly GolfShotV1[];
}

/**
 * The number shown as "you are about to play shot N".
 *
 * Deliberately not `totalStrokes`: a penalty raises the score without giving
 * the player another ball to hit, so the two diverge the moment anything goes
 * wrong. Keeping them separate functions is what stops that being re-derived
 * differently in two places.
 */
export function nextShotNumber(run: Pick<GolfRunResultV1, "shotCount">) {
  return run.shotCount + 1;
}

/** `totalStrokes` is derived, never passed in. */
export function totalStrokesOf(shotCount: number, penaltyStrokes: number) {
  return shotCount + penaltyStrokes;
}

export interface GolfRunDraft {
  readonly runId: string;
  readonly courseId: string;
  readonly status: GolfRunStatus;
  readonly shotCount: number;
  readonly penaltyStrokes: number;
  readonly elapsedSimulationMs: number;
  readonly remainingDistanceM: number;
  readonly longestDriveM: number;
  readonly rulesVersion?: string;
  readonly playerDisplayName?: string;
  readonly shotLog?: readonly GolfShotV1[];
}

/**
 * Builds a run record, deriving what is derivable.
 *
 * B calls this at the end of a hole. It is the only supported way to make a
 * `GolfRunResultV1`, which is what keeps `totalStrokes` from being invented
 * somewhere else.
 */
export function createGolfRunResult(draft: GolfRunDraft): GolfRunResultV1 {
  return {
    version: GOLF_RESULT_VERSION,
    runId: draft.runId,
    courseId: draft.courseId,
    rulesVersion: draft.rulesVersion ?? GOLF_RULES_VERSION,
    status: draft.status,
    shotCount: draft.shotCount,
    penaltyStrokes: draft.penaltyStrokes,
    totalStrokes: totalStrokesOf(draft.shotCount, draft.penaltyStrokes),
    elapsedSimulationMs: draft.elapsedSimulationMs,
    remainingDistanceM: draft.remainingDistanceM,
    longestDriveM: draft.longestDriveM,
    playerDisplayName: draft.playerDisplayName ?? GUEST_DISPLAY_NAME,
    ...(draft.shotLog ? { shotLog: draft.shotLog } : {}),
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Structural check for anything arriving from outside this module.
 *
 * D reads runs back from a network response, where the type system has already
 * stopped helping. This is the gate for that.
 */
export function isGolfRunResultV1(value: unknown): value is GolfRunResultV1 {
  if (typeof value !== "object" || value === null) return false;
  const run = value as Record<string, unknown>;

  if (run.version !== GOLF_RESULT_VERSION) return false;
  if (typeof run.runId !== "string" || run.runId.length === 0) return false;
  if (typeof run.courseId !== "string" || run.courseId.length === 0) return false;
  if (typeof run.rulesVersion !== "string" || run.rulesVersion.length === 0) return false;
  if (run.status !== "completed" && run.status !== "abandoned") return false;
  if (typeof run.playerDisplayName !== "string" || run.playerDisplayName.length === 0) {
    return false;
  }

  const counts = [run.shotCount, run.penaltyStrokes, run.totalStrokes];
  if (!counts.every((n) => isFiniteNumber(n) && Number.isInteger(n) && n >= 0)) return false;

  const measures = [run.elapsedSimulationMs, run.remainingDistanceM, run.longestDriveM];
  if (!measures.every((n) => isFiniteNumber(n) && n >= 0)) return false;

  // The one invariant a board cannot be allowed to disagree about.
  if (run.totalStrokes !== totalStrokesOf(run.shotCount as number, run.penaltyStrokes as number)) {
    return false;
  }

  if (run.shotLog !== undefined) {
    if (!Array.isArray(run.shotLog)) return false;
    const shotsValid = run.shotLog.every((shot: unknown) => {
      if (typeof shot !== "object" || shot === null) return false;
      const s = shot as Record<string, unknown>;
      return (
        isFiniteNumber(s.index) &&
        Number.isInteger(s.index) &&
        s.index >= 1 &&
        isFiniteNumber(s.atSimulationMs) &&
        s.atSimulationMs >= 0 &&
        isFiniteNumber(s.carryM) &&
        isFiniteNumber(s.penalty) &&
        (s.penalty as number) >= 0
      );
    });
    if (!shotsValid) return false;
  }

  return true;
}

/** How a stroke count reads on the result panel. */
function strokeLabel(total: number) {
  return total === 1 ? "1 STROKE" : `${total} STROKES`;
}

/**
 * Projects a run onto the panel shape the RESULT stage already renders.
 *
 * Ranked by `totalStrokes`, lower being better — the opposite direction from
 * the old carry-distance drive, which is exactly why the hole needed its own
 * contract rather than a wider `SportResult`.
 */
export function toSportResult(run: GolfRunResultV1): SportResult {
  const holed = run.status === "completed";
  return {
    rank: {
      /**
       * An abandoned hole is not a score.
       *
       * `totalStrokes` on a conceded run is however many shots were played
       * before giving up — nought if the visitor conceded on the tee — and
       * with `better: "lower"` that is a better mark than any round anyone
       * can actually finish. QA (session E) saw the visit standings read
       * `GOLF · 0 STROKES · BEST THIS VISIT` after two concessions. The run
       * is still recorded and still counts as an attempt; it just cannot
       * become the best.
       */
      value: holed ? run.totalStrokes : Number.POSITIVE_INFINITY,
      display: holed ? strokeLabel(run.totalStrokes) : "NO FINISHED HOLE",
      better: "lower",
    },
    heading: holed ? "HOLED OUT" : "RUN ABANDONED",
    playerLabel: "STROKES",
    playerScore: `${run.totalStrokes}`,
    opponentLabel: "LONGEST DRIVE",
    opponentScore: `${Math.round(run.longestDriveM)} M`,
    note: holed
      ? `${strokeLabel(run.totalStrokes)} · ${run.penaltyStrokes} PENALTY`
      : `${Math.round(run.remainingDistanceM)} M SHORT · ${strokeLabel(run.totalStrokes)}`,
  };
}
