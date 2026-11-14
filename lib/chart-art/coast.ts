import type { Anchorage } from "@/lib/game/chart/docking";
import type { ContourName, Loop, Tree } from "@/lib/game/chart/terrain";
import { anchor, ink, INK, label, LAND, line, pathFromLoops, RED, SEPIA, type Pen } from "@/lib/chart-art/ink";
import type { Landing, Vec } from "@/types/chart";

/** Coasts, water and woodland, built into `Path2D` objects once and filled every frame. */

export type CoastPaths = Readonly<Record<ContourName, Path2D>>;

export function buildCoastPaths(contours: Readonly<Record<ContourName, readonly Loop[]>>): CoastPaths {
  return Object.fromEntries(
    (Object.keys(contours) as ContourName[]).map((name) => [name, pathFromLoops(contours[name])]),
  ) as Record<ContourName, Path2D>;
}

/** Two washes for deep and shoal water, then the waterlines that follow each coast. */
export function drawWater(g: Pen, paths: CoastPaths) {
  g.fillStyle = "rgba(111,136,146,.11)";
  g.fill(paths.deep);
  g.fillStyle = "rgba(111,136,146,.2)";
  g.fill(paths.shoal);
  ink(g, 0.3, "rgba(84,112,124,.5)");
  g.setLineDash([0.6, 2.4]);
  g.stroke(paths.deep);
  g.setLineDash([]);
  ink(g, 0.28, "rgba(84,112,124,.38)");
  g.stroke(paths.shoal);
  ink(g, 0.32, "rgba(84,112,124,.55)");
  g.stroke(paths.waterline2);
  ink(g, 0.4, "rgba(84,112,124,.8)");
  g.stroke(paths.waterline);
}

export function drawLand(g: Pen, paths: CoastPaths) {
  g.fillStyle = LAND;
  g.fill(paths.coast);
  ink(g, 0.32, "rgba(124,100,80,.55)");
  g.stroke(paths.inner);
  ink(g, 0.95, INK);
  g.stroke(paths.coast);
}

export interface WoodlandPaths {
  readonly wash: Path2D;
  readonly ink: Path2D;
  readonly fruit: Path2D;
}

/** Every tree on an island as three paths: the green wash, the inked crowns and trunks, and fruit. */
export function buildWoodland(trees: readonly Tree[]): WoodlandPaths {
  const wash = new Path2D();
  const inked = new Path2D();
  const fruit = new Path2D();
  for (const { x, y, r, fruit: bears } of trees) {
    wash.moveTo(x + r, y - 3.2);
    wash.arc(x, y - 3.2, r, 0, 6.3);
    inked.moveTo(x + r, y - 3.2);
    inked.arc(x, y - 3.2, r, 0, 6.3);
    inked.moveTo(x - r * 0.5, y - 3.5);
    inked.arc(x - r * 0.1, y - 3.5, r * 0.45, Math.PI, Math.PI * 1.6);
    inked.moveTo(x, y - 3.2 + r);
    inked.lineTo(x, y - 0.2);
    inked.moveTo(x - 1.2, y - 0.2);
    inked.lineTo(x + 2.2, y - 0.2);
    if (bears) {
      fruit.moveTo(x - 0.2, y - 3.6);
      fruit.arc(x - 0.7, y - 3.6, 0.5, 0, 6.3);
      fruit.moveTo(x + 1.2, y - 2.6);
      fruit.arc(x + 0.7, y - 2.6, 0.5, 0, 6.3);
    }
  }
  return { wash, ink: inked, fruit };
}

export function drawWoodland(g: Pen, woods: WoodlandPaths) {
  g.fillStyle = "rgba(117,130,90,.42)";
  g.fill(woods.wash);
  ink(g, 0.28, "rgba(43,40,35,.82)");
  g.stroke(woods.ink);
  g.fillStyle = RED;
  g.fill(woods.fruit);
}

/** The jetty: two rails out from the coast, planked across, stopping short of the anchorage ring. */
export function drawJetty(g: Pen, anchorage: Anchorage) {
  const { x, y, ux, uy } = anchorage.coast;
  const reach = Math.min(15, Math.hypot(anchorage.point.x - x, anchorage.point.y - y) - 8);
  const nx = -uy;
  const ny = ux;
  ink(g, 0.45);
  line(g, x - ux * 3 + nx * 1.3, y - uy * 3 + ny * 1.3, x + ux * reach + nx * 1.3, y + uy * reach + ny * 1.3);
  line(g, x - ux * 3 - nx * 1.3, y - uy * 3 - ny * 1.3, x + ux * reach - nx * 1.3, y + uy * reach - ny * 1.3);
  ink(g, 0.3);
  for (let d = -2; d <= reach; d += 2.2) {
    line(g, x + ux * d + nx * 1.3, y + uy * d + ny * 1.3, x + ux * d - nx * 1.3, y + uy * d - ny * 1.3);
  }
}

/** The anchorage: a vermilion ring and anchor, pulsing outward until the landing is charted. */
export function drawAnchorageMark(g: Pen, at: Vec, pulse: number) {
  g.fillStyle = "rgba(246,240,224,.9)";
  g.beginPath();
  g.arc(at.x, at.y, 6, 0, 6.3);
  g.fill();
  ink(g, 0.5, RED);
  g.stroke();
  if (pulse) {
    g.globalAlpha = 1 - pulse;
    g.beginPath();
    g.arc(at.x, at.y, 6 + pulse * 7, 0, 6.3);
    g.stroke();
    g.globalAlpha = 1;
  }
  anchor(g, at.x, at.y, 1.05, RED);
}

export function drawNamePlate(g: Pen, landing: Landing, at: Vec) {
  label(g, landing.name, at.x, at.y, { face: "caps", size: 11.5, spacing: 1.1, haloWidth: 3.2 });
  if (landing.coord) {
    label(g, landing.coord, at.x, at.y + 7.4, { italic: true, size: 5.6, colour: SEPIA, haloWidth: 2 });
  }
}

/** The vermilion CHARTED stamp, set at the end of a name plate once its card has been opened. */
export function drawChartedStamp(g: Pen, plate: Vec) {
  g.save();
  g.translate(plate.x + 62, plate.y - 14);
  g.rotate(-0.24);
  g.globalAlpha = 0.86;
  g.scale(1.3, 1.3);
  ink(g, 0.7, RED);
  g.beginPath();
  g.arc(0, 0, 10, 0, 6.3);
  g.stroke();
  ink(g, 0.3, RED);
  g.beginPath();
  g.arc(0, 0, 8.4, 0, 6.3);
  g.stroke();
  label(g, "CHARTED", 0, 0.6, { face: "caps", size: 4.1, colour: RED, halo: false, spacing: 0.4 });
  ink(g, 0.6, RED);
  line(g, -2.6, 3.8, -0.8, 5.6, 2.8, 2.2);
  g.restore();
}
