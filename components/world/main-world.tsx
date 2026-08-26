"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { initialPlayer, WORLD_CONFIG, worldObjects } from "@/data/world";
import { findNearestInteractable, getInteractionPrompt } from "@/lib/game/interactions";
import {
  getCameraX,
  movePlayerX,
  type HorizontalDirection,
} from "@/lib/game/movement";
import type { InteractionAction, Player } from "@/types/world";

interface MainWorldProps {
  disabled?: boolean;
  onInteraction: (action: InteractionAction) => void;
}

const MOVEMENT_KEYS = new Set(["a", "d", "arrowleft", "arrowright"]);

function getDirection(keys: ReadonlySet<string>): HorizontalDirection {
  const left = keys.has("a") || keys.has("arrowleft");
  const right = keys.has("d") || keys.has("arrowright");
  if (left === right) return 0;
  return left ? -1 : 1;
}

export function MainWorld({ disabled = false, onInteraction }: MainWorldProps) {
  const [player, setPlayer] = useState<Player>(() => ({
    ...initialPlayer,
    position: { ...initialPlayer.position },
  }));
  const [viewportWidth, setViewportWidth] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pressedKeys = useRef(new Set<string>());

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

      if (direction !== 0) {
        setPlayer((current) => ({
          ...current,
          facing: direction < 0 ? "left" : "right",
          position: {
            ...current.position,
            x: movePlayerX({
              currentX: current.position.x,
              direction,
              deltaSeconds,
              speed: current.speed,
              worldWidth: WORLD_CONFIG.width,
              playerWidth: current.size.width,
            }),
          },
        }));
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
      onInteraction(nearbyObject.interaction);
    }

    window.addEventListener("keydown", handleInteraction);
    return () => window.removeEventListener("keydown", handleInteraction);
  }, [disabled, nearbyObject, onInteraction]);

  const cameraX = getCameraX({
    playerX: player.position.x,
    playerWidth: player.size.width,
    viewportWidth,
    worldWidth: WORLD_CONFIG.width,
  });

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
          <div
            aria-label="Edward player placeholder"
            className="world-player"
            data-facing={player.facing}
            data-object-id={player.id}
            style={{
              height: player.size.height,
              left: player.position.x,
              top: player.position.y,
              width: player.size.width,
            }}
          >
            E
          </div>
          {worldObjects.map((object) => (
            <div
              className={`world-object world-object--${object.kind}`}
              data-nearby={nearbyObject?.id === object.id || undefined}
              data-object-id={object.id}
              key={object.id}
              style={{
                height: object.size.height,
                left: object.position.x,
                top: object.position.y,
                width: object.size.width,
              }}
            >
              <span>{object.label}</span>
            </div>
          ))}
          <div className="world-ground" style={{ top: WORLD_CONFIG.groundY }} />
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
