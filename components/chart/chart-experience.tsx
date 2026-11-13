"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChartWorld } from "@/components/chart/chart-world";
import { PortfolioIndex } from "@/components/index/portfolio-index";
import type { ChartFonts } from "@/lib/chart-art/ink";
import { getPortfolioEntryView } from "@/lib/game/portfolio-entry";
import { recordJoinOnce } from "@/lib/joins/client";

/**
 * Keep the current surface in this history entry, so returning from a document
 * or refreshing never replays the captain's log. Next syncs native history
 * updates with `useSearchParams` without a reload.
 */
function setView(view: "world" | "index") {
  const url = new URL(window.location.href);
  url.searchParams.set("view", view);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

/**
 * The chart at `/`, and the index over it.
 *
 * `/` keeps the contract the town gave it: a cold visit opens on the log;
 * `?view=world` starts under way; `?view=index` opens the index over the
 * chart, and closing it leaves the visitor sailing. Every "Skip to index" is a
 * link to `?view=index` on this same route, so the voyage underneath survives
 * a look at the index.
 */
export function ChartExperience({ fonts }: { fonts: ChartFonts }) {
  const entry = getPortfolioEntryView(useSearchParams());
  const indexOpen = entry === "index";
  const [underWay, setUnderWay] = useState(false);

  // One join per visitor, counted the first time the chart is theirs to sail —
  // by Set sail, by Skip to index, or by arriving with a `?view=`.
  // `recordJoinOnce` is latched at module scope, so re-running costs nothing.
  useEffect(() => {
    if (!underWay) return;
    recordJoinOnce();
    if (entry === "intro") setView("world");
  }, [underWay, entry]);

  const embark = useCallback(() => setUnderWay(true), []);
  const closeIndex = useCallback(() => setView("world"), []);

  return (
    <>
      <ChartWorld entry={entry} fonts={fonts} indexOpen={indexOpen} onUnderWay={embark} />
      {indexOpen ? <PortfolioIndex onClose={closeIndex} /> : null}
    </>
  );
}
