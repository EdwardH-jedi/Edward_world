"use client";

import { useRef, useState } from "react";
import { Meter } from "@/components/sportsgang/minigames/meter";
import type { MinigameProps } from "@/components/sportsgang/minigames/types";
import { useMinigameInput } from "@/components/sportsgang/minigames/use-minigame-input";
import {
  advanceGolf,
  createGolfState,
  getGolfResult,
  type GolfState,
} from "@/lib/game/minigames/golf";
import { useGameLoop } from "@/lib/motion/use-game-loop";

/** Reference carry used to map metres onto the width of the hole. */
const SCALE_METRES = 280;

export function GolfGame({ active, onFinish }: MinigameProps) {
  const { consume, bind } = useMinigameInput(active);
  const [state, setState] = useState<GolfState>(createGolfState);
  const stateRef = useRef(state);
  const finished = useRef(false);

  useGameLoop(active, (delta) => {
    const input = consume();
    const next = advanceGolf(stateRef.current, input, delta);
    stateRef.current = next;
    setState(next);

    if (next.done && !finished.current) {
      finished.current = true;
      onFinish(getGolfResult(next));
    }
  });

  const ballLeft = 7 + (state.carry / SCALE_METRES) * 84;
  const ballBottom = 23 + (state.height / (SCALE_METRES * 0.22)) * 46;

  return (
    <div className="sg-play sg-play--golf">
      <div
        className="sg-play__ball sg-play__ball--golf"
        style={{ bottom: `${ballBottom}%`, left: `${ballLeft}%` }}
      />

      {state.phase === "FLIGHT" || state.phase === "DONE" ? (
        <p className="sg-play__readout" style={{ left: `${Math.min(ballLeft, 82)}%` }}>
          {state.carry} M
        </p>
      ) : null}

      <div className="sg-play__hud">
        <p className="sg-play__prompt">{state.prompt}</p>

        {state.phase === "POWER" ? (
          <Meter label="POWER" value={state.meter} />
        ) : null}

        {state.phase === "CONTACT" ? (
          <Meter
            centred
            label="CONTACT"
            target={{ from: 0.46, to: 0.54 }}
            tone="timing"
            value={state.meter}
          />
        ) : null}

        {state.phase === "POWER" || state.phase === "CONTACT" ? (
          <button
            className="sg-play__action"
            type="button"
            {...bind("action")}
          >
            {state.phase === "POWER" ? "SET POWER" : "STRIKE"}
          </button>
        ) : null}

        <p className="sg-play__hint">SPACE / TAP TO STOP THE BAR</p>
      </div>
    </div>
  );
}
