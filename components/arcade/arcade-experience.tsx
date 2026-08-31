"use client";

import type { Timeline } from "animejs";
import { createTimeline } from "animejs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProjectSummary } from "@/components/locations/project-summary";
import { useMinigameInput } from "@/components/sportsgang/minigames/use-minigame-input";
import { PixelCanvas } from "@/components/world/pixel-canvas";
import {
  type FloorLayout,
  getFloorLayout,
  isAtCabinet,
} from "@/lib/game/arcade/arcade-floor";
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
  STARTING_COFFEES,
  type PlatformerState,
} from "@/lib/game/arcade/platformer";
import { getCameraX, movePlayerX } from "@/lib/game/movement";
import { PIXEL_UNIT } from "@/lib/game/terrain";
import { prefersReducedMotion } from "@/lib/motion/animate-element";
import {
  applyScreenProjection,
  measureScreenProjection,
} from "@/lib/motion/sportsgang-choreography";
import { useGameLoop } from "@/lib/motion/use-game-loop";
import { drawEdward, EDWARD_ART_SIZE, getWalkFrame } from "@/lib/pixel/characters";

interface ArcadeExperienceProps {
  onExit: () => void;
}

const PRODUCT_FLOW = ["MOVE", "JUMP", "CLOSE BUGS", "REACH THE OFFER"] as const;

const EDWARD_WIDTH = 48;

/** The playable viewport, in level units. */
const VIEW = { width: 640, height: LEVEL_HEIGHT } as const;

type ArcadePhase = "FLOOR" | "PLAYING" | "DONE";

