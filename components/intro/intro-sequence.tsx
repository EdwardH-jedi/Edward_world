"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TitleScreen } from "@/components/title/title-screen";
import { PixelCanvas } from "@/components/world/pixel-canvas";
import {
  getIntroStageDuration,
  getPanOffset,
  INTRO_STAGE_TIMINGS,
  isShrineStage,
  isTimedIntroStage,
  MONOLITH_PHASE,
  nextIntroStage,
  PAN_OFFSET,
} from "@/lib/game/intro-machine";
import {
  consumesKey,
  createNameGateState,
  NAME_TEXT,
  pressKey,
  SOCKET_COUNT,
} from "@/lib/game/name-gate";
import { PIXEL_UNIT } from "@/lib/game/terrain";
import { useAmbientFrame } from "@/lib/motion/use-ambient-frame";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import {
  APPROACH_ART_SIZE,
  drawApproach,
  drawShrine,
  SHRINE_ART_SIZE,
} from "@/lib/pixel/monolith";
import type { ArtRoutine } from "@/lib/pixel/raster";
import type { IntroStage } from "@/types/intro";

interface IntroSequenceProps {
  onComplete: () => void;
  onOpenIndex: () => void;
}

/**
 * How long a wrong key leaves its socket dark.
 *
 * The gate itself records only *that* a key missed and where; the duration of
 * the flash is presentation, so it lives here rather than in the state module
 * or in the art's frame counter.
 */
const MISS_FLASH_MS = 260;

interface MissFlash {
  readonly socket: number;
  /** Carried so a second miss on the same socket is a new object, and re-fires. */
  readonly misses: number;
}

export function IntroSequence({ onComplete, onOpenIndex }: IntroSequenceProps) {
  const [stage, setStage] = useState<IntroStage>("TITLE");
  const [panOffset, setPanOffset] = useState(0);
  const [gate, setGate] = useState(createNameGateState);
  const [flash, setFlash] = useState<MissFlash | null>(null);
  const bloomRef = useRef<HTMLDivElement>(null);

  const reduced = useReducedMotion();
  const frame = useAmbientFrame(stage !== "TITLE");

  // Stage progression is on timers — except the gate, which waits for a person.
  useEffect(() => {
    if (!isTimedIntroStage(stage)) return;

    const timeout = window.setTimeout(() => {
      const next = nextIntroStage(stage);
      if (next === "WORLD") onComplete();
      else setStage(next);
    }, getIntroStageDuration(stage, reduced));

    return () => window.clearTimeout(timeout);
  }, [onComplete, reduced, stage]);

  // The camera east. Its own loop rather than a tween, because the offset is
  // an argument to the art routine and not a style on an element.
  useEffect(() => {
    // Under reduced motion there is no travel to animate: the camera is
    // simply already there, which the render below reads straight off.
    if (stage !== "PAN" || reduced) return;

    const start = performance.now();
    let animationFrame = 0;

    function step(now: number) {
      const progress = (now - start) / INTRO_STAGE_TIMINGS.PAN;
      setPanOffset(getPanOffset(progress));
      if (progress < 1) animationFrame = requestAnimationFrame(step);
    }

    animationFrame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrame);
  }, [reduced, stage]);

  // Escape leaves the ritual at any point in it, which is what the board
  // asks for — not only once the gate is asking a question.
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onComplete();
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onComplete]);

  // The ritual's one interactive beat. Rebinding per keystroke is cheap and
  // keeps the handler reading from the gate it is actually answering.
  useEffect(() => {
    if (stage !== "TYPING") return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      // A focused button owns Enter and Space — and only those. Letting it
      // swallow everything would mean one stray Tab left the gate dead.
      if (
        document.activeElement instanceof HTMLButtonElement &&
        (event.key === "Enter" || event.key === " ")
      ) {
        return;
      }
      if (!consumesKey(event.key)) return;
      event.preventDefault();

      const next = pressKey(gate, event.key);
      if (next === gate) return;

      setGate(next);
      if (next.misses > gate.misses && next.missAt !== null) {
        setFlash({ socket: next.missAt, misses: next.misses });
      }
      // The door is the completion, so proving the name advances the frame.
      if (next.solved) setStage("UNLOCK");
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gate, onComplete, stage]);

  useEffect(() => {
    if (!flash) return;
    const timeout = window.setTimeout(() => setFlash(null), MISS_FLASH_MS);
    return () => window.clearTimeout(timeout);
  }, [flash]);

  // The light that carries the ritual into the world.
  useEffect(() => {
    if (stage !== "UNLOCK") return;
    const bloom = bloomRef.current;
    if (!bloom) return;

    let cancelled = false;
    const delay = reduced ? 0 : INTRO_STAGE_TIMINGS.UNLOCK * 0.45;
    const timeout = window.setTimeout(() => {
      if (!cancelled) bloom.dataset.open = "true";
    }, delay);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [reduced, stage]);

  const cameraOffset = reduced ? PAN_OFFSET : panOffset;
  const drawPan = useCallback<ArtRoutine>(
    (raster, f) => drawApproach(raster, f, cameraOffset),
    [cameraOffset],
  );

  const shrineStage = isShrineStage(stage) ? stage : null;
  const phase = shrineStage ? MONOLITH_PHASE[shrineStage] : null;
  const typed = gate.typed;
  const missAt = flash?.socket ?? null;

  const drawClearing = useCallback<ArtRoutine>(
    (raster, f) => {
      if (phase === null) return;
      drawShrine(raster, f, phase, typed, missAt);
    },
    [missAt, phase, typed],
  );

  if (stage === "TITLE") {
    return <TitleScreen onEnter={() => setStage("PAN")} onOpenIndex={onOpenIndex} />;
  }

  const panning = stage === "PAN";

  return (
    <main className="intro-screen" data-stage={stage}>
      <div className="intro-stage">
        {panning ? (
          <PixelCanvas
            artHeight={APPROACH_ART_SIZE.height}
            artWidth={APPROACH_ART_SIZE.width}
            className="intro-scene"
            draw={drawPan}
            fill
            frame={frame}
            unit={PIXEL_UNIT}
          />
        ) : (
          <PixelCanvas
            artHeight={SHRINE_ART_SIZE.height}
            artWidth={SHRINE_ART_SIZE.width}
            className="intro-scene"
            draw={drawClearing}
            fill
            frame={frame}
            unit={PIXEL_UNIT}
          />
        )}
        <div className="intro-bloom" ref={bloomRef} />

        <div className="intro-actions">
          <button className="intro-skip" onClick={onComplete} type="button">
            {stage === "TYPING" ? "SKIP GATE (ESC) →" : "SKIP INTRO →"}
          </button>
          <button
            className="intro-skip intro-skip--quiet"
            onClick={onOpenIndex}
            type="button"
          >
            SKIP TO INDEX
          </button>
        </div>
      </div>

      <p aria-live="polite" className="loc-announcer">
        {stage === "TYPING"
          ? `Type the name to enter: ${NAME_TEXT}. ${typed} of ${SOCKET_COUNT} letters set.`
          : stage === "UNLOCK"
            ? "The name is proven. The stone opens."
            : "Opening sequence"}
      </p>
    </main>
  );
}
