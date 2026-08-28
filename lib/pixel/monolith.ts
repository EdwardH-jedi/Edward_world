import {
  bannerText,
  bigTree,
  bridge,
  bush,
  cloud,
  fern,
  flowers,
  glyph,
  lamp,
  motes,
  opera,
  P,
  skyline,
  soil,
  stars,
  terraces,
  tinyAvatar,
} from "@/lib/pixel/opening";
import type { Raster } from "@/lib/pixel/raster";

/**
 * The alphabet monolith, and the two scenes it lives in.
 *
 * Ported from the approved V4 board: a monolith/structure hybrid — stepped
 * plinth, shoulders, capstone, an apex ring, and two gate pylons — carrying a
 * seventy-letter A–Z face in weathered terracotta found nowhere else in the
 * world. Thirteen of those carvings are the visitor's target.
 */

/** Terracotta. Deliberately outside the world's palette. */
export const R = {
  light: "#B98B66",
  base: "#9A7052",
  shade: "#7C563F",
  edge: "#5E4030",
  carve: "#4A3226",
  socket: "#2A1D15",
  warm: "#F3E3B2",
  glow: "#F7F1E2",
} as const;

/** The 4x5 carved face. Smaller than the display font, and squarer. */
const M4: Readonly<Record<string, readonly string[]>> = {
  A: [".##.", "#..#", "####", "#..#", "#..#"],
  B: ["###.", "#..#", "###.", "#..#", "###."],
  C: [".###", "#...", "#...", "#...", ".###"],
  D: ["###.", "#..#", "#..#", "#..#", "###."],
  E: ["####", "#...", "###.", "#...", "####"],
  F: ["####", "#...", "###.", "#...", "#..."],
  G: [".###", "#...", "#.##", "#..#", ".###"],
  H: ["#..#", "#..#", "####", "#..#", "#..#"],
  I: ["###.", ".#..", ".#..", ".#..", "###."],
  J: ["..##", "...#", "...#", "#..#", ".##."],
  K: ["#..#", "#.#.", "##..", "#.#.", "#..#"],
  L: ["#...", "#...", "#...", "#...", "####"],
  M: ["#..#", "####", "####", "#..#", "#..#"],
  N: ["#..#", "##.#", "#.##", "#..#", "#..#"],
  O: [".##.", "#..#", "#..#", "#..#", ".##."],
  P: ["###.", "#..#", "###.", "#...", "#..."],
  Q: [".##.", "#..#", "#..#", "#.#.", ".#.#"],
  R: ["###.", "#..#", "###.", "#.#.", "#..#"],
  S: [".###", "#...", ".##.", "...#", "###."],
  T: ["####", ".#..", ".#..", ".#..", ".#.."],
  U: ["#..#", "#..#", "#..#", "#..#", ".##."],
  V: ["#..#", "#..#", "#..#", ".##.", "..#."],
  W: ["#..#", "#..#", "####", "####", "#..#"],
  X: ["#..#", "#..#", ".##.", "#..#", "#..#"],
  Y: ["#..#", "#..#", ".##.", ".#..", ".#.."],
  Z: ["####", "...#", ".##.", "#...", "####"],
};

export function g4(
  draw: Raster,
  x: number,
  y: number,
  ch: string,
  colour: string,
  scale = 1,
) {
  const rows = M4[ch];
  if (!rows) return;
  rows.forEach((row, j) => {
    for (let i = 0; i < 4; i += 1) {
      if (row[i] === "#") draw(x + i * scale, y + j * scale, scale, scale, colour);
    }
  });
}

/**
 * Which of the seventy carvings spell the name.
 *
 * A grid index is `occurrence * 26 + letter`, so a repeated letter is a
 * different physical carving each time. Read out, these are
 * S O O N · H Y U N · H W A N G.
 */
export const SEL: readonly number[] = [18, 14, 40, 13, 7, 24, 20, 39, 33, 22, 0, 65, 6];

export const LINES: readonly string[] = ["SOON", "HYUN", "HWANG"];

/** The letter a grid index carries. */
export function letterAt(index: number) {
  return String.fromCharCode(65 + (index % 26));
}

/** Where the nth selected letter flies to, in the assembled name. */
export function selTarget(n: number, ax: number, ay: number) {
  let k = n;
  for (let line = 0; line < LINES.length; line += 1) {
    if (k < LINES[line].length) {
      return { x: ax + k * 12, y: ay + line * 18, ch: LINES[line][k] };
    }
    k -= LINES[line].length;
  }
  return { x: ax, y: ay, ch: LINES[0][0] };
}

