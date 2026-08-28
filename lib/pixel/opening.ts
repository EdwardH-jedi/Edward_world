import type { Raster } from "@/lib/pixel/raster";

/**
 * Scenery for the opening: pixel Sydney at dusk.
 *
 * Ported from the approved design's `opening.js`, keeping its own palette
 * rather than the world's. The opening is a different time of day and a
 * different place — harbour, bridge, terraces, park — and the board treats it
 * as its own visual family. Only what the V4 board reaches is ported here;
 * the V2 and V3 illustrations stay in the design project.
 */

export const P = {
  skyT: "#C2B190",
  sky: "#D8C6A2",
  skyH: "#E8D6AE",
  cloud: "#E4D6B4",
  far: "#8B8574",
  far2: "#6E6A5C",
  bridge: "#3F4440",
  water: "#6F8892",
  water2: "#54707C",
  glint: "#93A8B0",
  roof: "#4A4238",
  roofD: "#3E3831",
  warm: "#F3E3B2",
  glow: "#F7F1E2",
  stone: "#C0B598",
  stone2: "#9C9179",
  stone3: "#6E6555",
  carve: "#7E7460",
  ink: "#221F1A",
  char: "#2B2823",
  grass: "#75825A",
  grass2: "#5E6B4B",
  grassH: "#8A946B",
  path: "#C4BAA3",
  orange: "#C98A52",
  skin: "#D8B28A",
  opera: "#EFE7D3",
} as const;

/** The 5x7 display face, used for the assembled name. */
export const FONT: Readonly<Record<string, readonly string[]>> = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".####", "#....", "#....", "#..##", "#...#", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  J: ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
};

export function glyph(
  draw: Raster,
  x: number,
  y: number,
  ch: string,
  colour: string,
  scale = 1,
) {
  const rows = FONT[ch];
  if (!rows) return;
  rows.forEach((row, j) => {
    for (let i = 0; i < 5; i += 1) {
      if (row[i] === "#") draw(x + i * scale, y + j * scale, scale, scale, colour);
    }
  });
}

export function cloud(draw: Raster, x: number, y: number) {
  draw(x, y, 14, 2, P.cloud);
  draw(x + 3, y - 2, 7, 2, P.cloud);
}

/** The city across the water. `big` is the near skyline, used on the title. */
export function skyline(
  draw: Raster,
  x0: number,
  base: number,
  frame: number,
  big: boolean,
) {
  const blocks = big
    ? [
        [0, 9, 16], [10, 7, 24], [18, 11, 12], [30, 6, 20],
        [38, 9, 28], [48, 7, 14], [56, 10, 20], [67, 6, 12],
      ]
    : [
        [0, 8, 12], [9, 6, 18], [16, 9, 9], [26, 5, 14],
        [32, 7, 20], [40, 6, 10], [47, 8, 15],
      ];

  blocks.forEach(([offset, width, height], index) => {
    draw(x0 + offset, base - height, width, height, P.far);
    if (index % 2 === 0) {
      draw(
        x0 + offset + 2,
        base - height + 3,
        1,
        1,
        frame % 7 === index ? P.warm : P.far2,
      );
    }
  });

  const towerX = x0 + (big ? 76 : 56);
  const towerHeight = big ? 34 : 26;
  draw(towerX, base - towerHeight, 1, towerHeight, P.far2);
  draw(towerX - 2, base - (big ? 30 : 23), 5, 4, P.far2);
  draw(towerX, base - (big ? 37 : 29), 1, 3, P.far2);
}

