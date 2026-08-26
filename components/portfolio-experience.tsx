"use client";

import { useCallback, useState } from "react";
import { IntroSequence } from "@/components/intro/intro-sequence";
import { PortfolioIndex } from "@/components/index/portfolio-index";
import { InteractionDialog } from "@/components/world/interaction-dialog";
import { MainWorld } from "@/components/world/main-world";
import { WorldIndexControl } from "@/components/world/world-index-control";
import type { InteractionAction } from "@/types/world";

export function PortfolioExperience() {
  const [experience, setExperience] = useState<"intro" | "world">("intro");
  const [indexOpen, setIndexOpen] = useState(false);
  const [activeInteraction, setActiveInteraction] =
    useState<InteractionAction | null>(null);

  const showWorld = useCallback(() => {
    setIndexOpen(false);
    setActiveInteraction(null);
    setExperience("world");
  }, []);

  const showIndex = useCallback(() => {
    setActiveInteraction(null);
    setExperience("world");
    setIndexOpen(true);
  }, []);

  const closeIndex = useCallback(() => setIndexOpen(false), []);
  const closeInteraction = useCallback(() => setActiveInteraction(null), []);

  return (
    <div className="experience-shell">
      <WorldIndexControl
        activeView={indexOpen ? "index" : "world"}
        onShowIndex={showIndex}
        onShowWorld={showWorld}
      />
      {experience === "intro" ? (
        <IntroSequence onComplete={showWorld} onOpenIndex={showIndex} />
      ) : (
        <MainWorld
          disabled={indexOpen || activeInteraction !== null}
          onInteraction={setActiveInteraction}
        />
      )}
      {indexOpen ? <PortfolioIndex onClose={closeIndex} /> : null}
      {activeInteraction ? (
        <InteractionDialog action={activeInteraction} onClose={closeInteraction} />
      ) : null}
    </div>
  );
}
