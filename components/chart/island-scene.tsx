"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type RefObject } from "react";
import { getLandingCard } from "@/data/chart";
import { cameraTarget, screenToChart, stepView, viewOrigin, type Screen, type View } from "@/lib/game/chart/camera";
import { atJetty, groundFor, nearestDoor, stepWalker, walkerAt, type Walker } from "@/lib/game/chart/island-walk";
import { steer } from "@/lib/game/chart/sailing";
import { createIslandArt, drawIsland } from "@/lib/chart-art/island-plan";
import { paperLayer, paperOffset } from "@/lib/chart-art/sheet";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import type { IslandPlan, Landing, Place, Vec } from "@/types/chart";

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

type Near = { readonly kind: "place"; readonly place: Place } | { readonly kind: "jetty" } | null;

interface IslandSceneProps {
  landing: Landing;
  plan: IslandPlan;
  /** Edward answers the keys only while the island is the current state. */
  active: boolean;
  /** Whether anything is on screen above it that hides it entirely. */
  covered: boolean;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onLeave: () => void;
  onEnter: (place: Place) => void;
  onLandings: () => void;
}

const isControl = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.tagName === "BUTTON" || target.tagName === "A");

function promptFor(near: Near) {
  if (!near) return null;
  if (near.kind === "jetty") return "Back to the boat";
  const { place } = near;
  return place.action.type === "OPEN_CARD" ? `Read ${place.name}` : `Enter ${place.name}`;
}

/**
 * Ashore: the island's harbour plan, and Edward walking on it. Owns its own
 * frame loop while mounted; the chart's pauses underneath. Edward's position
 * survives a visit to a place, because the scene stays mounted beneath it.
 */