export function ArcadeExperience({ onExit }: ArcadeExperienceProps) {
  const [phase, setPhase] = useState<ArcadePhase>("FLOOR");
  const [layout, setLayout] = useState<FloorLayout>(() => getFloorLayout(1_120));
  const [edwardX, setEdwardX] = useState(() => getFloorLayout(1_120).startX);
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
  /** Until Edward has been walked, a resize may reposition him freely. */
  const walkedRef = useRef(false);
  /**
   * How much of a level pixel one screen pixel is.
   *
   * Measured rather than expressed in CSS: `scale` takes a unitless number and
   * `calc(94vw / 640)` is a length, so the stylesheet's version of this was
   * silently invalid and the level rendered at 1:1, cropped to whatever fit.
   */
  const [stageScale, setStageScale] = useState(1);

  const { consume, bind } = useMinigameInput(phase !== "DONE", {
    captureActionKeys: phase === "PLAYING",
  });

  const nearCabinet = isAtCabinet(edwardX, layout);

  // The floor is however wide the viewport is, so the room is measured rather
  // than assumed. Without this the cabinet sits off the side of a phone.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    function apply() {
      const width = root?.clientWidth || window.innerWidth;
      const next = getFloorLayout(width);
      setLayout(next);
      setEdwardX((current) =>
        walkedRef.current
          ? Math.min(current, next.floorWidth - EDWARD_WIDTH / 2)
          : next.startX,
      );
    }

    apply();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", apply);
      return () => window.removeEventListener("resize", apply);
    }
    const observer = new ResizeObserver(apply);
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const screen = screenRef.current;
    if (!screen) return;

    function apply() {
      if (screen) setStageScale(screen.clientWidth / VIEW.width);
    }

    apply();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", apply);
      return () => window.removeEventListener("resize", apply);
    }
    const observer = new ResizeObserver(apply);
    observer.observe(screen);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    rootRef.current?.focus();
    return () => previousFocus?.focus();
  }, []);

  /** Stop the run without leaving the arcade: the summary is the ending. */
  const endRun = useCallback(() => setPhase("DONE"), []);

  // Escape means "back out of where I am". Mid-run that is the run, not the
  // room — the summary is what a finished visit is supposed to leave behind.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (phase === "PLAYING") endRun();
      else onExit();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [endRun, onExit, phase]);

  // Walking the floor reuses the world's own movement, so the arcade feels
  // like the same place rather than a separate app.
  useGameLoop(phase === "FLOOR", (delta) => {
    const input = consume();
    const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    setWalking(direction !== 0);
    if (direction === 0) return;
    walkedRef.current = true;
    setFacing(direction > 0 ? "right" : "left");
    setEdwardX((current) =>
      movePlayerX({
        currentX: current,
        direction: direction as 1 | -1,
        deltaSeconds: delta,
        speed: layout.walkSpeed,
        worldWidth: layout.floorWidth,
        playerWidth: EDWARD_WIDTH,
      }),
    );
  });

  useGameLoop(phase === "PLAYING", (delta) => {
    const next = advancePlatformer(gameRef.current, consume(), delta);
    gameRef.current = next;
    setGame(next);
  });

  useEffect(() => {
    if (game.phase !== "FINISHED" && game.phase !== "FAILED") return;

    const timeout = window.setTimeout(() => setPhase("DONE"), 900);
    return () => window.clearTimeout(timeout);
  }, [game.phase]);

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

  /** Straight back into the level: the machine resets and starts again. */
  const playAgain = useCallback(() => {
    setWalking(false);
    startPlaying();
  }, [startPlaying]);

  const summary = getRunSummary(game);
  const outcome = useMemo(() => {
    if (game.phase === "FINISHED") return "OFFER EXTENDED";
    if (game.phase === "FAILED") return "OUT OF COFFEE";
    return "RUN ENDED EARLY";
  }, [game.phase]);
  /** Rises by one each time a coffee is spent; keys the hit flash. */
  const hits = STARTING_COFFEES - game.coffees;
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
        <div className="ar-neighbours">
          <div className="ar-neighbour" data-slot="far-left" />
          <div className="ar-neighbour" data-slot="left" />
          <div className="ar-neighbour" data-slot="right" />
          <div className="ar-neighbour" data-slot="far-right" />
        </div>
        <div className="ar-spot" style={{ left: layout.cabinetX }} />
      </div>

      <button
        className="loc-exit"
        onClick={phase === "PLAYING" ? endRun : onExit}
        type="button"
      >
        {phase === "PLAYING" ? "ESC · END RUN" : "ESC · BACK TO WORLD"}
      </button>

      <p aria-live="polite" className="loc-announcer">
        {phase === "FLOOR"
          ? nearCabinet
            ? "At the Soonpermario cabinet. Press E to play."
            : "Walk to the Soonpermario cabinet."
          : phase === "PLAYING"
            ? "Playing Soonpermario"
            : `${outcome}. Soonpermario project summary.`}
      </p>

      {/* The cabinet on the arcade floor. */}
      <div
        aria-hidden="true"
        className="ar-cabinet"
        data-near={nearCabinet || undefined}
        style={{ left: layout.cabinetX }}
      >
        <div className="ar-cabinet__marquee">SOONPERMARIO</div>
        <div className="ar-cabinet__bezel">
          <div className="ar-cabinet__slot" ref={slotRef}>
            {/* Attract mode: the machine is playing to an empty room. */}
            <span className="ar-attract" />
            <span className="ar-attract__word">DEMO</span>
          </div>
        </div>
        <div className="ar-cabinet__panel">
          <span />
          <span />
        </div>
        <div className="ar-cabinet__plinth" />
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
        <div className="ar-stage" style={{ transform: `scale(${stageScale})` }}>
        {/* Scenery, at a third of the camera's speed. Depth for free: the
            same camera, one multiplier, no second simulation. */}
        <div
          aria-hidden="true"
          className="ar-far"
          style={{ transform: `translate3d(${-cameraX * 0.34}px, 0, 0)` }}
        >
          <span className="ar-far__horizon" />
          <span className="ar-far__racks" />
        </div>
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
              >
                {pickup.kind === "SKILL" ? <span>{pickup.label}</span> : null}
              </div>
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
                  <i className="ar-bug__eye" />
                  <i className="ar-bug__eye" />
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
            data-grounded={game.grounded || undefined}
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

        <div className="ar-scanlines" />
        {hits > 0 ? <div className="ar-hit" key={hits} /> : null}

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
          <div className="ar-prompt__row">
            <button
              aria-label="Walk left"
              className="ar-control ar-control--walk"
              type="button"
              {...bind("left")}
            >
              ←
            </button>
            <button
              className="loc-button loc-button--primary"
              disabled={!nearCabinet}
              onClick={startPlaying}
              ref={playRef}
              type="button"
            >
              [ E · PLAY ]
            </button>
            <button
              aria-label="Walk right"
              className="ar-control ar-control--walk"
              type="button"
              {...bind("right")}
            >
              →
            </button>
          </div>
        </div>
      ) : null}

      {phase === "PLAYING" ? (
        <div className="ar-controls">
          <button
            aria-label="Move left"
            className="ar-control"
            type="button"
            {...bind("left")}
          >
            ←
          </button>
          <button
            aria-label="Jump"
            className="ar-control"
            type="button"
            {...bind("action")}
          >
            JUMP
          </button>
          <button
            aria-label="Move right"
            className="ar-control"
            type="button"
            {...bind("right")}
          >
            →
          </button>
        </div>
      ) : null}

      {phase === "DONE" ? (
        <ProjectSummary
          caseStudyLabel="VIEW PROJECT"
          firstActionRef={summaryRef}
          flow={PRODUCT_FLOW}
          onExit={onExit}
          onReplay={playAgain}
          projectId="soonpermario"
          replayLabel="PLAY AGAIN"
          role="PLAYABLE EXPERIMENT"
          wordmark="SOONPERMARIO"
        >
          <p className="ar-result">
            <span>{outcome}</span>
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
