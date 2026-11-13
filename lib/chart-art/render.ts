import {
  BRIDGE,
  CARTOUCHE,
  CARTOUCHE_COPY,
  COFFEE_RING,
  LANDINGS,
  ROSE,
  SEA_NAMES,
  SERPENT,
  SERPENT_COPY,
  SHEET,
} from "@/data/chart";
import type { Boat, Ripple } from "@/lib/game/chart/sailing";
import type { ChartScene } from "@/lib/game/chart/scene";
import { drawBoat, drawBoatMarker, drawCourse, drawRipples } from "@/lib/chart-art/boat";
import { drawBottle, drawFishedNote } from "@/lib/chart-art/bottles";
import {
  buildCoastPaths,
  buildWoodland,
  drawAnchorageMark,
  drawChartedStamp,
  drawJetty,
  drawLand,
  drawNamePlate,
  drawWater,
  drawWoodland,
  type CoastPaths,
  type WoodlandPaths,
} from "@/lib/chart-art/coast";
import { LANDMARKS } from "@/lib/chart-art/landmarks";
import type { Pen } from "@/lib/chart-art/ink";
import {
  createPaperTile,
  drawBridge,
  drawCartouche,
  drawCoffeeRing,
  drawGraticule,
  drawNeatline,
  drawPaper,
  drawRose,
  drawSeaNames,
  drawSerpent,
  drawSoundings,
} from "@/lib/chart-art/sheet";
import type { LandingId, Vec } from "@/types/chart";

/**
 * One function draws the sheet at any scale: the live view and the small
 * overview in the Landings panel.
 *
 * Everything that never changes is built into `Path2D` objects once, in
 * `createChartArt`. Each frame only fills and strokes them, and islands,
 * landmarks and bottles outside the view are skipped.
 */
export interface ChartArt {
  readonly coast: CoastPaths;
  readonly woodland: Readonly<Record<LandingId, WoodlandPaths>>;
  readonly paper: HTMLCanvasElement;
}

/** Client only: `Path2D` and canvas do not exist during prerender. */
export function createChartArt(scene: ChartScene): ChartArt {
  const woodland = {} as Record<LandingId, WoodlandPaths>;
  for (const landing of LANDINGS) woodland[landing.id] = buildWoodland(scene.woodland[landing.id]);
  return { coast: buildCoastPaths(scene.contours), woodland, paper: createPaperTile() };
}

export interface ChartFrame {
  /** Device pixels per chart unit. */
  readonly k: number;
  /** The chart point at the canvas's top-left. */
  readonly camX: number;
  readonly camY: number;
  /** Canvas size in device pixels. */
  readonly width: number;
  readonly height: number;
  /** Seconds; 0 freezes every idle animation (reduced motion). */
  readonly t: number;
  readonly reduced: boolean;
  readonly overview: boolean;
  readonly boat: Boat;
  readonly course: readonly (readonly Vec[])[];
  readonly ripples: readonly Ripple[];
  readonly charted: ReadonlySet<LandingId>;
  readonly found: ReadonlySet<string>;
}

const patterns = new WeakMap<CanvasRenderingContext2D, CanvasPattern | null>();

function paperFor(g: Pen, art: ChartArt) {
  if (!patterns.has(g)) patterns.set(g, g.createPattern(art.paper, "repeat"));
  return patterns.get(g) ?? null;
}

export function drawChart(g: Pen, scene: ChartScene, art: ChartArt, f: ChartFrame) {
  const { k, camX, camY, overview } = f;
  const x1 = camX + f.width / k;
  const y1 = camY + f.height / k;
  const visible = (x: number, y: number, r: number) => x + r > camX && x - r < x1 && y + r > camY && y - r < y1;
  const t = f.reduced ? 0 : f.t;

  g.setTransform(1, 0, 0, 1, 0, 0);
  drawPaper(g, paperFor(g, art), camX, camY, k, f.width, f.height);
  g.setTransform(k, 0, 0, k, -camX * k, -camY * k);

  drawGraticule(g, SHEET, ROSE);
  drawWater(g, art.coast);
  drawLand(g, art.coast);
  if (!overview) drawSoundings(g, scene.soundings, visible);

  LANDINGS.forEach((landing, i) => {
    if (!visible(landing.centre.x, landing.centre.y, landing.radii.x * 1.3 + 60)) return;
    drawWoodland(g, art.woodland[landing.id]);
    const anchorage = scene.anchorages[i];
    drawJetty(g, anchorage);
    const pulse = f.charted.has(landing.id) || f.reduced ? 0 : (f.t * 0.7) % 1;
    drawAnchorageMark(g, anchorage.point, pulse);
    const { scale, offset } = landing.landmark;
    g.save();
    g.translate(landing.centre.x + offset.x, landing.centre.y + offset.y);
    g.scale(scale, scale);
    LANDMARKS[landing.id](g, t);
    g.restore();
  });

  drawSeaNames(g, SEA_NAMES, overview);
  if (!overview) {
    for (const landing of LANDINGS) {
      const plate = scene.plates[landing.id];
      drawNamePlate(g, landing, plate);
      if (f.charted.has(landing.id)) drawChartedStamp(g, plate);
    }
  }
  drawRose(g, ROSE);

  if (overview) {
    drawBoatMarker(g, f.boat);
  } else {
    drawCartouche(g, CARTOUCHE, CARTOUCHE_COPY);
    drawSerpent(g, SERPENT, SERPENT_COPY);
    drawCoffeeRing(g, COFFEE_RING);
    scene.bottles.forEach((bottle, i) => {
      if (!visible(bottle.at.x, bottle.at.y, 80)) return;
      if (f.found.has(bottle.id)) drawFishedNote(g, bottle);
      else drawBottle(g, bottle, i, t);
    });
    drawCourse(g, f.course);
    drawRipples(g, f.ripples);
    drawBoat(g, f.boat, t);
  }
  drawBridge(g, BRIDGE);
  drawNeatline(g, SHEET, !overview);
  g.setTransform(1, 0, 0, 1, 0, 0);
}
