"use client";

import { useEffect, useRef } from "react";
import { useUnitChipWidth } from "@/components/world/world-label";
import { animateElement, motionPresets } from "@/lib/motion/animate-element";

/**
 * The proximity prompt that rises over whatever the player is standing next to.
 * Re-animates whenever the target changes so walking along the path reads as a
 * sequence of small arrivals.
 */
export function InteractionPrompt({
  text,
  unit,
  anchorUnits,
}: {
  text: string;
  unit: number;
  /** The object's width in art pixels, which the prompt is centred on. */
  anchorUnits: number;
}) {
  const promptRef = useRef<HTMLSpanElement>(null);
  useUnitChipWidth(promptRef, unit, anchorUnits, text);

  useEffect(() => {
    if (!promptRef.current) return;

    const animation = animateElement(promptRef.current, motionPresets.enter, {
      duration: 220,
    });
    return () => {
      animation.revert();
    };
  }, [text]);

  return (
    <span className="world-object__prompt" ref={promptRef}>
      {text}
    </span>
  );
}
