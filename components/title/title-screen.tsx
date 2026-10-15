"use client";

import { useCallback, useEffect } from "react";
import { PixelCanvas } from "@/components/world/pixel-canvas";
import { usePixelUnit } from "@/lib/game/use-pixel-unit";
import { useAmbientFrame } from "@/lib/motion/use-ambient-frame";
import { APPROACH_ART_SIZE, drawApproach } from "@/lib/pixel/monolith";
import type { ArtRoutine } from "@/lib/pixel/raster";

interface TitleScreenProps {
  onEnter: () => void;
  onOpenIndex: () => void;
}

/**
 * The title screen, with the monument still off-screen.
 *
 * The visitor meets the place before it asks anything of them: harbour,
 * terraces, park, framing canopy, first stars. The only sign that something
 * else exists is a faint warm glow past the right treeline, which is drawn by
 * the scene itself at camera offset zero. ENTER starts the pan east.
 */
export function TitleScreen({ onEnter, onOpenIndex }: TitleScreenProps) {
  const frame = useAmbientFrame(true);
  const unit = usePixelUnit();

  // The camera has not moved yet, so the scene draws its title composition.
  const draw = useCallback<ArtRoutine>(
    (raster, f) => drawApproach(raster, f, 0),
    [],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Enter") return;
      // Let a focused control handle its own activation.
      if (document.activeElement instanceof HTMLButtonElement) return;
      event.preventDefault();
      onEnter();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onEnter]);

  return (
    <main
      className="title-screen"
      style={{ "--unit": `${unit}px` } as React.CSSProperties}
    >
      <div className="title-stage">
        <PixelCanvas
          artHeight={APPROACH_ART_SIZE.height}
          artWidth={APPROACH_ART_SIZE.width}
          className="title-scene"
          draw={draw}
          fill
          frame={frame}
          unit={unit}
        />

        <div className="title-copy">
          <p className="title-welcome">WELCOME TO</p>
          <h1 className="title-wordmark">
            EDWARD HWANG&apos;S
            <br />
            WORLD
          </h1>
          <p className="title-purpose">
            A software and AI portfolio you can explore.
          </p>
        </div>

        {/* Blinks on the ambient tick, like the rest of the scene. */}
        <button
          className="title-enter"
          data-lit={frame % 2 === 0}
          onClick={onEnter}
          type="button"
        >
          [ PRESS ENTER ]
        </button>

        <button className="title-skip" onClick={onOpenIndex} type="button">
          VIEW PROJECTS →
        </button>
      </div>
    </main>
  );
}
