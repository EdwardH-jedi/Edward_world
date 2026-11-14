import type { Pen } from "@/lib/chart-art/ink";

/**
 * A stand-in canvas for measuring what a drawing routine covers, in Node.
 *
 * It keeps the current transform and records every point a path passes
 * through (arcs and ellipses are sampled), every rectangle's corners and a
 * rough box for each piece of text. Nothing is rasterised.
 */

export interface Extent {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

type Matrix = [number, number, number, number, number, number];

const multiply = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];

export function recordDrawing(draw: (g: Pen) => void): { points: [number, number][]; extent: Extent } {
  const points: [number, number][] = [];
  let m: Matrix = [1, 0, 0, 1, 0, 0];
  const stack: Matrix[] = [];
  let fontSize = 10;
  let textAlign = "center";

  const add = (x: number, y: number) => points.push([m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]);
  const sampleEllipse = (x: number, y: number, rx: number, ry: number, rot: number, a0: number, a1: number) => {
    const span = a1 - a0;
    for (let i = 0; i <= 16; i++) {
      const a = a0 + (span * i) / 16;
      const ex = Math.cos(a) * rx;
      const ey = Math.sin(a) * ry;
      add(x + ex * Math.cos(rot) - ey * Math.sin(rot), y + ex * Math.sin(rot) + ey * Math.cos(rot));
    }
  };
  const text = (value: string, x: number, y: number) => {
    const w = value.length * fontSize * 0.5;
    const left = textAlign === "left" ? x : textAlign === "right" ? x - w : x - w / 2;
    add(left, y - fontSize * 0.75);
    add(left + w, y + fontSize * 0.2);
  };

  const pen = {
    save: () => stack.push(m),
    restore: () => {
      m = stack.pop() ?? [1, 0, 0, 1, 0, 0];
    },
    translate: (x: number, y: number) => {
      m = multiply(m, [1, 0, 0, 1, x, y]);
    },
    scale: (x: number, y: number) => {
      m = multiply(m, [x, 0, 0, y, 0, 0]);
    },
    rotate: (a: number) => {
      m = multiply(m, [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]);
    },
    setTransform: (a: number, b: number, c: number, d: number, e: number, f: number) => {
      m = [a, b, c, d, e, f];
    },
    beginPath: () => {},
    closePath: () => {},
    stroke: () => {},
    fill: () => {},
    setLineDash: () => {},
    moveTo: add,
    lineTo: add,
    quadraticCurveTo: (cx: number, cy: number, x: number, y: number) => {
      add(cx, cy);
      add(x, y);
    },
    bezierCurveTo: (c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number) => {
      add(c1x, c1y);
      add(c2x, c2y);
      add(x, y);
    },
    arc: (x: number, y: number, r: number, a0: number, a1: number) => sampleEllipse(x, y, r, r, 0, a0, a1),
    ellipse: (x: number, y: number, rx: number, ry: number, rot: number, a0: number, a1: number) =>
      sampleEllipse(x, y, rx, ry, rot, a0, a1),
    rect: (x: number, y: number, w: number, h: number) => {
      add(x, y);
      add(x + w, y + h);
    },
    fillRect: (x: number, y: number, w: number, h: number) => {
      add(x, y);
      add(x + w, y + h);
      add(x + w, y);
      add(x, y + h);
    },
    strokeRect: (x: number, y: number, w: number, h: number) => {
      add(x, y);
      add(x + w, y + h);
      add(x + w, y);
      add(x, y + h);
    },
    fillText: text,
    strokeText: text,
    set font(value: string) {
      fontSize = Number(/([\d.]+)px/.exec(value)?.[1] ?? 10);
    },
    get font() {
      return `${fontSize}px serif`;
    },
    set textAlign(value: string) {
      textAlign = value;
    },
    get textAlign() {
      return textAlign;
    },
  };

  draw(pen as unknown as Pen);

  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return {
    points,
    extent: { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) },
  };
}
