import { palette } from "@/lib/pixel/palette";
import type { ArtRoutine, Raster } from "@/lib/pixel/raster";
import { dashes, scatter, wheel } from "@/lib/pixel/raster";

/**
 * The room the AFL Predict Lab happens in.
 *
 * A university sports-statistics room that has been in continuous use for
 * about thirty years: prefab wall panels, a cable tray bolted under the
 * ceiling, a timber bench, and an open bay of machinery underneath it. The
 * eccentricity is meant to be the ordinary kind — a reel-to-reel unit still
 * doing real work, a reliability plot taped up next to the match board — not
 * the neon kind. Nothing here glows except the status lights.
 *
 * The six CRTs are deliberately *not* drawn. They are live DOM in
 * `afl-experience.tsx`, because each one shows numbers this pipeline actually
 * computed and those have to be selectable, announceable text rather than
 * rasterised pixels. This module draws the room they stand in, and the bench
 * line at `LAB_LAYOUT.benchY` is the surface they stand on.
 *
 * Same rules as every other art module here: shared palette only, integer art
 * pixels, and deterministic given `(draw, frame)` — no `Math.random`.
 */

/** Backdrop size in art pixels: 16:9, matching the other location backdrops. */
export const LAB_ART_SIZE = { width: 240, height: 135 } as const;

/**
 * The room's horizontal bands, in art pixels.
 *
 * Exported because the CSS has to agree with them: the DOM CRT rack is
 * positioned so its feet land on `benchY`, and the console is sized so it
 * never covers the equipment bay. A backdrop drawn at `object-fit: cover`
 * puts each of these at a fixed fraction of viewport height, which is what
 * makes that agreement hold at any aspect.
 */
export const LAB_LAYOUT = {
  /** Cable tray under the ceiling. */
  trayY: 6,
  /** Top of the wall proper. */
  wallY: 9,
  /** Wall props hang from here — the band the CRT rack leaves clear. */
  boardY: 12,
  /** The bench surface. The CRT rack stands on this line. */
  benchY: 76,
  /** Open equipment bay beneath the bench. */
  bayY: 82,
  /** Floor line. */
  floorY: 106,
} as const;

/**
 * Every colour the lab is allowed, aliased to the shared palette.
 *
 * Named by role rather than by hue so the room can be re-graded in one place,
 * and so a reader can tell what a draw call is *for*.
 */
export const LAB_PALETTE = {
  ceiling: palette.ink,
  wall: palette.green4,
  wallLit: palette.green3,
  seam: palette.char,
  benchLip: palette.brown,
  benchTop: palette.brown2,
  benchEdge: palette.brown3,
  recess: palette.ink,
  floor: palette.soilDark,
  floorSeam: palette.char,
  chassis: palette.crtShell,
  chassisShade: palette.stone2,
  metal: palette.stone3,
  led: palette.warm,
  ledDim: palette.stone3,
  accent: palette.orange,
  accentDim: palette.orange2,
  paper: palette.paper,
  ink: palette.char,
  highlight: palette.cream,
  turf: palette.turf,
  line: palette.cream,
  tape: palette.hair,
  teamA: palette.cream,
  teamB: palette.blue2,
  cableA: palette.brown3,
  cableB: palette.blue3,
  cableC: palette.orange2,
  cableD: palette.green3,
} as const;

/* ── Room shell ───────────────────────────────────────────────────────────── */

/** Ceiling, wall, bench slab, equipment bay and floor. */
export function drawLabShell(draw: Raster) {
  const { width, height } = LAB_ART_SIZE;
  const { trayY, wallY, benchY, bayY, floorY } = LAB_LAYOUT;

  draw(0, 0, width, trayY, LAB_PALETTE.ceiling);
  draw(0, wallY, width, benchY - wallY, LAB_PALETTE.wall);

  // Prefab panel seams. Without them the wall reads as fog rather than a room.
  for (let x = 20; x < width; x += 40) {
    draw(x, wallY, 1, benchY - wallY, LAB_PALETTE.seam);
    draw(x + 1, wallY, 1, benchY - wallY, LAB_PALETTE.wallLit);
  }

  // The shadow the bench overhang throws back onto the wall.
  draw(0, benchY - 4, width, 4, LAB_PALETTE.seam);

  // Bench: a thick slab, lit along its front lip.
  draw(0, benchY, width, 1, LAB_PALETTE.benchLip);
  draw(0, benchY + 1, width, 3, LAB_PALETTE.benchTop);
  draw(0, benchY + 4, width, 2, LAB_PALETTE.benchEdge);

  // Equipment bay, kept deep in shade so the machinery in it reads as lit.
  draw(0, bayY, width, floorY - bayY, LAB_PALETTE.recess);

  draw(0, floorY, width, height - floorY, LAB_PALETTE.floor);
  draw(0, floorY, width, 1, LAB_PALETTE.benchEdge);
  for (let x = 12; x < width; x += 24) {
    draw(x, floorY + 1, 1, height - floorY - 1, LAB_PALETTE.floorSeam);
  }
}

