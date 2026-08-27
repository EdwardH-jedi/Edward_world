"use client";

import { useRef, useState } from "react";
import { Gauge } from "@/components/sportsgang/minigames/meter";
import { PixelCanvas } from "@/components/world/pixel-canvas";
import { PIXEL_UNIT } from "@/lib/game/terrain";
import { edwardRoutines, opponentRoutines, PLAYER_ART_SIZE } from "@/lib/pixel/sportsgang";
import type { MinigameProps } from "@/components/sportsgang/minigames/types";
import { useMinigameInput } from "@/components/sportsgang/minigames/use-minigame-input";
import {
  advanceRunning,
  createRunningState,
  CRUISE_PACE,
  getRunningResult,
  RACE_METRES,
  TOP_SPEED_MPS,
  type RunningState,
} from "@/lib/game/minigames/running";
import { useGameLoop } from "@/lib/motion/use-game-loop";

const START_X = 8;
const FINISH_X = 88;

export function RunningGame({ active, onFinish }: MinigameProps) {
  const { consume, bind } = useMinigameInput(active);
  const [state, setState] = useState<RunningState>(createRunningState);
  const stateRef = useRef(state);
  const finished = useRef(false);

  useGameLoop(active, (delta) => {
    const input = consume();
    const next = advanceRunning(stateRef.current, input, delta);
    stateRef.current = next;
    setState(next);

    if (next.done && !finished.current) {
      finished.current = true;
      onFinish(getRunningResult(next));
    }
  });

  const progress = state.distance / RACE_METRES;
  const runnerX = START_X + progress * (FINISH_X - START_X);

  // A pacer holding cruise the whole way, so the player can see what an even
  // pace looks like. Scripted, deterministic, and not presented as a rival.
  const pacerDistance = Math.min(state.elapsed * CRUISE_PACE * TOP_SPEED_MPS, RACE_METRES);
  const pacerX = START_X + (pacerDistance / RACE_METRES) * (FINISH_X - START_X);

  return (
    <div className="sg-play sg-play--running">
      <div
        className="sg-play__runner sg-play__runner--pacer"
        style={{ left: `${pacerX}%` }}
      >
        <PixelCanvas
          artHeight={PLAYER_ART_SIZE.height}
          artWidth={PLAYER_ART_SIZE.width}
          draw={opponentRoutines.ready}
          frame={0}
          unit={PIXEL_UNIT}
        />
        <span>PACER</span>
      </div>
      <div
        className="sg-play__runner sg-play__runner--player"
        data-pushing={state.pace > CRUISE_PACE + 0.05 || undefined}
        style={{ left: `${runnerX}%` }}
      >
        <PixelCanvas
          artHeight={PLAYER_ART_SIZE.height}
          artWidth={PLAYER_ART_SIZE.width}
          draw={edwardRoutines.ready}
          frame={0}
          unit={PIXEL_UNIT}
        />
        <span>EDWARD</span>
      </div>

      <div className="sg-play__hud">
        <p className="sg-play__prompt">{state.prompt}</p>

        <div className="sg-play__gauges">
          <Gauge label="PACE" tone="pace" value={state.pace} />
          <Gauge label="STAMINA" value={state.stamina} />
        </div>

        <div className="sg-play__pair">
          <button className="sg-play__action" type="button" {...bind("up")}>
            PUSH
          </button>
          <button className="sg-play__action sg-play__action--quiet" type="button" {...bind("down")}>
            EASE
          </button>
        </div>
        <p className="sg-play__hint">
          W / ↑ TO PUSH · S / ↓ TO EASE · ABOVE CRUISE COSTS STAMINA
        </p>
      </div>
    </div>
  );
}
