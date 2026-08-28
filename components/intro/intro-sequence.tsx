"use client";

import { createTimeline, utils } from "animejs";
import { useEffect, useRef, useState } from "react";
import { TitleScreen } from "@/components/title/title-screen";
import { PixelCanvas } from "@/components/world/pixel-canvas";
import {
  getIntroStageDuration,
  INTRO_STAGE_TIMINGS,
  isTimedIntroStage,
  nextIntroStage,
} from "@/lib/game/intro-machine";
import { PIXEL_UNIT } from "@/lib/game/terrain";
import { prefersReducedMotion } from "@/lib/motion/animate-element";
import { drawEdward, EDWARD_ART_SIZE, getWalkFrame } from "@/lib/pixel/characters";
import { GLYPH_ART_SIZE, GLYPH_WORD, glyphRoutines } from "@/lib/pixel/glyphs";
import { drawClearing, INTRO_ART_SIZE, SLOT_POSITIONS } from "@/lib/pixel/intro";
import type { IntroStage } from "@/types/intro";

interface IntroSequenceProps {
  onComplete: () => void;
  onOpenIndex: () => void;
}

/** Where each creature drifts in from, as fractions of the clearing. */
const SPAWNS: readonly { readonly x: number; readonly y: number }[] = [
  { x: 0.22, y: 0.30 },
  { x: 0.34, y: 0.17 },
  { x: 0.46, y: 0.38 },
  { x: 0.17, y: 0.52 },
  { x: 0.30, y: 0.62 },
  { x: 0.44, y: 0.22 },
];

/** Where they line up to spell the word, before locking in. */
const WORD_Y = 0.16;
const WORD_FROM = 0.30;
const WORD_TO = 0.70;

