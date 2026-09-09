"use client";

import { useEffect, useRef, useState } from "react";
import type { MinigameProps } from "@/components/sportsgang/minigames/types";
import { useMinigameInput } from "@/components/sportsgang/minigames/use-minigame-input";
import { PixelCanvas } from "@/components/world/pixel-canvas";
import {
  advanceTennis,
  createTennisState,
  getTennisResult,
  TENNIS_TARGET_POINTS,
  type TennisState,
} from "@/lib/game/minigames/tennis";
import { PIXEL_UNIT } from "@/lib/game/terrain";
import { useGameLoop } from "@/lib/motion/use-game-loop";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import {
  edwardRoutines,
  opponentRoutines,
  PLAYER_ART_SIZE,
  type PlayerFrame,
} from "@/lib/pixel/sportsgang";

/**
 * The court, drawn from the simulation.
 *
 * This layer owns no rules. Everything it draws is a number `advanceTennis`
 * already decided, which is what keeps the match testable without a browser and
 * this file readable without the physics.
 *
 * It sits inside `.sg-play`, which shares the venue court's geometry exactly —
 * so an `x` from the simulation is a CSS `left` percentage, and its `y` is a
 * height above the surface in the same percentage band the net is drawn in. A
 * ball that clears the net in the simulation clears the one you can see.
 */

/** The playing surface's top edge, as a percentage of the court box. */
const SURFACE_TOP = 22;

function frameFor(swinging: boolean, moving: boolean): PlayerFrame {
  if (swinging) return "contact";
  return moving ? "ready" : "idle";
}

export function TennisGame({ active, onFinish }: MinigameProps) {
  const { consume, bind } = useMinigameInput(active);
  const [state, setState] = useState<TennisState>(createTennisState);
  const stateRef = useRef(state);
  const finished = useRef(false);
  const reducedMotion = useReducedMotion();

  useGameLoop(active, (delta) => {
    const next = advanceTennis(stateRef.current, consume(), delta);
    stateRef.current = next;
    setState(next);

    // Latched, so a frame that lands after the match is over cannot report it
    // twice — and the simulation itself refuses to advance past `done`.
    if (next.done && !finished.current) {
      finished.current = true;
      onFinish(getTennisResult(next));
    }
  });

  /* The court is a scene, not a form: nothing inside it should be able to take
     focus away from the keys that play the game. */
  const courtRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (active) courtRef.current?.focus({ preventScroll: true });
  }, [active]);

  const { ball } = state;
  const ballBottom = SURFACE_TOP + ball.y;
  const playerSwinging = state.playerRacket.animating > 0;
  const alexSwinging = state.alexRacket.animating > 0;
  const ballLive = state.phase === "RALLY";

  // Shake is a transform on the court layer alone, and only when motion is
  // wanted — it never moves anything the simulation reads.
  const shake = reducedMotion ? 0 : state.shake;
  const shakeStyle = shake > 0 ? { transform: `translate3d(${(shake * 4).toFixed(2)}px, 0, 0)` } : undefined;

  const showVerdict =
    state.quality !== null && state.qualityAge < 0.7 && state.quality !== "MISS";

  return (
    <div className="sg-play sg-play--tennis" style={shakeStyle}>
      <div
        aria-label={`Tennis. Edward ${state.playerPoints}, ALEX ${state.alexPoints}.`}
        className="sg-tennis__court"
        ref={courtRef}
        role="application"
        tabIndex={-1}
      >
        {/* The shadow is how you know where the ball is across the court, and
            the only reason lining a shot up is a skill rather than a guess. */}
        {ballLive ? (
          <div
            aria-hidden="true"
            className="sg-tennis__shadow"
            style={{
              left: `${ball.x}%`,
              opacity: Math.max(0.12, 0.5 - ball.y / 70),
            }}
          />
        ) : null}

        <div
          className="sg-tennis__figure sg-tennis__figure--player"
          data-swinging={playerSwinging || undefined}
          style={{ left: `${state.playerX}%` }}
        >
          <PixelCanvas
            artHeight={PLAYER_ART_SIZE.height}
            artWidth={PLAYER_ART_SIZE.width}
            draw={edwardRoutines[frameFor(playerSwinging, state.playerVx !== 0)]}
            frame={0}
            unit={PIXEL_UNIT}
          />
        </div>

        <div
          className="sg-tennis__figure sg-tennis__figure--alex"
          data-swinging={alexSwinging || undefined}
          style={{ left: `${state.alexX}%` }}
        >
          <PixelCanvas
            artHeight={PLAYER_ART_SIZE.height}
            artWidth={PLAYER_ART_SIZE.width}
            draw={opponentRoutines[frameFor(alexSwinging, state.alexVx !== 0)]}
            flipX
            frame={0}
            unit={PIXEL_UNIT}
          />
        </div>

        {ballLive ? (
          <div
            className="sg-tennis__ball"
            data-struck={state.impactAge < 0.12 || undefined}
            style={{ bottom: `${ballBottom}%`, left: `${ball.x}%` }}
          />
        ) : null}

        {/* One spark at the point of contact, gone in a fifth of a second. */}
        {!reducedMotion && state.impactAge < 0.2 ? (
          <div
            aria-hidden="true"
            className="sg-tennis__spark"
            style={{
              bottom: `${SURFACE_TOP + state.impactY}%`,
              left: `${state.impactX}%`,
              opacity: 1 - state.impactAge / 0.2,
            }}
          />
        ) : null}
      </div>

      <div className="sg-tennis__hud">
        <p className="sg-tennis__score">
          <span>EDWARD</span>
          <strong data-scored={state.pointWinner === "PLAYER" || undefined}>
            {state.playerPoints}
          </strong>
          <span className="sg-tennis__colon">:</span>
          <strong data-scored={state.pointWinner === "ALEX" || undefined}>
            {state.alexPoints}
          </strong>
          <span>ALEX</span>
        </p>

        <p
          className="sg-tennis__prompt"
          data-match-point={state.prompt.startsWith("MATCH POINT") || undefined}
        >
          {state.prompt}
        </p>
      </div>

      {showVerdict ? (
        <p className="sg-tennis__verdict" data-quality={state.quality} key={state.rallyShots}>
          {state.quality}
        </p>
      ) : null}

      <div className="sg-tennis__controls">
        <button
          aria-label="Move left"
          className="sg-tennis__button"
          type="button"
          {...bind("left")}
        >
          <span aria-hidden="true">←</span>
        </button>
        <button
          aria-label="Swing"
          className="sg-tennis__button sg-tennis__button--swing"
          type="button"
          {...bind("action")}
        >
          SWING
        </button>
        <button
          aria-label="Move right"
          className="sg-tennis__button"
          type="button"
          {...bind("right")}
        >
          <span aria-hidden="true">→</span>
        </button>
      </div>

      <p className="sg-tennis__hint">
        A / D MOVE · ENTER SWING · FIRST TO {TENNIS_TARGET_POINTS}
      </p>
      <p aria-live="polite" className="loc-announcer">
        {state.pointWinner
          ? `${state.pointReason}. Edward ${state.playerPoints}, ALEX ${state.alexPoints}.`
          : ""}
      </p>
    </div>
  );
}
