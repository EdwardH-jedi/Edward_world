"use client";

import "./chart.css";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { CaptainsLog } from "@/components/chart/captains-log";
import { IslandScene } from "@/components/chart/island-scene";
import { LandingsPanel } from "@/components/chart/landings-panel";
import { PlaceCard } from "@/components/chart/place-card";
import { EXPERIENCE_PROJECTS, HouseExperience, ProjectExperience } from "@/components/experience-scenes";
import { SceneDissolve } from "@/components/world/scene-dissolve";
import { ISLAND_PLANS } from "@/data/islands";
import { getProjectById } from "@/data/projects";
import {
  BOTTLES,
  CARTOUCHE,
  getLanding,
  HOME_LANDING,
  LANDINGS,
  ROSE,
  SEA_NAMES,
  SERPENT,
  SHEET,
} from "@/data/chart";
import {
  bearingMarker,
  cameraTarget,
  fitScale,
  screenToChart,
  stepView,
  UNITS_PER_MILE,
  viewOrigin,
  type Screen,
  type View,
} from "@/lib/game/chart/camera";
import { bottlesInReach, nearestAnchorage } from "@/lib/game/chart/docking";
import { prepareIsland } from "@/lib/game/chart/island-walk";
import {
  ageRipples,
  boatAt,
  extendCourse,
  rippleBehind,
  RIPPLE_EVERY,
  RIPPLE_MIN_SPEED,
  speedOf,
  steer,
  stepBoat,
  type Boat,
  type Ripple,
} from "@/lib/game/chart/sailing";
import { buildChartScene, type ChartScene } from "@/lib/game/chart/scene";
import { INITIAL_VOYAGE, isAshore, voyageReducer } from "@/lib/game/chart/voyage-machine";
import { setChartFonts, type ChartFonts } from "@/lib/chart-art/ink";
import { createChartArt, drawChart, type ChartArt } from "@/lib/chart-art/render";
import { paperLayer, paperOffset } from "@/lib/chart-art/sheet";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import type { LandingCard as CardContent, LandingId, Place, Vec } from "@/types/chart";
import type { PortfolioProjectId } from "@/types/portfolio";
import type { WorldLocationId } from "@/types/world";

/** Arrow keys and WASD, as a unit step each. */
const MOVE: Readonly<Record<string, readonly [number, number]>> = {
  arrowleft: [-1, 0],
  a: [-1, 0],
  arrowright: [1, 0],
  d: [1, 0],
  arrowup: [0, -1],
  w: [0, -1],
  arrowdown: [0, 1],
  s: [0, 1],
};

/** How long a bottle's message stays up, in milliseconds. */
const TOAST_MS = 6_500;

/** The live simulation. Held in a ref: the frame loop drives it, React only hears about changes. */
interface Voyage {
  readonly scene: ChartScene;
  readonly art: ChartArt;
  boat: Boat;
  view: View;
  screen: Screen;
  dpr: number;
  course: (readonly Vec[])[];
  ripples: Ripple[];
  rippleClock: number;
  keys: Set<string>;
  /** A held pointer, in canvas CSS pixels. */
  steer: Vec | null;
  near: LandingId | null;
  found: Set<string>;
}

interface Toast {
  readonly eyebrow: string;
  readonly text: string;
  readonly id: number;
}

function keyVector(keys: ReadonlySet<string>): Vec {
  let x = 0;
  let y = 0;
  for (const key of keys) {
    x += MOVE[key][0];
    y += MOVE[key][1];
  }
  return { x, y };
}

function isControl(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.tagName === "BUTTON" || target.tagName === "A");
}

type Interior =
  | { readonly kind: "card"; readonly card: CardContent }
  | { readonly kind: "scene"; readonly projectId?: PortfolioProjectId; readonly locationId?: WorldLocationId };

/**
 * What a place opens. Project interiors and Edward's House open through the
 * same lazy scenes the town uses; a project without an interior, and every
 * OPEN_CARD place, opens a paper card.
 */
function interiorFor(place: Place): Interior | null {
  const { action } = place;
  if (action.type === "OPEN_LOCATION") return { kind: "scene", locationId: action.locationId };
  if (action.type === "OPEN_PROJECT") {
    if (EXPERIENCE_PROJECTS.has(action.projectId)) return { kind: "scene", projectId: action.projectId };
    const project = getProjectById(action.projectId);
    if (!project) return null;
    return {
      kind: "card",
      card: {
        eyebrow: project.category,
        heading: project.displayName,
        lede: project.shortDescriptor,
        lines: project.framingNote ? [project.framingNote] : [],
        stack: project.techStack ?? [],
        links: [{ label: "Case study", href: project.caseStudyUrl, external: false }],
      },
    };
  }
  if (action.type === "OPEN_CARD") {
    return {
      kind: "card",
      card: { eyebrow: "", heading: action.heading, lede: "", lines: action.body, stack: [], links: action.links ?? [] },
    };
  }
  return null;
}

