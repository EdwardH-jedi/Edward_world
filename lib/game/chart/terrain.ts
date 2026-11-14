import type { Landing, Rect, Vec } from "@/types/chart";

/**
 * The chart's terrain, as one signed distance field.
 *
 * Every cell holds the distance in chart units to the nearest coast: negative
 * on land, positive at sea. The same field drives collision, the coastline,
 * the waterlines and the soundings, so what the boat bumps into is exactly
 * what is drawn. Pure: no canvas, no DOM.
 */

export interface Terrain {
  readonly width: number;
  readonly height: number;
  readonly field: Float32Array;
}

/** Open sea, far from any coast. Also what is returned off the sheet. */
export const OPEN_SEA = 999;

/** A closed contour, as [x, y] pairs in chart units. */
export type Loop = readonly (readonly [number, number])[];

/** Deterministic 0–1 hash of an integer pair. */
export function hash(x: number, y: number): number {
  let n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}

/** Smooth value noise over the integer lattice. */
export function valueNoise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/** Radius of an axis-aligned ellipse along the direction (dx, dy). */
function ellipseRadius(dx: number, dy: number, rx: number, ry: number) {
  const theta = Math.atan2(dy, dx);
  return { theta, r: 1 / Math.hypot(Math.cos(theta) / rx, Math.sin(theta) / ry) };
}

/** How far the coast swells or recedes at bearing `theta`, from the island's seed. */
export function coastWobble(seed: number): (theta: number) => number {
  const p0 = hash(seed, 1) * 6.283;
  const p1 = hash(seed, 2) * 6.283;
  const p2 = hash(seed, 3) * 6.283;
  return (theta) =>
    1 + 0.09 * Math.sin(3 * theta + p0) + 0.055 * Math.sin(5 * theta + p1) + 0.03 * Math.sin(9 * theta + p2);
}

/** Builds the distance field for a sheet of `width × height` units. */
export function buildTerrain(
  landings: readonly Landing[],
  sheet: { readonly width: number; readonly height: number },
): Terrain {
  const { width, height } = sheet;
  const field = new Float32Array(width * height).fill(OPEN_SEA);

  for (const landing of landings) {
    const { centre, radii } = landing;
    const edge = coastWobble(landing.seed);
    const ex = Math.ceil(radii.x * 1.2 + 46);
    const ey = Math.ceil(radii.y * 1.2 + 46);
    // Whole cells: a centre between cells must not make the indices fractional.
    const y0 = Math.max(0, Math.floor(centre.y - ey));
    const y1 = Math.min(height, Math.ceil(centre.y + ey));
    const x0 = Math.max(0, Math.floor(centre.x - ex));
    const x1 = Math.min(width, Math.ceil(centre.x + ex));

    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const dx = x - centre.x;
        const dy = y - centre.y;
        const e = ellipseRadius(dx, dy, radii.x, radii.y);
        let s = Math.hypot(dx, dy) - edge(e.theta) * e.r;
        for (const bay of landing.carve ?? []) {
          const bx = x - bay.x;
          const by = y - bay.y;
          s = Math.max(s, ellipseRadius(bx, by, bay.rx, bay.ry).r - Math.hypot(bx, by));
        }
        const i = y * width + x;
        if (s < field[i]) field[i] = s;
      }
    }
  }

  return { width, height, field };
}

/** Distance to the nearest coast at a point; negative on land. */
export function distanceAt(terrain: Terrain, x: number, y: number): number {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (ix < 0 || iy < 0 || ix >= terrain.width || iy >= terrain.height) return OPEN_SEA;
  return terrain.field[iy * terrain.width + ix];
}

/** The contour levels the chart draws, with how much hand-wobble each line gets. */
export const CONTOURS = {
  coast: { level: 0, wobble: 1.1 },
  inner: { level: -3.2, wobble: 1.6 },
  waterline: { level: 4, wobble: 0.8 },
  waterline2: { level: 9, wobble: 1 },
  shoal: { level: 15, wobble: 1.2 },
  deep: { level: 32, wobble: 0 },
} as const;

export type ContourName = keyof typeof CONTOURS;

/**
 * Marching squares over the field: the closed loops where it crosses `level`,
 * on a two-unit grid, nudged by noise and smoothed by corner-cutting so they
 * read as drawn rather than computed.
 */
