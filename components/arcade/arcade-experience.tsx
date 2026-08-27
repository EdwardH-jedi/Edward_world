"use client";

import type { Timeline } from "animejs";
import { createTimeline } from "animejs";
import { useCallback, useEffect, useRef, useState } from "react";
import { ProjectSummary } from "@/components/locations/project-summary";
import { useMinigameInput } from "@/components/sportsgang/minigames/use-minigame-input";
import { PixelCanvas } from "@/components/world/pixel-canvas";
import {
  advancePlatformer,
  createPlatformerState,
  FLAG,
  getRunSummary,
  hazardAt,
  HAZARDS,
  LEVEL_HEIGHT,
  LEVEL_WIDTH,
  PICKUPS,
  PLATFORMS,
  PLAYER_SIZE,
  type PlatformerState,
} from "@/lib/game/arcade/platformer";
import { getCameraX, movePlayerX } from "@/lib/game/movement";
import { PIXEL_UNIT } from "@/lib/game/terrain";
import { prefersReducedMotion } from "@/lib/motion/animate-element";
import {
  applyScreenProjection,
  measureScreenProjection,
  type CourtProjection,
} from "@/lib/motion/sportsgang-choreography";
import { useGameLoop } from "@/lib/motion/use-game-loop";
import { drawEdward, EDWARD_ART_SIZE, getWalkFrame } from "@/lib/pixel/characters";

interface ArcadeExperienceProps {
  onExit: () => void;
}

const PRODUCT_FLOW = ["MOVE", "JUMP", "CLOSE BUGS", "REACH THE OFFER"] as const;

/** The arcade floor, in the same CSS pixels the world uses. */
const FLOOR_WIDTH = 1_120;
const CABINET_X = 720;
const APPROACH_RANGE = 150;
const WALK_SPEED = 240;

/** The playable viewport, in level units. */
const VIEW = { width: 640, height: LEVEL_HEIGHT } as const;

type ArcadePhase = "FLOOR" | "PLAYING" | "DONE";