/* ── The monolith ────────────────────────────────────────────────────────── */

/**
 * Phases, matching the board's storyboard:
 *   3 dormant · 4 letters pulling free · 5 name assembled ·
 *   6 the ask · 7 typing (channels waking) · 8 unlocked
 */
export type MonolithPhase = 3 | 4 | 5 | 6 | 7 | 8;

export function drawMonolith(
  draw: Raster,
  cx: number,
  groundY: number,
  frame: number,
  phase: MonolithPhase,
  typed = 0,
) {
  const x0 = cx - 21;
  const top = groundY - 82;

  // Gate pylons, which catch as braziers once the ritual is under way.
  for (const px of [cx - 40, cx + 32]) {
    draw(px, groundY - 14, 8, 14, R.base);
    draw(px, groundY - 14, 8, 1, R.light);
    draw(px + 7, groundY - 14, 1, 14, R.edge);
    draw(px + 2, groundY - 10, 2, 2, R.carve);
    draw(px + 4, groundY - 6, 2, 2, R.carve);
    if (phase >= 7) draw(px + 3, groundY - 16, 2, 2, frame % 2 ? R.warm : R.glow);
  }

  // Three-step plinth with worn central stairs.
  for (const [width, up] of [[64, 4], [54, 8], [46, 12]] as const) {
    const y = groundY - up;
    draw(cx - (width >> 1), y, width, 4, R.base);
    draw(cx - (width >> 1), y, width, 1, R.light);
    draw(cx - (width >> 1), y + 3, width, 1, R.edge);
    draw(cx - 6, y, 12, 1, "#C9A278");
  }

  // Shaft.
  draw(x0, top, 42, 70, R.base);
  draw(x0, top, 42, 1, R.light);
  draw(x0, top, 1, 70, R.light);
  draw(x0 + 41, top, 1, 70, R.edge);
  for (let i = 0; i < 30; i += 1) {
    draw(x0 + ((i * 37 + 11) % 42), top + ((i * 23 + 5) % 70), 1, 1, i % 2 ? R.shade : R.light);
  }

  // Shoulder blocks and weathering.
  draw(x0 - 3, top + 14, 3, 10, R.base);
  draw(x0 - 3, top + 14, 3, 1, R.light);
  draw(x0 + 42, top + 14, 3, 10, R.shade);
  draw(x0 + 8, top + 40, 1, 6, R.edge);
  draw(x0 + 31, top + 22, 1, 7, R.edge);

  // Capstone and apex stone.
  draw(cx - 26, top - 6, 52, 6, R.base);
  draw(cx - 26, top - 6, 52, 1, R.light);
  draw(cx - 26, top - 1, 52, 1, R.edge);
  draw(cx - 6, top - 12, 12, 6, R.base);
  draw(cx - 6, top - 12, 12, 1, R.light);

  // The apex ring — the only thing that glows before the door exists.
  const ring = phase >= 7 ? (frame % 3 ? R.warm : R.glow) : R.carve;
  draw(cx - 2, top - 10, 4, 1, ring);
  draw(cx - 2, top - 7, 4, 1, ring);
  draw(cx - 2, top - 9, 1, 2, ring);
  draw(cx + 1, top - 9, 1, 2, ring);
  if (phase >= 8) draw(cx - 4, top - 13, 8, 1, "rgba(243,227,178,0.4)");

  // The carved face.
  draw(x0 + 3, top + 3, 36, 64, R.shade);
  draw(x0 + 4, top + 4, 34, 62, R.base);
  if (phase >= 7) {
    draw(x0 + 3, top + 3, 36, 1, R.warm);
    draw(x0 + 3, top + 3, 1, 64, phase >= 8 ? R.warm : "rgba(243,227,178,0.5)");
  }
  if (phase >= 8) {
    draw(x0 + 38, top + 3, 1, 64, R.warm);
    draw(x0 + 3, top + 66, 36, 1, R.warm);
  }

  const faceX = cx - 17;
  const faceY = top + 5;
  for (let index = 0; index < 70; index += 1) {
    const ch = letterAt(index);
    const col = index % 7;
    const row = (index / 7) | 0;
    const x = faceX + col * 5;
    const y = faceY + row * 6;
    const chosen = SEL.indexOf(index);

    // Once a letter has left, its socket stays.
    if (chosen >= 0 && (phase >= 5 || (phase === 4 && chosen < 7))) {
      draw(x - 1, y - 1, 6, 6, R.socket);
      draw(x - 1, y + 4, 6, 1, R.light);
      continue;
    }
    if (chosen >= 0 && phase === 4) {
      draw(x - 1, y - 1, 6, 6, "rgba(243,227,178,0.22)");
      g4(draw, x, y, ch, frame % 4 < 3 ? R.warm : R.glow);
      continue;
    }
    g4(draw, x, y, ch, R.carve);
  }

  for (let i = 0; i < 8; i += 1) {
    draw(cx - 30 + ((i * 8) % 60), groundY - 1, 2, 1, P.grass2);
  }

  // The doorway, once the name is proven.
  if (phase >= 8) {
    draw(cx - 8, groundY - 34, 16, 22, R.edge);
    draw(cx - 7, groundY - 33, 14, 21, R.warm);
    draw(cx - 5, groundY - 31, 10, 19, R.glow);
    draw(cx - 1, top + 3, 2, 46, frame % 3 ? R.warm : R.glow);
    draw(cx - 12, groundY - 12, 24, 12, "rgba(243,227,178,0.25)");
    draw(cx - 16, groundY, 32, 3, "rgba(243,227,178,0.15)");
  } else if (phase >= 6) {
    // The seam the ask leaves behind, brightening a step every third letter
    // once typing begins. It never drops below what phase 6 already showed.
    const steps = phase >= 7 ? Math.min(4, Math.floor(typed / 3)) : 0;
    draw(cx - 1, groundY - 34, 2, 22, `rgba(243,227,178,${0.2 + steps * 0.15})`);
  }

  // Letters in flight, halfway to the name.
  if (phase === 4) {
    for (let n = 0; n < 7; n += 1) {
      const index = SEL[n];
      const col = index % 7;
      const row = (index / 7) | 0;
      const sx = faceX + col * 5;
      const sy = faceY + row * 6;
      const target = selTarget(n, cx - 100, 16);
      const bob = (frame + n) % 4 < 2 ? 0 : 1;
      g4(
        draw,
        Math.round(sx + (target.x - sx) * 0.5),
        Math.round(sy + (target.y - sy) * 0.5) + bob,
        letterAt(index),
        R.warm,
      );
    }
  }
}

