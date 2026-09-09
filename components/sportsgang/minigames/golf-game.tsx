"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Meter } from "@/components/sportsgang/minigames/meter";
import type { MinigameProps } from "@/components/sportsgang/minigames/types";
import { useFixedStepGameLoop } from "@/components/sportsgang/minigames/use-fixed-step-loop";
import { useMinigameInput } from "@/components/sportsgang/minigames/use-minigame-input";
import { PixelCanvas } from "@/components/world/pixel-canvas";
import {
  depthPercent,
  distanceToHoleM,
  GOLF_COURSE,
  GOLF_VIEW,
  heightPercent,
  mapPercent,
  xPercent,
} from "@/lib/game/minigames/golf-course";
import {
  abandonGolfHole,
  advanceGolfHole,
  createGolfHoleState,
  draftGolfRun,
  estimateShotDistanceM,
  type GolfHoleState,
} from "@/lib/game/minigames/golf-hole";
import {
  createGolfRunResult,
  GUEST_DISPLAY_NAME,
  nextShotNumber,
  toSportResult,
} from "@/lib/game/minigames/golf-result";
import type { FixedStepper } from "@/lib/game/minigames/fixed-step";
import type { MinigameInput } from "@/lib/game/minigames/types";
import { PIXEL_UNIT } from "@/lib/game/terrain";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import {
  drawFlag,
  FLAG_ANCHOR_PERCENT,
  FLAG_ART_SIZE,
  GOLFER_ANCHOR_PERCENT,
  GOLFER_ART_SIZE,
  golferRoutines,
} from "@/lib/pixel/sg-golf";

/**
 * One hole of golf, drawn from the simulation and nothing else.
 *
 * This layer owns no rules. The ball's position, the camera, the club, the
 * score and the shot number are all numbers `advanceGolfHole` already decided;
 * the only arithmetic here is the projection in `golf-course.ts`, which turns
 * metres into percentages of the play box. That is deliberate and it is the
 * reason the same hole reads the same at 1440x900 and at 390x844: there is no
 * viewport in the conversion.
 *
 * ## Three things this file is careful about
 *
 * - **The shot number is not the score.** `SHOT` is the ball you are about to
 *   hit, `TOTAL STROKES` includes penalties, and after a penalty the two
 *   visibly differ. They come from different functions for that reason.
 * - **The club head and the ball are one point.** The figure is anchored by
 *   `GOLFER_ANCHOR_PERCENT`, the impact pose's club head expressed as a share
 *   of its own box, so the club arrives exactly where the ball is at any size.
 * - **Reduced motion changes the camera shake and nothing else.** The power
 *   bar, the contact window and the strike are identical either way; a player
 *   who prefers less motion plays the same game, not an easier one.
 */

/** The distance posts down the fairway, in metres from the tee. */
const MARKERS = [50, 100, 150, 200, 250] as const;

/** How many flight samples the trail keeps. Long enough to read an arc. */
const TRAIL_LENGTH = 40;

/** Anything this far outside the frame is not rendered at all. */
const OFF_SCREEN_PERCENT = 20;

interface TrailPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** The phases in which the player has not yet struck the ball in front of them. */
const BEFORE_IMPACT: ReadonlySet<string> = new Set(["AIM", "POWER", "SWING"]);

function aimLabel(aimDeg: number) {
  const rounded = Math.round(Math.abs(aimDeg));
  if (rounded === 0) return "AT THE FLAG";
  return `${rounded}° ${aimDeg < 0 ? "LEFT" : "RIGHT"}`;
}

