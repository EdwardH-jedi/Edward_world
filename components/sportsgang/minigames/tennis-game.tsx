"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MinigameProps } from "@/components/sportsgang/minigames/types";
import { useFixedStepGameLoop } from "@/components/sportsgang/minigames/use-fixed-step-loop";
import { useMinigameInput } from "@/components/sportsgang/minigames/use-minigame-input";
import { PixelCanvas } from "@/components/world/pixel-canvas";
import {
  advanceTennis,
  contactAnchor,
  createTennisState,
  getTennisResult,
  STRIKE_HALF_X,
  STRIKE_HALF_Y,
  swingProgress,
  TENNIS_TARGET_POINTS,
  type TennisState,
} from "@/lib/game/minigames/tennis";
import { PIXEL_UNIT } from "@/lib/game/terrain";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import { PLAYER_ART_SIZE } from "@/lib/pixel/sportsgang";
import { tennisRoutine } from "@/lib/pixel/sg-tennis";

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

/**
 * The court, drawn from the simulation.
 *
 * `debug` draws the overlay the sync work was diagnosed with: the ball centre,
 * the racket anchor, the strike zone, and the tick. Nothing in the application
 * passes it — the venue mounts `<TennisGame active onFinish={...} />` — so it
 * cannot reach production, and it is a prop rather than a `NODE_ENV` check
 * precisely so that stays true and testable.
 */
export function TennisGame({
  active,
  onFinish,
  debug = false,
}: MinigameProps & { debug?: boolean }) {
  const { consume, bind, clear } = useMinigameInput(active);
  const [state, setState] = useState<TennisState>(createTennisState);
  const stateRef = useRef(state);
  const finished = useRef(false);
  const reducedMotion = useReducedMotion();

  const step = useCallback(
    (delta: number, input: Parameters<typeof advanceTennis>[1]) => {
      const next = advanceTennis(stateRef.current, input, delta);
      stateRef.current = next;
      setState(next);

      // Latched, so a frame that lands after the match is over cannot report
      // it twice — and the simulation itself refuses to advance past `done`.
      if (next.done && !finished.current) {
        finished.current = true;
        onFinish(getTennisResult(next));
      }
    },
    [onFinish],
  );

  // The fixed clock. The ball and the players advance on one step, so they
  // cannot drift apart, and the same input at the same tick plays out the same
  // way whatever rate the browser is painting at.
  useFixedStepGameLoop(active, consume, step, { onSuspend: clear });

  /* The court is a scene, not a form: nothing inside it should be able to take
     focus away from the keys that play the game. */
  const courtRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (active) courtRef.current?.focus({ preventScroll: true });
  }, [active]);

  const { ball } = state;
  const ballBottom = SURFACE_TOP + ball.y;
  const playerSwing = state.playerRacket.swing;
  const alexSwing = state.alexRacket.swing;
  const playerProgress = swingProgress(playerSwing);
  const alexProgress = swingProgress(alexSwing);
  const ballLive = state.phase === "RALLY";

  // The one point both the picture and the physics call contact.
  const playerAnchor = contactAnchor(
    "PLAYER",
    state.playerX,
    playerSwing?.kind ?? null,
    playerProgress,
  );

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

        {/* The toss. A serve whose ball simply appears at contact height was
            the thing that read as fake, so the ball is thrown and travels. */}
        {state.toss ? (
          <div
            className="sg-tennis__ball sg-tennis__ball--toss"
            style={{
              bottom: `${SURFACE_TOP + state.toss.y}%`,
              left: `${state.toss.x}%`,
            }}
          />
        ) : null}

        <div
          className="sg-tennis__figure sg-tennis__figure--player"
          data-swing={playerSwing?.kind}
          style={{ left: `${state.playerX}%` }}
        >
          <PixelCanvas
            artHeight={PLAYER_ART_SIZE.height}
            artWidth={PLAYER_ART_SIZE.width}
            draw={tennisRoutine("PLAYER", playerSwing?.kind ?? null, playerProgress)}
            frame={0}
            unit={PIXEL_UNIT}
          />
        </div>

        <div
          className="sg-tennis__figure sg-tennis__figure--alex"
          data-swing={alexSwing?.kind}
          style={{ left: `${state.alexX}%` }}
        >
          <PixelCanvas
            artHeight={PLAYER_ART_SIZE.height}
            artWidth={PLAYER_ART_SIZE.width}
            draw={tennisRoutine("ALEX", alexSwing?.kind ?? null, alexProgress)}
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

        {debug ? (
          <>
            <div
              className="sg-tennis-debug__box"
              style={{
                bottom: `${SURFACE_TOP + playerAnchor.y - STRIKE_HALF_Y}%`,
                height: `${STRIKE_HALF_Y * 2}%`,
                left: `${playerAnchor.x - STRIKE_HALF_X}%`,
                width: `${STRIKE_HALF_X * 2}%`,
              }}
            />
            <div
              className="sg-tennis-debug__anchor"
              style={{
                bottom: `${SURFACE_TOP + playerAnchor.y}%`,
                left: `${playerAnchor.x}%`,
              }}
            />
            {ballLive ? (
              <div
                className="sg-tennis-debug__ball"
                style={{ bottom: `${ballBottom}%`, left: `${ball.x}%` }}
              />
            ) : null}
            <p className="sg-tennis-debug__read">
              {`tick ${state.tick} · ${state.phase} · swing ${
                playerSwing?.kind ?? "—"
              } · p ${playerProgress.toFixed(2)} · anchor ${playerAnchor.x.toFixed(
                2,
              )},${playerAnchor.y.toFixed(2)} · ball ${ball.x.toFixed(2)},${ball.y.toFixed(
                2,
              )}${
                state.lastContact
                  ? ` · hit t=${state.lastContact.t.toFixed(2)} @${state.lastContact.tick} ${state.lastContact.swing}`
                  : ""
              }`}
            </p>
          </>
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
