"use client";

import { memo, useEffect, useRef } from "react";
import { useUnitChipWidth } from "@/components/world/world-label";
import { play } from "@/lib/audio/sfx";

/**
 * The proximity prompt that pops in over whatever the player is standing next
 * to. It mounts once per target, so the two-step pop (CSS) and the blip both
 * happen once per arrival.
 */
export const InteractionPrompt = memo(function InteractionPrompt({
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
    play("ui-blip");
  }, []);

  return (
    <span className="world-object__prompt" ref={promptRef}>
      {text}
    </span>
  );
});