export function contourLoops(terrain: Terrain, level: number, wobble: number): Loop[] {
  const { width, field } = terrain;
  const g = 2;
  const nx = Math.floor((width - 1) / g);
  const ny = Math.floor((terrain.height - 1) / g);
  const stride = nx + 2;
  const v = (ix: number, iy: number) => field[iy * g * width + ix * g] - level;
  const points = new Map<number, [number, number]>();
  const adjacent = new Map<number, number[]>();

  const point = (ix: number, iy: number, vertical: 0 | 1) => {
    const key = (iy * stride + ix) * 2 + vertical;
    if (!points.has(key)) {
      const a = v(ix, iy);
      const b = vertical ? v(ix, iy + 1) : v(ix + 1, iy);
      const t = a / (a - b);
      points.set(key, vertical ? [ix * g, (iy + t) * g] : [(ix + t) * g, iy * g]);
    }
    return key;
  };
  const link = (a: number, b: number) => {
    const la = adjacent.get(a) ?? [];
    la.push(b);
    adjacent.set(a, la);
    const lb = adjacent.get(b) ?? [];
    lb.push(a);
    adjacent.set(b, lb);
  };

  for (let iy = 0; iy < ny; iy++) {
    for (let ix = 0; ix < nx; ix++) {
      const a = v(ix, iy) < 0;
      const b = v(ix + 1, iy) < 0;
      const c = v(ix + 1, iy + 1) < 0;
      const d = v(ix, iy + 1) < 0;
      if (a === b && b === c && c === d) continue;
      const edges: number[] = [];
      if (a !== b) edges.push(point(ix, iy, 0));
      if (b !== c) edges.push(point(ix + 1, iy, 1));
      if (c !== d) edges.push(point(ix, iy + 1, 0));
      if (d !== a) edges.push(point(ix, iy, 1));
      if (edges.length === 2) link(edges[0], edges[1]);
      else if (edges.length === 4) {
        link(edges[0], edges[1]);
        link(edges[2], edges[3]);
      }
    }
  }

  const loops: Loop[] = [];
  const done = new Set<number>();
  for (const start of adjacent.keys()) {
    if (done.has(start)) continue;
    let loop: [number, number][] = [];
    let previous = -1;
    let current: number | undefined = start;
    while (current !== undefined && !done.has(current)) {
      done.add(current);
      loop.push(points.get(current)!);
      const next: number[] = adjacent.get(current)!;
      const following: number = next[0] !== previous ? next[0] : next[1];
      previous = current;
      current = following;
    }
    if (loop.length < 8) continue;
    if (wobble) {
      loop = loop.map(([x, y]) => [
        x + (valueNoise(x / 8, y / 8) - 0.5) * wobble,
        y + (valueNoise(x / 8 + 40, y / 8) - 0.5) * wobble,
      ]);
    }
    const smooth: [number, number][] = [];
    for (let i = 0; i < loop.length; i++) {
      const p = loop[i];
      const q = loop[(i + 1) % loop.length];
      smooth.push(
        [0.75 * p[0] + 0.25 * q[0], 0.75 * p[1] + 0.25 * q[1]],
        [0.25 * p[0] + 0.75 * q[0], 0.25 * p[1] + 0.75 * q[1]],
      );
    }
    loops.push(smooth);
  }
  return loops;
}

/** Where a ray from `from` at bearing `angle` first reaches water. */
export function coastAlong(terrain: Terrain, from: Vec, angle: number) {
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  let t = 4;
  while (t < 400 && distanceAt(terrain, from.x + ux * t, from.y + uy * t) < 0) t++;
  return { x: from.x + ux * t, y: from.y + uy * t, ux, uy };
}

export interface Tree {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly fruit: boolean;
}

/**
 * The trees on one island: a jittered seven-unit grid, thinned by the
 * island's density, kept ten units inside the coast, out of the clearings,
 * and off the jetty.
 */
export function plantWoodland(terrain: Terrain, landing: Landing, jetty: Vec): Tree[] {
  const { centre, radii, woodland, seed } = landing;
  const ex = Math.ceil(radii.x * 1.2);
  const ey = Math.ceil(radii.y * 1.2);
  const trees: Tree[] = [];
  for (let gy = centre.y - ey; gy < centre.y + ey; gy += 7) {
    for (let gx = centre.x - ex; gx < centre.x + ex; gx += 7) {
      if (hash(gx + seed, gy) > woodland.density) continue;
      const x = gx + hash(gx, gy + 3) * 5;
      const y = gy + hash(gx + 5, gy) * 5;
      if (distanceAt(terrain, x, y) > -10) continue;
      const rx = x - centre.x;
      const ry = y - centre.y;
      // Clearings are in the landmark's units: move and scale them with it.
      const { scale: k, offset } = landing.landmark;
      const inClearing = woodland.clearings.some((c) => {
        const cx = offset.x + c.x * k;
        const cy = offset.y + c.y * k;
        return rx > cx - 3 && rx < cx + c.w * k + 3 && ry > cy - 1 && ry < cy + c.h * k + 7;
      });
      if (inClearing) continue;
      if (Math.hypot(x - jetty.x, y - jetty.y) < 14) continue;
      trees.push({ x, y, r: 1.7 + hash(gx, gy) * 0.7, fruit: Boolean(woodland.fruit) && rx < -40 });
    }
  }
  return trees;
}

export interface Sounding {
  readonly x: number;
  readonly y: number;
  readonly depth: number;
}

/**
 * Depth figures across open water. Decorative, but read off the same field,
 * so they shoal toward every coast. Kept clear of `keepOut` lettering.
 */
export function takeSoundings(terrain: Terrain, keepOut: readonly Rect[]): Sounding[] {
  const out: Sounding[] = [];
  for (let gy = 30; gy < terrain.height - 16; gy += 58) {
    for (let gx = 30; gx < terrain.width - 16; gx += 62) {
      const x = gx + Math.floor(hash(gx, gy) * 26) - 13;
      const y = gy + Math.floor(hash(gy, gx) * 22) - 11;
      const s = distanceAt(terrain, x, y);
      if (s < 18) continue;
      if (keepOut.some((k) => x > k.x && x < k.x + k.w && y > k.y && y < k.y + k.h)) continue;
      out.push({
        x,
        y,
        depth: Math.round(s > 900 ? 62 + hash(x, y) * 34 : s / 2.1 + hash(x, y) * 5),
      });
    }
  }
  return out;
}
