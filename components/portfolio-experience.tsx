"use client";

import { useCallback, useState } from "react";
import { IntroSequence } from "@/components/intro/intro-sequence";
import { AflExperience } from "@/components/afl/afl-experience";
import { ArcadeExperience } from "@/components/arcade/arcade-experience";
import { HouseExperience } from "@/components/house/house-experience";
import { PortfolioIndex } from "@/components/index/portfolio-index";
import { SportsgangExperience } from "@/components/sportsgang/sportsgang-experience";
import { WardrobeExperience } from "@/components/wardrobe/wardrobe-experience";
import { InteractionDialog } from "@/components/world/interaction-dialog";
import { MainWorld } from "@/components/world/main-world";
import { WorldIndexControl } from "@/components/world/world-index-control";
import type { PortfolioProjectId } from "@/types/portfolio";
import type { InteractionAction, WorldLocationId } from "@/types/world";

/**
 * Projects that open a full location experience instead of a summary dialog.
 * Everything not listed here keeps the existing dialog behaviour, so adding
 * the next one is a single entry rather than a change to this component.
 */
const EXPERIENCE_PROJECTS = new Set<PortfolioProjectId>([
  "sportsgang",
  "wardrobe",
  "afl-predict",
  "soonpermario",
]);

export function PortfolioExperience() {
  const [experience, setExperience] = useState<"intro" | "world">("intro");
  const [indexOpen, setIndexOpen] = useState(false);
  const [activeInteraction, setActiveInteraction] =
    useState<InteractionAction | null>(null);
  const [activeProjectExperience, setActiveProjectExperience] =
    useState<PortfolioProjectId | null>(null);
  const [activeLocation, setActiveLocation] = useState<WorldLocationId | null>(null);

  const showWorld = useCallback(() => {
    setIndexOpen(false);
    setActiveInteraction(null);
    setActiveProjectExperience(null);
    setActiveLocation(null);
    setExperience("world");
  }, []);

  const showIndex = useCallback(() => {
    setActiveInteraction(null);
    // The index is the recruiter's fast path; leaving a scripted sequence
    // running underneath it would only make returning ambiguous.
    setActiveProjectExperience(null);
    setActiveLocation(null);
    setExperience("world");
    setIndexOpen(true);
  }, []);

  const handleInteraction = useCallback((action: InteractionAction) => {
    if (action.type === "OPEN_PROJECT" && EXPERIENCE_PROJECTS.has(action.projectId)) {
      setActiveProjectExperience(action.projectId);
      return;
    }
    if (action.type === "OPEN_LOCATION") {
      setActiveLocation(action.locationId);
      return;
    }
    setActiveInteraction(action);
  }, []);

  const closeIndex = useCallback(() => setIndexOpen(false), []);
  const closeInteraction = useCallback(() => setActiveInteraction(null), []);
  const closeProjectExperience = useCallback(
    () => setActiveProjectExperience(null),
    [],
  );
  const closeLocation = useCallback(() => setActiveLocation(null), []);

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
          disabled={
            indexOpen ||
            activeInteraction !== null ||
            activeProjectExperience !== null ||
            activeLocation !== null
          }
          onInteraction={handleInteraction}
        />
      )}
      {activeProjectExperience === "sportsgang" ? (
        <SportsgangExperience onExit={closeProjectExperience} />
      ) : null}
      {activeProjectExperience === "wardrobe" ? (
        <WardrobeExperience onExit={closeProjectExperience} />
      ) : null}
      {activeProjectExperience === "afl-predict" ? (
        <AflExperience onExit={closeProjectExperience} />
      ) : null}
      {activeProjectExperience === "soonpermario" ? (
        <ArcadeExperience onExit={closeProjectExperience} />
      ) : null}
      {activeLocation === "edwards-house" ? (
        <HouseExperience onExit={closeLocation} />
      ) : null}
      {indexOpen ? <PortfolioIndex onClose={closeIndex} /> : null}
      {activeInteraction ? (
        <InteractionDialog action={activeInteraction} onClose={closeInteraction} />
      ) : null}
    </div>
  );
}
