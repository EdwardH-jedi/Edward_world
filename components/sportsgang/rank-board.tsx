"use client";

import { useSyncExternalStore } from "react";
import {
  getServerStandings,
  getStandings,
  subscribeToStandings,
  type RecordedRun,
} from "@/lib/game/sportsgang-standings";
import { SPORTSGANG_SPORTS, type SportsgangSport } from "@/types/sportsgang";
import type { RefObject } from "react";

interface RankBoardProps {
  /** The sport just played, so its row can be picked out. */
  sport: SportsgangSport;
  /** What that run turned out to be. Null before anything has been recorded. */
  run: RecordedRun | null;
  continueRef?: RefObject<HTMLButtonElement | null>;
  onContinue: () => void;
}

/**
 * The RANK beat: where a finished run goes.
 *
 * SportsGang's loop ends on RANK, so the visitor should see one rather than be
 * told it exists. The only ranking this can honestly show is the visitor's
 * own — there is no server and there are no other players — so the board is
 * explicit that it covers this visit and nothing more, and a first run is
 * reported as a first run rather than measured against a made-up baseline.
 */
export function RankBoard({ sport, run, continueRef, onContinue }: RankBoardProps) {
  const standings = useSyncExternalStore(
    subscribeToStandings,
    getStandings,
    getServerStandings,
  );

  const played = SPORTSGANG_SPORTS.map((name) =>
    standings.find((entry) => entry.sport === name),
  ).filter((entry) => entry !== undefined);

  return (
    <div className="sg-rank">
      <p className="sg-rank__heading">RANK</p>
      <p className="sg-rank__scope">YOUR STANDINGS · THIS VISIT</p>

      <ol className="sg-rank__table">
        {played.map((entry) => (
          <li
            className="sg-rank__row"
            data-current={entry.sport === sport || undefined}
            key={entry.sport}
          >
            <span className="sg-rank__sport">{entry.sport}</span>
            <span className="sg-rank__best">{entry.bestDisplay}</span>
            <span className="sg-rank__attempts">
              {entry.attempts === 1 ? "1 RUN" : `${entry.attempts} RUNS`}
            </span>
          </li>
        ))}
      </ol>

      {run ? (
        <p className="sg-rank__verdict">
          {run.isFirst
            ? "FIRST RECORDED RUN IN THIS SPORT"
            : run.isPersonalBest
              ? `NEW BEST · PREVIOUS ${run.previousBestDisplay}`
              : `BEST THIS VISIT STANDS AT ${run.previousBestDisplay}`}
        </p>
      ) : null}

      <p className="sg-rank__footnote">
        Standings are yours alone and reset when the page reloads. SportsGang
        ranks players against each other; this world has no one else in it.
      </p>

      <button
        className="loc-button loc-button--primary"
        onClick={onContinue}
        ref={continueRef}
        type="button"
      >
        [ CONTINUE ]
      </button>
    </div>
  );
}
