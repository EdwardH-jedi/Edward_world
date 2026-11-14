import type { PortfolioProjectId } from "@/types/portfolio";
import type { WorldLocationId } from "@/types/world";

/**
 * The chart overworld's domain types.
 *
 * Positions are in chart units: the sheet is 1440 × 960 of them, and one unit
 * is roughly two CSS pixels on a laptop once the camera has come down to the
 * boat. Nothing here knows about the canvas.
 */

export interface Vec {
  readonly x: number;
  readonly y: number;
}

export interface Ellipse {
  readonly x: number;
  readonly y: number;
  readonly rx: number;
  readonly ry: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export const LANDING_IDS = [
  "incheon",
  "jeju",
  "field",
  "shipyard",
  "sydney",
  "sportsgang",
  "afl",
  "arcade",
] as const;

export type LandingId = (typeof LANDING_IDS)[number];

/**
 * Where the trees on an island grow.
 *
 * `clearings` are rectangles in the landmark drawing's units, so they move and
 * scale with it, kept free so the landmark and its lettering have room. `density` is the share of the tree
 * grid that is planted.
 */
export interface Woodland {
  readonly density: number;
  readonly clearings: readonly Rect[];
  /** Jeju's tangerine groves: red dots on the western trees. */
  readonly fruit?: boolean;
}

/**
 * How an island's landmark drawing sits on it. The routine in
 * `lib/chart-art/landmarks/` draws in its own units around its own origin;
 * this places and scales it, so resizing a landmark is a data change.
 */
export interface LandmarkPlacement {
  /** 1.6–2: the drawing's scale on the chart. */
  readonly scale: number;
  /** Where the drawing's origin sits, relative to the island's centre. */
  readonly offset: Vec;
  /** The main landmark's horizontal extent, in drawing units. It must span at least 45% of the island. */
  readonly main: { readonly x0: number; readonly x1: number; readonly name: string };
}

/** One island on the chart. */
export interface Landing {
  readonly id: LandingId;
  readonly name: string;
  /** "2017 – 2022", "Data science". Resolved from the canonical data where it exists. */
  readonly tag: string;
  /** Real latitude and longitude, where the place has one. */
  readonly coord?: string;
  readonly centre: Vec;
  readonly radii: Vec;
  /** Drives the coastline's wobble and the tree layout. */
  readonly seed: number;
  /** Bearing from the centre, in radians, along which the jetty runs out to the anchorage. */
  readonly dockAngle: number;
  /**
   * Where the boat waits. Fixed where phase 1 put it (26 units out from the
   * original coast); islands grown since then grew around it.
   */
  readonly anchorage: Vec;
  readonly landmark: LandmarkPlacement;
  /** Bays cut out of the coast. */
  readonly carve?: readonly Ellipse[];
  readonly woodland: Woodland;
  /** Horizontal nudge for the name plate, where the landmark would otherwise sit under it. */
  readonly labelDx?: number;
  readonly source: {
    readonly chapterId?: string;
    readonly projectId?: PortfolioProjectId;
  };
}

/** A link on a landing card. Internal links route through Next; external ones open a new tab. */
export interface CardLink {
  readonly label: string;
  readonly href: string;
  readonly external: boolean;
}

/** What `E` shows at an anchorage until the island scene exists (phase 3). */
export interface LandingCard {
  readonly eyebrow: string;
  readonly heading: string;
  readonly lede: string;
  readonly lines: readonly string[];
  readonly stack: readonly string[];
  readonly links: readonly CardLink[];
}

/** A message in a bottle: a short handwritten note on the chart, and the line it unfolds into. */
export interface Bottle {
  readonly id: string;
  readonly at: Vec;
  readonly note: string;
  readonly text: string;
}

/** Lettering across open water. */
export interface SeaName {
  readonly text: string;
  readonly at: Vec;
  readonly rotation: number;
  readonly size: number;
}

/* ── Islands ashore (phase 3) ─────────────────────────────────────────────── */

export type PlaceKind = "project" | "chapter" | "idea" | "placeholder";

export type PlaceAction =
  | { readonly type: "OPEN_PROJECT"; readonly projectId: PortfolioProjectId }
  | { readonly type: "OPEN_LOCATION"; readonly locationId: WorldLocationId }
  | { readonly type: "OPEN_CARD"; readonly heading: string; readonly body: readonly string[] }
  | { readonly type: "NONE" };

/** A building or spot on an island plan. */
export interface Place {
  readonly id: string;
  readonly name: string;
  readonly kind: PlaceKind;
  /** Footprint on the island plan; solid. */
  readonly rect: Rect;
  /** Where Edward stands to interact. */
  readonly door: Vec;
  readonly action: PlaceAction;
  /** Key of a drawing routine; falls back to a labelled plot. */
  readonly art?: string;
}

/** The large-scale harbour plan of one landing. */
export interface IslandPlan {
  readonly landing: LandingId;
  readonly size: Vec;
  /** Spawn and exit. */
  readonly jetty: Vec;
  readonly places: readonly Place[];
  /** Drawn as dashed footpaths. */
  readonly paths: readonly (readonly Vec[])[];
}