/* ── Cabling ──────────────────────────────────────────────────────────────── */

/** One cable: down the wall, a jog sideways, then down again to the bench. */
function cable(
  draw: Raster,
  x: number,
  jogY: number,
  jogX: number,
  color: string,
) {
  const { trayY, benchY } = LAB_LAYOUT;
  draw(x, trayY + 3, 1, jogY - trayY - 3, color);
  draw(Math.min(x, x + jogX), jogY, Math.abs(jogX) + 1, 1, color);
  draw(x + jogX, jogY, 1, benchY - jogY, color);
}

/**
 * Cable runs placed to miss the wall props, so each one is legible top to
 * bottom before it disappears behind the equipment on the bench.
 */
const CABLE_RUNS = [
  { x: 4, jogY: 34, jogX: 6, color: LAB_PALETTE.cableA },
  { x: 96, jogY: 24, jogX: 5, color: LAB_PALETTE.cableD },
  { x: 136, jogY: 52, jogX: -6, color: LAB_PALETTE.cableC },
  { x: 236, jogY: 30, jogX: -5, color: LAB_PALETTE.cableB },
] as const;

/** The overhead tray, its junction box, and the cables dropping off it. */
export function drawCableRun(draw: Raster, frame: number) {
  const { width } = LAB_ART_SIZE;
  const { trayY } = LAB_LAYOUT;

  draw(0, trayY, width, 3, LAB_PALETTE.metal);
  draw(0, trayY, width, 1, LAB_PALETTE.chassisShade);
  for (let x = 14; x < width; x += 38) {
    draw(x, trayY + 3, 2, 3, LAB_PALETTE.seam);
  }

  for (const run of CABLE_RUNS) {
    cable(draw, run.x, run.jogY, run.jogX, run.color);
  }

  // Junction box on the tray, with a heartbeat light.
  draw(60, trayY - 3, 14, 8, LAB_PALETTE.chassis);
  draw(60, trayY - 3, 14, 1, LAB_PALETTE.highlight);
  draw(62, trayY - 1, 10, 3, LAB_PALETTE.recess);
  draw(63, trayY, 2, 1, Math.abs(frame) % 4 < 2 ? LAB_PALETTE.led : LAB_PALETTE.ledDim);
}

/* ── Wall: the match board, the pinned working, the field reference ───────── */

/**
 * The match board.
 *
 * Two sides and a round, written up by hand. Deliberately unreadable at world
 * scale — per the building language, signage is dashes and the real labels
 * live in the DOM beside it, so this can never drift out of step with what the
 * pipeline is actually running.
 */
export function drawMatchBoard(draw: Raster) {
  const x = 12;
  const y = LAB_LAYOUT.boardY;
  const width = 80;
  const height = 30;

  draw(x - 2, y - 2, width + 4, height + 4, LAB_PALETTE.benchEdge);
  draw(x - 2, y - 2, width + 4, 1, LAB_PALETTE.benchLip);
  draw(x, y, width, height, LAB_PALETTE.paper);

  // Header band: the round this demonstration is running.
  draw(x, y, width, 5, LAB_PALETTE.ink);
  dashes(draw, x + 3, y + 2, width - 8, LAB_PALETTE.paper);

  // One row per side: a colour chip, the side's name, its recent form.
  const rows = [
    { top: y + 8, chip: LAB_PALETTE.teamA },
    { top: y + 19, chip: LAB_PALETTE.teamB },
  ] as const;
  for (const row of rows) {
    draw(x + 4, row.top, 6, 6, row.chip);
    draw(x + 4, row.top, 6, 1, LAB_PALETTE.ink);
    dashes(draw, x + 14, row.top + 2, 42, LAB_PALETTE.ink);
    dashes(draw, x + 60, row.top + 2, 16, LAB_PALETTE.metal);
  }

  draw(x + 3, y + 16, width - 6, 1, LAB_PALETTE.metal);

  // Magnets holding the sheet flat.
  draw(x + 2, y + 6, 2, 2, LAB_PALETTE.accent);
  draw(x + width - 4, y + 6, 2, 2, LAB_PALETTE.accent);
  draw(x + width - 4, y + height - 3, 2, 2, LAB_PALETTE.accentDim);
}

