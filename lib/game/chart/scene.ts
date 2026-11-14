import {
  anchorageFor,
  settleBottles,
  type Anchorage,
} from "@/lib/game/chart/docking";
import {
  buildTerrain,
  contourLoops,
  CONTOURS,
  plantWoodland,
  takeSoundings,
  type ContourName,
  type Loop,
  type Sounding,
  type Terrain,
  type Tree,
} from "@/lib/game/chart/terrain";
import type { Bottle, Landing, LandingId, Rect, SeaName, Vec } from "@/types/chart";

/**
 * Everything about the chart that does not move, computed once.
 *
 * The component builds this on the client when the chart mounts; the art
 * layer turns its loops and points into `Path2D` objects a single time. Pure,
 * so the tests build exactly what the visitor sails on.
 */
export interface ChartScene {
  readonly terrain: Terrain;
  readonly contours: Readonly<Record<ContourName, readonly Loop[]>>;
  readonly anchorages: readonly Anchorage[];
  readonly woodland: Readonly<Record<LandingId, readonly Tree[]>>;
  readonly plates: Readonly<Record<LandingId, Vec>>;
  readonly soundings: readonly Sounding[];
  readonly bottles: readonly Bottle[];
}

export interface SheetFurniture {
  readonly seas: readonly SeaName[];
  readonly rose: { readonly x: number; readonly y: number; readonly r: number };
  readonly cartouche: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly serpent: Vec;
}

/** Where an island's name plate is lettered: above it, a little higher when a coordinate goes underneath. */
export function namePlateAt(landing: Landing): Vec {
  return {
    x: landing.centre.x + (landing.labelDx ?? 0),
    y: landing.centre.y - landing.radii.y - (landing.coord ? 20 : 14),
  };
}

/** Soundings stay out of the lettering and the sheet's furniture. */
function keepOut(furniture: SheetFurniture, plates: readonly Vec[]): Rect[] {
  const { cartouche: c, rose, serpent } = furniture;
  return [
    { x: c.x - c.w / 2 - 8, y: c.y - c.h / 2 - 8, w: c.w + 16, h: c.h + 16 },
    { x: rose.x - rose.r - 12, y: rose.y - rose.r - 12, w: rose.r * 2 + 24, h: rose.r * 2 + 24 },
    { x: serpent.x - 50, y: serpent.y - 22, w: 100, h: 40 },
    ...furniture.seas.map((s) =>
      Math.abs(s.rotation) > 1
        ? { x: s.at.x - 14, y: s.at.y - 70, w: 28, h: 140 }
        : {
            x: s.at.x - s.text.length * s.size * 0.34,
            y: s.at.y - s.size,
            w: s.text.length * s.size * 0.68,
            h: s.size * 1.8,
          },
    ),
    ...plates.map((p) => ({ x: p.x - 62, y: p.y - 14, w: 124, h: 30 })),
  ];
}

export function buildChartScene(
  landings: readonly Landing[],
  bottles: readonly Bottle[],
  sheet: { readonly width: number; readonly height: number },
  furniture: SheetFurniture,
): ChartScene {
  const terrain = buildTerrain(landings, sheet);

  const contours = Object.fromEntries(
    (Object.keys(CONTOURS) as ContourName[]).map((name) => [
      name,
      contourLoops(terrain, CONTOURS[name].level, CONTOURS[name].wobble),
    ]),
  ) as Record<ContourName, Loop[]>;

  const anchorages = landings.map((landing) => anchorageFor(terrain, landing));
  const woodland = {} as Record<LandingId, Tree[]>;
  const plates = {} as Record<LandingId, Vec>;
  landings.forEach((landing, i) => {
    woodland[landing.id] = plantWoodland(terrain, landing, anchorages[i].coast);
    plates[landing.id] = namePlateAt(landing);
  });

  return {
    terrain,
    contours,
    anchorages,
    woodland,
    plates,
    soundings: takeSoundings(terrain, keepOut(furniture, Object.values(plates))),
    bottles: settleBottles(terrain, bottles),
  };
}