/** A monolith seen from far off, only its crown catching the light. */
export function drawDistantMonolith(
  draw: Raster,
  cx: number,
  groundY: number,
) {
  draw(cx - 32, groundY - 8, 64, 8, R.base);
  draw(cx - 32, groundY - 8, 64, 1, R.light);
  draw(cx - 21, groundY - 84, 42, 76, R.base);
  draw(cx - 21, groundY - 84, 1, 76, R.light);
  draw(cx + 20, groundY - 84, 1, 76, R.edge);
  draw(cx - 26, groundY - 90, 52, 6, R.base);
  draw(cx - 26, groundY - 90, 52, 1, R.light);
  draw(cx - 6, groundY - 96, 12, 6, R.base);
  draw(cx - 17, groundY - 80, 34, 64, R.shade);
  draw(cx - 16, groundY - 79, 32, 62, R.base);
  for (let row = 0; row < 10; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      draw(cx - 14 + col * 6, groundY - 76 + row * 6, 4, 1, R.carve);
    }
  }
}

/* ── The inscription slab ────────────────────────────────────────────────── */

/**
 * Thirteen carved sockets, one per letter, with gaps where the spaces are.
 * A filled socket holds a lit letter; the next one carries the cursor.
 */
export function drawTablet(
  draw: Raster,
  cx: number,
  y: number,
  frame: number,
  typed: number,
  scale: number,
  missAt: number | null = null,
) {
  const text = "SOON HYUN HWANG";
  let width = 0;
  for (const ch of text) width += ch === " " ? 3 * scale : 6 * scale;
  width -= 2 * scale;

  const x = cx - (width >> 1);
  draw(x - 2 * scale - 1, y - scale - 2, width + 4 * scale + 2, 7 * scale + 4, R.edge);
  draw(x - 2 * scale, y - scale - 1, width + 4 * scale, 7 * scale + 2, R.base);
  draw(x - 2 * scale, y - scale - 1, width + 4 * scale, 1, R.light);

  let cursor = x;
  let index = 0;
  for (const ch of text) {
    if (ch === " ") {
      cursor += 3 * scale;
      continue;
    }
    if (index < typed) {
      g4(draw, cursor, y, ch, frame % 4 < 3 ? R.warm : R.glow, scale);
    } else {
      // An empty socket. A wrong key flashes this one dark; how long the
      // flash lasts is the view's business, not the frame counter's.
      const flashing = missAt === index;
      draw(cursor - 1, y - 1, 4 * scale + 2, 5 * scale + 2, flashing ? "#140E0A" : R.socket);
      draw(cursor - 1, y + 5 * scale, 4 * scale + 2, 1, R.light);
      // The cursor rests on the next socket. Even parity, so a frozen frame
      // under reduced motion still shows where typing will land.
      if (index === typed && !flashing && frame % 2 === 0) {
        draw(cursor, y, 4 * scale, 5 * scale, "rgba(243,227,178,0.35)");
      }
    }
    cursor += 6 * scale;
    index += 1;
  }
}

