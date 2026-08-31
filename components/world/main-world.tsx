"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InteractionPrompt } from "@/components/world/interaction-prompt";
import { PixelCanvas } from "@/components/world/pixel-canvas";
import { initialPlayer, WORLD_CONFIG, worldObjects } from "@/data/world";
import { findNearestInteractable, getInteractionPrompt } from "@/lib/game/interactions";
import {
  getCameraX,
  movePlayerX,
  type HorizontalDirection,
} from "@/lib/game/movement";
import { getGroundYForFootprint, PIXEL_UNIT } from "@/lib/game/terrain";
import { getTomodachiLines, getWanderOffset } from "@/lib/game/tomodachi";
import { useAmbientFrame } from "@/lib/motion/use-ambient-frame";
import { BACKDROP_ART_SIZE, drawBackdrop } from "@/lib/pixel/backdrop";
import { buildingArt, signpostArt, type BuildingArt } from "@/lib/pixel/buildings";
import {
  drawTomodachi,
  EDWARD_ART_SIZE,
  edwardPoses,
  getWalkFrame,
  TOMODACHI_ART_SIZE,
  type EdwardPose,
} from "@/lib/pixel/characters";
import type { Player, WorldObject } from "@/types/world";
import type { InteractionAction } from "@/types/world";

interface MainWorldProps {
  disabled?: boolean;
  onInteraction: (action: InteractionAction) => void;
}

const MOVEMENT_KEYS = new Set(["a", "d", "arrowleft", "arrowright"]);

/**
 * How long Edward keeps his walking stance after the keys go up, before he
 * settles and turns to face the visitor. Without it, tapping a key would
 * strobe him between the side and front poses.
 */
const SETTLE_MS = 420;

const TOMODACHI_ART: BuildingArt = {
  size: TOMODACHI_ART_SIZE,
  draw: drawTomodachi,
};

function getDirection(keys: ReadonlySet<string>): HorizontalDirection {
  const left = keys.has("a") || keys.has("arrowleft");
  const right = keys.has("d") || keys.has("arrowright");
  if (left === right) return 0;
  return left ? -1 : 1;
}

/** Resolves the art routine and grid size for any world object. */
function getObjectArt(object: WorldObject): BuildingArt {
  if (object.kind === "building") return buildingArt[object.id];
  if (object.kind === "npc") return TOMODACHI_ART;
  return signpostArt;
}

