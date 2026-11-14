"use client";

import dynamic from "next/dynamic";
import type { PortfolioProjectId } from "@/types/portfolio";

/**
 * The interiors, shared by the side-view town and the chart overworld.
 *
 * Every interior loads when it is entered, not with the first paint: the
 * visitor's first key should not wait on code for rooms they have not opened.
 * While a chunk loads, a solid cover in the dissolve's colour sits under the
 * dissolve overlay, so the cut stays covered instead of showing what is behind.
 */
const SceneLoading = () => <div aria-hidden="true" className="scene-loading" />;
const lazyScene = <P extends object>(load: () => Promise<React.ComponentType<P>>) =>
  dynamic(load, { ssr: false, loading: SceneLoading });

export const AflExperience = lazyScene(() =>
  import("@/components/afl/afl-experience").then((m) => m.AflExperience),
);
export const ArcadeExperience = lazyScene(() =>
  import("@/components/arcade/arcade-experience").then((m) => m.ArcadeExperience),
);
export const HouseExperience = lazyScene(() =>
  import("@/components/house/house-experience").then((m) => m.HouseExperience),
);
export const SportsgangExperience = lazyScene(() =>
  import("@/components/sportsgang/sportsgang-experience").then((m) => m.SportsgangExperience),
);

/**
 * Projects that open a full location experience instead of a summary dialog.
 * Everything not listed here keeps the existing dialog behaviour, so adding
 * the next one is a single entry rather than a change to either world.
 */
export const EXPERIENCE_PROJECTS: ReadonlySet<PortfolioProjectId> = new Set<PortfolioProjectId>([
  "sportsgang",
  "afl-predict",
  "soonpermario",
]);

/** The interior for a project, or `null` for a project that opens a dialog instead. */
export function ProjectExperience({ projectId, onExit }: { projectId: PortfolioProjectId; onExit: () => void }) {
  if (projectId === "sportsgang") return <SportsgangExperience onExit={onExit} />;
  if (projectId === "afl-predict") return <AflExperience onExit={onExit} />;
  if (projectId === "soonpermario") return <ArcadeExperience onExit={onExit} />;
  return null;
}
