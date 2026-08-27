"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  drawEdward,
  drawTomodachi,
  EDWARD_ART_SIZE,
  getWalkFrame,
  TOMODACHI_ART_SIZE,
} from "@/lib/pixel/characters";
import type { Player, WorldObject } from "@/types/world";
import type { InteractionAction } from "@/types/world";

interface MainWorldProps {
  disabled?: boolean;
  onInteraction: (action: InteractionAction) => void;
}

const MOVEMENT_KEYS = new Set(["a", "d", "arrowleft", "arrowright"]);

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

  useEffect(() => {
    let animationFrame = 0;
    let lastTime = performance.now();

    function update(time: number) {
      const direction = disabled ? 0 : getDirection(pressedKeys.current);
      const deltaSeconds = Math.min((time - lastTime) / 1_000, 0.05);
      lastTime = time;

      // Same value bails out of a re-render, so this is safe every frame.
      setMoving((current) => (current === (direction !== 0) ? current : direction !== 0));

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

  useEffect(() => {
    function handleInteraction(event: KeyboardEvent) {
      if (disabled || event.key.toLowerCase() !== "e" || !nearbyObject) return;
      event.preventDefault();

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
    }

    window.addEventListener("keydown", handleInteraction);
    return () => window.removeEventListener("keydown", handleInteraction);
  }, [disabled, nearbyObject, onInteraction, tomodachiVisits]);

  const cameraX = getCameraX({
    playerX: player.position.x,
    playerWidth: player.size.width,
    viewportWidth,
    worldWidth: WORLD_CONFIG.width,
  });

  const walkFrame = getWalkFrame(player.position.x, PIXEL_UNIT, moving);

  return (
    <main className="world-screen">
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
              draw={drawEdward}
              flipX={player.facing === "left"}
              frame={walkFrame}
              unit={PIXEL_UNIT}
            />
          </div>
        </div>
      </div>
      <div aria-live="polite" className="interaction-status">
        {nearbyObject ? (
          <span>
            {nearbyObject.label} · {getInteractionPrompt(nearbyObject.interaction)}
          </span>
        ) : (
          <span>Move near an object to interact</span>
        )}
      </div>
    </main>
  );
}
