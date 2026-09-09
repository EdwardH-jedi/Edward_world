/**
 * How the golf board is ordered, and what a tie means.
 *
 * Ranking is the server's job. The client sends a run and is told where it
 * landed; it never sends a rank and nothing here reads one, so a client cannot
 * assert its own position.
 */

/** One row, as stored and as returned. */
export interface BoardEntry {
  /** The anonymous device id this best belongs to. Never sent to the browser. */
  readonly anonId: string;
  readonly runId: string;
  readonly displayName: string;
  readonly totalStrokes: number;
  readonly shotCount: number;
  readonly penaltyStrokes: number;
  readonly elapsedSimulationMs: number;
  readonly longestDriveM: number;
  /** Server clock, at the moment the row was accepted. Never the client's. */
  readonly receivedAt: number;
}

/** A row as the browser sees it: ranked, and with the anonymous id removed. */
export interface RankedEntry {
  readonly rank: number;
  readonly runId: string;
  readonly displayName: string;
  readonly totalStrokes: number;
  readonly shotCount: number;
  readonly penaltyStrokes: number;
  readonly elapsedSimulationMs: number;
  readonly longestDriveM: number;
  readonly receivedAt: number;
  /** True for the row belonging to the visitor who asked. */
  readonly isYou?: boolean;
}

/**
 * Orders the board.
 *
 * Fewer strokes is better — the opposite direction from the single drive this
 * hole replaced, which is why the hole needed its own rules version.
 *
 * **The only ranking key is `totalStrokes`.** `elapsedSimulationMs` and
 * `longestDriveM` are shown beside a row because they are interesting, and
 * they are deliberately *not* consulted here: a player reading the board can
 * see every number that decided their position. Ties are real ties.
 *
 * What does order tied rows is the server's own receipt — `receivedAt`, then
 * `runId` as a total order when two rows arrive in the same millisecond. That
 * is display order only. It never changes anyone's rank, and it is stable, so
 * the board does not shuffle between reads.
 */
export function rankEntries(
  entries: readonly BoardEntry[],
  youAnonId?: string,
): readonly RankedEntry[] {
  const ordered = [...entries].sort(
    (a, b) =>
      a.totalStrokes - b.totalStrokes ||
      a.receivedAt - b.receivedAt ||
      (a.runId < b.runId ? -1 : a.runId > b.runId ? 1 : 0),
  );

  const ranked: RankedEntry[] = [];
  let rank = 0;
  let previousStrokes: number | null = null;

  ordered.forEach((entry, index) => {
    // Standard competition ranking: equal scores share a rank, and the next
    // different score takes the position it actually occupies. Two players on
    // three strokes are both 1st and the next is 3rd — not 2nd, because two
    // people really are ahead of them.
    if (previousStrokes === null || entry.totalStrokes !== previousStrokes) {
      rank = index + 1;
      previousStrokes = entry.totalStrokes;
    }
    ranked.push({
      rank,
      runId: entry.runId,
      displayName: entry.displayName,
      totalStrokes: entry.totalStrokes,
      shotCount: entry.shotCount,
      penaltyStrokes: entry.penaltyStrokes,
      elapsedSimulationMs: entry.elapsedSimulationMs,
      longestDriveM: entry.longestDriveM,
      receivedAt: entry.receivedAt,
      ...(youAnonId !== undefined && entry.anonId === youAnonId
        ? { isYou: true }
        : {}),
    });
  });

  return ranked;
}

/**
 * Whether a new run replaces the one already held for this player.
 *
 * Strictly better only, so resubmitting an equal score does not reshuffle the
 * board or move a player up past someone who got there first.
 */
export function beatsStoredBest(
  candidate: Pick<BoardEntry, "totalStrokes">,
  stored: Pick<BoardEntry, "totalStrokes"> | null,
): boolean {
  if (stored === null) return true;
  return candidate.totalStrokes < stored.totalStrokes;
}

/**
 * The board key. One board per course *and* per rules version.
 *
 * Both halves matter: the same course played under different rules is a
 * different game, and the drive that preceded this hole was scored on distance
 * and ranked the other way up. Mixing them would be meaningless.
 */
export function boardKeyFor(courseId: string, rulesVersion: string) {
  return `${courseId}:${rulesVersion}`;
}
