import { palette } from "@/lib/pixel/palette";
import type { ArtRoutine, Raster } from "@/lib/pixel/raster";
import { scatter } from "@/lib/pixel/raster";

/**
 * The clearing, and the sealed door in it.
 *
 * Dark, quiet and almost empty: one warm seam of light in a stand of trees.
 * No spectacle — the approved direction is explicit that this beat should be
 * restrained.
 */

export const INTRO_ART_SIZE = { width: 200, height: 120 } as const;

/** Where the six carved slots sit, as fractions of the art box. */
export const SLOT_POSITIONS: readonly { readonly x: number; readonly y: number }[] = [
  { x: 0.607, y: 0.40 },
  { x: 0.607, y: 0.523 },
  { x: 0.607, y: 0.647 },
  { x: 0.792, y: 0.40 },
  { x: 0.792, y: 0.523 },
  { x: 0.792, y: 0.647 },
];

/** The doorway, as a fraction of the art box. */
export const DOOR = { x: 0.66, y: 0.483, width: 0.08, height: 0.25 } as const;

const { width: W, height: H } = INTRO_ART_SIZE;
const GROUND_Y = 92;

export const drawClearing: ArtRoutine = (draw: Raster, frame: number) => {
  draw(0, 0, W, GROUND_Y, "#252822");

  // A scattering of stars, a few of them catching the light.
  for (let index = 0; index < 26; index += 1) {
    const noise = scatter(index * 7 + 3);
    const x = noise % W;
    const y = (noise >> 3) % (GROUND_Y - 12);
    draw(x, y, 1, 1, (index + frame) % 5 === 0 ? palette.cream : "#4A4A3C");
  }

  draw(0, GROUND_Y, W, H - GROUND_Y, "#20241D");
  draw(0, GROUND_Y, W, 1, "#333A2C");

  // Treeline closing in from both sides.
  for (let x = 0; x < 40; x += 8) {
    const height = 20 + (scatter(x) % 9);
    draw(x, GROUND_Y - height, 8, height, "#1B1E18");
  }
  for (let x = 164; x < W; x += 8) {
    const height = 22 + (scatter(x + 5) % 9);
    draw(x, GROUND_Y - height, 8, height, "#1B1E18");
  }

  // The sealed structure.
  draw(115, 42, 50, 50, "#5A5546");
  draw(115, 42, 50, 2, "#6E6857");
  draw(115, 42, 2, 50, "#6E6857");
  draw(117, 38, 46, 4, "#6E6857");
  draw(120, 35, 40, 3, "#5A5546");

  // The doorway, and the seam of light in it.
  draw(132, 58, 16, 34, "#14110D");
  draw(134, 54, 12, 4, "#14110D");
  const seam = frame % 2 ? 2 : 1;
  draw(140 - (seam >> 1), 58, seam, 34, palette.warm);
  draw(138, 53, 4, 1, "#C9BC8F");
  draw(136, 91, 8, 1, "#3D3A2C");

  // Empty carved slots. The glyphs fill these.
  for (const slot of SLOT_POSITIONS) {
    draw(Math.round(slot.x * W), Math.round(slot.y * H), 4, 4, "#3A3529");
    draw(Math.round(slot.x * W) + 1, Math.round(slot.y * H) + 1, 2, 2, "#4A4438");
  }
};
