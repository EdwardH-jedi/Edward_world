import { palette } from "@/lib/pixel/palette";
import type { Raster } from "@/lib/pixel/raster";
import { scatter } from "@/lib/pixel/raster";

/**
 * Ambient motion that is more than a pixel nudge inside one routine.
 *
 * Every function here is a pure function of the shared ambient `frame`: no
 * clocks, no randomness, no state. The same frame always paints the same
 * pixels, and under reduced motion (where the frame stops at 0) the first
 * frame renders and nothing advances.
 */

const CLOUD_COLOR = "#F2EAD6";

/** Cloud banks `[startX, y, width]`, in art pixels. */
const CLOUDS = [
  [40, 14, 16],
  [170, 30, 11],
  [250, 21, 16],
  [370, 9, 12],
  [470, 26, 16],
  [560, 16, 10],
  [640, 34, 16],
  [750, 12, 13],
  [830, 24, 16],
  [910, 38, 11],
] as const;

/**
 * Clouds advance one art pixel every 4 frames (high banks) or every 2 (low
 * banks), which reads as depth, and wrap past the right edge.
 */
export function drawClouds(draw: Raster, frame: number, worldWidth: number) {
  for (const [startX, y, width] of CLOUDS) {
    const drift = y < 20 ? frame >> 2 : frame >> 1;
    const x = ((startX + drift) % (worldWidth + 40)) - 20;
    draw(x, y, width, 3, CLOUD_COLOR);
    draw(x + 3, y - 2, Math.max(5, width - 7), 2, CLOUD_COLOR);
  }
}

/** Frames between the start of one bird's crossing and the next. */
export const BIRD_PERIOD = 40;
const BIRD_FIRST_FRAME = 2;
const BIRD_LAST_FRAME = 34;

/**
 * One bird, a 3-pixel sprite with two wing positions, crossing the sky once
 * per `BIRD_PERIOD` frames and then despawning. The first bird flies where the
 * visitor starts; later ones are placed by `scatter` so they cross other parts
 * of the world.
 */
export function drawBird(draw: Raster, frame: number, worldWidth: number) {
  const cycle = Math.floor(frame / BIRD_PERIOD);
  const phase = frame % BIRD_PERIOD;
  if (phase < BIRD_FIRST_FRAME || phase >= BIRD_LAST_FRAME) return;

  const travelled = phase - BIRD_FIRST_FRAME;
  const startX = cycle === 0 ? 40 : scatter(cycle * 97 + 5) % (worldWidth - 160);
  const y = cycle === 0 ? 18 : 10 + (scatter(cycle * 31 + 3) % 20);
  const x = startX + travelled * 3;

  if (travelled % 2 === 0) {
    // Wings up.
    draw(x, y, 1, 1, palette.brown3);
    draw(x + 1, y + 1, 1, 1, palette.brown3);
    draw(x + 2, y, 1, 1, palette.brown3);
  } else {
    // Wings down.
    draw(x, y + 1, 1, 1, palette.brown3);
    draw(x + 1, y, 1, 1, palette.brown3);
    draw(x + 2, y + 1, 1, 1, palette.brown3);
  }
}

/** Hanging signs drop one pixel on every other frame. */
export function signBob(frame: number) {
  return frame % 2;
}
