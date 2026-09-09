"use client";

import { useCallback, useRef, useState } from "react";
import { Meter } from "@/components/sportsgang/minigames/meter";
import type { MinigameProps } from "@/components/sportsgang/minigames/types";
import { useFixedStepGameLoop } from "@/components/sportsgang/minigames/use-fixed-step-loop";
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
import {
  BALL_CENTRE,
  BALL_COLORS,
  BALL_LIGHT_ORIGIN,
  BALL_OUTLINE_WIDTH,
  BALL_RADIUS,
  BALL_SEAM_WIDTH,
  BALL_SPIN_FRAMES,
  BALL_VIEWBOX,
  basketballSeams,
} from "@/lib/pixel/sg-ball";

/** Where the player shoots from and where the ring sits, in court percent. */
const SHOOTER_X = 20;
const RING_X = 84;
/** Court percentages: where the ball leaves the hands, and where the ring is. */
const RELEASE_HEIGHT = 30;
const RING_HEIGHT = 52;

/**
 * Turns the ball makes between the hands and the ring.
 *
 * Presentation only — the spin is read off `flight`, which the simulation
 * already computes, so nothing about the shot changes because of it. Two turns
 * over the flight is fast enough to read as backspin and slow enough that the
 * panels never strobe.
 */
const FLIGHT_TURNS = 2;

/**
 * The ball itself.
 *
 * The seams come from `lib/pixel/sg-ball.ts`, which models them as great
 * circles on a sphere; all this does is put them on a shaded disc. The spin is
 * *inside* the SVG rather than a CSS `rotate` on the element, which matters:
 * the element carries the `translate(-50%, 50%)` that puts the simulation's
 * ball position at the element's centre, and a rotation composed onto that
 * transform would move the centre the arc and the ring are measured against.
 */
function Basketball({ spinFrame }: { spinFrame: number }) {
  const seams = basketballSeams(spinFrame);

  return (
    <svg
      aria-hidden="true"
      className="sg-ball__art"
      focusable="false"
      viewBox={`0 0 ${BALL_VIEWBOX} ${BALL_VIEWBOX}`}
    >
      <defs>
        {/* Restrained: two stops, lit from the upper left like the venue's
            floodlights, so the ball rounds off without turning into a
            highlight study. */}
        <radialGradient
          cx={BALL_LIGHT_ORIGIN.x}
          cy={BALL_LIGHT_ORIGIN.y}
          id="sg-ball-shading"
          r="0.92"
        >
          <stop offset="0" stopColor={BALL_COLORS.light} />
          <stop offset="0.55" stopColor={BALL_COLORS.base} />
          <stop offset="1" stopColor={BALL_COLORS.shade} />
        </radialGradient>
      </defs>

      <circle cx={BALL_CENTRE} cy={BALL_CENTRE} fill="url(#sg-ball-shading)" r={BALL_RADIUS} />

      {/* Seams are clipped by nothing: every point is already inside the
          silhouette, because they are projected from the near hemisphere. */}
      <g
        fill="none"
        stroke={BALL_COLORS.line}
        strokeLinecap="round"
        strokeWidth={BALL_SEAM_WIDTH}
      >
        {seams.map((path, index) => (
          <path d={path} key={index} />
        ))}
      </g>

      {/* The silhouette last, so it reads against the court at any size. */}
      <circle
        cx={BALL_CENTRE}
        cy={BALL_CENTRE}
        fill="none"
        r={BALL_RADIUS}
        stroke={BALL_COLORS.line}
        strokeWidth={BALL_OUTLINE_WIDTH}
      />
    </svg>
  );
}

export function BasketballGame({ active, onFinish }: MinigameProps) {
  const { consume, bind, clear } = useMinigameInput(active);
  const [state, setState] = useState<BasketballState>(createBasketballState);
  const stateRef = useRef(state);
  const finished = useRef(false);

  const step = useCallback(
    (delta: number, input: Parameters<typeof advanceBasketball>[1]) => {
      const next = advanceBasketball(stateRef.current, input, delta);
      stateRef.current = next;
      setState(next);

      if (next.done && !finished.current) {
        finished.current = true;
        onFinish(getBasketballResult(next));
      }
    },
    [onFinish],
  );

  // The fixed clock, and one suspension path for the clock and the keys
  // together: tabbing away mid-shot must not replay the release on return.
  useFixedStepGameLoop(active, consume, step, { onSuspend: clear });

  // How far the shot actually travels is the release strength, nothing else.
  const reach = getShotReach(state.release);
  const travel = Math.min(reach, 1.25);
  // `DONE` counts as in flight so the last shot does not snap back to the
  // player's hands for the frame between the session ending and the RESULT
  // panel taking over. The state still holds that shot's `flight` and
  // `release`, so the ball simply stays where it finished.
  const inFlight =
    state.phase === "SHOT" || state.phase === "FEEDBACK" || state.phase === "DONE";

  // The ball is in the player's hands before the shot and on its arc after it,
  // so the court is never a basketball court without a basketball on it.
  const ballLeft = inFlight
    ? SHOOTER_X + state.flight * travel * (RING_X - SHOOTER_X)
    : SHOOTER_X;
  // The shot rises to the ring rather than back to the floor: the baseline
  // climbs from release height to ring height, and the arc sits on top of it.
  const climb = state.flight * (RING_HEIGHT - RELEASE_HEIGHT) * travel;
  const arc = Math.sin(Math.PI * state.flight) * 38 * Math.min(reach, 1.3);
  const ballBottom = inFlight
    ? RELEASE_HEIGHT + climb + arc
    : // Gathered a little higher the longer the shot is held. Read off the
      // charge the simulation already keeps; it decides nothing.
      RELEASE_HEIGHT + state.charge * 3;

  const spinFrame = inFlight
    ? Math.round(state.flight * FLIGHT_TURNS * BALL_SPIN_FRAMES)
    : 0;

  return (
    <div className="sg-play sg-play--basketball">
      <div
        className="sg-play__ball sg-ball"
        style={{ bottom: `${ballBottom}%`, left: `${ballLeft}%` }}
      >
        <Basketball spinFrame={spinFrame} />
      </div>

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

        <button
          aria-label="Hold to charge the shot, release to shoot"
          className="sg-play__action"
          type="button"
          {...bind("action")}
        >
          HOLD · RELEASE
        </button>
        <p className="sg-play__hint">HOLD SPACE / TAP AND HOLD, LET GO IN THE BAND</p>
      </div>
    </div>
  );
}
