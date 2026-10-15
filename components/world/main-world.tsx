"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { InteractionPrompt } from "@/components/world/interaction-prompt";
import { PixelCanvas } from "@/components/world/pixel-canvas";
import { WorldLabel } from "@/components/world/world-label";
import { initialPlayer, WORLD_CONFIG, worldObjects } from "@/data/world";
import { findNearestInteractable, getInteractionPrompt } from "@/lib/game/interactions";
import {
  getCameraX,
  movePlayerX,
  type HorizontalDirection,
} from "@/lib/game/movement";
import { getGroundYForFootprint, PIXEL_UNIT } from "@/lib/game/terrain";
import { snapToCss, toCss, usePixelUnit } from "@/lib/game/use-pixel-unit";
import { formatJoinLine } from "@/lib/joins/ordinal";
import { useJoinTotal } from "@/lib/joins/use-join-total";
import { play } from "@/lib/audio/sfx";
import { prefersReducedMotion } from "@/lib/motion/animate-element";
import { AMBIENT_FRAME_MS, useAmbientFrame } from "@/lib/motion/use-ambient-frame";

import {
  claimExploreHint,
  EXPLORE_HINT_FRAMES,
  getExploreHintServerSnapshot,
  subscribeExploreHint,
} from "@/lib/storage/explore-hint";
import { BACKDROP_ART_SIZE, drawBackdrop } from "@/lib/pixel/backdrop";
import { buildingArt, signpostArt, type BuildingArt } from "@/lib/pixel/buildings";
import { worldExitArt } from "@/lib/pixel/world-exit";
import {
  EDWARD_ART_SIZE,
  edwardPoses,
  getAvatarAnchor,
  getWalkFrame,
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

/** The camera leads the player by one art pixel in the way he faces. */
const LOOK_AHEAD = PIXEL_UNIT;

/** Ambient frames the door stays open before the scene changes. */
const DOOR_OPEN_FRAMES = 2;

function getDirection(keys: ReadonlySet<string>): HorizontalDirection {
  const left = keys.has("a") || keys.has("arrowleft");
  const right = keys.has("d") || keys.has("arrowright");
  if (left === right) return 0;
  return left ? -1 : 1;
}

/** Resolves the art routine and grid size for any world object. */
function getObjectArt(object: WorldObject): BuildingArt {
  if (object.kind === "building") return buildingArt[object.id];
  // The exit is a sign by kind, because it is not a building and not a
  // project, but it is a gateway and has to read as one.
  if (object.id === "world-exit") return worldExitArt;
  return signpostArt;
}

export function MainWorld({ disabled = false, onInteraction }: MainWorldProps) {
  const [player, setPlayer] = useState<Player>(() => ({
    ...initialPlayer,
    position: { ...initialPlayer.position },
  }));
  const [moving, setMoving] = useState(false);
  const [settled, setSettled] = useState(true);
  // The building whose door is swinging open, and which of its two open frames.
  const [opening, setOpening] = useState<{ id: string; step: 0 | 1 } | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pressedKeys = useRef(new Set<string>());
  const ambientFrame = useAmbientFrame(!disabled);
  // First arrival on this device only. The server snapshot is "no hint", so
  // hydration agrees and the hint appears once the client has read storage.
  const firstVisit = useSyncExternalStore(
    subscribeExploreHint,
    claimExploreHint,
    getExploreHintServerSnapshot,
  );
  const unit = usePixelUnit();
  // Null until a real total arrives, and null forever if the counter is
  // unreachable — the line is simply absent rather than guessed at.
  const joinTotal = useJoinTotal();

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const observer = new ResizeObserver(([entry]) => {
      setViewportWidth(entry.contentRect.width);
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  // The door is a short scripted beat: the world listens to nothing until it ends.
  const locked = disabled || opening !== null;
  if (disabled && opening) setOpening(null);
  const openingId = opening?.id;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (locked) return;
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
  }, [locked]);

  useEffect(() => {
    if (locked) pressedKeys.current.clear();
  }, [locked]);

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
      const direction = locked ? 0 : getDirection(pressedKeys.current);
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
  }, [locked]);

  const nearbyObject = useMemo(
    () => findNearestInteractable(player, worldObjects),
    [player],
  );

  const openNearby = useCallback(() => {
    if (locked || !nearbyObject) return;

    // A building opens its door first; the rest of the beat plays out below.
    if (
      nearbyObject.kind === "building" &&
      buildingArt[nearbyObject.id].openDoor &&
      !prefersReducedMotion()
    ) {
      play("door");
      setOpening({ id: nearbyObject.id, step: 0 });
      return;
    }
    onInteraction(nearbyObject.interaction);
  }, [locked, nearbyObject, onInteraction]);

  // Two ambient frames of open door, then the scene change.
  useEffect(() => {
    if (!openingId) return;
    const target = worldObjects.find((object) => object.id === openingId);
    const timers = [
      window.setTimeout(() => setOpening({ id: openingId, step: 1 }), AMBIENT_FRAME_MS),
      window.setTimeout(() => {
        setOpening(null);
        if (target?.interaction) onInteraction(target.interaction);
      }, DOOR_OPEN_FRAMES * AMBIENT_FRAME_MS),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [openingId, onInteraction]);

  useEffect(() => {
    function handleInteraction(event: KeyboardEvent) {
      // `repeat` matters at the exit in particular: an overlay closing while E
      // is still held would otherwise re-open it immediately, which is the one
      // way the farewell could fire without anyone asking for it. Holding E at
      // any other object used to re-fire too.
      if (event.repeat) return;
      if (event.key.toLowerCase() !== "e" || !nearbyObject || locked) return;
      event.preventDefault();
      openNearby();
    }

    window.addEventListener("keydown", handleInteraction);
    return () => window.removeEventListener("keydown", handleInteraction);
  }, [locked, nearbyObject, openNearby]);

  /** Pointer controls, so the world is reachable without a keyboard. */
  const holdDirection = useCallback((key: "a" | "d", held: boolean) => {
    if (held) pressedKeys.current.add(key);
    else pressedKeys.current.delete(key);
  }, []);

  // Movement, collision and the camera stay in authored pixels; only what is
  // drawn is scaled, so the unit can change without touching the simulation.
  const cameraX = getCameraX({
    playerX: player.position.x,
    playerWidth: player.size.width,
    viewportWidth: (viewportWidth * PIXEL_UNIT) / unit,
    worldWidth: WORLD_CONFIG.width,
    lookAhead: player.facing === "left" ? -LOOK_AHEAD : LOOK_AHEAD,
  });

  const walkFrame = getWalkFrame(player.position.x, PIXEL_UNIT, moving);

  // A footstep on every other walk frame; the sound alternates its own pitch.
  useEffect(() => {
    if (moving && walkFrame % 2 === 0) play("footstep");
  }, [moving, walkFrame]);

  const openStep = opening?.step ?? 0;
  const openDoorDraw = useMemo(() => {
    const art = openingId ? buildingArt[openingId as keyof typeof buildingArt] : null;
    const open = art?.openDoor;
    if (!art || !open) return null;
    return (draw: Parameters<typeof art.draw>[0], frame: number) => {
      art.draw(draw, frame);
      open(draw, openStep);
    };
  }, [openingId, openStep]);

  /**
   * The art rectangle, which is deliberately not the hitbox. `player.size` is
   * the only rectangle movement, bounds, the camera and proximity read; this
   * is where the sprite is *drawn*, anchored feet-down and centred on that
   * footprint. Today they are the same 48x64, so this changes nothing — it is
   * the seam that lets a taller avatar arrive without moving the player.
   */
  const avatar = getAvatarAnchor(EDWARD_ART_SIZE, player.size, PIXEL_UNIT);

  /**
   * Which Edward to draw. Purely presentational — every branch reads state the
   * world already keeps, so movement, collision and interaction detection are
   * untouched. He walks in profile, turns his back to a building as it opens,
   * raises a hand at anything he can interact with, and otherwise settles and
   * looks out at the visitor, which is the pose that reads as the protagonist.
   */
  const pose: EdwardPose = moving
    ? "walk"
    : locked && nearbyObject?.kind === "building"
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
    <main
      className="world-screen"
      inert={disabled || undefined}
      style={{ "--unit": `${unit}px` } as React.CSSProperties}
    >
      {joinTotal !== null ? (
        <p className="world-join" role="status">
          {formatJoinLine(joinTotal)}
        </p>
      ) : null}

      {firstVisit && ambientFrame < EXPLORE_HINT_FRAMES ? (
        <div className="world-instructions">
          <strong>Explore</strong>
          <span>A / D or ← / → to move · E to interact</span>
        </div>
      ) : null}
      <div
        aria-label="Edward's interactive portfolio world"
        className="world-viewport"
        ref={viewportRef}
        role="application"
      >
        <div
          className="world-track"
          style={{
            height: toCss(WORLD_CONFIG.height, unit),
            transform: `translate3d(${-snapToCss(cameraX, unit)}px, 0, 0)`,
            width: toCss(WORLD_CONFIG.width, unit),
          }}
        >
          <PixelCanvas
            artHeight={BACKDROP_ART_SIZE.height}
            artWidth={BACKDROP_ART_SIZE.width}
            className="world-backdrop"
            draw={drawBackdrop}
            frame={ambientFrame}
            unit={unit}
          />
          {worldObjects.map((object) => {
            const art = getObjectArt(object);
            const isNearby = nearbyObject?.id === object.id;
            return (
              <div
                className={`world-object world-object--${object.kind}`}
                data-nearby={isNearby || undefined}
                data-object-id={object.id}
                key={object.id}
                style={{
                  height: toCss(object.size.height, unit),
                  left: toCss(object.position.x, unit),
                  top: toCss(object.position.y, unit),
                  width: toCss(object.size.width, unit),
                }}
              >
                <PixelCanvas
                  artHeight={art.size.height}
                  artWidth={art.size.width}
                  draw={object.id === openingId && openDoorDraw ? openDoorDraw : art.draw}
                  frame={ambientFrame}
                  unit={unit}
                />
                <WorldLabel
                  anchorUnits={object.size.width / PIXEL_UNIT}
                  text={object.label}
                  unit={unit}
                />
                {isNearby && object.interaction ? (
                  <InteractionPrompt
                    anchorUnits={object.size.width / PIXEL_UNIT}
                    text={getInteractionPrompt(object.interaction)}
                    unit={unit}
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
              height: toCss(avatar.height, unit),
              left: snapToCss(player.position.x + avatar.left, unit),
              top: toCss(player.position.y + avatar.top, unit),
              width: toCss(avatar.width, unit),
            }}
          >
            <PixelCanvas
              artHeight={EDWARD_ART_SIZE.height}
              artWidth={EDWARD_ART_SIZE.width}
              draw={edwardPoses[pose]}
              flipX={player.facing === "left"}
              frame={spriteFrame}
              unit={unit}
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
