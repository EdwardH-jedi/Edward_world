import type { GolfRunResultV1 } from "@/lib/game/minigames/golf-result";
import type { SportResult } from "@/lib/game/minigames/types";

/**
 * What a mini-game is mounted with.
 *
 * `active` and `onFinish` are the original two and have not changed: every
 * sport still reports itself through `SportResult`, and the RESULT panel and
 * the standings still read exactly that.
 *
 * `onGolfRun` is additive and optional. The one-hole golf run carries more
 * than a panel needs — a run id, a rules version, penalties, simulated time —
 * because it is the record D submits to the public board. Golf emits it
 * alongside `onFinish`; every other sport ignores it, and a host that does not
 * supply it still works.
 */
export interface MinigameProps {
  /** False while the surface is covered or the stage is not PLAY. */
  active: boolean;
  /** Called once, with a result derived entirely from what the player did. */
  onFinish: (result: SportResult) => void;
  /** Golf only. The full run record, for whoever owns submission. */
  onGolfRun?: (run: GolfRunResultV1) => void;
  /** Shown on a scoreboard when the run is submitted. `GUEST` when absent. */
  playerDisplayName?: string;
}
