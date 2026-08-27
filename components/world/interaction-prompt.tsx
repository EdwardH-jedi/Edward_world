"use client";

import { useEffect, useRef } from "react";
import { animateElement, motionPresets } from "@/lib/motion/animate-element";

/**
 * The proximity prompt that rises over whatever the player is standing next to.
 * Re-animates whenever the target changes so walking along the path reads as a
 * sequence of small arrivals.
 */
export function InteractionPrompt({ text }: { text: string }) {
  const promptRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (promptRef.current) {
      animateElement(promptRef.current, motionPresets.enter, { duration: 220 });
    }
  }, [text]);

  return (
    <span className="world-object__prompt" ref={promptRef}>
      {text}
    </span>
  );
}
