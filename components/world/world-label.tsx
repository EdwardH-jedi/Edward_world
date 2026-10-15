"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";

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
      element.style.setProperty("--chip-left", `${((anchorUnits - snapped) / 2) * unit}px`);
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
  }, [ref, unit, anchorUnits, content]);
}

interface WorldLabelProps {
  text: string;
  unit: number;
  /** The object's width in art pixels, which the chip is centred on. */
  anchorUnits: number;
}

/** The name chip over an object. It is also the object's accessible name. */
export function WorldLabel({ text, unit, anchorUnits }: WorldLabelProps) {
  const ref = useRef<HTMLSpanElement>(null);
  useUnitChipWidth(ref, unit, anchorUnits, text);
  return (
    <span className="world-object__label" ref={ref}>
      {text}
    </span>
  );
}