export function ChartWorld({ fonts }: { fonts: ChartFonts }) {
  const [state, dispatch] = useReducer(voyageReducer, INITIAL_VOYAGE);
  const reduced = useReducedMotion();
  const [near, setNear] = useState<LandingId | null>(null);
  const [found, setFound] = useState(0);
  const [toast, setToast] = useState<Toast | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const islandCanvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef<HTMLDivElement>(null);
  const pointerArrowRef = useRef<HTMLSpanElement>(null);
  const pointerTextRef = useRef<HTMLSpanElement>(null);
  const voyageRef = useRef<Voyage | null>(null);
  const stateRef = useRef(state);
  const reducedRef = useRef(reduced);

  const charted = useMemo(() => new Set(state.charted), [state.charted]);
  const chartedRef = useRef(charted);

  // The loop and the key handlers read the latest state through refs.
  useEffect(() => {
    stateRef.current = state;
    chartedRef.current = charted;
    reducedRef.current = reduced;
  }, [state, charted, reduced]);

  // Any change of mode lets go of the helm, as the prototype did. Back at the
  // boat from an island there is no dialog to hand focus back, so the chart takes it.
  useEffect(() => {
    const voyage = voyageRef.current;
    if (voyage) {
      voyage.keys.clear();
      voyage.steer = null;
    }
    const focused = document.activeElement;
    if (state.mode === "CHART" && (!focused || focused === document.body)) {
      canvasRef.current?.focus({ preventScroll: true });
    }
  }, [state.mode]);

  // Build the chart once, on the client, and run the frame loop.
  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const g = canvas?.getContext("2d");
    if (!stage || !canvas || !g) return;

    setChartFonts(fonts);
    const scene = buildChartScene(LANDINGS, BOTTLES, SHEET, {
      seas: SEA_NAMES,
      rose: ROSE,
      cartouche: CARTOUCHE,
      serpent: SERPENT,
    });
    const home = scene.anchorages.find((a) => a.landing === HOME_LANDING)!.point;
    const screen = { width: stage.clientWidth, height: stage.clientHeight };
    const voyage: Voyage = {
      scene,
      art: createChartArt(scene),
      boat: boatAt(home),
      view: { k: fitScale(screen, SHEET), cx: SHEET.width / 2, cy: SHEET.height / 2 },
      screen,
      dpr: 1,
      course: [[home]],
      ripples: [],
      rippleClock: 0,
      keys: new Set(),
      steer: null,
      near: null,
      found: new Set(),
    };
    voyageRef.current = voyage;

    const paper = paperRef.current;
    if (paper) paper.style.backgroundImage = paperLayer(voyage.art.paper);
    let paperAt = "";
    const resize = () => {
      voyage.screen = { width: stage.clientWidth, height: stage.clientHeight };
      voyage.dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(voyage.screen.width * voyage.dpr);
      canvas.height = Math.round(voyage.screen.height * voyage.dpr);
      if (paper) paper.style.backgroundSize = `${256 / voyage.dpr}px`;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(stage);

    let frame = 0;
    let last = performance.now();
    const prepared = new Set<LandingId>();
    let drawn = "";
    // Text drawn before the faces arrive is in the fallback face; draw again once they have.
    void document.fonts?.ready.then(() => {
      drawn = "";
    });
    const idleHandles: number[] = [];
    // Safari has no requestIdleCallback; a short timeout does the same job there.
    const hasIdle = typeof window.requestIdleCallback === "function";
    const whenIdle = (work: () => void) => {
      idleHandles.push(hasIdle ? window.requestIdleCallback(work, { timeout: 1_000 }) : window.setTimeout(work, 50));
    };

    // While the captain's log is open the chart stands still, so that is when the
    // islands are prepared: home port first, one per idle slot. Once under way the
    // queue stops, so it never costs a sailing frame; arriving at an anchorage
    // still prepares that island before E is pressed.
    const queue = [HOME_LANDING, ...LANDINGS.map((l) => l.id).filter((id) => id !== HOME_LANDING)];
    const prepareNext = () => {
      if (stateRef.current.mode !== "LOG") return;
      const id = queue.find((candidate) => !prepared.has(candidate));
      if (!id) return;
      prepared.add(id);
      prepareIsland(getLanding(id), ISLAND_PLANS[id]);
      whenIdle(prepareNext);
    };
    whenIdle(prepareNext);

    const sail = (dt: number) => {
      const pointer = voyage.steer
        ? screenToChart(voyage.view, voyage.screen, voyage.steer.x, voyage.steer.y)
        : null;
      voyage.boat = stepBoat(scene.terrain, voyage.boat, steer(keyVector(voyage.keys), pointer, voyage.boat), dt);

      const run = voyage.course[voyage.course.length - 1];
      const next = extendCourse(run, voyage.boat);
      if (next !== run) voyage.course[voyage.course.length - 1] = next;

      voyage.rippleClock += dt;
      if (!reducedRef.current && speedOf(voyage.boat) > RIPPLE_MIN_SPEED && voyage.rippleClock > RIPPLE_EVERY) {
        voyage.rippleClock = 0;
        voyage.ripples.push(rippleBehind(voyage.boat));
      }

      const dock = nearestAnchorage(scene.anchorages, voyage.boat)?.landing ?? null;
      if (dock !== voyage.near) {
        voyage.near = dock;
        setNear(dock);
        if (dock && !prepared.has(dock)) {
          prepared.add(dock);
          const landing = getLanding(dock);
          whenIdle(() => prepareIsland(landing, ISLAND_PLANS[dock]));
        }
      }

      const picked = bottlesInReach(scene.bottles, voyage.boat, voyage.found);
      if (picked.length) {
        for (const id of picked) voyage.found.add(id);
        const bottle = scene.bottles.find((b) => b.id === picked[picked.length - 1])!;
        setFound(voyage.found.size);
        setToast({
          eyebrow: `Message in a bottle · ${voyage.found.size}/${scene.bottles.length}`,
          text: bottle.text,
          id: voyage.found.size,
        });
      }
    };

    const showBearing = (sailing: boolean) => {
      const pointer = pointerRef.current;
      if (!pointer) return;
      let goal: { point: Vec; landing: LandingId } | null = null;
      let distance = Infinity;
      if (sailing) {
        for (const a of scene.anchorages) {
          if (chartedRef.current.has(a.landing)) continue;
          const d = Math.hypot(a.point.x - voyage.boat.x, a.point.y - voyage.boat.y);
          if (d < distance) {
            distance = d;
            goal = a;
          }
        }
      }
      const marker = goal ? bearingMarker(voyage.view, voyage.screen, goal.point) : null;
      pointer.hidden = !marker;
      if (!marker || !goal) return;
      pointer.style.left = `${marker.left}px`;
      pointer.style.top = `${marker.top}px`;
      if (pointerArrowRef.current) pointerArrowRef.current.style.transform = `rotate(${marker.angle}rad)`;
      const text = `${getLanding(goal.landing).name}, ${Math.max(1, Math.round(distance / UNITS_PER_MILE))} nm`;
      if (pointerTextRef.current && pointerTextRef.current.textContent !== text) {
        pointerTextRef.current.textContent = text;
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1_000);
      last = now;
      const mode = stateRef.current.mode;
      // Ashore, the island scene covers the chart and runs its own loop.
      if (isAshore(stateRef.current)) {
        frame = requestAnimationFrame(tick);
        return;
      }
      if (mode === "CHART") sail(dt);
      if (voyage.ripples.length) voyage.ripples = ageRipples(voyage.ripples, dt);

      const target = cameraTarget(mode === "LOG" ? "sheet" : voyage.boat, voyage.screen, SHEET);
      voyage.view = stepView(voyage.view, target, dt, reducedRef.current);

      const origin = viewOrigin(voyage.view, voyage.screen);
      // Under reduced motion nothing moves on its own, so an unchanged frame is not redrawn.
      const still = [
        voyage.view.k, voyage.view.cx, voyage.view.cy, voyage.boat.x, voyage.boat.y, voyage.boat.facing,
        voyage.ripples.length, chartedRef.current.size, voyage.found.size, canvas.width, canvas.height, mode,
      ].join();
      if (reducedRef.current && still === drawn) {
        frame = requestAnimationFrame(tick);
        return;
      }
      drawn = still;
      drawChart(g, scene, voyage.art, {
        k: voyage.view.k * voyage.dpr,
        camX: origin.x,
        camY: origin.y,
        width: canvas.width,
        height: canvas.height,
        t: now / 1_000,
        reduced: reducedRef.current,
        overview: false,
        boat: voyage.boat,
        course: voyage.course,
        ripples: voyage.ripples,
        charted: chartedRef.current,
        found: voyage.found,
      });
      const at = paperOffset(origin.x, origin.y, voyage.view.k * voyage.dpr, voyage.dpr);
      if (paper && at !== paperAt) {
        paper.style.backgroundPosition = at;
        paperAt = at;
      }
      showBearing(mode === "CHART");
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      for (const handle of idleHandles) {
        if (hasIdle) window.cancelIdleCallback(handle);
        else window.clearTimeout(handle);
      }
      voyageRef.current = null;
    };
  }, [fonts]);

  // Keyboard: the helm while sailing, Enter on the log, M for the Landings panel.
  // Escape inside a dialog is handled once, by the dialog.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      const mode = stateRef.current.mode;
      const voyage = voyageRef.current;

      if (mode === "LOG") {
        if (key === "enter" && !isControl(event.target)) {
          event.preventDefault();
          dispatch({ type: "SET_SAIL" });
        }
        return;
      }
      if (mode === "ISLAND" || mode === "PLACE") return;
      if (mode === "LANDINGS") {
        if (key === "m") {
          event.preventDefault();
          dispatch({ type: "TOGGLE_LANDINGS" });
        }
        return;
      }
      if (mode !== "CHART" || !voyage) return;

      if (MOVE[key]) {
        voyage.keys.add(key);
        event.preventDefault();
        return;
      }
      // Held keys repeat; dropping anchor and the panel act once per press.
      if (event.repeat) return;
      if (key === "m") {
        event.preventDefault();
        dispatch({ type: "OPEN_LANDINGS" });
        return;
      }
      const anchorKey = key === "e" || ((key === "enter" || key === " ") && !isControl(event.target));
      if (anchorKey && voyage.near) {
        event.preventDefault();
        dispatch({ type: "DROP_ANCHOR", landing: voyage.near });
      }
    }
    function onKeyUp(event: KeyboardEvent) {
      voyageRef.current?.keys.delete(event.key.toLowerCase());
    }
    function letGo() {
      const voyage = voyageRef.current;
      if (!voyage) return;
      voyage.keys.clear();
      voyage.steer = null;
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", letGo);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", letGo);
    };
  }, []);

  // A bottle's message is a timed beat, not an animation.
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const setSail = useCallback(() => dispatch({ type: "SET_SAIL" }), []);
  const escape = useCallback(() => dispatch({ type: "ESCAPE" }), []);
  const leaveIsland = useCallback(() => dispatch({ type: "LEAVE_ISLAND" }), []);
  const leavePlace = useCallback(() => dispatch({ type: "LEAVE_PLACE" }), []);
  const enterPlace = useCallback((place: Place) => dispatch({ type: "ENTER_PLACE", place: place.id }), []);
  const openLandings = useCallback(() => dispatch({ type: "OPEN_LANDINGS" }), []);

  const sailTo = useCallback((landing: LandingId) => {
    const voyage = voyageRef.current;
    if (voyage) {
      const { point } = voyage.scene.anchorages.find((a) => a.landing === landing)!;
      voyage.boat = { ...voyage.boat, x: point.x, y: point.y, vx: 0, vy: 0 };
      voyage.course.push([point]);
      voyage.view = cameraTarget(voyage.boat, voyage.screen, SHEET);
    }
    dispatch({ type: "SAIL_TO", landing });
  }, []);

  const drawMap = useCallback((map: HTMLCanvasElement) => {
    const voyage = voyageRef.current;
    const g = map.getContext("2d");
    if (!voyage || !g) return;
    const k = map.width / (SHEET.width + 60);
    drawChart(g, voyage.scene, voyage.art, {
      k,
      camX: -30,
      camY: -30,
      width: map.width,
      height: map.height,
      t: 0,
      reduced: true,
      overview: true,
      boat: voyage.boat,
      course: [],
      ripples: [],
      charted: chartedRef.current,
      found: voyage.found,
    });
  }, []);

  const pointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const voyage = voyageRef.current;
    if (stateRef.current.mode !== "CHART" || !voyage) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    voyage.steer = { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY };
  };
  const pointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const voyage = voyageRef.current;
    if (voyage?.steer) voyage.steer = { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY };
  };
  const pointerUp = () => {
    if (voyageRef.current) voyageRef.current.steer = null;
  };

  const sailing = state.mode === "CHART";
  const nearLanding = sailing && near ? getLanding(near) : null;
  const ashore = isAshore(state) && state.landing ? getLanding(state.landing) : null;
  const plan = ashore ? ISLAND_PLANS[ashore.id] : null;
  const place = state.mode === "PLACE" && plan ? (plan.places.find((p) => p.id === state.place) ?? null) : null;
  const interior = place ? interiorFor(place) : null;

  return (
    <div className="chart-stage" ref={stageRef}>
      <div aria-hidden="true" className="chart-paper" ref={paperRef} />
      <canvas
        aria-label="A nautical chart of Edward's World. Sail the boat between its eight landings."
        className="chart-sea"
        onPointerCancel={pointerUp}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        ref={canvasRef}
        role="img"
        tabIndex={0}
      />
      <div aria-hidden="true" className="chart-vignette" />

      <p className="chart-hud chart-progress">
        Charted <i>{state.charted.length}</i>/{LANDINGS.length} · Bottles <i>{found}</i>/{BOTTLES.length}
      </p>
      <div className="chart-hud chart-actions">
        <button className="chart-btn" onClick={openLandings} type="button">
          Landings<kbd>M</kbd>
        </button>
        <Link className="chart-btn" href="/?view=index">
          Skip to index &rarr;
        </Link>
      </div>
      <p aria-live="polite" className="chart-sr">
        {nearLanding ? `Drop anchor at ${nearLanding.name}: press E.` : ""}
      </p>
      <div className="chart-hud chart-dock">
        {nearLanding ? (
          <button
            className="chart-btn chart-btn--primary chart-prompt"
            onClick={() => dispatch({ type: "DROP_ANCHOR", landing: nearLanding.id })}
            type="button"
          >
            Drop anchor at {nearLanding.name}
            <kbd>E</kbd>
          </button>
        ) : null}
        <p className="chart-hint">
          <span className="chart-hint__keys">
            WASD or arrow keys to sail, or hold the mouse on the water. E drops anchor. M lists the landings.
          </span>
          <span className="chart-hint__touch">Hold a finger on the water to sail toward it.</span>
        </p>
      </div>
      <div className="chart-hud chart-pointer" hidden ref={pointerRef}>
        <span className="chart-pointer__arrow" ref={pointerArrowRef} />
        <span ref={pointerTextRef} />
      </div>
      <div aria-live="polite" className="chart-hud chart-toast" hidden={!toast} role="status">
        {toast ? (
          <>
            <p className="chart-eyebrow">{toast.eyebrow}</p>
            <p className="chart-toast__text">{toast.text}</p>
          </>
        ) : null}
      </div>

      {state.mode === "LOG" ? <CaptainsLog onSetSail={setSail} returnFocusRef={canvasRef} /> : null}
      {ashore && plan ? (
        <IslandScene
          active={state.mode === "ISLAND"}
          canvasRef={islandCanvasRef}
          covered={interior?.kind === "scene"}
          key={ashore.id}
          landing={ashore}
          onEnter={enterPlace}
          onLandings={openLandings}
          onLeave={leaveIsland}
          plan={plan}
        />
      ) : null}
      {interior?.kind === "card" && ashore ? (
        <PlaceCard
          card={{ ...interior.card, eyebrow: interior.card.eyebrow || ashore.name }}
          leaveLabel="Back to the island"
          onLeave={leavePlace}
          returnFocusRef={islandCanvasRef}
        />
      ) : null}
      {interior?.kind === "scene" && interior.projectId ? (
        <ProjectExperience onExit={leavePlace} projectId={interior.projectId} />
      ) : null}
      {interior?.kind === "scene" && interior.locationId === "edwards-house" ? <HouseExperience onExit={leavePlace} /> : null}
      {interior?.kind === "scene" ? (
        <Link className="chart-btn chart-skip" href="/?view=index">
          Skip to index &rarr;
        </Link>
      ) : null}
      <SceneDissolve sceneKey={interior?.kind === "scene" ? `${ashore?.id}/${place?.id}` : "chart"} />
      {state.mode === "LANDINGS" ? (
        <LandingsPanel
          charted={state.charted}
          drawMap={drawMap}
          onClose={escape}
          onSail={sailTo}
          returnFocusRef={state.returnTo === "ISLAND" ? islandCanvasRef : canvasRef}
        />
      ) : null}
    </div>
  );
}
