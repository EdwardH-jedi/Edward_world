"use client";

import { memo, useLayoutEffect, useRef, type RefObject } from "react";

/**
 * Snaps a chip to the unit grid.
 *
 * Text decides a chip's width, and glyph advances are not unit multiples, so a
 * chip centred on its object would otherwise land on a fractional pixel. The
 * width is rounded up to whole units, and to the same parity as the object's
 * width in units, so centring it on the object is a whole number of units
 * (`--chip-left`). Centring with `translateX(-50%)` instead would leave the
 * prompt on a half pixel, because the enter animation owns its transform.
 */
export function useUnitChipWidth(
  ref: RefObject<HTMLElement | null>,
  unit: number,
  anchorUnits: number,
  content: string,
  /** The object's left edge on screen and the viewport width, both in CSS px.
      Given only for the nearby object, whose chip must stay on screen. */
  screenLeft?: number,
  viewportWidth?: number,
) {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const snap = () => {
      element.style.width = "";
      // Layout width, not the bounding box: the prompt arrives mid-animation,
      // and a transform would shrink the rectangle being measured.
      const units = Math.ceil(element.offsetWidth / unit);
      const snapped = (units - anchorUnits) % 2 === 0 ? units : units + 1;
      element.style.width = `${snapped * unit}px`;
      let left = ((anchorUnits - snapped) / 2) * unit;
      if (screenLeft !== undefined && viewportWidth) {
        // Clamp into the visible strip, a unit in from each edge, in whole
        // units so the chip stays on the grid (screenLeft is a unit multiple).
        const min = Math.ceil((unit - screenLeft) / unit) * unit;
        const max =
          Math.floor((viewportWidth - unit * 2 - screenLeft - snapped * unit) / unit) * unit;
        left = Math.max(min, Math.min(max, left));
      }
      element.style.setProperty("--chip-left", `${left}px`);
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
  }, [ref, unit, anchorUnits, content, screenLeft, viewportWidth]);
}

interface WorldLabelProps {
  text: string;
  unit: number;
  /** The object's width in art pixels, which the chip is centred on. */
  anchorUnits: number;
  /** See `useUnitChipWidth`; only the nearby object passes these. */
  screenLeft?: number;
  viewportWidth?: number;
}

/** The name chip over an object. It is also the object's accessible name. */
export const WorldLabel = memo(function WorldLabel({
  text,
  unit,
  anchorUnits,
  screenLeft,
  viewportWidth,
}: WorldLabelProps) {
  const ref = useRef<HTMLSpanElement>(null);
  useUnitChipWidth(ref, unit, anchorUnits, text, screenLeft, viewportWidth);
  return (
    <span className="world-object__label" ref={ref}>
      {text}
    </span>
  );
});
