"use client";

import { useRef, useState } from "react";
import { Meter } from "@/components/sportsgang/minigames/meter";
import type { MinigameProps } from "@/components/sportsgang/minigames/types";
import { useMinigameInput } from "@/components/sportsgang/minigames/use-minigame-input";
import {
  advanceBasketball,
  BASKETBALL_SHOTS,
  createBasketballState,
  getBasketballResult,
  getShotReach,
  IDEAL_RELEASE,
  isMade,
  type BasketballState,
} from "@/lib/game/minigames/basketball";
import { useGameLoop } from "@/lib/motion/use-game-loop";

/** Where the player shoots from and where the ring sits, in court percent. */
const SHOOTER_X = 20;
const RING_X = 84;
/** Court percentages: where the ball leaves the hands, and where the ring is. */
const RELEASE_HEIGHT = 30;
const RING_HEIGHT = 52;

export function BasketballGame({ active, onFinish }: MinigameProps) {
  const { consume, bind } = useMinigameInput(active);
  const [state, setState] = useState<BasketballState>(createBasketballState);
  const stateRef = useRef(state);
  const finished = useRef(false);

  useGameLoop(active, (delta) => {
    const input = consume();
    const next = advanceBasketball(stateRef.current, input, delta);
    stateRef.current = next;
    setState(next);

    if (next.done && !finished.current) {
      finished.current = true;
      onFinish(getBasketballResult(next));
    }
  });

  // How far the shot actually travels is the release strength, nothing else.
  const reach = getShotReach(state.release);
  const travel = Math.min(reach, 1.25);
  const ballLeft = SHOOTER_X + state.flight * travel * (RING_X - SHOOTER_X);
  // The shot rises to the ring rather than back to the floor: the baseline
  // climbs from release height to ring height, and the arc sits on top of it.
  const climb = state.flight * (RING_HEIGHT - RELEASE_HEIGHT) * travel;
  const arc = Math.sin(Math.PI * state.flight) * 38 * Math.min(reach, 1.3);
  const ballBottom = RELEASE_HEIGHT + climb + arc;
  const showBall = state.phase === "SHOT" || state.phase === "FEEDBACK";

  return (
    <div className="sg-play sg-play--basketball">
      {showBall ? (
        <div
          className="sg-play__ball sg-play__ball--basketball"
          style={{ bottom: `${ballBottom}%`, left: `${ballLeft}%` }}
        />
      ) : null}

      {state.outcome && state.phase === "FEEDBACK" ? (
        <p
          className="sg-play__verdict"
          data-verdict={isMade(state.outcome) ? "PERFECT" : "MISS"}
        >
          {state.outcome}
        </p>
      ) : null}

      <div className="sg-play__hud">
        <p className="sg-play__prompt">{state.prompt}</p>

        <p className="sg-play__tally">
          SHOT {Math.min(state.shot + 1, BASKETBALL_SHOTS)} / {BASKETBALL_SHOTS}
          <span>MADE {state.made}</span>
        </p>

        {state.phase === "READY" || state.phase === "CHARGING" ? (
          <Meter
            label="RELEASE"
            target={{ from: IDEAL_RELEASE - 0.085, to: IDEAL_RELEASE + 0.085 }}
            value={state.charge}
          />
        ) : null}

        <button className="sg-play__action" type="button" {...bind("action")}>
          HOLD · RELEASE
        </button>
        <p className="sg-play__hint">HOLD SPACE / TAP AND HOLD, LET GO IN THE BAND</p>
      </div>
    </div>
  );
}