/**
 * Working taped to the wall: a page of notes, and over it a reliability plot.
 *
 * The plot is the honest one to pin up here — a calibration stage is judged on
 * whether predicted probabilities match observed rates, so the diagonal is the
 * reference and the curve is what the model actually did.
 */
export function drawPinnedNotes(draw: Raster) {
  // Sheet one: notes.
  draw(101, 15, 26, 20, LAB_PALETTE.seam);
  draw(100, 14, 26, 20, LAB_PALETTE.paper);
  for (let row = 0; row < 5; row += 1) {
    dashes(draw, 103, 17 + row * 3, 20, LAB_PALETTE.metal);
  }
  draw(104, 12, 5, 3, LAB_PALETTE.chassisShade);

  // Sheet two: the reliability plot, taped over the corner of the first.
  draw(107, 21, 24, 18, LAB_PALETTE.seam);
  draw(106, 20, 24, 18, LAB_PALETTE.paper);
  draw(109, 23, 1, 12, LAB_PALETTE.ink);
  draw(109, 34, 18, 1, LAB_PALETTE.ink);
  for (let step = 0; step < 9; step += 1) {
    // The diagonal a perfectly calibrated model would sit on.
    draw(110 + step * 2, 33 - Math.round(step * 1.3), 1, 1, LAB_PALETTE.metal);
    // And the flatter curve of one that is over-confident before scaling.
    draw(110 + step * 2, 33 - Math.round(step * 0.95), 1, 1, LAB_PALETTE.accent);
  }
  draw(113, 18, 5, 3, LAB_PALETTE.chassisShade);
}

/** A filled ellipse with a one-pixel edge, capped top and bottom. */
function ovalFill(
  draw: Raster,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  fill: string,
  edge: string,
) {
  for (let dy = -ry; dy <= ry; dy += 1) {
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))));
    if (half < 1) {
      draw(cx - 1, cy + dy, 2, 1, edge);
      continue;
    }
    draw(cx - half, cy + dy, half * 2, 1, fill);
    draw(cx - half, cy + dy, 1, 1, edge);
    draw(cx + half - 1, cy + dy, 1, 1, edge);
  }
}

/**
 * The field reference: a framed diagram of an oval, centre square and goals.
 *
 * A reference, not a scoreboard — it never shows a state, because the lab has
 * no real match to show the state of.
 */
export function drawFieldReference(draw: Raster) {
  const x = 150;
  const y = LAB_LAYOUT.boardY;
  const width = 78;
  const height = 30;

  draw(x - 2, y - 2, width + 4, height + 4, LAB_PALETTE.benchEdge);
  draw(x - 2, y - 2, width + 4, 1, LAB_PALETTE.benchLip);
  draw(x, y, width, height, LAB_PALETTE.paper);

  const cx = x + (width >> 1);
  const cy = y + 13;
  ovalFill(draw, cx, cy, 34, 10, LAB_PALETTE.turf, LAB_PALETTE.line);

  // Centre square and centre circle.
  draw(cx - 3, cy - 3, 6, 6, LAB_PALETTE.line);
  draw(cx - 2, cy - 2, 4, 4, LAB_PALETTE.turf);
  draw(cx - 1, cy - 1, 2, 2, LAB_PALETTE.line);

  // Goal square and four posts at each end.
  for (const side of [-1, 1] as const) {
    draw(cx + side * 30 - 1, cy - 3, 2, 6, LAB_PALETTE.line);
    for (const offset of [-3, -1, 1, 3] as const) {
      draw(cx + side * 34, cy + offset, 1, 1, LAB_PALETTE.line);
    }
  }

  dashes(draw, x + 6, y + height - 4, width - 12, LAB_PALETTE.ink);
}

/* ── Equipment bay ────────────────────────────────────────────────────────── */

/** One tape reel, its spoke stepping round the hub so it visibly turns. */
function reel(draw: Raster, cx: number, cy: number, frame: number) {
  draw(cx - 5, cy - 4, 10, 8, LAB_PALETTE.tape);
  draw(cx - 4, cy - 5, 8, 10, LAB_PALETTE.tape);
  draw(cx - 2, cy - 2, 4, 4, LAB_PALETTE.chassisShade);
  draw(cx - 1, cy - 1, 2, 2, LAB_PALETTE.metal);

  const spokes = [
    [0, -4],
    [3, 0],
    [0, 3],
    [-4, 0],
  ] as const;
  const [dx, dy] = spokes[Math.abs(frame) % spokes.length];
  draw(cx + dx, cy + dy, 1, 1, LAB_PALETTE.led);
}

