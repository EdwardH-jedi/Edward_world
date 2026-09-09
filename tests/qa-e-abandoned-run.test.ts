import { beforeEach, describe, expect, it } from "vitest";
import {
  createGolfRunResult,
  toSportResult,
  type GolfRunDraft,
} from "@/lib/game/minigames/golf-result";
import {
  abandonGolfHole,
  advanceGolfHole,
  createGolfHoleState,
  getGolfHoleResult,
} from "@/lib/game/minigames/golf-hole";
import { getStandings, recordRun, resetStandings } from "@/lib/game/sportsgang-standings";
import { IDLE_INPUT } from "@/lib/game/minigames/types";

/**
 * QA (session E): conceding is not a nought.
 *
 * Found on screen. Two runs conceded on the tee, and the visit standings read
 *
 *     GOLF · 0 STROKES · 2 RUNS · BEST THIS VISIT STANDS AT 0 STROKES
 *
 * because an abandoned run reports `totalStrokes` — nought, when nothing was
 * struck — as a mark that is ranked lower-is-better. Nought beats every round
 * anybody can finish, so three concessions gave a perfect golf record and the
 * standings stopped meaning anything.
 *
 * The public board was never affected: the server refuses a run whose status
 * is not `completed`, which is checked in `golf-board.test.ts` and was
 * confirmed against the running server. This is the personal, per-visit half
 * of the same rule.
 */

const draft: GolfRunDraft = {
  runId: "qa-e",
  courseId: "sg-meadow-hole-1",
  status: "completed",
  shotCount: 4,
  penaltyStrokes: 0,
  elapsedSimulationMs: 30_000,
  remainingDistanceM: 0,
  longestDriveM: 210,
};

beforeEach(() => resetStandings());

describe("an abandoned hole is not a score", () => {
  it("cannot be beaten by conceding on the tee", () => {
    const conceded = toSportResult(
      createGolfRunResult({ ...draft, status: "abandoned", shotCount: 0, remainingDistanceM: 300 }),
    );
    expect(conceded.rank.value).toBe(Number.POSITIVE_INFINITY);
    expect(conceded.rank.better).toBe("lower");
    // It still says what happened; only the ranking number is withheld.
    expect(conceded.heading).toBe("RUN ABANDONED");
    expect(conceded.playerScore).toBe("0");
  });

  it("never becomes the best of the visit", () => {
    const conceded = toSportResult(
      createGolfRunResult({ ...draft, status: "abandoned", shotCount: 0, remainingDistanceM: 300 }),
    );
    const first = recordRun("GOLF", conceded.rank);
    expect(first.isFirst).toBe(true);
    expect(getStandings()[0].bestDisplay).toBe("NO FINISHED HOLE");

    // A real round, however ordinary, is better than not finishing.
    const holed = toSportResult(createGolfRunResult({ ...draft, shotCount: 7 }));
    const second = recordRun("GOLF", holed.rank);
    expect(second.isPersonalBest).toBe(true);
    expect(getStandings()[0].bestDisplay).toBe("7 STROKES");

    // And conceding afterwards does not take the record back.
    const third = recordRun("GOLF", conceded.rank);
    expect(third.isPersonalBest).toBe(false);
    expect(getStandings()[0].bestDisplay).toBe("7 STROKES");
  });

  it("still counts as an attempt", () => {
    const conceded = toSportResult(
      createGolfRunResult({ ...draft, status: "abandoned", shotCount: 2, remainingDistanceM: 140 }),
    );
    recordRun("GOLF", conceded.rank);
    recordRun("GOLF", conceded.rank);
    expect(getStandings()[0].attempts).toBe(2);
  });

  it("holds for a hole conceded through the simulation, not just a draft", () => {
    // The path the CONCEDE button takes.
    let state = createGolfHoleState();
    state = advanceGolfHole(state, IDLE_INPUT, 1 / 60);
    const result = getGolfHoleResult(abandonGolfHole(state));
    expect(result.heading).toBe("RUN ABANDONED");
    expect(result.rank.value).toBe(Number.POSITIVE_INFINITY);
    recordRun("GOLF", result.rank);
    expect(getStandings()[0].bestDisplay).toBe("NO FINISHED HOLE");
  });

  it("leaves a finished hole ranked by its strokes, as before", () => {
    const holed = toSportResult(createGolfRunResult(draft));
    expect(holed.rank.value).toBe(4);
    expect(holed.rank.display).toBe("4 STROKES");
    expect(holed.heading).toBe("HOLED OUT");
  });
});
