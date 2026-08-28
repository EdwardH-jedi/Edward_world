import { palette } from "@/lib/pixel/palette";
import type { Raster } from "@/lib/pixel/raster";

/**
 * Reusable "pixel Sydney" background: a layered harbour skyline horizon —
 * sky, water, bridge, opera house and terrace rooftops — parameterised by the
 * ambient frame counter and a horizontal scroll offset.
 *
 * NOT the intro. `lib/pixel/opening.ts` is the approved Sydney-at-dusk scene
 * for the V4 intro's title screen and camera-pan sequence, ported verbatim
 * from the design project's `opening.js`, and it stays that way — this module
 * does not import from it, copy its routines, or compete with it as a scene.
 * The two differ on purpose, not just detail:
 *
 *   - opening.ts is a fixed 240x135 cinematic composition hand-tuned to one
 *     sequence (title dusk grade, stars, motes, a ferry, birds, foreground
 *     canopy trees, `tinyAvatar`, the name-gate glyph font) and it owns a
 *     local dusk palette (`P`) built for that grade specifically.
 *   - sydney.ts here is a plain, day-lit, seamlessly tileable strip meant to
 *     sit behind other content at any width (an ambient surface, a section
 *     backdrop) — no atmosphere effects, no staged camera choreography, no
 *     characters, and no colours outside the shared `palette.ts`.
 *
 * This is a standalone art module, not wired into any scene yet — wiring is
 * left to whichever surface later adopts it. The two inevitably still share
 * landmarks (bridge, opera house, terraces) — both draw Sydney — but this is
 * the shared-palette, tileable, non-intro variant: reach for opening.ts for
 * the intro, and only reach for this module when something outside the
 * intro wants a Sydney motif on the world's own colours.
 *
 * Every routine here follows the `Raster` signature from `raster.ts`. The
 * exported routines take `(draw, frame, offset = 0)`, mirroring the
 * `monolith.ts` convention for a horizontal offset parameter — but unlike
 * `drawApproach`'s title-sequence camera, `offset` here is a generic scroll
 * position for tiling/parallax, with nearer layers moving a larger fraction
 * of it than farther ones.
 */

/** Background size in art pixels. Freestanding — no world footprint yet. */
export const SYDNEY_ART_SIZE = { width: 320, height: 108 } as const;

/**
 * How far each layer travels per art-pixel of scroll offset, `0` being
 * locked to the screen (the sky) and `1` moving in lockstep with the
 * foreground. Nearer layers move faster, which is what sells the parallax.
 */
export const SYDNEY_PARALLAX = {
  sky: 0,
  water: 0.08,
  bridge: 0.3,
  opera: 0.3,
  terraces: 0.6,
} as const;

/**
 * Colour roles for this scene, aliased from the shared palette so the routines
 * below read by intent while staying on the one approved swatch set. No hex
 * is introduced here — every value below is a direct `palette.ts` entry.
 */
export const SYDNEY_PALETTE = {
  skyHigh: palette.sky2,
  skyLow: palette.sky,
  skyGlow: palette.warm,
  water: palette.blue2,
  waterDeep: palette.blue3,
  waterGlint: palette.blue,
  bridge: palette.char,
  bridgeTower: palette.brown3,
  operaSail: palette.cream,
  operaBase: palette.stone2,
  roof: palette.brown3,
  roofTrim: palette.brown2,
  roofLit: palette.warm,
  roofDark: palette.ink,
  shore: palette.stone3,
} as const;

const { width: W, height: H } = SYDNEY_ART_SIZE;

/** Where sky meets water. Fixed — only the layers below it pan. */
const HORIZON_Y = 62;
/** Where the water gives way to the shore the terraces sit on. */
const WATER_BOTTOM = H - 16;
/** Ground line the rooftops are measured up from. */
const SHORE_Y = H - 4;

/** Keeps an art-pixel x on `[0, width)` regardless of how negative it is. */
function wrap(x: number, width: number) {
  return ((x % width) + width) % width;
}

/** Sky gradient band down to the waterline. Locked to the screen. */
export function drawSydneySky(draw: Raster, frame: number): void {
  draw(0, 0, W, 26, SYDNEY_PALETTE.skyHigh);
  draw(0, 26, W, 20, SYDNEY_PALETTE.skyLow);
  draw(0, 46, W, HORIZON_Y - 46, SYDNEY_PALETTE.skyGlow);

  // Two cloud banks, drifting at slightly different speeds for depth.
  const banks: readonly (readonly [number, number, number])[] = [
    [30, 10, 22],
    [190, 18, 16],
  ];
  for (const [startX, y, bandWidth] of banks) {
    const drift = y < 14 ? frame >> 2 : frame >> 1;
    const x = wrap(startX + drift, W + 30) - 15;
    draw(x, y, bandWidth, 2, SYDNEY_PALETTE.skyHigh);
    draw(x + 3, y - 2, Math.max(5, bandWidth - 8), 2, SYDNEY_PALETTE.skyHigh);
  }
}

/** Harbour water: a flat fill with drifting glints. Pans slowly — near the
 *  sky's zero, since open water reads as far away even close to shore. */