/* ── Scenes ──────────────────────────────────────────────────────────────── */

export const APPROACH_ART_SIZE = { width: 240, height: 135 } as const;
export const SHRINE_ART_SIZE = { width: 220, height: 124 } as const;

/**
 * The title view and the pan east.
 *
 * `offset` is the camera. At zero the monolith is fully off-screen and only a
 * faint warm glow past the right treeline hints that anything is there; the
 * layers slide at different speeds as it grows.
 */
export function drawApproach(draw: Raster, frame: number, offset = 0) {
  const W = APPROACH_ART_SIZE.width;
  const far = -Math.round(offset * 0.25);
  const mid = -Math.round(offset * 0.55);
  const near = -offset;

  draw(0, 0, W, 28, P.skyT);
  draw(0, 28, W, 26, P.sky);
  draw(0, 54, W, 16, P.skyH);
  stars(draw, W, frame);
  cloud(draw, ((40 + frame) % (W + 30)) - 15, 10);
  cloud(draw, ((150 + (frame >> 1)) % (W + 30)) - 15, 24);
  cloud(draw, ((90 + frame) % (W + 30)) - 15, 40);

  const birdX = ((frame * 3) % (W + 30)) - 15;
  draw(birdX, 16, 2, 1, P.char);
  draw(birdX + 4, 15, 2, 1, P.char);

  bridge(draw, 16 + far, 100 + far, 58, 16);
  skyline(draw, 118 + far, 62, frame, true);
  opera(draw, 200 + far, 63);

  draw(0, 64, W, 16, P.water);
  draw(0, 79, W, 1, P.water2);
  for (let i = 0; i < 12; i += 1) {
    draw((i * 23 + frame * 2) % (W - 4), 66 + ((i * 13) % 12), 3, 1, P.glint);
  }
  const ferryX = ((frame * 2) % (W + 30)) - 15;
  draw(ferryX, 72, 8, 2, P.char);
  draw(ferryX + 2, 70, 3, 2, P.char);
  draw(ferryX - 3, 74, 3, 1, P.glint);

  terraces(draw, mid - 10, W + 80 + mid, 96, frame, 1);
  bigTree(draw, 28 + near, 116, frame, false);

  draw(0, 96, W, 2, P.grassH);
  draw(0, 98, W, 20, P.grass);
  for (let x = 0; x < W; x += 1) {
    if ((x * 13 + 7) % 29 < 2) draw(x, 100 + ((x * 7) % 16), 1, 1, P.grass2);
  }
  soil(draw, W, 118, 135);

  // The winding stone path.
  for (let x = 0; x < W; x += 1) {
    const y = 112 - Math.round(2 * Math.sin((x + offset) * 0.06));
    draw(x, y, 1, 3, P.path);
    if ((x + offset) % 9 < 1) draw(x, y + 3, 1, 1, P.stone2);
  }

  bush(draw, 58 + near, 114);
  fern(draw, 72 + near, 113, frame);
  flowers(draw, 78 + near, 112, "#C98A52");
  flowers(draw, 142 + near, 114, P.water);
  lamp(draw, 92 + near, 112);
  draw(91 + near, 95, 6, 4, "rgba(243,227,178,0.18)");
  lamp(draw, 168 + near, 114);
  bush(draw, 178 + near, 116);

  drawDistantMonolith(draw, 296 + near, 124);
  tinyAvatar(draw, 118 + Math.round(offset * 0.5) + near, 104);

  // Foreground canopy, framing the frame.
  bigTree(draw, 0 + near, 130, frame, true);
  bigTree(draw, 204 + near, 132, frame, true);

  // Before the pan, only a hint past the right treeline.
  if (offset === 0) draw(212, 94, 6, 22, "rgba(243,227,178,0.1)");

  motes(draw, W, 135, frame);
  for (let i = 0; i < 5; i += 1) {
    if ((frame + i) % 3 === 0) {
      draw((i * 47 + frame * 3) % W, 104 + ((i * 13) % 12), 1, 1, R.warm);
    }
  }
  draw(0, 131, W, 4, "rgba(34,31,26,0.35)");
}

