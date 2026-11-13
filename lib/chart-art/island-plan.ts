import { drawBoat } from "@/lib/chart-art/boat";
import { BLUE, dot, ink, INK, label, LAND, line, PAPER_LIT, pathFromLoops, poly, rect, RED, SEPIA, shade, type Pen } from "@/lib/chart-art/ink";
import { drawFigure } from "@/lib/chart-art/figure";
import { createPaperTile, drawPaper } from "@/lib/chart-art/sheet";
import { islandContours, plantIsland, type IslandContour, type IslandGround, type Walker } from "@/lib/game/chart/island-walk";
import type { IslandPlan, Landing, Place, Vec } from "@/types/chart";

/**
 * An island's harbour plan: the inset a chart prints for a port. Same ink as
 * the chart, at four times its scale, seen from above. Built once per island;
 * each frame fills the paths and draws Edward.
 */

export interface IslandArt {
  readonly contours: Readonly<Record<IslandContour, Path2D>>;
  readonly trees: { readonly wash: Path2D; readonly ink: Path2D; readonly fruit: Path2D };
  readonly paper: HTMLCanvasElement;
}

/** Client only. */
export function createIslandArt(ground: IslandGround, plan: IslandPlan, landing: Landing): IslandArt {
  const loops = islandContours(ground);
  const contours = Object.fromEntries(
    (Object.keys(loops) as IslandContour[]).map((name) => [name, pathFromLoops(loops[name])]),
  ) as Record<IslandContour, Path2D>;
  const wash = new Path2D();
  const inked = new Path2D();
  const fruit = new Path2D();
  for (const { x, y, r, fruit: bears } of plantIsland(ground, plan, landing)) {
    wash.moveTo(x + r, y - r);
    wash.arc(x, y - r, r, 0, 6.3);
    inked.moveTo(x + r, y - r);
    inked.arc(x, y - r, r, 0, 6.3);
    inked.moveTo(x - r * 0.5, y - r * 1.1);
    inked.arc(x - r * 0.1, y - r * 1.1, r * 0.45, Math.PI, Math.PI * 1.6);
    if (bears) {
      fruit.moveTo(x - 1.4, y - r * 1.2);
      fruit.arc(x - 2, y - r * 1.2, 1.1, 0, 6.3);
      fruit.moveTo(x + 2.6, y - r * 0.7);
      fruit.arc(x + 2, y - r * 0.7, 1.1, 0, 6.3);
    }
  }
  return { contours, trees: { wash, ink: inked, fruit }, paper: createPaperTile() };
}

export interface IslandFrame {
  /** Device pixels per plan unit. */
  readonly k: number;
  readonly camX: number;
  readonly camY: number;
  readonly width: number;
  readonly height: number;
  /** Seconds; 0 under reduced motion. */
  readonly t: number;
  readonly walker: Walker;
  /** The place whose door Edward is at, or "jetty". */
  readonly near: string | null;
}

const patterns = new WeakMap<CanvasRenderingContext2D, CanvasPattern | null>();

export function drawIsland(g: Pen, plan: IslandPlan, landing: Landing, art: IslandArt, f: IslandFrame) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (!patterns.has(g)) patterns.set(g, g.createPattern(art.paper, "repeat"));
  drawPaper(g, patterns.get(g) ?? null, f.camX, f.camY, f.k, f.width, f.height);
  g.setTransform(f.k, 0, 0, f.k, -f.camX * f.k, -f.camY * f.k);

  // A light graticule, so the plan reads as surveyed.
  ink(g, 0.4, "rgba(84,112,124,.22)");
  for (let x = 100; x < plan.size.x; x += 100) line(g, x, 0, x, plan.size.y);
  for (let y = 100; y < plan.size.y; y += 100) line(g, 0, y, plan.size.x, y);

  const c = art.contours;
  g.fillStyle = "rgba(111,136,146,.11)";
  g.fill(c.deep);
  g.fillStyle = "rgba(111,136,146,.2)";
  g.fill(c.shoal);
  ink(g, 0.6, "rgba(84,112,124,.38)");
  g.stroke(c.shoal);
  ink(g, 0.7, "rgba(84,112,124,.55)");
  g.stroke(c.waterline2);
  ink(g, 0.9, "rgba(84,112,124,.8)");
  g.stroke(c.waterline);
  g.fillStyle = LAND;
  g.fill(c.coast);
  ink(g, 0.7, "rgba(124,100,80,.55)");
  g.stroke(c.inner);
  ink(g, 1.8, INK);
  g.stroke(c.coast);

  drawJetty(g, plan, landing, f.t);

  ink(g, 1.2, SEPIA);
  g.setLineDash([5, 5]);
  for (const path of plan.paths) {
    g.beginPath();
    path.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
    g.stroke();
  }
  g.setLineDash([]);

  g.fillStyle = "rgba(117,130,90,.42)";
  g.fill(art.trees.wash);
  ink(g, 0.6, "rgba(43,40,35,.82)");
  g.stroke(art.trees.ink);
  g.fillStyle = RED;
  g.fill(art.trees.fruit);

  for (const place of plan.places) drawPlace(g, place, f.near === place.id, f.t);
  drawFigure(g, f.walker);

  // The inset's neatline.
  ink(g, 2.2, INK);
  g.strokeRect(-14, -14, plan.size.x + 28, plan.size.y + 28);
  ink(g, 0.8);
  g.strokeRect(-7, -7, plan.size.x + 14, plan.size.y + 14);
  g.setTransform(1, 0, 0, 1, 0, 0);
}

