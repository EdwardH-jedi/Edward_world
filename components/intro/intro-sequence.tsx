"use client";

import { useEffect, useRef, useState } from "react";
import {
  INTRO_STAGE_TIMINGS,
  getIntroStageDuration,
  isTimedIntroStage,
  nextIntroStage,
} from "@/lib/game/intro-machine";
import { TitleScreen } from "@/components/title/title-screen";
import { animateElement, motionPresets } from "@/lib/motion/animate-element";
import type { IntroStage } from "@/types/intro";

interface IntroSequenceProps {
  onComplete: () => void;
  onOpenIndex: () => void;
}

export function IntroSequence({ onComplete, onOpenIndex }: IntroSequenceProps) {
  const [stage, setStage] = useState<IntroStage>("TITLE");
  const stageRef = useRef<HTMLDivElement>(null);
  const glyphRef = useRef<HTMLDivElement>(null);
  const doorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isTimedIntroStage(stage)) return;

    const timeout = window.setTimeout(() => {
      const next = nextIntroStage(stage);
      if (next === "WORLD") onComplete();
      else setStage(next);
    }, getIntroStageDuration(
      stage,
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    ));

    return () => window.clearTimeout(timeout);
  }, [onComplete, stage]);

  useEffect(() => {
    if (stage === "GLYPH_REVEAL" && glyphRef.current) {
      const animation = animateElement(glyphRef.current, motionPresets.glyphReveal, {
        duration: INTRO_STAGE_TIMINGS.GLYPH_REVEAL,
      });
      return () => {
        animation.cancel();
      };
    }

    if (stage === "DOOR_OPEN" && doorRef.current) {
      const animation = animateElement(doorRef.current, motionPresets.doorOpen, {
        duration: INTRO_STAGE_TIMINGS.DOOR_OPEN,
      });
      return () => {
        animation.cancel();
      };
    }

    if (stage !== "TITLE" && stageRef.current) {
      const animation = animateElement(stageRef.current, motionPresets.enter, {
        duration: 180,
      });
      return () => {
        animation.cancel();
      };
    }
  }, [stage]);

  if (stage === "TITLE") {
    return (
      <TitleScreen onEnter={() => setStage("APPROACH")} onOpenIndex={onOpenIndex} />
    );
  }

  return (
    <main className="intro-screen" data-stage={stage} ref={stageRef}>
      <p className="eyebrow">Intro sequence placeholder</p>
      <h1>{stage.replaceAll("_", " ")}</h1>
      <div aria-label={`Intro stage: ${stage}`} className="intro-stage">
        <div className="intro-avatar" aria-label="Avatar placeholder">
          AVATAR
        </div>
        <div className="intro-glyphs" ref={glyphRef}>
          GLYPHS
        </div>
        <div className="intro-door" ref={doorRef}>
          SEALED DOOR
        </div>
      </div>
      <div className="intro-actions">
        <button onClick={onOpenIndex} type="button">
          Skip to Index
        </button>
        <button onClick={onComplete} type="button">
          Skip Intro
        </button>
      </div>
    </main>
  );
}