export function drawHarbourWater(draw: Raster, frame: number, offset = 0): void {
  const shift = -Math.round(offset * SYDNEY_PARALLAX.water);
  const depth = WATER_BOTTOM - HORIZON_Y;

  draw(0, HORIZON_Y, W, depth, SYDNEY_PALETTE.water);
  draw(0, HORIZON_Y, W, 2, SYDNEY_PALETTE.waterDeep);
  draw(0, WATER_BOTTOM - 2, W, 2, SYDNEY_PALETTE.waterDeep);

  for (let index = 0; index < 14; index += 1) {
    const x = wrap(index * 23 + frame * 2 + shift, W);
    const y = HORIZON_Y + 4 + ((index * 13) % Math.max(1, depth - 6));
    draw(x, y, 3, 1, SYDNEY_PALETTE.waterGlint);
  }
}

/** The harbour bridge's arch, as a dark silhouette. */
const BRIDGE_SPAN = { xa: 40, xb: 190, deckY: HORIZON_Y - 2, rise: 12 } as const;

export function drawHarbourBridge(draw: Raster, offset = 0): void {
  const shift = -Math.round(offset * SYDNEY_PARALLAX.bridge);
  const xa = BRIDGE_SPAN.xa + shift;
  const xb = BRIDGE_SPAN.xb + shift;
  const { deckY, rise } = BRIDGE_SPAN;

  draw(xa - 1, deckY - 9, 3, 11, SYDNEY_PALETTE.bridge);
  draw(xb - 1, deckY - 9, 3, 11, SYDNEY_PALETTE.bridge);
  draw(xa, deckY, xb - xa, 1, SYDNEY_PALETTE.bridge);

  for (let x = xa; x <= xb; x += 1) {
    const t = (x - xa) / (xb - xa);
    const y = Math.round(deckY - 2 - rise * t * (1 - t) * 4);
    draw(x, y, 1, 1, SYDNEY_PALETTE.bridge);
    if ((x - xa) % 6 === 3 && y < deckY) {
      draw(x, y + 1, 1, deckY - y - 1, SYDNEY_PALETTE.bridgeTower);
    }
  }
}

/** One opera-house sail: a quarter-ellipse silhouette, tallest edge trailing. */
function operaSail(draw: Raster, x: number, base: number, width: number, height: number) {
  for (let row = 0; row < height; row += 1) {
    const t = row / height;
    const rowWidth = Math.max(1, Math.round(width * Math.sqrt(1 - t * t)));
    draw(x + width - rowWidth, base - 1 - row, rowWidth, 1, SYDNEY_PALETTE.operaSail);
  }
  draw(x + width - 1, base - height, 1, height, SYDNEY_PALETTE.operaBase);
}

/** The opera house, as a cluster of three sails on a stone base. */
export function drawOperaHouseSilhouette(draw: Raster, offset = 0): void {
  const shift = -Math.round(offset * SYDNEY_PARALLAX.opera);
  const x = 150 + shift;
  const base = HORIZON_Y + 1;

  operaSail(draw, x, base, 8, 7);
  operaSail(draw, x + 7, base, 7, 6);
  operaSail(draw, x + 13, base, 5, 4);
  draw(x, base, 19, 1, SYDNEY_PALETTE.operaBase);
}

/**
 * A run of terrace rooftops along the shore, tiling seamlessly at any offset.
 * The tiling period is fixed (rather than dependent on `offset`) so the
 * number of rooftops drawn — and so the draw-call count — never grows with
 * how far the camera has panned.
 */
const TERRACE_PERIOD = 15;

export function drawTerraceRooftops(draw: Raster, frame: number, offset = 0): void {
  const shift = -Math.round(offset * SYDNEY_PARALLAX.terraces);
  const phase = wrap(shift, TERRACE_PERIOD);

  draw(0, SHORE_Y, W, 1, SYDNEY_PALETTE.shore);

  let cursor = phase - TERRACE_PERIOD;
  let index = 0;
  while (cursor < W) {
    const roofWidth = 12 + ((index * 7) % 5);
    const roofHeight = 10 + ((index * 5) % 6);
    draw(cursor, SHORE_Y - roofHeight, roofWidth, roofHeight, SYDNEY_PALETTE.roof);
    draw(cursor, SHORE_Y - roofHeight, roofWidth, 1, SYDNEY_PALETTE.roofTrim);
    if (index % 2 === 0) {
      const lit = frame % 6 === index % 6;
      draw(
        cursor + 3,
        SHORE_Y - roofHeight + 4,
        2,
        3,
        lit ? SYDNEY_PALETTE.roofLit : SYDNEY_PALETTE.roofDark,
      );
    }
    cursor += roofWidth + 1;
    index += 1;
  }
}

/**
 * The full layered horizon: sky, water, bridge, opera house, terraces —
 * back to front. `frame` is the shared ambient counter used across
 * `lib/pixel`; `offset` is a horizontal scroll position in art pixels, with
 * each layer panning by its `SYDNEY_PARALLAX` ratio — not a staged camera
 * move, just enough parallax to read as depth if a scene scrolls this strip.
 *
 * Not wired into any scene — this composes the routines above into one call
 * for whichever ambient surface later adopts it.
 */
export function drawSydneyBackground(draw: Raster, frame: number, offset = 0): void {
  drawSydneySky(draw, frame);
  drawHarbourWater(draw, frame, offset);
  drawHarbourBridge(draw, offset);
  drawOperaHouseSilhouette(draw, offset);
  drawTerraceRooftops(draw, frame, offset);
}