export function MainWorld({ disabled = false, onInteraction }: MainWorldProps) {
  const [player, setPlayer] = useState<Player>(() => ({
    ...initialPlayer,
    position: { ...initialPlayer.position },
  }));
  const [moving, setMoving] = useState(false);
  const [settled, setSettled] = useState(true);
  const [tomodachiVisits, setTomodachiVisits] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pressedKeys = useRef(new Set<string>());
  const ambientFrame = useAmbientFrame(!disabled);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const observer = new ResizeObserver(([entry]) => {
      setViewportWidth(entry.contentRect.width);
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (disabled) return;
      const key = event.key.toLowerCase();
      if (!MOVEMENT_KEYS.has(key)) return;
      event.preventDefault();
      pressedKeys.current.add(key);
    }

    function handleKeyUp(event: KeyboardEvent) {
      pressedKeys.current.delete(event.key.toLowerCase());
    }

    function clearKeys() {
      pressedKeys.current.clear();
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", clearKeys);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", clearKeys);
    };
  }, [disabled]);

  useEffect(() => {
    if (disabled) pressedKeys.current.clear();
  }, [disabled]);

  // Settling is what lets him hold his walking stance for a beat before he
  // turns to face the visitor; moving un-settles him again from the frame loop.
  useEffect(() => {
    if (moving) return;
    const timer = window.setTimeout(() => setSettled(true), SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [moving]);

  useEffect(() => {
    let animationFrame = 0;
    let lastTime = performance.now();

    function update(time: number) {
      const direction = disabled ? 0 : getDirection(pressedKeys.current);
      const deltaSeconds = Math.min((time - lastTime) / 1_000, 0.05);
      lastTime = time;

      // Same value bails out of a re-render, so this is safe every frame.
      setMoving((current) => (current === (direction !== 0) ? current : direction !== 0));
      if (direction !== 0) setSettled((current) => (current ? false : current));

      if (direction !== 0) {
        setPlayer((current) => {
          const nextX = movePlayerX({
            currentX: current.position.x,
            direction,
            deltaSeconds,
            speed: current.speed,
            worldWidth: WORLD_CONFIG.width,
            playerWidth: current.size.width,
          });

          return {
            ...current,
            facing: direction < 0 ? "left" : "right",
            position: {
              x: nextX,
              // Follow the terraced ground so Edward walks down the hill
              // instead of floating off the end of it.
              y:
                getGroundYForFootprint(nextX, current.size.width) -
                current.size.height,
            },
          };
        });
      }

      animationFrame = requestAnimationFrame(update);
    }

    animationFrame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrame);
  }, [disabled]);

  const nearbyObject = useMemo(
    () => findNearestInteractable(player, worldObjects),
    [player],
  );

  const openNearby = useCallback(() => {
    if (disabled || !nearbyObject) return;

    // TOMODACHI has more than one thing to say, and remembers roughly how
    // often you have stopped. Everything else dispatches as authored.
    if (nearbyObject.kind === "npc" && nearbyObject.interaction.type === "TALK") {
      onInteraction({
        ...nearbyObject.interaction,
        lines: getTomodachiLines(tomodachiVisits),
      });
      setTomodachiVisits((visits) => visits + 1);
      return;
    }

    onInteraction(nearbyObject.interaction);
  }, [disabled, nearbyObject, onInteraction, tomodachiVisits]);

  useEffect(() => {
    function handleInteraction(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "e" || !nearbyObject || disabled) return;
      event.preventDefault();
      openNearby();
    }

    window.addEventListener("keydown", handleInteraction);
    return () => window.removeEventListener("keydown", handleInteraction);
  }, [disabled, nearbyObject, openNearby]);

  /** Pointer controls, so the world is reachable without a keyboard. */
  const holdDirection = useCallback((key: "a" | "d", held: boolean) => {
    if (held) pressedKeys.current.add(key);
    else pressedKeys.current.delete(key);
  }, []);

  const cameraX = getCameraX({
    playerX: player.position.x,
    playerWidth: player.size.width,
    viewportWidth,
    worldWidth: WORLD_CONFIG.width,
  });

  const walkFrame = getWalkFrame(player.position.x, PIXEL_UNIT, moving);

  /**
   * Which Edward to draw. Purely presentational — every branch reads state the
   * world already keeps, so movement, collision and interaction detection are
   * untouched. He walks in profile, turns his back to a building as it opens,
   * raises a hand at anything he can interact with, and otherwise settles and
   * looks out at the visitor, which is the pose that reads as the protagonist.
   */
  const pose: EdwardPose = moving
    ? "walk"
    : disabled && nearbyObject?.kind === "building"
      ? "back"
      : nearbyObject
        ? "inspect"
        : settled
          ? "front"
          : "walk";

  // The walk cycle steps with distance; the standing poses breathe on the
  // ambient tick. A stopped-but-not-settled Edward holds the idle frame.
  const spriteFrame = moving ? walkFrame : pose === "walk" ? 0 : ambientFrame;

  return (
    <main className="world-screen" inert={disabled || undefined}>
      <div className="world-instructions">
        <strong>Explore</strong>
        <span>A / D or ← / → to move · E to interact</span>
      </div>
      <div
        aria-label="Edward's interactive portfolio world"
        className="world-viewport"
        ref={viewportRef}
        role="application"
      >
        <div
          className="world-track"
          style={{
            height: WORLD_CONFIG.height,
            transform: `translate3d(${-cameraX}px, 0, 0)`,
            width: WORLD_CONFIG.width,
          }}
        >
          <PixelCanvas
            artHeight={BACKDROP_ART_SIZE.height}
            artWidth={BACKDROP_ART_SIZE.width}
            className="world-backdrop"
            draw={drawBackdrop}
            frame={ambientFrame}
            unit={PIXEL_UNIT}
          />
          {worldObjects.map((object) => {
            const art = getObjectArt(object);
            const isNearby = nearbyObject?.id === object.id;
            // Only TOMODACHI drifts, and only visually.
            const drift =
              object.kind === "npc" ? getWanderOffset(ambientFrame) : 0;

            return (
              <div
                className={`world-object world-object--${object.kind}`}
                data-nearby={isNearby || undefined}
                data-object-id={object.id}
                key={object.id}
                style={{
                  height: object.size.height,
                  left: object.position.x + drift,
                  top: object.position.y,
                  width: object.size.width,
                }}
              >
                <PixelCanvas
                  artHeight={art.size.height}
                  artWidth={art.size.width}
                  draw={art.draw}
                  frame={ambientFrame}
                  unit={PIXEL_UNIT}
                />
                <span className="world-object__label">{object.label}</span>
                {isNearby ? (
                  <InteractionPrompt
                    text={getInteractionPrompt(object.interaction)}
                  />
                ) : null}
              </div>
            );
          })}
          <div
            aria-label="Edward"
            className="world-player"
            data-facing={player.facing}
            data-object-id={player.id}
            data-moving={moving || undefined}
            data-pose={pose}
            style={{
              height: player.size.height,
              left: player.position.x,
              top: player.position.y,
              width: player.size.width,
            }}
          >
            <PixelCanvas
              artHeight={EDWARD_ART_SIZE.height}
              artWidth={EDWARD_ART_SIZE.width}
              draw={edwardPoses[pose]}
              flipX={player.facing === "left"}
              frame={spriteFrame}
              unit={PIXEL_UNIT}
            />
          </div>
        </div>
      </div>
      <div className="world-controls">
        <div className="world-touch">
          <button
            aria-label="Walk left"
            className="world-touch__button"
            onPointerCancel={() => holdDirection("a", false)}
            onPointerDown={() => holdDirection("a", true)}
            onPointerLeave={() => holdDirection("a", false)}
            onPointerUp={() => holdDirection("a", false)}
            type="button"
          >
            <span aria-hidden="true">←</span>
          </button>
          <button
            aria-label="Walk right"
            className="world-touch__button"
            onPointerCancel={() => holdDirection("d", false)}
            onPointerDown={() => holdDirection("d", true)}
            onPointerLeave={() => holdDirection("d", false)}
            onPointerUp={() => holdDirection("d", false)}
            type="button"
          >
            <span aria-hidden="true">→</span>
          </button>
        </div>

        <button
          aria-live="polite"
          className="interaction-status"
          disabled={!nearbyObject}
          onClick={openNearby}
          type="button"
        >
          {nearbyObject ? (
            <span>
              {nearbyObject.label} · {getInteractionPrompt(nearbyObject.interaction)}
            </span>
          ) : (
            <span>Move near an object to interact</span>
          )}
        </button>
      </div>
    </main>
  );
}
