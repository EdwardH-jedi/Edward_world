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

/**
 * The hole, in metres and in frames.
 *
 * The fairway is drawn three frames wide and the camera tracks the ball down
 * it, so a long drive travels instead of sliding across a fixed picture. The
 * ball is held a third of the way in once it passes that mark, which is what
 * makes the ground appear to move rather than the ball.
 */
const FIELD_METRES = 300;
const FIELD_FRAMES = 3;
const HOLD_AT_PERCENT = 32;
const MARKERS = [50, 100, 150, 200, 250] as const;

/** Peak height the flight can reach, for mapping the ball's arc. */
const APEX_METRES = FIELD_METRES * 0.22;

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

  // Where the ball sits along the whole fairway, and where the camera has to
  // be for it to stay in shot.
  const ballFieldPercent = (state.carry / FIELD_METRES) * 100;
  const ballFramePercent = ballFieldPercent * FIELD_FRAMES;
  const camera = Math.min(
    Math.max(ballFramePercent - HOLD_AT_PERCENT, 0),
    (FIELD_FRAMES - 1) * 100,
  );
  // The readout rides with the ball, in the frame's own coordinates.
  const readoutPercent = ballFramePercent - camera;
  const ballBottom = 23 + (state.height / APEX_METRES) * 46;
  const flying = state.phase === "FLIGHT" || state.phase === "DONE";

  return (
    <div className="sg-play sg-play--golf">
      <div
        className="sg-play__field"
        style={{ left: `${-camera}%`, width: `${FIELD_FRAMES * 100}%` }}
      >
        {MARKERS.map((metres) => (
          <div
            className="sg-play__marker"
            key={metres}
            style={{ left: `${(metres / FIELD_METRES) * 100}%` }}
          >
            <span>{metres}</span>
          </div>
        ))}
        <div
          className="sg-play__ball sg-play__ball--golf"
          style={{
            bottom: `${ballBottom}%`,
            left: `${ballFieldPercent}%`,
            width: `${1.1 / FIELD_FRAMES}%`,
          }}
        />
      </div>

      {flying ? (
        <p
          className="sg-play__readout"
          style={{ left: `${Math.min(Math.max(readoutPercent, 8), 88)}%` }}
        >
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