export function bridge(
  draw: Raster,
  xa: number,
  xb: number,
  deckY: number,
  amp: number,
) {
  draw(xa - 1, deckY - 9, 3, 11, P.bridge);
  draw(xb - 1, deckY - 9, 3, 11, P.bridge);
  draw(xa, deckY, xb - xa, 1, P.bridge);
  for (let x = xa; x <= xb; x += 1) {
    const t = (x - xa) / (xb - xa);
    const y = Math.round(deckY - 2 - amp * 4 * t * (1 - t));
    draw(x, y, 1, 1, P.bridge);
    if ((x - xa) % 6 === 3 && y < deckY) {
      draw(x, y + 1, 1, deckY - y - 1, "rgba(63,68,64,0.45)");
    }
  }
}

function sail(draw: Raster, x: number, base: number, w: number, h: number) {
  for (let j = 0; j < h; j += 1) {
    const wj = Math.max(1, Math.round(w * Math.sqrt(1 - (j / h) * (j / h))));
    draw(x + w - wj, base - 1 - j, wj, 1, P.opera);
  }
  draw(x + w - 1, base - h, 1, h, P.stone2);
}

export function opera(draw: Raster, x: number, base: number) {
  sail(draw, x, base, 8, 7);
  sail(draw, x + 7, base, 7, 6);
  sail(draw, x + 13, base, 5, 4);
  draw(x, base, 19, 1, P.stone2);
}

/** A run of terrace roofs, with the odd lit window. */
export function terraces(
  draw: Raster,
  x0: number,
  x1: number,
  base: number,
  frame: number,
  seed: number,
) {
  let x = x0;
  let k = seed || 0;
  while (x < x1 - 8) {
    const w = 12 + ((k * 7) % 5);
    const h = 14 + ((k * 5) % 6);
    draw(x, base - h, w, h, P.roof);
    draw(x, base - h, w, 1, "#5C5344");
    draw(x + 2, base - h - 3, 2, 3, P.roofD);
    if (k % 3 === 0) draw(x + w - 4, base - h - 2, 1, 2, P.roofD);
    if (k % 2 === 0) {
      draw(x + 3, base - h + 4, 2, 3, frame % 6 === k % 6 ? P.warm : "#3A332B");
    }
    draw(x + w - 5, base - h + 6, 2, 3, "#3A332B");
    x += w + 1;
    k += 1;
  }
}

/** Edward at world scale. `dark` is his silhouette, for the doorway. */
export function tinyAvatar(draw: Raster, x: number, y: number, dark = false) {
  const hair = dark ? P.char : "#26221D";
  const face = dark ? P.char : P.skin;
  const coat = dark ? P.char : "#7B7669";
  const legs = dark ? P.char : "#3A362F";
  const rows = [
    ".hhhh.", ".hffh.", "cccccc", "cccccc",
    ".cccc.", ".pppp.", ".p..p.", ".s..s.",
  ];
  rows.forEach((row, j) => {
    for (let i = 0; i < 6; i += 1) {
      const key = row[i];
      if (key === ".") continue;
      const colour =
        key === "h" ? hair : key === "f" ? face : key === "c" ? coat : key === "p" ? legs : hair;
      draw(x + i, y + j, 1, 1, colour);
    }
  });
}

export function lamp(draw: Raster, x: number, groundY: number) {
  draw(x, groundY - 16, 1, 16, P.char);
  draw(x, groundY - 16, 3, 1, P.char);
  draw(x + 2, groundY - 15, 2, 2, P.warm);
}

/* ── Dusk atmosphere ─────────────────────────────────────────────────────── */

/** First stars, a few of them catching. */
export function stars(draw: Raster, width: number, frame: number) {
  const points = [
    [10, 4], [38, 9], [70, 3], [105, 7], [140, 5], [172, 9],
    [205, 4], [55, 12], [120, 12], [190, 12], [228, 7],
  ];
  points.forEach(([x, y], index) => {
    if (x >= width) return;
    draw(x, y, 1, 1, index % 6 === frame % 6 ? "#EFE7D3" : "rgba(239,231,211,0.35)");
  });
}