/** The reel-to-reel unit: where the demonstration round is read from. */
export function drawTapeDeck(draw: Raster, frame: number) {
  const x = 8;
  const y = 83;
  const width = 56;
  const height = 22;

  draw(x, y, width, height, LAB_PALETTE.chassis);
  draw(x, y, width, 1, LAB_PALETTE.highlight);
  draw(x, y + height - 2, width, 2, LAB_PALETTE.chassisShade);

  draw(x + 3, y + 3, width - 6, 13, LAB_PALETTE.recess);
  draw(x + 10, y + 4, width - 21, 1, LAB_PALETTE.tape);
  reel(draw, x + 10, y + 10, frame);
  reel(draw, x + width - 11, y + 10, frame + 2);

  for (let light = 0; light < 7; light += 1) {
    const lit = (scatter(light * 13) + Math.abs(frame)) % 5 < 2;
    draw(x + 5 + light * 4, y + 18, 2, 2, lit ? LAB_PALETTE.led : LAB_PALETTE.ledDim);
  }
}

/** Line printer, mid-page, with its fan-fold output stacking underneath. */
export function drawPrinter(draw: Raster) {
  draw(76, 86, 30, 4, LAB_PALETTE.paper);
  for (let mark = 0; mark < 5; mark += 1) {
    draw(78 + mark * 6, 87, 4, 1, LAB_PALETTE.metal);
  }
  draw(72, 90, 40, 10, LAB_PALETTE.chassis);
  draw(72, 90, 40, 1, LAB_PALETTE.highlight);
  draw(72, 98, 40, 2, LAB_PALETTE.chassisShade);

  for (let fold = 0; fold < 6; fold += 1) {
    draw(
      74,
      100 + fold,
      36 - (fold % 2) * 4,
      1,
      fold % 2 ? LAB_PALETTE.paper : LAB_PALETTE.chassisShade,
    );
  }
}

/** Patch panel and meters: the bay's one piece of visible signal routing. */
export function drawPatchPanel(draw: Raster, frame: number) {
  draw(190, 82, 44, 23, LAB_PALETTE.metal);
  draw(190, 82, 44, 1, LAB_PALETTE.chassisShade);
  draw(193, 85, 38, 9, LAB_PALETTE.recess);

  for (let socket = 0; socket < 9; socket += 1) {
    draw(195 + socket * 4, 86, 2, 2, LAB_PALETTE.chassisShade);
    draw(195 + socket * 4, 91, 2, 2, LAB_PALETTE.chassisShade);
  }
  // Two leads patched across, because a panel with nothing in it is a prop.
  draw(196, 89, 9, 1, LAB_PALETTE.cableC);
  draw(212, 89, 13, 1, LAB_PALETTE.cableD);

  // A meter whose needle drifts, and a bank of lights that does not.
  draw(194, 96, 16, 8, LAB_PALETTE.recess);
  draw(194, 103, 16, 1, LAB_PALETTE.chassisShade);
  draw(197 + (Math.abs(frame) % 4) * 3, 98, 1, 5, LAB_PALETTE.accent);
  draw(214, 96, 16, 8, LAB_PALETTE.recess);
  for (let light = 0; light < 5; light += 1) {
    const lit = (scatter(light * 29) + Math.abs(frame)) % 4 < 2;
    draw(216 + light * 3, 99, 2, 2, lit ? LAB_PALETTE.led : LAB_PALETTE.ledDim);
  }
}

/** Coiled spare cable and two crates of printouts, filling the bay's middle. */
export function drawBayStores(draw: Raster) {
  wheel(draw, 118, 92, 13, LAB_PALETTE.cableB);
  wheel(draw, 121, 95, 7, LAB_PALETTE.cableD);

  draw(142, 90, 20, 15, LAB_PALETTE.benchEdge);
  draw(142, 90, 20, 1, LAB_PALETTE.benchLip);
  dashes(draw, 145, 96, 14, LAB_PALETTE.metal);

  draw(164, 94, 18, 11, LAB_PALETTE.benchEdge);
  draw(164, 94, 18, 1, LAB_PALETTE.benchLip);
  dashes(draw, 167, 100, 12, LAB_PALETTE.metal);
}

/* ── Composite ────────────────────────────────────────────────────────────── */

/**
 * The whole room, back to front.
 *
 * Order matters: cables are run before the wall props so they pass *behind*
 * the board and the field reference the way real ones would.
 */
export const drawAflLab: ArtRoutine = (draw, frame) => {
  drawLabShell(draw);
  drawCableRun(draw, frame);
  drawMatchBoard(draw);
  drawPinnedNotes(draw);
  drawFieldReference(draw);
  drawTapeDeck(draw, frame);
  drawPrinter(draw);
  drawBayStores(draw);
  drawPatchPanel(draw, frame);
};
