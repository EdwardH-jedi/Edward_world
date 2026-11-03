"use client";

import { useCallback, useEffect } from "react";
import { PixelCanvas } from "@/components/world/pixel-canvas";
import { usePixelUnit } from "@/lib/motion/use-pixel-unit";
import { useAmbientFrame } from "@/lib/motion/use-ambient-frame";
import { APPROACH_ART_SIZE, drawApproach } from "@/lib/pixel/monolith";
import type { ArtRoutine } from "@/lib/pixel/raster";

interface TitleScreenProps {
  onEnter: () => void;
  onOpenIndex: () => void;
}

/**
 * Every word on the title, in one place.
 *
 * The purpose line and the call to action come in pairs, and both halves are
 * always in the markup: CSS shows the one that fits (the short purpose line
 * at 480px and narrower, TAP TO START on a device with no hover and a coarse
 * pointer). Deciding in CSS rather than in a hook means the server and the
 * first client render are the same markup, so there is nothing to mismatch on
 * hydration and no flash of the wrong prompt.
 */
const TITLE_COPY = {
  welcome: "WELCOME TO",
  purpose: {
    long: "A software and AI portfolio you can explore.",
    short: "A software and AI portfolio.",
  },
  enter: {
    keys: "[ PRESS ENTER ]",
    touch: "[ TAP TO START ]",
  },
  skip: "VIEW PROJECTS →",
} as const;

/**
 * The title screen, with the monument still off-screen.
 *
 * The visitor meets the place before it asks anything of them: harbour,
 * terraces, park, framing canopy, first stars. The only sign that something
 * else exists is a faint warm glow past the right treeline, which is drawn by
 * the scene itself at camera offset zero. Enter, a click or a tap anywhere
 * starts the pan east.
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

  // The whole screen is the Start button for a pointer, the way Enter is for
  // a keyboard. Its own controls answer their own clicks: PRESS ENTER already
  // starts the world, and VIEW PROJECTS must open the index, not also start
  // the pan. The HUD is mounted outside this element, so its taps never
  // arrive here.
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (event.target instanceof Element && event.target.closest("button")) return;
      onEnter();
    },
    [onEnter],
  );

  return (
    <main
      className="title-screen"
      onClick={handleClick}
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
          <p className="title-welcome">{TITLE_COPY.welcome}</p>
          <h1 className="title-wordmark">
            EDWARD HWANG&apos;S
            <br />
            WORLD
          </h1>
          {/* The hidden half is display:none, so it is not read out either. */}
          <p className="title-purpose">
            <span className="title-purpose__long">{TITLE_COPY.purpose.long}</span>
            <span className="title-purpose__short">{TITLE_COPY.purpose.short}</span>
          </p>
        </div>

        {/* Blinks on the ambient tick, like the rest of the scene. */}
        <button
          className="title-enter"
          data-lit={frame % 2 === 0}
          onClick={onEnter}
          type="button"
        >
          <span className="title-enter__keys">{TITLE_COPY.enter.keys}</span>
          <span className="title-enter__touch">{TITLE_COPY.enter.touch}</span>
        </button>

        <button className="title-skip" onClick={onOpenIndex} type="button">
          {TITLE_COPY.skip}
        </button>
      </div>
    </main>
  );
}
