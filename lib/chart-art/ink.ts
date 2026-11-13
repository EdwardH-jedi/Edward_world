import type { Loop } from "@/lib/game/chart/terrain";

/**
 * Drawing primitives for the chart. Everything is engraved in one ink, one sea
 * blue and one vermilion on aged paper. Drawing only: these functions take a
 * context and leave state as they found it, apart from the stroke they set.
 */

export const INK = "#2B2823";
export const BLUE = "#54707C";
export const RED = "#A9482C";
export const PAPER = "#EFE7D3";
export const PAPER_LIT = "#F6F0E0";
export const LAND = "#E6D8B0";
export const SEPIA = "#7C6450";
export const NAVY = "#3B4756";

export type Pen = CanvasRenderingContext2D;

/** The three faces, as canvas font families. `next/font` hashes the names, so the page passes them in. */
export interface ChartFonts {
  readonly display: string;
  readonly caps: string;
  readonly hand: string;
}

let fonts: ChartFonts = {
  display: '"IM Fell English", Georgia, serif',
  caps: '"IM Fell English SC", "IM Fell English", Georgia, serif',
  hand: '"Nanum Pen Script", "Bradley Hand", cursive',
};

export function setChartFonts(next: ChartFonts) {
  fonts = {
    display: `${next.display}, Georgia, serif`,
    caps: `${next.caps}, ${next.display}, Georgia, serif`,
    hand: `${next.hand}, "Bradley Hand", cursive`,
  };
}

/** The canvas font family for one of the three faces. */
export function fontFor(face: keyof ChartFonts): string {
  return fonts[face];
}

/** Sets the stroke: width in chart units, colour. */
export function ink(g: Pen, width = 0.55, colour: string = INK) {
  g.strokeStyle = colour;
  g.lineWidth = width;
  g.lineJoin = "round";
  g.lineCap = "round";
}

/** A polyline through (x0, y0, x1, y1, …). */
export function line(g: Pen, ...points: number[]) {
  g.beginPath();
  g.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) g.lineTo(points[i], points[i + 1]);
  g.stroke();
}

export function rect(g: Pen, x: number, y: number, w: number, h: number, fill: string = PAPER_LIT) {
  g.fillStyle = fill;
  g.fillRect(x, y, w, h);
  g.strokeRect(x, y, w, h);
}

export function poly(g: Pen, points: readonly number[], fill?: string) {
  g.beginPath();
  g.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) g.lineTo(points[i], points[i + 1]);
  g.closePath();
  if (fill) {
    g.fillStyle = fill;
    g.fill();
  }
  g.stroke();
}

/** The shadowed side of a building. */
export function shade(g: Pen, x: number, y: number, w: number, h: number) {
  g.fillStyle = "rgba(43,40,35,.14)";
  g.fillRect(x, y, w, h);
}

export function dot(g: Pen, x: number, y: number, r: number, colour: string = INK) {
  g.fillStyle = colour;
  g.beginPath();
  g.arc(x, y, r, 0, 6.3);
  g.fill();
}

/** A small gabled house standing on baseline y. */
export function house(g: Pen, x: number, y: number, w: number, h: number, roof: string = PAPER_LIT) {
  rect(g, x, y - h, w, h);
  shade(g, x + w * 0.7, y - h, w * 0.3, h);
  poly(g, [x - 1, y - h, x + w / 2, y - h - w * 0.4, x + w + 1, y - h], roof);
  g.fillStyle = INK;
  g.fillRect(x + w / 2 - 1, y - 3.6, 2, 3.6);
}

export interface LabelOptions {
  readonly face?: "display" | "caps" | "hand";
  readonly italic?: boolean;
  readonly size?: number;
  readonly rotation?: number;
  readonly align?: CanvasTextAlign;
  /** Letter spacing in chart units. */
  readonly spacing?: number;
  /** A paper-coloured outline that keeps lettering legible over linework. */
  readonly halo?: boolean;
  readonly haloColour?: string;
  readonly haloWidth?: number;
  readonly colour?: string;
}

type Spaced = Pen & { letterSpacing?: string };

export function label(g: Pen, text: string, x: number, y: number, o: LabelOptions = {}) {
  const spaced = g as Spaced;
  g.save();
  g.translate(x, y);
  if (o.rotation) g.rotate(o.rotation);
  g.font = `${o.italic ? "italic " : ""}${o.size ?? 10}px ${fonts[o.face ?? "display"]}`;
  g.textAlign = o.align ?? "center";
  g.textBaseline = "alphabetic";
  if ("letterSpacing" in g) spaced.letterSpacing = `${o.spacing ?? 0}px`;
  if (o.halo !== false) {
    g.strokeStyle = o.haloColour ?? PAPER;
    g.lineWidth = o.haloWidth ?? 2.6;
    g.lineJoin = "round";
    g.strokeText(text, 0, 0);
  }
  g.fillStyle = o.colour ?? INK;
  g.fillText(text, 0, 0);
  if ("letterSpacing" in g) spaced.letterSpacing = "0px";
  g.restore();
}

/** An anchor symbol. */
export function anchor(g: Pen, x: number, y: number, scale: number, colour: string) {
  g.save();
  g.translate(x, y);
  g.scale(scale, scale);
  ink(g, 0.6, colour);
  g.beginPath();
  g.arc(0, -3.2, 0.9, 0, 6.3);
  g.stroke();
  line(g, 0, -2.3, 0, 3.1);
  line(g, -1.9, -1.1, 1.9, -1.1);
  g.beginPath();
  g.arc(0, 0.2, 2.9, 0.45, Math.PI - 0.45);
  g.stroke();
  line(g, 2.6, 1.5, 3.2, 0.3);
  line(g, -2.6, 1.5, -3.2, 0.3);
  g.restore();
}

/** Draws `draw` with its origin at (x, y), scaled by `k`. */
export function group(g: Pen, x: number, y: number, k: number, draw: () => void) {
  g.save();
  g.translate(x, y);
  g.scale(k, k);
  draw();
  g.restore();
}

/** One `Path2D` from a set of closed loops. Call once and keep it. */
export function pathFromLoops(loops: readonly Loop[]): Path2D {
  const path = new Path2D();
  for (const loop of loops) {
    path.moveTo(loop[0][0], loop[0][1]);
    for (let i = 1; i < loop.length; i++) path.lineTo(loop[i][0], loop[i][1]);
    path.closePath();
  }
  return path;
}