export function ArcadeExperience({ onExit }: ArcadeExperienceProps) {
  const [phase, setPhase] = useState<ArcadePhase>("FLOOR");
  const [edwardX, setEdwardX] = useState(120);
  const [facing, setFacing] = useState<"left" | "right">("right");
  const [walking, setWalking] = useState(false);
  const [game, setGame] = useState<PlatformerState>(createPlatformerState);

  const rootRef = useRef<HTMLElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLAnchorElement>(null);
  const playRef = useRef<HTMLButtonElement>(null);
  const gameRef = useRef(game);
  const expansionRef = useRef<Timeline | null>(null);
  const projectionRef = useRef<CourtProjection | null>(null);

  const { consume, bind } = useMinigameInput(true);

  const nearCabinet = Math.abs(edwardX - CABINET_X) < APPROACH_RANGE;

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    rootRef.current?.focus();
    return () => previousFocus?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onExit();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onExit]);

  // Walking the floor reuses the world's own movement, so the arcade feels
  // like the same place rather than a separate app.
  useGameLoop(phase === "FLOOR", (delta) => {
    const input = consume();
    const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    setWalking(direction !== 0);
    if (direction === 0) return;
    setFacing(direction > 0 ? "right" : "left");
    setEdwardX((current) =>
      movePlayerX({
        currentX: current,
        direction: direction as 1 | -1,
        deltaSeconds: delta,
        speed: WALK_SPEED,
        worldWidth: FLOOR_WIDTH,
        playerWidth: 48,
      }),
    );
  });

  useGameLoop(phase === "PLAYING", (delta) => {
    const next = advancePlatformer(gameRef.current, consume(), delta);
    gameRef.current = next;
    setGame(next);
    if (next.phase === "FINISHED" || next.phase === "FAILED") {
      window.setTimeout(() => setPhase("DONE"), 900);
    }
  });

  const startPlaying = useCallback(() => {
    const screen = screenRef.current;
    const slot = slotRef.current;
    gameRef.current = createPlatformerState();
    setGame(gameRef.current);
    setPhase("PLAYING");

    if (!screen || !slot) return;
    // The cabinet's display becomes the game: measure the little screen, park
    // the real one inside it, then let it grow out.
    const projection = measureScreenProjection(slot, screen);
    projectionRef.current = projection;
    applyScreenProjection(screen, projection);

    if (prefersReducedMotion() || !projection) {
      applyScreenProjection(screen, null);
      return;
    }

    expansionRef.current = createTimeline().add(screen, {
      translateX: [projection.translateX, 0],
      translateY: [projection.translateY, 0],
      scale: [projection.scale, 1],
      duration: 620,
      ease: "outQuart",
    });
  }, []);

  useEffect(() => {
    if (phase !== "PLAYING") return;
    const screen = screenRef.current;
    return () => {
      expansionRef.current?.pause();
      // Pin the end state rather than trusting the tween to have landed.
      if (screen) applyScreenProjection(screen, null);
    };
  }, [phase]);

  useEffect(() => {
    if (phase === "DONE") summaryRef.current?.focus();
    if (phase === "FLOOR" && nearCabinet) playRef.current?.focus();
  }, [nearCabinet, phase]);

  // E starts the machine, exactly as it opens a building in the world.
  useEffect(() => {
    if (phase !== "FLOOR") return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "e" || !nearCabinet) return;
      event.preventDefault();
      startPlaying();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nearCabinet, phase, startPlaying]);

  const replay = useCallback(() => {
    gameRef.current = createPlatformerState();
    setGame(gameRef.current);
    setPhase("FLOOR");
  }, []);

  const summary = getRunSummary(game);
  const cameraX = getCameraX({
    playerX: game.x,
    playerWidth: PLAYER_SIZE.width,
    viewportWidth: VIEW.width,
    worldWidth: LEVEL_WIDTH,
  });
  const walkFrame = getWalkFrame(edwardX, PIXEL_UNIT, walking);

  return (
    <section
      aria-label="Arcade"
      className="loc-experience ar-arcade"
      data-phase={phase}
      ref={rootRef}
      tabIndex={-1}
    >
      <div aria-hidden="true" className="ar-interior">
        <div className="ar-wall" />
        <div className="ar-carpet" />
        <div className="ar-neon">SOONPERMARIO</div>
        <div className="ar-shelf" />
      </div>

      <button className="loc-exit" onClick={onExit} type="button">
        ESC · BACK TO WORLD
      </button>

      <p aria-live="polite" className="loc-announcer">
        {phase === "FLOOR"
          ? nearCabinet
            ? "At the cabinet. Press E to play."
            : "Walk to the cabinet."
          : phase === "PLAYING"
            ? "Playing Soonpermario"
            : "Soonpermario project summary"}
      </p>

      {/* The cabinet on the arcade floor. */}
      <div
        aria-hidden="true"
        className="ar-cabinet"
        data-near={nearCabinet || undefined}
        style={{ left: CABINET_X }}
      >
        <div className="ar-cabinet__marquee">SOONPERMARIO</div>
        <div className="ar-cabinet__bezel">
          <div className="ar-cabinet__slot" ref={slotRef} />
        </div>
        <div className="ar-cabinet__panel">
          <span />
          <span />
        </div>
      </div>

      {phase === "FLOOR" ? (
        <div
          aria-hidden="true"
          className="ar-edward"
          data-facing={facing}
          style={{ left: edwardX }}
        >
          <PixelCanvas
            artHeight={EDWARD_ART_SIZE.height}
            artWidth={EDWARD_ART_SIZE.width}
            draw={drawEdward}
            flipX={facing === "left"}
            frame={walkFrame}
            unit={PIXEL_UNIT}
          />
        </div>
      ) : null}

      {/* The game. Always full size; parked inside the cabinet until it starts. */}
      <div className="ar-screen" data-live={phase === "PLAYING" || undefined} ref={screenRef}>
        {/* The stage carries the scale so the camera can translate in level
            units inside it; scaling and translating the same element would
            leave the camera offset in the wrong coordinate space. */}
        <div className="ar-stage">
        <div
          className="ar-level"
          style={{ transform: `translate3d(${-cameraX}px, 0, 0)` }}
        >
          {PLATFORMS.map((platform, index) => (
            <div
              className="ar-platform"
              key={`p-${index}`}
              style={{
                height: platform.height,
                left: platform.x,
                top: platform.y,
                width: platform.width,
              }}
            />
          ))}

          {PICKUPS.filter((pickup) => !game.collected.includes(pickup.id)).map(
            (pickup) => (
              <div
                className="ar-pickup"
                data-kind={pickup.kind}
                key={pickup.id}
                style={{
                  height: pickup.height,
                  left: pickup.x,
                  top: pickup.y,
                  width: pickup.width,
                }}
              />
            ),
          )}

          {HAZARDS.filter((hazard) => !game.defeated.includes(hazard.id)).map(
            (hazard) => {
              const at = hazardAt(hazard, game.elapsed);
              return (
                <div
                  className="ar-bug"
                  key={hazard.id}
                  style={{
                    height: hazard.height,
                    left: at.x,
                    top: hazard.y,
                    width: hazard.width,
                  }}
                >
                  <span>{hazard.label}</span>
                </div>
              );
            },
          )}

          <div
            className="ar-flag"
            style={{ height: FLAG.height, left: FLAG.x, top: FLAG.y, width: FLAG.width }}
          >
            <span className="ar-flag__cloth" />
            <span className="ar-flag__label">OFFER</span>
          </div>

          <div
            className="ar-player"
            style={{
              height: PLAYER_SIZE.height,
              left: game.x,
              top: game.y,
              width: PLAYER_SIZE.width,
            }}
          >
            <PixelCanvas
              artHeight={EDWARD_ART_SIZE.height}
              artWidth={EDWARD_ART_SIZE.width}
              draw={drawEdward}
              flipX={game.facing === "left"}
              frame={getWalkFrame(game.x, 2, game.grounded && Math.abs(game.vx) > 0)}
              unit={2}
            />
          </div>
        </div>
        </div>

        <div className="ar-hud">
          <span>COFFEE {"☕".repeat(Math.max(0, game.coffees))}</span>
          <span>
            COMMITS {game.commits}/{summary.totalCommits}
          </span>
          <span>
            BUGS {summary.bugsClosed}/{summary.totalBugs}
          </span>
        </div>

        {game.banner ? <p className="ar-banner">{game.banner}</p> : null}
        {game.phase === "READY" ? (
          <p className="ar-start">MOVE TO START · ← → OR A D · SPACE TO JUMP</p>
        ) : null}
      </div>

      {phase === "FLOOR" ? (
        <div className="loc-beat ar-prompt">
          <p className="loc-beat__text">
            {nearCabinet ? "SOONPERMARIO · E TO PLAY" : "WALK TO THE CABINET · A D"}
          </p>
          <button
            className="loc-button loc-button--primary"
            disabled={!nearCabinet}
            onClick={startPlaying}
            ref={playRef}
            type="button"
          >
            [ E · PLAY ]
          </button>
        </div>
      ) : null}

      {phase === "PLAYING" ? (
        <div className="ar-controls">
          <button className="ar-control" type="button" {...bind("left")}>
            ←
          </button>
          <button className="ar-control" type="button" {...bind("action")}>
            JUMP
          </button>
          <button className="ar-control" type="button" {...bind("right")}>
            →
          </button>
        </div>
      ) : null}

      {phase === "DONE" ? (
        <ProjectSummary
          firstActionRef={summaryRef}
          flow={PRODUCT_FLOW}
          onExit={onExit}
          onReplay={replay}
          projectId="soonpermario"
          replayLabel="PLAY AGAIN"
          role="PLAYABLE EXPERIMENT"
          wordmark="SOONPERMARIO"
        >
          <p className="ar-result">
            <span>{summary.finished ? "OFFER EXTENDED" : "OUT OF COFFEE"}</span>
            <span className="ar-result__stat">
              {summary.commits}/{summary.totalCommits} COMMITS
            </span>
            <span className="ar-result__stat">
              {summary.bugsClosed}/{summary.totalBugs} BUGS CLOSED
            </span>
            <span className="ar-result__stat">{summary.seconds.toFixed(1)}s</span>
          </p>
          <p className="ar-note">
            One segment of a much longer game: the full version walks Edward
            through his own timeline, and every collectible is a commit.
          </p>
        </ProjectSummary>
      ) : null}
    </section>
  );
}
