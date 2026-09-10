"use client";

import { useCallback, useRef, useState } from "react";
import { Gauge } from "@/components/sportsgang/minigames/meter";
import { PixelCanvas } from "@/components/world/pixel-canvas";
import { PIXEL_UNIT } from "@/lib/game/terrain";
import { edwardRoutines, opponentRoutines, PLAYER_ART_SIZE } from "@/lib/pixel/sportsgang";
import type { MinigameProps } from "@/components/sportsgang/minigames/types";
import { useFixedStepGameLoop } from "@/components/sportsgang/minigames/use-fixed-step-loop";
import {
  RUNNING_KEY_MAP,
  useMinigameInput,
} from "@/components/sportsgang/minigames/use-minigame-input";
import {
  advanceRunning,
  createRunningState,
  CRUISE_PACE,
  getPacerDistance,
  getRunningResult,
  RACE_METRES,
  type RunningState,
} from "@/lib/game/minigames/running";

const START_X = 8;
const FINISH_X = 88;

/**
 * How far a lane moves a runner up or down the screen, in court percent.
 *
 * The track's own lane lines sit at 34% and 66% of the surface, and the runners
 * stand on 22%. Six percent either side keeps the whole width the player can
 * use inside the lines that are drawn, so moving across the track lands the
 * runner in a lane rather than in the crowd. It is a shallow band on purpose:
 * this is a side-on track, so the width is a hint of depth, not a second axis
 * as large as the first.
 */
const LANE_SPREAD = 6;
const RUNNER_BOTTOM = 22;

/** Where a lane position puts a figure, in court percent from the bottom. */
function bottomForLane(lane: number) {
  return RUNNER_BOTTOM - lane * LANE_SPREAD;
}

export function RunningGame({ active, onFinish }: MinigameProps) {
  // Running is the one sport that needs to steer and spurt at the same time, so
  // it takes the map that puts `S` on its own channel instead of on `down`.
  const { consume, bind, clear } = useMinigameInput(active, { keyMap: RUNNING_KEY_MAP });
  const [state, setState] = useState<RunningState>(createRunningState);
  /**
   * Whether the spurt is *held*, which is not the same as whether it is
   * working. Standing still, winding up from cruise, or staggering on an empty
   * tank all leave the pace at or below cruise while the control is very much
   * pressed. The button reports the control's own state, because that is what
   * a control's pressed state means and what a screen reader is being told.
   */
  const [sprintHeld, setSprintHeld] = useState(false);
  const stateRef = useRef(state);
  const finished = useRef(false);

  const step = useCallback(
    (delta: number, input: Parameters<typeof advanceRunning>[1]) => {
      const next = advanceRunning(stateRef.current, input, delta);
      stateRef.current = next;
      setState(next);
      setSprintHeld(input.sprint === true);

      if (next.done && !finished.current) {
        finished.current = true;
        onFinish(getRunningResult(next));
      }
    },
    [onFinish],
  );

  // One clock, and one suspension path for the clock and the held keys
  // together. Without `onSuspend` a key held while the tab is hidden would
  // still be held on return, and the runner would come back already moving.
  useFixedStepGameLoop(active, consume, step, { onSuspend: clear });

  const progress = state.distance / RACE_METRES;
  const runnerX = START_X + progress * (FINISH_X - START_X);

  // A pacer holding cruise the whole way, so the player can see what an even
  // pace looks like. Scripted, deterministic, and not presented as a rival —
  // and read off the simulation's own elapsed time, so it cannot drift onto a
  // second clock and jump when the tab comes back.
  const pacerX =
    START_X + (getPacerDistance(state.elapsed) / RACE_METRES) * (FINISH_X - START_X);

  // The runner's own tell is about effect: he only leans into it when the legs
  // are actually answering. The button above is about the press.
  const spurting = state.pace > CRUISE_PACE + 0.05;

  return (
    <div className="sg-play sg-play--running">
      <div
        className="sg-play__runner sg-play__runner--pacer"
        style={{ bottom: `${bottomForLane(0)}%`, left: `${pacerX}%` }}
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
        data-pushing={spurting || undefined}
        style={{ bottom: `${bottomForLane(state.lane)}%`, left: `${runnerX}%` }}
      >
        <PixelCanvas
          artHeight={PLAYER_ART_SIZE.height}
          artWidth={PLAYER_ART_SIZE.width}
          draw={edwardRoutines.ready}
          // Faces the way he is actually going, so turning round reads.
          flipX={state.heading === -1}
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

        {/* Touch gets the same two things the keyboard has and can hold both at
            once: a pad for the four directions, and a spurt that lasts as long
            as a finger is on it. They are separate channels, so a finger coming
            off one cannot cancel the other. */}
        <div className="sg-run-controls">
          <div className="sg-run-pad">
            <button
              aria-label="Move up a lane"
              className="sg-run-pad__key sg-run-pad__key--up"
              type="button"
              {...bind("up")}
            >
              ↑
            </button>
            <button
              aria-label="Run left, back down the track"
              className="sg-run-pad__key sg-run-pad__key--left"
              type="button"
              {...bind("left")}
            >
              ←
            </button>
            <button
              aria-label="Run right, towards the finish"
              className="sg-run-pad__key sg-run-pad__key--right"
              type="button"
              {...bind("right")}
            >
              →
            </button>
            <button
              aria-label="Move down a lane"
              className="sg-run-pad__key sg-run-pad__key--down"
              type="button"
              {...bind("down")}
            >
              ↓
            </button>
          </div>

          <button
            aria-label="Hold to spurt, spending stamina"
            aria-pressed={sprintHeld}
            className="sg-play__action sg-run-sprint"
            type="button"
            {...bind("sprint")}
          >
            SPRINT
            <span>HOLD</span>
          </button>
        </div>

        <p className="sg-play__hint">
          ← → TO RUN · ↑ ↓ FOR THE LANES · HOLD S TO SPURT · LET GO TO EASE OFF
        </p>
      </div>
    </div>
  );
}