/** The jetty runs out from where Edward lands to deep water, with the boat moored at its end. */
function drawJetty(g: Pen, plan: IslandPlan, landing: Landing, t: number) {
  const ux = Math.cos(landing.dockAngle);
  const uy = Math.sin(landing.dockAngle);
  const nx = -uy * 5;
  const ny = ux * 5;
  const a = { x: plan.jetty.x + ux * 14, y: plan.jetty.y + uy * 14 };
  const b = { x: plan.jetty.x + ux * 120, y: plan.jetty.y + uy * 120 };
  g.fillStyle = PAPER_LIT;
  poly(g, [a.x + nx, a.y + ny, b.x + nx, b.y + ny, b.x - nx, b.y - ny, a.x - nx, a.y - ny], PAPER_LIT);
  ink(g, 0.5);
  for (let d = 18; d < 120; d += 5) {
    const p = { x: plan.jetty.x + ux * d, y: plan.jetty.y + uy * d };
    line(g, p.x + nx, p.y + ny, p.x - nx, p.y - ny);
  }
  g.save();
  const boatAt = { x: b.x + ux * 22 + nx * 2.4, y: b.y + uy * 22 + ny * 2.4 };
  g.translate(boatAt.x, boatAt.y);
  g.scale(3, 3);
  drawBoat(g, { x: 0, y: 0, vx: 0, vy: 0, facing: ux < 0 ? -1 : 1 }, t);
  g.restore();
}

function caption(g: Pen, text: string, at: Vec, colour: string = INK) {
  label(g, text, at.x, at.y, { face: "caps", size: 13, spacing: 1, haloWidth: 4, colour });
}

function drawPlace(g: Pen, place: Place, near: boolean, t: number) {
  const r = place.rect;
  const cx = r.x + r.w / 2;
  const below = { x: cx, y: r.y + r.h + 22 };

  if (place.kind === "placeholder") {
    ink(g, 1, SEPIA);
    g.setLineDash([6, 5]);
    g.strokeRect(r.x, r.y, r.w, r.h);
    g.setLineDash([]);
    for (const [x, y] of [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]]) dot(g, x, y, 2.2, SEPIA);
    label(g, place.name, cx, r.y + r.h / 2 + 4, { italic: true, size: 11, colour: SEPIA, haloColour: LAND, haloWidth: 3 });
    return;
  }

  (PLACE_ART[place.art ?? ""] ?? building)(g, place, t);
  caption(g, place.name, place.art === "bridge" ? { x: cx, y: r.y - 10 } : below);

  if (place.action.type !== "NONE") {
    const d = place.door;
    g.fillStyle = near ? "rgba(169,72,44,.9)" : "rgba(246,240,224,.9)";
    g.beginPath();
    g.arc(d.x, d.y, 5, 0, 6.3);
    g.fill();
    ink(g, 1, RED);
    g.stroke();
  }
}

