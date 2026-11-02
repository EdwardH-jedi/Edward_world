"use client";

import { memo, useCallback, useEffect, useRef } from "react";
import { useUnitChipWidth } from "@/components/world/world-label";
import {
  BUBBLE_GAP_UNITS,
  BUBBLE_TAIL_UNITS,
  type ChipPlacement,
  clearOf,
  placeTail,
  type UnitRect,
} from "@/lib/game/chip-layout";
import { play } from "@/lib/audio/sfx";
import { EDWARD_HEAD_COLUMN } from "@/lib/pixel/characters";

/** Unit rect of `element` in the track's space, with its one-unit offset shadow. */
function chipRect(element: Element, track: DOMRect, unit: number): UnitRect {
  const rect = element.getBoundingClientRect();
  return {
    left: Math.round((rect.left - track.left) / unit),
    top: Math.round((rect.top - track.top) / unit),
    width: Math.round(rect.width / unit) + 1,
    height: Math.round(rect.height / unit) + 1,
  };
}

/**
 * The proximity prompt, as a speech bubble over Edward's head. It mounts once
 * per target (the caller keys it), so the two-step pop (CSS) and the blip both
 * happen once per arrival.
 *
 * It is clamped onto the screen like every chip, its tail stays over his head
 * wherever the clamp puts it, and it never covers a name sign: where it would,
 * it lifts, whole units at a time, until it clears it. The sign never moves.
 */
export const InteractionPrompt = memo(function InteractionPrompt({
  text,
  unit,
  anchorUnits,
  facing,
  screenLeft,
  viewportWidth,
}: {
  text: string;
  unit: number;
  /** Edward's sprite width in art pixels, which the bubble is centred on. */
  anchorUnits: number;
  facing: "left" | "right";
  /** Keeps the bubble on screen; see `useUnitChipWidth`. */
  screenLeft: number;
  viewportWidth: number;
}) {
  const promptRef = useRef<HTMLSpanElement>(null);

  const anchor = useCallback(
    (element: HTMLElement, placement: ChipPlacement) => {
      const tail = placeTail(placement, EDWARD_HEAD_COLUMN[facing]);
      // The tail is three units wide (its fill and an outline either side),
      // positioned from the padding box, one unit in from the border. It
      // starts in the bubble's bottom border row and hangs two units below it.
      element.style.setProperty("--tail-left", `${(tail - 2) * unit}px`);

      // Measured in the track's space, where the player and every sign live.
      const player = element.parentElement;
      const track = element.closest(".world-track");
      if (!player || !track) return;
      const height = Math.round(element.offsetHeight / unit);
      const bubble: UnitRect = {
        left: Math.round(player.offsetLeft / unit) + placement.left,
        top:
          Math.round(player.offsetTop / unit) - BUBBLE_GAP_UNITS - BUBBLE_TAIL_UNITS - height,
        width: placement.width + 1,
        height: height + BUBBLE_TAIL_UNITS,
      };
      const trackRect = track.getBoundingClientRect();
      const signs = [...track.querySelectorAll(".world-object__label")].map((label) =>
        chipRect(label, trackRect, unit),
      );
      const lift = bubble.top - clearOf(bubble, signs);
      element.style.setProperty(
        "--rise",
        `${(BUBBLE_GAP_UNITS + BUBBLE_TAIL_UNITS + lift) * unit}px`,
      );
    },
    [facing, unit],
  );

  useUnitChipWidth(promptRef, unit, anchorUnits, text, screenLeft, viewportWidth, anchor);

  useEffect(() => {
    play("ui-blip");
  }, []);

  return (
    <span className="world-prompt" ref={promptRef}>
      {text}
      <span aria-hidden="true" className="world-prompt__tail" />
    </span>
  );
});
