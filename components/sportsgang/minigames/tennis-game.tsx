"use client";

import { useRef, useState } from "react";
import { Meter } from "@/components/sportsgang/minigames/meter";
import type { MinigameProps } from "@/components/sportsgang/minigames/types";
import { useMinigameInput } from "@/components/sportsgang/minigames/use-minigame-input";
import {
  advanceTennis,
  createTennisState,
  getTennisResult,
  TENNIS_POINTS,
  type TennisState,
} from "@/lib/game/minigames/tennis";
import { useGameLoop } from "@/lib/motion/use-game-loop";

/** The timing bar runs a little past contact, so a late swing still reads. */
const TIMING_SCALE = 1.3;

export function TennisGame({ active, onFinish }: MinigameProps) {
  const { consume, bind } = useMinigameInput(active);
  const [state, setState] = useState<TennisState>(createTennisState);
  const stateRef = useRef(state);
  const finished = useRef(false);

  useGameLoop(active, (delta) => {
    const input = consume();
    const next = advanceTennis(stateRef.current, input, delta);
    stateRef.current = next;
    setState(next);

    if (next.done && !finished.current) {
      finished.current = true;
      onFinish(getTennisResult(next));
    }
  });

  // Ball crosses from the opponent's baseline to Edward's, arcing over the net.
  const travel = Math.min(state.ballT, 1.2);
  const ballLeft = 84 - travel * 68;
  const ballBottom = 23 + Math.sin(Math.PI * Math.min(travel, 1)) * 34;
  const inPlay = state.phase === "INCOMING" || state.phase === "FEEDBACK";

  return (
    <div className="sg-play sg-play--tennis">
      {inPlay ? (
        <div
          className="sg-play__ball sg-play__ball--tennis"
          style={{ bottom: `${ballBottom}%`, left: `${ballLeft}%` }}
        />
      ) : null}

      {state.verdict ? (
        <p className="sg-play__verdict" data-verdict={state.verdict}>
          {state.verdict}
        </p>
      ) : null}

      <div className="sg-play__hud">
        <p className="sg-play__prompt">{state.prompt}</p>

        <p className="sg-play__tally">
          POINT {Math.min(state.point + 1, TENNIS_POINTS)} / {TENNIS_POINTS}
          <span>
            EDWARD {state.playerPoints} — {state.opponentPoints} PLAYER 02
          </span>
        </p>

        {state.phase === "INCOMING" ? (
          <Meter
            label="RETURN WINDOW"
            target={{ from: 0.82 / TIMING_SCALE, to: 1.18 / TIMING_SCALE }}
            tone="timing"
            value={state.ballT / TIMING_SCALE}
          />
        ) : null}

        <button className="sg-play__action" type="button" {...bind("action")}>
          SWING
        </button>
        <p className="sg-play__hint">SPACE / TAP AS THE BALL ARRIVES</p>
      </div>
    </div>
  );
}
