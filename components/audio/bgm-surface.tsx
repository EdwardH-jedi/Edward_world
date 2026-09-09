"use client";

import { useEffect } from "react";
import type { BgmSurface as Surface } from "@/lib/audio/bgm";
import { setBgmSurface } from "@/lib/audio/bgm-engine";

/**
 * Declares which surface the visitor is on, for the pages that are routes.
 *
 * `/resume` and `/case-studies/*` are read rather than played, so the music
 * steps further back on them than it does for a project opened inside the
 * world. Renders nothing; it exists so a server component can state the fact.
 */
export function BgmSurface({ surface }: { surface: Surface }) {
  useEffect(() => {
    setBgmSurface(surface);
  }, [surface]);
  return null;
}
