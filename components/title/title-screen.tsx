"use client";

import { useEffect } from "react";
import { PixelCanvas } from "@/components/world/pixel-canvas";
import { buildings } from "@/data/world";
import { PIXEL_UNIT } from "@/lib/game/terrain";
import { BACKDROP_ART_SIZE, drawBackdrop } from "@/lib/pixel/backdrop";
import { buildingArt } from "@/lib/pixel/buildings";

interface TitleScreenProps {
  onEnter: () => void;
  onOpenIndex: () => void;
}

/**
 * How far into the world the title screen looks.
 *
 * Zero puts the sign, Edward's House, TOMODACHI and the start of the Wardrobe
 * in frame — the world is already visible, which is the whole idea. The title
 * sits on top of it rather than in front of a separate illustration.
 */
const TITLE_CAMERA_X = 0;

/** The buildings that fall inside that view. */
const VISIBLE = new Set(["edwards-house", "wardrobe"]);

export function TitleScreen({ onEnter, onOpenIndex }: TitleScreenProps) {
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
    <main className="title-screen">
      <div aria-hidden="true" className="title-scene">
        <div
          className="title-track"
          style={{ transform: `translate3d(${-TITLE_CAMERA_X}px, 0, 0)` }}
        >
          <PixelCanvas
            artHeight={BACKDROP_ART_SIZE.height}
            artWidth={BACKDROP_ART_SIZE.width}
            className="title-backdrop"
            draw={drawBackdrop}
            frame={0}
            unit={PIXEL_UNIT}
          />
          {buildings
            .filter((building) => VISIBLE.has(building.id))
            .map((building) => {
              const art = buildingArt[building.id];
              return (
                <div
                  className="title-building"
                  key={building.id}
                  style={{
                    height: building.size.height,
                    left: building.position.x,
                    top: building.position.y,
                    width: building.size.width,
                  }}
                >
                  <PixelCanvas
                    artHeight={art.size.height}
                    artWidth={art.size.width}
                    draw={art.draw}
                    frame={0}
                    unit={PIXEL_UNIT}
                  />
                </div>
              );
            })}
        </div>
      </div>

      <div className="title-copy">
        <p className="title-welcome">WELCOME TO</p>
        <h1 className="title-wordmark">
          EDWARD HWANG&apos;S
          <br />
          WORLD
        </h1>
        <p className="title-place">SYDNEY, AU — 2026</p>
      </div>

      <button className="title-enter" onClick={onEnter} type="button">
        [ PRESS ENTER ]
      </button>

      <button className="title-skip" onClick={onOpenIndex} type="button">
        SKIP TO INDEX →
      </button>
    </main>
  );
}
