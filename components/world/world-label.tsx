"use client";

import { memo, useCallback, useLayoutEffect, useRef, type RefObject } from "react";
import { type ChipPlacement, placeChip } from "@/lib/game/chip-layout";
import { signDrop, stemFoot } from "@/lib/pixel/signage";

/**
 * Snaps a chip to the unit grid (see `placeChip`) and writes the result as
 * its width and `--chip-left`. `decorate` then gets the same placement, plus
 * the one it would have had centred, to place anything that hangs off it.
 */
export function useUnitChipWidth(
  ref: RefObject<HTMLElement | null>,
  unit: number,
  anchorUnits: number,
  content: string,
  /** The anchor's left edge on screen and the viewport width, both in CSS px.
      Given only for a chip that must stay on screen. */
  screenLeft?: number,
  viewportWidth?: number,
  decorate?: (element: HTMLElement, placement: ChipPlacement, centred: ChipPlacement) => void,
) {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const snap = () => {
      element.style.width = "";
      // Layout width, not the bounding box: the prompt arrives mid-animation,
      // and a transform would shrink the rectangle being measured.
      const naturalWidth = element.offsetWidth;
      const centred = placeChip({ naturalWidth, unit, anchorUnits });
      const placement = placeChip({ naturalWidth, unit, anchorUnits, screenLeft, viewportWidth });
      element.style.width = `${placement.width * unit}px`;
      element.style.setProperty("--chip-left", `${placement.left * unit}px`);
      decorate?.(element, placement, centred);
    };

    snap();
    // The bitmap face swaps in after first paint, which changes every width.
    let live = true;
    void document.fonts.ready.then(() => {
      if (live) snap();
    });
    return () => {
      live = false;
    };
  }, [ref, unit, anchorUnits, content, screenLeft, viewportWidth, decorate]);
}

interface WorldLabelProps {
  text: string;
  unit: number;
  /** The object's width in art pixels, which the chip is centred on. */
  anchorUnits: number;
  /** The first solid row of each column of the object's art (`topProfile`). */
  profile: readonly number[];
  /** See `useUnitChipWidth`; only the nearby object passes these. */
  screenLeft?: number;
  viewportWidth?: number;
}

/**
 * The name sign on an object. It is also the object's accessible name.
 *
 * It hangs a clear unit above the highest art under it (`--sign-drop`), and a
 * one-unit stem drops from its middle to the art below, so it reads as a sign
 * fixed to the building rather than a tooltip over it. Both are whole units.
 */
export const WorldLabel = memo(function WorldLabel({
  text,
  unit,
  anchorUnits,
  profile,
  screenLeft,
  viewportWidth,
}: WorldLabelProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const hang = useCallback(
    (element: HTMLElement, placement: ChipPlacement, centred: ChipPlacement) => {
      element.style.setProperty("--sign-drop", `${signDrop(profile, centred) * unit}px`);
      // The stem stands under the chip's middle column, in the object's columns.
      const middle = Math.floor((placement.width - 1) / 2);
      const foot = stemFoot(profile, placement.left + middle);
      element.style.setProperty("--stem-left", `${(middle - 1) * unit}px`);
      element.style.setProperty("--stem-foot", `${(foot ?? 0) * unit}px`);
      element.dataset.stem = foot === null ? "off" : "on";
    },
    [profile, unit],
  );
  useUnitChipWidth(ref, unit, anchorUnits, text, screenLeft, viewportWidth, hang);
  return (
    <span className="world-object__label" ref={ref}>
      {text}
      <span aria-hidden="true" className="world-object__stem" />
    </span>
  );
});
