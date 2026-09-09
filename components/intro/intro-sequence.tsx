"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TitleScreen } from "@/components/title/title-screen";
import { PixelCanvas } from "@/components/world/pixel-canvas";
import {
  getIntroStageDuration,
  INTRO_STAGE_TIMINGS,
  isShrineStage,
  isTimedIntroStage,
  MONOLITH_PHASE,
  nextIntroStage,
  PAN_OFFSET,
} from "@/lib/game/intro-machine";
import {
  applyText,
  consumesKey,
  createNameGateState,
  NAME_TEXT,
  pressKey,
  SOCKET_COUNT,
  type NameGateState,
} from "@/lib/game/name-gate";
import { PIXEL_UNIT } from "@/lib/game/terrain";
import { driveValue } from "@/lib/motion/intro-choreography";
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
 * How long a wrong letter leaves its socket dark.
 *
 * The gate records only *that* a letter missed and where; the duration of the
 * flash is presentation, so it lives here rather than in the state module or
 * in the art's frame counter.
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
  const [lifted, setLifted] = useState(0);
  const [gate, setGate] = useState(createNameGateState);
  const [flash, setFlash] = useState<MissFlash | null>(null);
  const bloomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // The camera east. Under reduced motion there is no travel to animate: the
  // camera is simply already there, which the render below reads straight off.
  useEffect(() => {
    if (stage !== "PAN" || reduced) return;
    const pan = driveValue(setPanOffset, {
      to: PAN_OFFSET,
      duration: INTRO_STAGE_TIMINGS.PAN,
      ease: "inOutSine",
    });
    return () => pan.cancel();
  }, [reduced, stage]);

  // The letters leaving the stone, one after another.
  useEffect(() => {
    if (stage !== "SELECTION" || reduced) return;
    const selection = driveValue(setLifted, {
      to: SOCKET_COUNT,
      duration: INTRO_STAGE_TIMINGS.SELECTION,
      ease: "inOutQuad",
    });
    return () => selection.cancel();
  }, [reduced, stage]);

  /**
   * Everything the gate accepts lands here, from the input and from the
   * keyboard bridge alike, so the two can never disagree.
   */
  const commit = useCallback(
    (previous: NameGateState, next: NameGateState) => {
      if (next === previous) return;
      setGate(next);

      // The input is uncontrolled on purpose: a refused letter has to be taken
      // back out of the DOM even when React sees no state change.
      const input = inputRef.current;
      if (input && input.value !== next.text) input.value = next.text;

      if (next.misses > previous.misses && next.missAt !== null) {
        setFlash({ socket: next.missAt, misses: next.misses });
      }
      // The door is the completion, so proving the name advances the frame.
      if (next.solved) setStage("UNLOCK");
    },
    [],
  );

  const handleInput = useCallback(
    (event: React.FormEvent<HTMLInputElement>) => {
      commit(gate, applyText(gate, event.currentTarget.value));
    },
    [commit, gate],
  );

  // Desktop visitors should be able to type the moment the stone asks.
  useEffect(() => {
    if (stage !== "TYPING") return;
    inputRef.current?.focus({ preventScroll: true });
  }, [stage]);

  /**
   * Typing that misses the input — because focus moved to a skip button, or
   * anywhere else — is caught and replayed through the same reducer, and pulls
   * focus back. Losing the keyboard mid-ritual then heals on the next letter
   * rather than leaving a gate that silently ignores everything.
   */
  useEffect(() => {
    if (stage !== "TYPING") return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.target === inputRef.current) return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.isComposing) return;
      if (!consumesKey(event.key)) return;
      event.preventDefault();
      inputRef.current?.focus({ preventScroll: true });
      commit(gate, pressKey(gate, event.key));
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commit, gate, stage]);

  // Escape leaves the ritual at any point in it, which is what the board asks
  // for — not only once the gate is asking a question.
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onComplete();
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onComplete]);

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
  const liftedCount = reduced ? SOCKET_COUNT : lifted;

  const drawClearing = useCallback<ArtRoutine>(
    (raster, f) => {
      if (phase === null) return;
      drawShrine(raster, f, phase, typed, missAt, liftedCount);
    },
    [liftedCount, missAt, phase, typed],
  );

  if (stage === "TITLE") {
    return <TitleScreen onEnter={() => setStage("PAN")} onOpenIndex={onOpenIndex} />;
  }

  const panning = stage === "PAN";
  const asking = stage === "TYPING";

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

        {/*
          The inscription slab's tap target, and a real text input — so a phone
          raises its own keyboard on a tap, and a screen reader is told what is
          being asked. It carries no visible chrome of its own: the letters the
          visitor types appear in the carved sockets behind it, which is the
          whole point of a slab rather than a form field.
        */}
        {asking ? (
          <input
            aria-label={`Type the name to enter: ${NAME_TEXT}`}
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            className="intro-inscription"
            defaultValue=""
            enterKeyHint="go"
            inputMode="text"
            onInput={handleInput}
            ref={inputRef}
            spellCheck={false}
            type="text"
          />
        ) : null}

        <div className="intro-bloom" ref={bloomRef} />

        <div className="intro-actions">
          <button className="intro-skip" onClick={onComplete} type="button">
            {asking ? "SKIP GATE (ESC) →" : "SKIP INTRO →"}
          </button>
          <button
            className="intro-skip intro-skip--quiet"
            onClick={onOpenIndex}
            type="button"
          >
            VIEW PROJECTS
          </button>
        </div>
      </div>

      <p aria-live="polite" className="loc-announcer">
        {asking
          ? `Type the name to enter: ${NAME_TEXT}. ${typed} of ${SOCKET_COUNT} letters set.`
          : stage === "UNLOCK"
            ? "The name is proven. The stone opens."
            : "Opening sequence"}
      </p>
    </main>
  );
}
