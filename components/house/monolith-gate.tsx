"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PixelCanvas } from "@/components/world/pixel-canvas";
import {
  getShrineStageDuration,
  isTimedShrineStage,
  MONOLITH_PHASE,
  nextShrineStage,
  SHRINE_STAGE_TIMINGS,
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
import { usePixelUnit } from "@/lib/motion/use-pixel-unit";
import { driveValue } from "@/lib/motion/intro-choreography";
import { useAmbientFrame } from "@/lib/motion/use-ambient-frame";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import { drawShrine, SHRINE_ART_SIZE } from "@/lib/pixel/monolith";
import type { ArtRoutine } from "@/lib/pixel/raster";
import type { ShrineStage } from "@/types/intro";

interface MonolithGateProps {
  /** The stone has opened: the name was proven and the light has played out. */
  onSolved: () => void;
  /** The visitor left the ritual without proving the name. */
  onClose: () => void;
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

/**
 * The name gate, as THE MONOLITH in Edward's House runs it.
 *
 * The ritual that used to stand between the title and the world: the letters
 * pull free of the stone, assemble into the name, and the visitor types it back
 * into thirteen carved sockets.
 */
export function MonolithGate({ onSolved, onClose }: MonolithGateProps) {
  const [stage, setStage] = useState<ShrineStage>("SHRINE");
  const [lifted, setLifted] = useState(0);
  const [gate, setGate] = useState(createNameGateState);
  const [flash, setFlash] = useState<MissFlash | null>(null);
  const bloomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reduced = useReducedMotion();
  const frame = useAmbientFrame(true);
  const unit = usePixelUnit();

  // Stage progression is on timers — except the gate, which waits for a person.
  useEffect(() => {
    if (!isTimedShrineStage(stage)) return;

    const timeout = window.setTimeout(() => {
      const next = nextShrineStage(stage);
      if (next === null) onSolved();
      else setStage(next);
    }, getShrineStageDuration(stage, reduced));

    return () => window.clearTimeout(timeout);
  }, [onSolved, reduced, stage]);

  // The letters leaving the stone, one after another.
  useEffect(() => {
    if (stage !== "SELECTION" || reduced) return;
    const selection = driveValue(setLifted, {
      to: SOCKET_COUNT,
      duration: SHRINE_STAGE_TIMINGS.SELECTION,
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
  // for. It is caught in the capture phase and stopped there, so the room
  // behind the gate does not also hear it and send the visitor away.
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onClose();
    }

    window.addEventListener("keydown", handleEscape, true);
    return () => window.removeEventListener("keydown", handleEscape, true);
  }, [onClose]);

  useEffect(() => {
    if (!flash) return;
    const timeout = window.setTimeout(() => setFlash(null), MISS_FLASH_MS);
    return () => window.clearTimeout(timeout);
  }, [flash]);

  // The light that carries the ritual out of the stone.
  useEffect(() => {
    if (stage !== "UNLOCK") return;
    const bloom = bloomRef.current;
    if (!bloom) return;

    let cancelled = false;
    const delay = reduced ? 0 : SHRINE_STAGE_TIMINGS.UNLOCK * 0.45;
    const timeout = window.setTimeout(() => {
      if (!cancelled) bloom.dataset.open = "true";
    }, delay);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [reduced, stage]);

  const phase = MONOLITH_PHASE[stage];
  const typed = gate.typed;
  const missAt = flash?.socket ?? null;
  const liftedCount = reduced ? SOCKET_COUNT : lifted;

  const drawClearing = useCallback<ArtRoutine>(
    (raster, f) => drawShrine(raster, f, phase, typed, missAt, liftedCount),
    [liftedCount, missAt, phase, typed],
  );

  const asking = stage === "TYPING";

  return (
    <main
      aria-label="The monolith"
      className="intro-screen intro-screen--gate"
      data-stage={stage}
      style={{ "--unit": `${unit}px` } as React.CSSProperties}
    >
      <div className="intro-stage">
        <PixelCanvas
          artHeight={SHRINE_ART_SIZE.height}
          artWidth={SHRINE_ART_SIZE.width}
          className="intro-scene"
          draw={drawClearing}
          fill
          frame={frame}
          unit={unit}
        />

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
            // Shown only in the portrait layout, where the input is its own band.
            placeholder="TAP HERE TO TYPE THE NAME"
            ref={inputRef}
            spellCheck={false}
            type="text"
          />
        ) : null}

        <div className="intro-bloom" ref={bloomRef} />

        <div className="intro-actions">
          <button className="intro-skip" onClick={onClose} type="button">
            {asking ? "SKIP GATE (ESC) →" : "LEAVE THE STONE (ESC) →"}
          </button>
        </div>
      </div>

      <p aria-live="polite" className="loc-announcer">
        {asking
          ? `Type the name to enter: ${NAME_TEXT}. ${typed} of ${SOCKET_COUNT} letters set.`
          : stage === "UNLOCK"
            ? "The name is proven. The stone opens."
            : "The monolith stirs"}
      </p>
    </main>
  );
}