/** A plain building from above: roof, shaded side, ridge. The fallback for any place without its own drawing. */
function building(g: Pen, place: Place) {
  const r = place.rect;
  ink(g, 1);
  rect(g, r.x, r.y, r.w, r.h);
  shade(g, r.x + r.w * 0.78, r.y, r.w * 0.22, r.h);
  ink(g, 0.6);
  if (r.w >= r.h) line(g, r.x + 6, r.y + r.h / 2, r.x + r.w - 6, r.y + r.h / 2);
  else line(g, r.x + r.w / 2, r.y + 6, r.x + r.w / 2, r.y + r.h - 6);
}

function roofed(g: Pen, place: Place, fill: string) {
  const r = place.rect;
  ink(g, 1);
  rect(g, r.x, r.y, r.w, r.h, fill);
  shade(g, r.x + r.w * 0.78, r.y, r.w * 0.22, r.h);
  ink(g, 0.6);
  line(g, r.x, r.y, r.x + r.w / 2, r.y + r.h / 2, r.x + r.w, r.y);
  line(g, r.x, r.y + r.h, r.x + r.w / 2, r.y + r.h / 2, r.x + r.w, r.y + r.h);
}

const PLACE_ART: Readonly<Record<string, (g: Pen, place: Place, t: number) => void>> = {
  towers(g, { rect: r }) {
    const w = (r.w - 20) / 3;
    for (let i = 0; i < 3; i++) {
      const x = r.x + i * (w + 10);
      const h = r.h * (i === 1 ? 1 : 0.8);
      ink(g, 1);
      rect(g, x, r.y + r.h - h, w, h);
      shade(g, x + w * 0.75, r.y + r.h - h, w * 0.25, h);
      ink(g, 0.4);
      for (let y = r.y + r.h - h + 8; y < r.y + r.h - 4; y += 9) line(g, x + 5, y, x + w - 9, y);
    }
  },
  quay(g, { rect: r }) {
    ink(g, 1);
    rect(g, r.x, r.y, r.w, r.h, "rgba(124,100,80,.12)");
    ink(g, 0.4);
    for (let x = r.x + 4; x < r.x + r.w; x += 6) line(g, x, r.y + r.h, x - 4, r.y + r.h + 6);
    const fills = [PAPER_LIT, "rgba(169,72,44,.55)", "rgba(84,112,124,.5)", "rgba(43,40,35,.35)"];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) rect(g, r.x + 12 + i * 22, r.y + 14 + j * 22, 18, 16, fills[(i + j) % 4]);
    ink(g, 2, RED);
    for (const x of [r.x + r.w - 70, r.x + r.w - 30]) {
      g.strokeRect(x, r.y + 6, 22, r.h - 12);
      line(g, x, r.y + 6, x + 22, r.y + r.h - 6);
    }
  },
  mountain(g, { rect: r }) {
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    for (let i = 0; i < 6; i++) {
      const f = 1 - i * 0.16;
      ink(g, i === 0 ? 1 : 0.6, i === 0 ? INK : SEPIA);
      g.beginPath();
      for (let a = 0; a <= 64; a++) {
        const th = (a / 64) * Math.PI * 2;
        const wob = 1 + 0.05 * Math.sin(th * 5 + i);
        const x = cx + Math.cos(th) * (r.w / 2) * f * wob;
        const y = cy + Math.sin(th) * (r.h / 2) * f * wob;
        if (a) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
      g.closePath();
      if (i === 0) {
        g.fillStyle = "rgba(246,240,224,.55)";
        g.fill();
      }
      g.stroke();
    }
    poly(g, [cx - 8, cy + 6, cx, cy - 8, cx + 8, cy + 6], PAPER_LIT);
    label(g, "1,947 m", cx, cy + 22, { italic: true, size: 11, haloColour: LAND, haloWidth: 3 });
  },
  statue(g, { rect: r }) {
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    ink(g, 1);
    g.fillStyle = PAPER_LIT;
    g.beginPath();
    g.arc(cx, cy, r.w / 2, 0, 6.3);
    g.fill();
    g.stroke();
    dot(g, cx, cy, r.w / 4);
  },
  academy(g, place) {
    roofed(g, place, "rgba(169,72,44,.35)");
    const r = place.rect;
    ink(g, 1);
    line(g, r.x - 12, r.y + 10, r.x - 12, r.y - 26);
    poly(g, [r.x - 12, r.y - 26, r.x + 6, r.y - 21, r.x - 12, r.y - 16], RED);
  },
  hut(g, place) {
    roofed(g, place, PAPER_LIT);
    const r = place.rect;
    ink(g, 1);
    g.beginPath();
    g.arc(r.x + r.w + 18, r.y + 10, 6, 0, 6.3);
    g.stroke();
    for (const rr of [10, 16]) {
      ink(g, 0.6, RED);
      g.beginPath();
      g.arc(r.x + r.w + 18, r.y + 10, rr, -1.2, 0.4);
      g.stroke();
    }
  },
  fence(g, { rect: r }) {
    const horizontal = r.w >= r.h;
    const n = Math.floor((horizontal ? r.w : r.h) / 14);
    const mid = horizontal ? r.y + r.h / 2 : r.x + r.w / 2;
    ink(g, 0.6);
    if (horizontal) line(g, r.x, mid - 3, r.x + r.w, mid - 3);
    else line(g, mid - 3, r.y, mid - 3, r.y + r.h);
    for (let i = 0; i <= n; i++) {
      const p = (horizontal ? r.x : r.y) + i * 14;
      const [x, y] = horizontal ? [p, mid] : [mid, p];
      if (i % 3 === 1) {
        g.fillStyle = RED;
        g.fillRect(x - 3, y - 3, 6, 6);
      } else dot(g, x, y, 2);
    }
  },
  slipway(g, { rect: r }) {
    ink(g, 1);
    rect(g, r.x, r.y + 10, r.w, r.h - 20, "rgba(124,100,80,.15)");
    ink(g, 0.5);
    for (let x = r.x + 6; x < r.x + r.w; x += 10) line(g, x, r.y + 10, x, r.y + r.h - 10);
    ink(g, 1.4);
    const cy = r.y + r.h / 2;
    g.beginPath();
    g.moveTo(r.x + 20, cy);
    g.quadraticCurveTo(r.x + r.w / 2, cy - 34, r.x + r.w - 14, cy);
    g.quadraticCurveTo(r.x + r.w / 2, cy + 34, r.x + 20, cy);
    g.fillStyle = PAPER_LIT;
    g.fill();
    g.stroke();
    ink(g, 0.6);
    for (let x = r.x + 34; x < r.x + r.w - 24; x += 12) line(g, x, cy - 20, x, cy + 20);
  },
  quadrangle(g, { rect: r }) {
    ink(g, 1);
    rect(g, r.x, r.y, r.w, r.h);
    g.fillStyle = "rgba(117,130,90,.35)";
    g.fillRect(r.x + 26, r.y + 26, r.w - 52, r.h - 52);
    g.strokeRect(r.x + 26, r.y + 26, r.w - 52, r.h - 52);
    shade(g, r.x + r.w - 26, r.y, 26, r.h);
    ink(g, 0.5);
    line(g, r.x + r.w / 2, r.y + 26, r.x + r.w / 2, r.y + r.h - 26);
    line(g, r.x + 26, r.y + r.h / 2, r.x + r.w - 26, r.y + r.h / 2);
    ink(g, 1.2);
    rect(g, r.x + r.w / 2 - 14, r.y - 6, 28, 32, "rgba(43,40,35,.25)");
    line(g, r.x + r.w / 2 - 14, r.y - 6, r.x + r.w / 2 + 14, r.y + 26);
    line(g, r.x + r.w / 2 + 14, r.y - 6, r.x + r.w / 2 - 14, r.y + 26);
  },
  house(g, place) {
    roofed(g, place, "rgba(169,72,44,.55)");
    const r = place.rect;
    ink(g, 0.8);
    rect(g, r.x + r.w * 0.62, r.y + 10, 10, 10);
  },
  signpost(g, { rect: r }) {
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    ink(g, 1);
    dot(g, cx, cy, 3);
    poly(g, [cx - 16, cy - 5, cx + 12, cy - 5, cx + 18, cy, cx + 12, cy + 5, cx - 16, cy + 5], PAPER_LIT);
  },
  bridge(g, { rect: r }) {
    const cy = r.y + r.h / 2;
    ink(g, 1.2);
    line(g, r.x, cy - 6, r.x + r.w, cy - 6);
    line(g, r.x, cy + 6, r.x + r.w, cy + 6);
    ink(g, 0.4);
    for (let x = r.x + 8; x < r.x + r.w; x += 8) line(g, x, cy - 6, x, cy + 6);
    for (const x of [r.x + 30, r.x + r.w - 30]) {
      ink(g, 1);
      rect(g, x - 10, cy - 14, 20, 28);
      shade(g, x + 4, cy - 14, 6, 28);
    }
    ink(g, 0.6, BLUE);
    g.setLineDash([4, 4]);
    g.beginPath();
    g.moveTo(r.x + 30, cy - 14);
    g.quadraticCurveTo(r.x + r.w / 2, cy - 40, r.x + r.w - 30, cy - 14);
    g.stroke();
    g.setLineDash([]);
  },
  opera(g, { rect: r }) {
    const bx = r.x + 16;
    const by = r.y + r.h - 10;
    ink(g, 1);
    rect(g, r.x, by, r.w, 8);
    for (let i = 0; i < 4; i++) {
      const a = -0.9 + i * 0.34;
      const len = r.w * (0.75 - i * 0.12);
      g.beginPath();
      g.moveTo(bx + i * 18, by);
      g.quadraticCurveTo(bx + i * 18 + Math.cos(a) * len * 0.3, by + Math.sin(a) * len, bx + i * 18 + Math.cos(a) * len, by - 4);
      g.closePath();
      g.fillStyle = PAPER_LIT;
      g.fill();
      g.stroke();
    }
  },
  clubhouse(g, { rect: r }) {
    const court = { x: r.x, y: r.y, w: r.w * 0.62, h: r.h };
    g.fillStyle = "rgba(117,130,90,.35)";
    g.fillRect(court.x, court.y, court.w, court.h);
    ink(g, 1);
    g.strokeRect(court.x, court.y, court.w, court.h);
    ink(g, 0.5);
    g.strokeRect(court.x + 12, court.y + 12, court.w - 24, court.h - 24);
    line(g, court.x + court.w / 2, court.y + 6, court.x + court.w / 2, court.y + court.h - 6);
    line(g, court.x + 12, court.y + court.h / 2, court.x + court.w - 12, court.y + court.h / 2);
    const club = { x: r.x + r.w * 0.68, y: r.y + r.h * 0.2, w: r.w * 0.32, h: r.h * 0.6 };
    ink(g, 1);
    rect(g, club.x, club.y, club.w, club.h);
    shade(g, club.x + club.w * 0.7, club.y, club.w * 0.3, club.h);
  },
  oval(g, { rect: r }) {
    const cx = r.x + r.w * 0.42;
    const cy = r.y + r.h / 2;
    g.fillStyle = "rgba(117,130,90,.35)";
    g.beginPath();
    g.ellipse(cx, cy, r.w * 0.4, r.h * 0.46, 0, 0, 6.3);
    g.fill();
    ink(g, 1);
    g.stroke();
    ink(g, 0.5);
    g.strokeRect(cx - 12, cy - 12, 24, 24);
    for (const side of [-1, 1]) {
      const gx = cx + side * r.w * 0.4;
      for (let i = -3; i <= 3; i += 2) dot(g, gx, cy + i * 5, 1.8);
    }
    const lab = { x: r.x + r.w * 0.84, y: r.y + r.h * 0.55, w: r.w * 0.16, h: r.h * 0.4 };
    ink(g, 1);
    rect(g, lab.x, lab.y, lab.w, lab.h);
    shade(g, lab.x + lab.w * 0.7, lab.y, lab.w * 0.3, lab.h);
  },
  arcade(g, place, t) {
    const r = place.rect;
    ink(g, 0.6);
    for (let x = r.x + 6; x < r.x + r.w; x += 14) dot(g, x, r.y + r.h + 8, 2);
    ink(g, 1);
    rect(g, r.x, r.y, r.w, r.h);
    shade(g, r.x + r.w * 0.78, r.y, r.w * 0.22, r.h);
    g.fillStyle = RED;
    g.fillRect(r.x - 4, r.y + 8, 12, r.h - 16);
    g.strokeRect(r.x - 4, r.y + 8, 12, r.h - 16);
    for (let i = 0; i < 8; i++) {
      dot(g, r.x + 2, r.y + 14 + i * ((r.h - 28) / 7), 1.6, (i + Math.floor(t * 2.2)) % 2 ? PAPER_LIT : INK);
    }
  },
};