export function IslandScene({ landing, plan, active, covered, canvasRef, onLeave, onEnter, onLandings }: IslandSceneProps) {
  const reduced = useReducedMotion();
  const [near, setNear] = useState<Near>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const live = useRef({ active, covered, reduced, near: null as Near, onLeave, onEnter, onLandings });
  const keys = useRef(new Set<string>());
  const steerAt = useRef<Vec | null>(null);
  const walkerRef = useRef<Walker>(walkerAt(plan.jetty));
  const viewRef = useRef<View | null>(null);
  const screenRef = useRef<Screen>({ width: 1, height: 1 });

  useEffect(() => {
    live.current = { ...live.current, active, covered, reduced, onLeave, onEnter, onLandings };
    if (!active) {
      keys.current.clear();
      steerAt.current = null;
    }
  }, [active, covered, reduced, onLeave, onEnter, onLandings]);

  // Ashore, and back from a place: the plan takes focus unless something else already has it.
  useEffect(() => {
    if (!active) return;
    const focused = document.activeElement;
    if (!focused || focused === document.body || !focused.isConnected) {
      canvasRef.current?.focus({ preventScroll: true });
    }
  }, [active, canvasRef]);

  useEffect(() => {
    canvasRef.current?.focus({ preventScroll: true });
  }, [canvasRef]);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const g = canvas?.getContext("2d");
    if (!stage || !canvas || !g) return;
    const ground = groundFor(landing, plan);
    const art = createIslandArt(ground, plan, landing);
    const paper = paperRef.current;
    if (paper) paper.style.backgroundImage = paperLayer(art.paper);
    let paperAt = "";
    let drawn = "";
    void document.fonts?.ready.then(() => {
      drawn = "";
    });
    let dpr = 1;
    const resize = () => {
      screenRef.current = { width: stage.clientWidth, height: stage.clientHeight };
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(screenRef.current.width * dpr);
      canvas.height = Math.round(screenRef.current.height * dpr);
      if (paper) paper.style.backgroundSize = `${256 / dpr}px`;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    const focus = () => ({ ...walkerRef.current, vx: 0, vy: 0 });
    const bounds = { width: plan.size.x, height: plan.size.y };
    viewRef.current = cameraTarget(focus(), screenRef.current, bounds);

    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1_000);
      last = now;
      const state = live.current;
      if (state.active) {
        let kx = 0;
        let ky = 0;
        for (const key of keys.current) {
          kx += MOVE[key][0];
          ky += MOVE[key][1];
        }
        const pointer = steerAt.current
          ? screenToChart(viewRef.current!, screenRef.current, steerAt.current.x, steerAt.current.y)
          : null;
        walkerRef.current = stepWalker(ground, plan.places, walkerRef.current, steer({ x: kx, y: ky }, pointer, walkerRef.current), dt);
        const door = nearestDoor(plan.places, walkerRef.current);
        const next: Near = door ? { kind: "place", place: door } : atJetty(plan, walkerRef.current) ? { kind: "jetty" } : null;
        const changed =
          (next?.kind ?? null) !== (state.near?.kind ?? null) ||
          (next?.kind === "place" && state.near?.kind === "place" && next.place.id !== state.near.place.id);
        if (changed) {
          state.near = next;
          setNear(next);
        }
      }
      viewRef.current = stepView(viewRef.current!, cameraTarget(focus(), screenRef.current, bounds), dt, state.reduced);
      const nearId = state.near ? (state.near.kind === "jetty" ? "jetty" : state.near.place.id) : null;
      const view = viewRef.current;
      const still = [view.k, view.cx, view.cy, walkerRef.current.x, walkerRef.current.y, nearId, canvas.width, canvas.height].join();
      // Under reduced motion nothing moves on its own, so an unchanged frame is not redrawn.
      const skip = state.covered || (state.reduced && still === drawn);
      if (!skip) {
        drawn = still;
        const origin = viewOrigin(viewRef.current, screenRef.current);
        drawIsland(g, plan, landing, art, {
          k: viewRef.current.k * dpr,
          camX: origin.x,
          camY: origin.y,
          width: canvas.width,
          height: canvas.height,
          t: state.reduced ? 0 : now / 1_000,
          walker: walkerRef.current,
          near: nearId,
        });
        const at = paperOffset(origin.x, origin.y, viewRef.current.k * dpr, dpr);
        if (paper && at !== paperAt) {
          paper.style.backgroundPosition = at;
          paperAt = at;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [canvasRef, landing, plan]);

  useEffect(() => {
    function act() {
      const { near: current, onEnter: enter, onLeave: leave } = live.current;
      if (current?.kind === "place") enter(current.place);
      else if (current?.kind === "jetty") leave();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (!live.current.active || event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (MOVE[key]) {
        keys.current.add(key);
        event.preventDefault();
      } else if (event.repeat) {
        // A held E would go ashore and straight back: act once per press.
        return;
      } else if (key === "escape") {
        event.preventDefault();
        live.current.onLeave();
      } else if (key === "m") {
        event.preventDefault();
        live.current.onLandings();
      } else if (key === "e" || ((key === "enter" || key === " ") && !isControl(event.target))) {
        if (!live.current.near) return;
        event.preventDefault();
        act();
      }
    }
    function onKeyUp(event: KeyboardEvent) {
      keys.current.delete(event.key.toLowerCase());
    }
    function letGo() {
      keys.current.clear();
      steerAt.current = null;
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

  const card = getLandingCard(landing.id);
  const prompt = active ? promptFor(near) : null;
  const announcement = prompt ? `${prompt}: press E.` : "";

  return (
    <div className="chart-island" ref={stageRef}>
      <div aria-hidden="true" className="chart-paper" ref={paperRef} />
      <canvas
        aria-label={`A harbour plan of ${landing.name}. Walk to a door and press E.`}
        className="chart-sea"
        onPointerCancel={() => (steerAt.current = null)}
        onPointerDown={(event) => {
          if (!live.current.active) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          steerAt.current = { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY };
        }}
        onPointerMove={(event) => {
          if (steerAt.current) steerAt.current = { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY };
        }}
        onPointerUp={() => (steerAt.current = null)}
        ref={canvasRef}
        role="img"
        tabIndex={0}
      />
      <div aria-hidden="true" className="chart-vignette" />
      <div className="chart-hud chart-island__title">
        <p className="chart-eyebrow">Inset · {card.eyebrow}</p>
        <h2>{landing.name}</h2>
      </div>
      <div className="chart-hud chart-actions">
        <button className="chart-btn" onClick={() => live.current.onLandings()} type="button">
          Landings<kbd>M</kbd>
        </button>
        <button className="chart-btn" onClick={() => live.current.onLeave()} type="button">
          Back to the boat<kbd>Esc</kbd>
        </button>
        <Link className="chart-btn" href="/?view=index">
          Skip to index &rarr;
        </Link>
      </div>
      <p aria-live="polite" className="chart-sr">
        {announcement}
      </p>
      <div className="chart-hud chart-dock">
        {prompt ? (
          <button className="chart-btn chart-btn--primary chart-prompt" onClick={() => {
            const current = live.current.near;
            if (current?.kind === "place") live.current.onEnter(current.place);
            else if (current?.kind === "jetty") live.current.onLeave();
          }} type="button">
            {prompt}
            <kbd>E</kbd>
          </button>
        ) : null}
        <p className="chart-hint">
          <span className="chart-hint__keys">
            WASD or arrow keys to walk, or hold the mouse on the ground. E at a door goes in. Esc returns to the boat.
          </span>
          <span className="chart-hint__touch">Hold a finger on the ground to walk toward it.</span>
        </p>
      </div>
    </div>
  );
}