export function GolfGame({
  active,
  onFinish,
  onGolfRun,
  playerDisplayName,
}: MinigameProps) {
  const { consume, bind, clear } = useMinigameInput(active);
  const [state, setState] = useState<GolfHoleState>(createGolfHoleState);
  const stateRef = useRef(state);
  const finished = useRef(false);
  const stepperRef = useRef<FixedStepper | null>(null);
  // The trail is rendered, so it is state rather than a ref: reading a ref
  // during render would mean the drawn arc could lag the ball by a frame.
  const [trail, setTrail] = useState<readonly TrailPoint[]>([]);
  const trailShot = useRef(0);
  const reducedMotion = useReducedMotion();

  /**
   * Identity comes from here, never from the simulation.
   *
   * The rules layer is checked by test for exactly this: no clock, no random
   * source, nothing that would make two identical runs differ. A fresh attempt
   * is a fresh mount, so a lazy initial state is one id per run.
   */
  const [runId] = useState(() => globalThis.crypto.randomUUID());

  const step = useCallback((dt: number, input: MinigameInput) => {
    const next = advanceGolfHole(stateRef.current, input, dt);

    // The trail is the flight the simulation just flew, resampled — not a
    // separate animation that could disagree with where the ball actually is.
    if (next.impactCount !== trailShot.current) {
      trailShot.current = next.impactCount;
      setTrail([]);
    }
    if (next.phase === "FLIGHT" || next.phase === "ROLL") {
      setTrail((current) => [
        ...current.slice(-(TRAIL_LENGTH - 1)),
        { x: next.ball.x, y: next.ball.y, z: next.ball.z },
      ]);
    }

    stateRef.current = next;
    setState(next);
  }, []);

  const { stepper } = useFixedStepGameLoop(active, consume, step, {
    onSuspend: clear,
  });

  useEffect(() => {
    stepperRef.current = stepper;
  }, [stepper]);

  // `elapsedMs` survives a reset on purpose, so a run has to say where it began.
  useEffect(() => {
    stepper.markRunStart();
  }, [stepper]);

  /**
   * The run leaves once.
   *
   * Keyed on `done` rather than on the loop, so conceding and holing out and
   * running out of shots all report through the same single path.
   */
  useEffect(() => {
    if (!state.done || finished.current) return;
    finished.current = true;
    const run = createGolfRunResult(
      draftGolfRun(state, {
        runId,
        elapsedSimulationMs:
          stepperRef.current?.elapsedSinceRunStartMs ?? state.simulationMs,
        ...(playerDisplayName ? { playerDisplayName } : {}),
      }),
    );
    onFinish(toSportResult(run));
    // D owns submission. B produces the record and hands it over; nothing here
    // touches storage or the network.
    onGolfRun?.(run);
  }, [onFinish, onGolfRun, playerDisplayName, runId, state]);

  const concede = useCallback(() => {
    const next = abandonGolfHole(stateRef.current);
    stateRef.current = next;
    setState(next);
  }, []);

  /* The hole is a scene, not a form: nothing in it should take focus off the
     keys that play the game. */
  const sceneRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (active) sceneRef.current?.focus({ preventScroll: true });
  }, [active]);

  const { camera, ball } = state;
  const remaining = distanceToHoleM(GOLF_COURSE, ball);
  const ground = GOLF_VIEW.groundPercent;

  const ballLeft = xPercent(ball.x, camera);
  const ballGround = ground + depthPercent(ball.y);
  const ballBottom = ballGround + heightPercent(ball.z, camera);
  const holeLeft = xPercent(GOLF_COURSE.holeM, camera);
  const holeWidth = ((GOLF_COURSE.holeRadiusM * 2) / camera.spanM) * 100;
  const greenWidth = ((GOLF_COURSE.greenRadiusM * 2) / camera.spanM) * 100;

  // The figure stands on the side away from the flag, so running past the hole
  // never parks Edward on top of it.
  const facingRight = GOLF_COURSE.holeM >= ball.x;
  const anchorX = facingRight
    ? GOLFER_ANCHOR_PERCENT.x
    : 100 - GOLFER_ANCHOR_PERCENT.x;

  const shake = reducedMotion ? 0 : state.shake;
  const shakeStyle =
    shake > 0
      ? { transform: `translate3d(${(shake * 3).toFixed(2)}px, 0, 0)` }
      : undefined;

  const club = state.club;
  const range = useMemo(
    () => Math.round(estimateShotDistanceM(GOLF_COURSE, club, 1, state.lie)),
    [club, state.lie],
  );

  const shotNumber = BEFORE_IMPACT.has(state.phase)
    ? nextShotNumber(state)
    : state.shotCount;
  const swinging = state.club === "PUTTER" ? "PUTTER" : "DRIVER";
  const inPlay = state.phase !== "AIM" && state.phase !== "POWER";
  const markers = MARKERS.map((metres) => ({ metres, left: xPercent(metres, camera) })).filter(
    ({ left }) => left > -OFF_SCREEN_PERCENT && left < 100 + OFF_SCREEN_PERCENT,
  );

  return (
    <div className="sg-play sg-play--golf" style={shakeStyle}>
      <div
        aria-label={`Golf, hole 1, par ${GOLF_COURSE.par}. Shot ${shotNumber}, ${Math.round(remaining)} metres to the hole.`}
        className="sg-golf__scene"
        ref={sceneRef}
        role="application"
        tabIndex={-1}
      >
        <div className="sg-golf__ground" style={{ height: `${ground}%` }} />

        {markers.map(({ metres, left }) => (
          <div className="sg-golf__marker" key={metres} style={{ bottom: `${ground}%`, left: `${left}%` }}>
            <span>{metres}</span>
          </div>
        ))}

        <div
          className="sg-golf__green"
          style={{ bottom: `${ground}%`, left: `${holeLeft}%`, width: `${greenWidth}%` }}
        />
        {/* The cup: a dark opening on the ground line, never behind anything. */}
        <div
          className="sg-golf__hole"
          style={{ bottom: `${ground}%`, left: `${holeLeft}%`, width: `${holeWidth}%` }}
        />
        <div
          className="sg-golf__flag"
          style={{
            bottom: `${ground}%`,
            left: `${holeLeft}%`,
            transform: `translate(-${FLAG_ANCHOR_PERCENT.x}%, ${FLAG_ANCHOR_PERCENT.y}%)`,
          }}
        >
          <PixelCanvas
            artHeight={FLAG_ART_SIZE.height}
            artWidth={FLAG_ART_SIZE.width}
            draw={drawFlag}
            fill
            frame={Math.floor(state.simulationMs / 320)}
            unit={PIXEL_UNIT}
          />
        </div>

        {trail.map((point, index) => (
          <div
            aria-hidden="true"
            className="sg-golf__trail"
            key={index}
            style={{
              bottom: `${ground + depthPercent(point.y) + heightPercent(point.z, camera)}%`,
              left: `${xPercent(point.x, camera)}%`,
              opacity: ((index + 1) / trail.length) * 0.45,
            }}
          />
        ))}

        {/* The shadow is on the ground under the ball, from the same numbers:
            it is how height reads as height rather than as distance. */}
        <div
          aria-hidden="true"
          className="sg-golf__shadow"
          style={{
            bottom: `${ballGround}%`,
            left: `${ballLeft}%`,
            opacity: Math.max(0.1, 0.45 - ball.z / 60),
          }}
        />

        <div
          className="sg-golf__figure"
          style={{
            bottom: `${ballGround}%`,
            left: `${ballLeft}%`,
            transform: `translate(-${anchorX}%, ${GOLFER_ANCHOR_PERCENT.y}%)`,
          }}
        >
          <PixelCanvas
            artHeight={GOLFER_ART_SIZE.height}
            artWidth={GOLFER_ART_SIZE.width}
            draw={golferRoutines[swinging][state.swingStage]}
            flipX={!facingRight}
            frame={0}
            unit={PIXEL_UNIT}
          />
        </div>

        <div
          className="sg-golf__ball"
          data-airborne={ball.z > 0.4 || undefined}
          style={{ bottom: `${ballBottom}%`, left: `${ballLeft}%` }}
        />

        {inPlay ? (
          <p
            className="sg-golf__readout"
            style={{ left: `${Math.min(Math.max(ballLeft, 10), 90)}%` }}
          >
            {Math.round(remaining)} M
          </p>
        ) : null}
      </div>

      {/* The course map is always up, so the hole is never a surprise and the
          line of the shot is readable from above where a side view cannot
          show it. */}
      <div aria-hidden="true" className="sg-golf__map">
        <div className="sg-golf__map-fairway" />
        <div className="sg-golf__map-green" />
        <div className="sg-golf__map-flag" />
        <div
          className="sg-golf__map-ball"
          style={{
            left: `${mapPercent(GOLF_COURSE, ball.x)}%`,
            top: `${50 + (ball.y / GOLF_COURSE.outOfBoundsHalfWidthM) * 50}%`,
          }}
        />
        <p className="sg-golf__map-label">
          {GOLF_COURSE.name} · {GOLF_COURSE.holeM} M · PAR {GOLF_COURSE.par}
        </p>
      </div>

      <div className="sg-golf__hud">
        <p className="sg-golf__line">
          <span>PLAYER</span>
          <strong>{playerDisplayName ?? GUEST_DISPLAY_NAME}</strong>
          <span>HOLE 1 / PAR {GOLF_COURSE.par}</span>
        </p>
        <dl className="sg-golf__stats">
          <div>
            <dt>SHOT</dt>
            <dd>{shotNumber}</dd>
          </div>
          <div>
            <dt>TOTAL STROKES</dt>
            <dd data-penalised={state.penaltyStrokes > 0 || undefined}>
              {state.totalStrokes}
            </dd>
          </div>
          <div>
            <dt>TO HOLE</dt>
            <dd>{Math.round(remaining)} M</dd>
          </div>
          <div>
            <dt>LAST SHOT</dt>
            <dd>{Math.round(state.lastShotM)} M</dd>
          </div>
          <div>
            <dt>CLUB</dt>
            <dd>{club}</dd>
          </div>
          <div>
            <dt>RANGE</dt>
            <dd>{range} M</dd>
          </div>
        </dl>

        <p className="sg-golf__prompt">{state.prompt}</p>

        {state.phase === "AIM" ? (
          <p className="sg-golf__aim">AIM · {aimLabel(state.aimDeg)}</p>
        ) : null}
        {state.phase === "POWER" ? <Meter label="POWER" value={state.meter} /> : null}
        {state.phase === "SWING" ? (
          <Meter
            centred
            label="CONTACT"
            target={{ from: 0.45, to: 0.55 }}
            tone="timing"
            value={state.faceActive ? state.meter : 0}
          />
        ) : null}
      </div>

      <div className="sg-golf__controls">
        <button
          aria-label="Aim left"
          className="sg-golf__button"
          disabled={state.phase !== "AIM"}
          type="button"
          {...bind("left")}
        >
          <span aria-hidden="true">←</span>
        </button>
        <button className="sg-golf__button sg-golf__button--action" type="button" {...bind("action")}>
          {state.phase === "AIM"
            ? "SET POWER"
            : state.phase === "POWER"
              ? "STOP"
              : state.phase === "SWING"
                ? "STRIKE"
                : "NEXT"}
        </button>
        <button
          aria-label="Aim right"
          className="sg-golf__button"
          disabled={state.phase !== "AIM"}
          type="button"
          {...bind("right")}
        >
          <span aria-hidden="true">→</span>
        </button>
        {state.phase === "HOLED" || state.done ? null : (
          <button className="sg-golf__button sg-golf__button--quiet" onClick={concede} type="button">
            CONCEDE
          </button>
        )}
      </div>

      <p className="sg-golf__hint">{state.nextKey || "· · ·"}</p>

      <p aria-live="polite" className="loc-announcer">
        {state.phase === "SHOT_END" || state.phase === "HOLED" ? state.prompt : ""}
      </p>
    </div>
  );
}
