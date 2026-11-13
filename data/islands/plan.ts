import { getLanding, getLandingCard } from "@/data/chart";
import { chapters } from "@/data/personal";
import type { LandingId, Place, PlaceAction, Rect, Vec } from "@/types/chart";

/**
 * Helpers for writing island plans. A plan is in plan units, four to a chart
 * unit, with the island's centre at the middle of the plan and 120 units of
 * water round it. Rectangles are footprints; doors are where Edward stands.
 */

const PLAN_SCALE = 4;
const PLAN_MARGIN = 120;

/** The plan's size: the island's grown radii, a quarter again for the wobble of its coast, and the water margin. */
export function planSize(id: LandingId): Vec {
  const { radii } = getLanding(id);
  return {
    x: Math.round(radii.x * 2 * 1.25 * PLAN_SCALE + PLAN_MARGIN * 2),
    y: Math.round(radii.y * 2 * 1.25 * PLAN_SCALE + PLAN_MARGIN * 2),
  };
}

/** A footprint `w × h` centred on (cx, cy). */
export const box = (cx: number, cy: number, w: number, h: number): Rect => ({ x: cx - w / 2, y: cy - h / 2, w, h });

/** A footprint from its top-left corner. */
export const rect = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

/** Where Edward stands in front of a footprint's side. */
export function doorOf(r: Rect, side: "north" | "south" | "east" | "west", gap = 16): Vec {
  if (side === "north") return { x: r.x + r.w / 2, y: r.y - gap };
  if (side === "south") return { x: r.x + r.w / 2, y: r.y + r.h + gap };
  if (side === "west") return { x: r.x - gap, y: r.y + r.h / 2 };
  return { x: r.x + r.w + gap, y: r.y + r.h / 2 };
}

/** A surveyed plot, reserved for an idea Edward has not placed yet. */
export function plot(letter: string, r: Rect): Place {
  return {
    id: `plot-${letter.toLowerCase()}`,
    name: `Plot ${letter}, reserved`,
    kind: "placeholder",
    rect: r,
    door: doorOf(r, "south"),
    action: { type: "NONE" },
  };
}

/** Scenery from a chapter: drawn and solid, but nothing to open. */
export function scenery(id: string, name: string, r: Rect, art: string): Place {
  return { id, name, kind: "chapter", rect: r, door: doorOf(r, "south"), action: { type: "NONE" }, art };
}

/** A card of a chapter's lines, read from `data/personal.ts`. */
export function chapterCard(heading: string, chapterId: string): PlaceAction {
  const chapter = chapters.find((entry) => entry.id === chapterId);
  if (!chapter) throw new Error(`data/islands: unknown chapter "${chapterId}"`);
  return { type: "OPEN_CARD", heading, body: chapter.detail };
}

/** A card of the chart's own lines for a landing: its lede, then its lines. */
export function landingLinesCard(heading: string, id: LandingId): PlaceAction {
  const card = getLandingCard(id);
  return { type: "OPEN_CARD", heading, body: [card.lede, ...card.lines] };
}