export function IntroSequence({ onComplete, onOpenIndex }: IntroSequenceProps) {
  const [stage, setStage] = useState<IntroStage>("TITLE");

  const edwardRef = useRef<HTMLDivElement>(null);
  const glyphRefs = useRef<(HTMLDivElement | null)[]>([]);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const doorRef = useRef<HTMLDivElement>(null);
  const bloomRef = useRef<HTMLDivElement>(null);

  // Stage progression is on timers, never on an animation callback.
  useEffect(() => {
    if (!isTimedIntroStage(stage)) return;

    const timeout = window.setTimeout(
      () => {
        const next = nextIntroStage(stage);
        if (next === "WORLD") onComplete();
        else setStage(next);
      },
      getIntroStageDuration(stage, prefersReducedMotion()),
    );

    return () => window.clearTimeout(timeout);
  }, [onComplete, stage]);

  // Choreography. Fired and forgotten; nothing waits on it.
  useEffect(() => {
    if (stage === "TITLE" || stage === "WORLD") return;

    const glyphs = glyphRefs.current.filter(Boolean) as HTMLDivElement[];
    const reduced = prefersReducedMotion();
    const timeline = createTimeline();

    if (stage === "APPROACH" && edwardRef.current) {
      timeline.add(edwardRef.current, {
        left: ["8%", "44%"],
        duration: reduced ? 1 : INTRO_STAGE_TIMINGS.APPROACH,
        ease: "inOutSine",
      });
    }

    if (stage === "GLYPH_REVEAL" && glyphs.length) {
      glyphs.forEach((glyph, index) => {
        const spawn = SPAWNS[index];
        utils.set(glyph, {
          left: `${spawn.x * 100}%`,
          top: `${spawn.y * 100}%`,
          opacity: 0,
          scale: 0.6,
        });
        timeline.add(
          glyph,
          {
            opacity: [0, 1],
            scale: [0.6, 1],
            duration: reduced ? 1 : 420,
            ease: "outBack",
          },
          reduced ? 0 : index * 90,
        );
      });
    }

    if (stage === "EDWARD_FORMATION" && glyphs.length) {
      // They assemble into the word, in reading order. The reveal's end state
      // is pinned first: each beat must be able to start from a known place
      // rather than trusting the previous tween to have landed.
      utils.set(glyphs, { opacity: 1, scale: 1 });
      glyphs.forEach((glyph, index) => {
        const span = WORD_TO - WORD_FROM;
        const x = WORD_FROM + (span * index) / (glyphs.length - 1);
        timeline.add(
          glyph,
          {
            left: `${x * 100}%`,
            top: `${WORD_Y * 100}%`,
            duration: reduced ? 1 : 640,
            ease: "inOutQuart",
          },
          reduced ? 0 : index * 60,
        );
      });
    }

    if (stage === "DOOR_UNLOCK" && glyphs.length) {
      // Each one locks into its carved slot, and the slot takes the light.
      utils.set(glyphs, { opacity: 1 });
      glyphs.forEach((glyph, index) => {
        const slot = SLOT_POSITIONS[index];
        timeline.add(
          glyph,
          {
            left: `${slot.x * 100}%`,
            top: `${slot.y * 100}%`,
            scale: [1, 0.42],
            opacity: [1, 0],
            duration: reduced ? 1 : 520,
            ease: "inQuad",
          },
          reduced ? 0 : index * 45,
        );
        const target = slotRefs.current[index];
        if (target) {
          timeline.add(
            target,
            { opacity: [0, 1], duration: reduced ? 1 : 260 },
            reduced ? 0 : index * 45 + 260,
          );
        }
      });
    }

    if (stage === "DOOR_OPEN") {
      if (doorRef.current) {
        timeline.add(doorRef.current, {
          scaleX: [1, 9],
          opacity: [1, 0.9],
          duration: reduced ? 1 : 760,
          ease: "inQuad",
        });
      }
      if (bloomRef.current) {
        timeline.add(
          bloomRef.current,
          { opacity: [0, 1], duration: reduced ? 1 : 620, ease: "inQuad" },
          reduced ? 0 : 420,
        );
      }
    }

    return () => {
      // Paused, never reverted. Every beat here hands its end state to the
      // next one — reverting would wipe the creatures back to invisible the
      // moment they finished arriving.
      timeline.pause();
    };
  }, [stage]);

  if (stage === "TITLE") {
    return (
      <TitleScreen onEnter={() => setStage("APPROACH")} onOpenIndex={onOpenIndex} />
    );
  }

  const walking = stage === "APPROACH";
  const showGlyphs = ["GLYPH_REVEAL", "EDWARD_FORMATION", "DOOR_UNLOCK"].includes(
    stage,
  );

  return (
    <main className="intro-screen" data-stage={stage}>
      <div className="intro-stage">
        <PixelCanvas
          artHeight={INTRO_ART_SIZE.height}
          artWidth={INTRO_ART_SIZE.width}
          className="intro-clearing"
          draw={drawClearing}
          fill
          frame={0}
          unit={PIXEL_UNIT}
        />

        {SLOT_POSITIONS.map((slot, index) => (
          <div
            className="intro-slot"
            key={`slot-${index}`}
            ref={(node) => {
              slotRefs.current[index] = node;
            }}
            style={{ left: `${slot.x * 100}%`, top: `${slot.y * 100}%` }}
          />
        ))}

        <div
          className="intro-edward"
          data-walking={walking || undefined}
          ref={edwardRef}
        >
          <PixelCanvas
            artHeight={EDWARD_ART_SIZE.height}
            artWidth={EDWARD_ART_SIZE.width}
            draw={drawEdward}
            frame={getWalkFrame(stage === "APPROACH" ? 40 : 0, PIXEL_UNIT, walking)}
            unit={PIXEL_UNIT}
          />
        </div>

        {showGlyphs
          ? glyphRoutines.map((routine, index) => (
              <div
                aria-hidden="true"
                className="intro-glyph"
                key={`glyph-${index}`}
                ref={(node) => {
                  glyphRefs.current[index] = node;
                }}
              >
                <PixelCanvas
                  artHeight={GLYPH_ART_SIZE.height}
                  artWidth={GLYPH_ART_SIZE.width}
                  draw={routine}
                  frame={0}
                  unit={PIXEL_UNIT}
                />
              </div>
            ))
          : null}

        <div className="intro-door" ref={doorRef} />
        <div className="intro-bloom" ref={bloomRef} />
      </div>

      <p aria-live="polite" className="loc-announcer">
        {stage === "EDWARD_FORMATION" || stage === "DOOR_UNLOCK"
          ? `The glyphs spell ${GLYPH_WORD}`
          : "Opening sequence"}
      </p>

      <div className="intro-actions">
        <button className="intro-skip" onClick={onComplete} type="button">
          SKIP INTRO →
        </button>
        <button className="intro-skip intro-skip--quiet" onClick={onOpenIndex} type="button">
          SKIP TO INDEX
        </button>
      </div>
    </main>
  );
}
