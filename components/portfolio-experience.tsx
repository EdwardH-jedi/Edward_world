"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { setBgmSurface, startBgm } from "@/lib/audio/bgm-engine";
import { getPortfolioEntryView } from "@/lib/game/portfolio-entry";
import { recordJoinOnce } from "@/lib/joins/client";
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
  const entryView = getPortfolioEntryView(useSearchParams());
  const experience = entryView === "intro" ? "intro" : "world";
  const indexOpen = entryView === "index";
  const [activeInteraction, setActiveInteraction] =
    useState<InteractionAction | null>(null);
  const [activeProjectExperience, setActiveProjectExperience] =
    useState<PortfolioProjectId | null>(null);
  const [activeLocation, setActiveLocation] = useState<WorldLocationId | null>(null);

  // Keep the current surface in this history entry, so returning from a
  // document or refreshing it never accidentally replays the opening ritual.
  // Next syncs native history updates with useSearchParams without a reload.
  const setView = useCallback((view: "world" | "index") => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", view);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  // One join per visitor, counted the first time the world is theirs to walk
  // — whichever of the three doors they came through. `recordJoinOnce` is
  // latched at module scope, so this effect re-running proves nothing and
  // costs nothing.
  useEffect(() => {
    if (experience !== "world") return;
    recordJoinOnce();
  }, [experience]);

  /**
   * The music begins when the world does — whichever door the visitor came
   * through. `startBgm` is latched, so this effect re-running on any of the
   * state below costs nothing and cannot produce a second copy of the song.
   */
  useEffect(() => {
    if (experience !== "world") return;
    startBgm("world");
  }, [experience]);

  /**
   * What the visitor is actually looking at, which is a duck and never a
   * restart: the source node keeps running underneath, so leaving a project
   * returns to the bar the world was already playing.
   */
  useEffect(() => {
    setBgmSurface(
      activeLocation !== null
        ? "house"
        : activeProjectExperience !== null
          ? "project"
          : "world",
    );
  }, [activeLocation, activeProjectExperience]);

  const showWorld = useCallback(() => {
    setActiveInteraction(null);
    setActiveProjectExperience(null);
    setActiveLocation(null);
    setView("world");
  }, [setView]);

  const showIndex = useCallback(() => {
    setActiveInteraction(null);
    // The index is the recruiter's fast path; leaving a scripted sequence
    // running underneath it would only make returning ambiguous.
    setActiveProjectExperience(null);
    setActiveLocation(null);
    setView("index");
  }, [setView]);

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

  const closeIndex = useCallback(() => setView("world"), [setView]);
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
