"use client";

import { useCallback, useEffect, useState } from "react";
import { TitleScreen } from "@/components/title/title-screen";
import { PixelCanvas } from "@/components/world/pixel-canvas";
import {
  getIntroStageDuration,
  INTRO_STAGE_TIMINGS,
  nextIntroStage,
  PAN_OFFSET,
} from "@/lib/game/intro-machine";
import { usePixelUnit } from "@/lib/game/use-pixel-unit";
import { driveValue } from "@/lib/motion/intro-choreography";
import { useAmbientFrame } from "@/lib/motion/use-ambient-frame";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import { APPROACH_ART_SIZE, drawApproach } from "@/lib/pixel/monolith";
import type { ArtRoutine } from "@/lib/pixel/raster";
import type { IntroStage } from "@/types/intro";

interface IntroSequenceProps {
  onComplete: () => void;
  onOpenIndex: () => void;
}

/**
 * TITLE → (Enter) → PAN → WORLD. The name gate is no longer on this path: it
 * lives on THE MONOLITH in Edward's House (`components/house/monolith-gate`).
 */
export function IntroSequence({ onComplete, onOpenIndex }: IntroSequenceProps) {
  const [stage, setStage] = useState<IntroStage>("TITLE");
  const [panOffset, setPanOffset] = useState(0);

  const reduced = useReducedMotion();
  const frame = useAmbientFrame(stage !== "TITLE");
  const unit = usePixelUnit();

  useEffect(() => {
    if (stage !== "PAN") return;

    const timeout = window.setTimeout(() => {
      if (nextIntroStage(stage) === "WORLD") onComplete();
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

  // Escape skips the pan; the world is one keypress away at every point.
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onComplete();
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onComplete]);

  const cameraOffset = reduced ? PAN_OFFSET : panOffset;
  const drawPan = useCallback<ArtRoutine>(
    (raster, f) => drawApproach(raster, f, cameraOffset),
    [cameraOffset],
  );

  if (stage === "TITLE") {
    return <TitleScreen onEnter={() => setStage("PAN")} onOpenIndex={onOpenIndex} />;
  }

  return (
    <main
      className="intro-screen"
      data-stage={stage}
      style={{ "--unit": `${unit}px` } as React.CSSProperties}
    >
      <div className="intro-stage">
        <PixelCanvas
          artHeight={APPROACH_ART_SIZE.height}
          artWidth={APPROACH_ART_SIZE.width}
          className="intro-scene"
          draw={drawPan}
          fill
          frame={frame}
          unit={unit}
        />

        <div className="intro-actions">
          <button className="intro-skip" onClick={onComplete} type="button">
            SKIP INTRO →
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
        Opening sequence
      </p>
    </main>
  );
}
