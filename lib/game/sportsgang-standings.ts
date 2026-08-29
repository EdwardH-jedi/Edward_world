import type { SportsgangSport } from "@/types/sportsgang";

/**
 * Standings for the SportsGang visit.
 *
 * The product's loop ends on RANK, so the experience has to show one. The only
 * honest ranking this app can show is the visitor's own: what they scored, in
 * which sports, during this visit. There is no server, no other players and no
 * rating system, so nothing here is compared against anyone else and no
 * baseline is invented — a first run says it is a first run.
 *
 * Deliberately session-scoped and held in module memory rather than
 * `localStorage`: it survives leaving for the world and coming back, which is
 * what makes standings worth keeping, and it resets on reload, which stops the
 * page from making a durability claim it does not honour.
 */

/** Which direction counts as better for a sport's comparable number. */
export type RankDirection = "higher" | "lower";

/** The comparable number a finished sport reports. */
export interface RankValue {
  readonly value: number;
  readonly display: string;
  readonly better: RankDirection;
}

export interface StandingsEntry {
  readonly sport: SportsgangSport;
  readonly attempts: number;
  readonly best: number;
  readonly bestDisplay: string;
  readonly better: RankDirection;
}

/** What one finished run turned out to be, relative to the visit so far. */
export interface RecordedRun {
  readonly sport: SportsgangSport;
  readonly isFirst: boolean;
  readonly isPersonalBest: boolean;
  readonly attempts: number;
  /** The mark this run had to beat, or null when there was none. */
  readonly previousBestDisplay: string | null;
}

export function isBetter(next: number, current: number, better: RankDirection) {
  return better === "higher" ? next > current : next < current;
}

const entries = new Map<SportsgangSport, StandingsEntry>();

/**
 * React compares snapshots by identity, so this must be the *same* array until
 * something actually changes. Rebuilding it per read would spin the store.
 */
let snapshot: readonly StandingsEntry[] = [];
const listeners = new Set<() => void>();

function publish() {
  snapshot = [...entries.values()];
  for (const listener of listeners) listener();
}

export function subscribeToStandings(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function getStandings(): readonly StandingsEntry[] {
  return snapshot;
}

/** The page is prerendered, so the server has to be handed something stable. */
const EMPTY: readonly StandingsEntry[] = [];
export function getServerStandings(): readonly StandingsEntry[] {
  return EMPTY;
}

export function recordRun(sport: SportsgangSport, rank: RankValue): RecordedRun {
  const existing = entries.get(sport);

  if (!existing) {
    entries.set(sport, {
      sport,
      attempts: 1,
      best: rank.value,
      bestDisplay: rank.display,
      better: rank.better,
    });
    publish();
    return {
      sport,
      isFirst: true,
      isPersonalBest: true,
      attempts: 1,
      previousBestDisplay: null,
    };
  }

  const improved = isBetter(rank.value, existing.best, rank.better);
  entries.set(sport, {
    ...existing,
    attempts: existing.attempts + 1,
    best: improved ? rank.value : existing.best,
    bestDisplay: improved ? rank.display : existing.bestDisplay,
  });
  publish();

  return {
    sport,
    isFirst: false,
    isPersonalBest: improved,
    attempts: existing.attempts + 1,
    previousBestDisplay: existing.bestDisplay,
  };
}

/** Only for tests — a visit is otherwise cleared by reloading the page. */
export function resetStandings() {
  entries.clear();
  publish();
}