/** Drifting motes, the thing that makes dusk read as dusk. */
export function motes(draw: Raster, width: number, height: number, frame: number) {
  for (let i = 0; i < 9; i += 1) {
    const x = (i * 53 + frame * 2) % width;
    const y = 18 + ((i * 37 + frame + i) % (height - 40));
    draw(x, y, 1, 1, `rgba(243,227,178,${i % 2 ? 0.5 : 0.3})`);
  }
}

/** A framing tree. `big` is the foreground canopy. */
export function bigTree(
  draw: Raster,
  x: number,
  groundY: number,
  frame: number,
  big: boolean,
) {
  const trunkHeight = big ? 30 : 22;
  const crownWidth = big ? 22 : 16;
  const mid = "#4E5A40";
  const light = "#5E6B4B";

  draw(x + (crownWidth >> 1) - 2, groundY - trunkHeight + 10, 4, trunkHeight - 10, "#57473A");
  draw(x + (crownWidth >> 1) - 3, groundY - 2, 6, 2, "#4A3B30");
  draw(x + (crownWidth >> 1), groundY - trunkHeight + 12, 1, 4, "#6B5A4A");

  draw(x, groundY - trunkHeight + 4, crownWidth, 8, mid);
  draw(x + 2, groundY - trunkHeight, crownWidth - 4, 6, mid);
  // The canopy sways by a pixel.
  draw(x + 3 + (frame % 2), groundY - trunkHeight - 3, crownWidth - 6, 4, mid);

  draw(x + 2, groundY - trunkHeight + 1, 5, 2, P.grass);
  draw(x + crownWidth - 8, groundY - trunkHeight + 5, 5, 2, P.grass);
  draw(x + 5, groundY - trunkHeight + 8, 4, 1, P.grass);
  draw(x + 1, groundY - trunkHeight + 9, 3, 2, light);
  draw(x + crownWidth - 4, groundY - trunkHeight + 2, 3, 2, light);
}

export function bush(draw: Raster, x: number, groundY: number) {
  draw(x, groundY - 4, 9, 4, "#4E5A40");
  draw(x + 2, groundY - 6, 5, 2, "#4E5A40");
  draw(x + 3, groundY - 5, 2, 1, P.grass);
}

export function fern(draw: Raster, x: number, groundY: number, frame: number) {
  const b = frame % 2;
  draw(x, groundY - 3, 1, 3, P.grass2);
  draw(x - 1 - b, groundY - 3, 1, 1, P.grass2);
  draw(x + 1 + b, groundY - 2, 1, 1, P.grass2);
}

export function flowers(draw: Raster, x: number, groundY: number, colour: string) {
  draw(x, groundY - 2, 1, 1, colour);
  draw(x, groundY - 1, 1, 1, P.grass2);
  draw(x + 4, groundY - 2, 1, 1, colour);
  draw(x + 4, groundY - 1, 1, 1, P.grass2);
}

/** The soil cross-section, with buried stones. */
export function soil(draw: Raster, width: number, y: number, height: number) {
  draw(0, y, width, height - y, "#5C4A3B");
  draw(0, y, width, 1, "#4A3B30");
  for (let i = 0; i < 16; i += 1) {
    draw(
      (i * 41 + 9) % width,
      y + 3 + ((i * 29) % (height - y - 5)),
      2 + (i % 2),
      1 + (i % 2),
      i % 3 ? "#4A3B30" : "#6E5A48",
    );
  }
  for (let x = 0; x < width; x += 7) {
    if ((x * 11) % 31 < 4) draw(x, y - 1, 1, 1, P.grass2);
  }
}

/** A string in the display face, with word gaps. */
export function bannerText(
  draw: Raster,
  x: number,
  y: number,
  scale: number,
  text: string,
  colour: string,
) {
  let cursor = x;
  for (const ch of text) {
    if (ch === " ") {
      cursor += 4 * scale;
      continue;
    }
    glyph(draw, cursor, y, ch, colour, scale);
    cursor += 6 * scale;
  }
}