/** The shrine clearing, at whichever beat of the ritual. */
export function drawShrine(
  draw: Raster,
  frame: number,
  phase: MonolithPhase,
  typed = 0,
  missAt: number | null = null,
) {
  const W = SHRINE_ART_SIZE.width;
  const groundY = 100;
  const cx = 118;

  draw(0, 0, W, 16, P.skyT);
  draw(0, 16, W, 20, P.sky);
  draw(0, 36, W, 10, P.skyH);
  stars(draw, W, frame);
  cloud(draw, ((50 + frame) % (W + 30)) - 15, 8);
  cloud(draw, ((160 + (frame >> 1)) % (W + 30)) - 15, 20);

  draw(0, 46, W, 6, "#A9A188");
  terraces(draw, -6, 58, 58, frame, 3);
  terraces(draw, 166, W + 10, 58, frame, 7);
  draw(58, 50, 108, 4, P.water);
  for (let i = 0; i < 5; i += 1) {
    draw(60 + ((i * 23 + frame * 2) % 104), 51 + (i % 3), 3, 1, P.glint);
  }

  draw(0, 58, W, 2, P.grassH);
  draw(0, 60, W, 48, P.grass);
  for (let x = 0; x < W; x += 1) {
    if ((x * 13 + 7) % 29 < 2) draw(x, 63 + ((x * 7) % 40), 1, 1, P.grass2);
  }
  // Dusk deepens once the letters start moving.
  if (phase >= 4) draw(0, 0, W, 58, "rgba(36,32,26,0.22)");

  soil(draw, W, 108, 124);

  draw(0, 100, cx - 52, 3, P.path);
  draw(0, 99, cx - 52, 1, P.stone);
  for (let i = 0; i < 13; i += 1) {
    draw(cx - 52 + i * 8, 100, 7, 3, i % 2 ? P.stone : P.stone2);
  }

  bigTree(draw, 2, 100, frame, true);
  bigTree(draw, 196, 102, frame, true);
  bush(draw, 34, 100);
  fern(draw, 46, 100, frame);
  flowers(draw, 52, 100, "#C98A52");
  flowers(draw, 168, 101, P.water);
  fern(draw, 178, 101, frame);
  lamp(draw, 28, 98);
  draw(27, 80, 6, 4, "rgba(243,227,178,0.18)");

  drawMonolith(draw, cx, groundY, frame, phase, typed);

  if (phase === 8) tinyAvatar(draw, cx - 3, 91, true);
  else tinyAvatar(draw, 44, 92);

  // The assembled name, held overhead as the reference while typing.
  if (phase >= 5 && phase <= 7) {
    draw(12, 10, 76, 58, "rgba(28,25,20,0.45)");
    LINES.forEach((word, line) => {
      for (let k = 0; k < word.length; k += 1) {
        const bob = (frame + line + k) % 6 < 3 ? 0 : 1;
        glyph(draw, 18 + k * 12, 16 + line * 18 + bob, word[k], R.glow, 2);
      }
    });
  }

  if (phase >= 6) {
    if (phase < 8) {
      draw(40, 71, 140, 11, "rgba(28,25,20,0.5)");
      bannerText(
        draw,
        48,
        73,
        1,
        "TYPE THE NAME TO ENTER",
        phase === 6 ? (frame % 4 < 3 ? R.warm : R.glow) : "#B99F6E",
      );
    }
    drawTablet(draw, 110, 109, frame, phase === 6 ? 0 : typed, 1, missAt);
  }

  motes(draw, W, 124, frame);
  for (let i = 0; i < 5; i += 1) {
    if ((frame + i) % 3 === 0) {
      draw((i * 47 + frame * 3) % W, 88 + ((i * 13) % 14), 1, 1, R.warm);
    }
  }
  draw(0, 120, W, 4, "rgba(34,31,26,0.35)");
}
