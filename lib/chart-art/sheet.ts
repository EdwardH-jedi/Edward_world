import { hash } from "@/lib/game/chart/terrain";
import type { Sounding } from "@/lib/game/chart/terrain";
import { BLUE, dot, fontFor, ink, INK, label, line, PAPER, PAPER_LIT, rect, RED, SEPIA, shade, type Pen } from "@/lib/chart-art/ink";
import type { SeaName, Vec } from "@/types/chart";

/** The sheet itself: paper, graticule, rose, cartouche, folds and neatline, and the sea's lettering. */

interface Sheet {
  readonly width: number;
  readonly height: number;
}

/** A 256-pixel tile of aged paper: flecks of fibre and a few scratches. Build once. */
export function createPaperTile(): HTMLCanvasElement {
  const tile = document.createElement("canvas");
  tile.width = tile.height = 256;
  const p = tile.getContext("2d")!;
  p.fillStyle = PAPER;
  p.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    const x = hash(i, 1) * 256;
    const y = hash(i, 2) * 256;
    const d = hash(i, 3);
    p.fillStyle = d < 0.5 ? `rgba(87,71,58,${0.03 + d * 0.08})` : `rgba(255,252,240,${0.1 + (d - 0.5) * 0.3})`;
    p.fillRect(x, y, 1 + (d > 0.9 ? 1 : 0), 1);
  }
  p.strokeStyle = "rgba(87,71,58,.07)";
  p.lineWidth = 0.6;
  for (let i = 0; i < 70; i++) {
    const x = hash(i, 7) * 256;
    const y = hash(i, 8) * 256;
    const a = hash(i, 9) * 6.3;
    const l = 4 + hash(i, 10) * 12;
    p.beginPath();
    p.moveTo(x, y);
    p.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    p.stroke();
  }
  return tile;
}

/** Fills the canvas with paper that scrolls with the chart. Call in screen space. */
export function drawPaper(g: Pen, pattern: CanvasPattern | null, camX: number, camY: number, k: number, pw: number, ph: number) {
  g.save();
  g.translate(-((camX * k) % 256) - 256, -((camY * k) % 256) - 256);
  g.fillStyle = pattern ?? PAPER;
  g.fillRect(0, 0, pw + 768, ph + 768);
  g.restore();
}

/** Sixteen rhumb lines from the rose, then the graticule every 120 units. */
export function drawGraticule(g: Pen, sheet: Sheet, rose: { x: number; y: number; r: number }) {
  ink(g, 0.22, "rgba(124,100,80,.34)");
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * 6.2832;
    line(g, rose.x + Math.cos(a) * rose.r, rose.y + Math.sin(a) * rose.r, rose.x + Math.cos(a) * 2200, rose.y + Math.sin(a) * 2200);
  }
  ink(g, 0.2, "rgba(84,112,124,.3)");
  for (let x = 120; x < sheet.width; x += 120) line(g, x, 0, x, sheet.height);
  for (let y = 120; y < sheet.height; y += 120) line(g, 0, y, sheet.width, y);
}

export function drawSoundings(g: Pen, soundings: readonly Sounding[], visible: (x: number, y: number, r: number) => boolean) {
  g.font = `italic 5px ${fontFor("display")}`;
  g.textAlign = "center";
  g.fillStyle = "rgba(84,112,124,.66)";
  for (const s of soundings) if (visible(s.x, s.y, 8)) g.fillText(String(s.depth), s.x, s.y);
}

export function drawSeaNames(g: Pen, seas: readonly SeaName[], overview: boolean) {
  for (const s of seas) {
    if (overview && s.size <= 9) continue;
    label(g, s.text, s.at.x, s.at.y, {
      italic: true,
      size: s.size,
      rotation: s.rotation,
      colour: "rgba(84,112,124,.9)",
      spacing: s.size > 9 ? 3.2 : 0.6,
      haloWidth: 2,
    });
  }
}

export function drawRose(g: Pen, rose: { x: number; y: number; r: number }) {
  const { x, y, r } = rose;
  g.save();
  g.translate(x, y);
  ink(g, 0.5);
  g.beginPath();
  g.arc(0, 0, r, 0, 6.3);
  g.stroke();
  ink(g, 0.25);
  g.beginPath();
  g.arc(0, 0, r - 3.4, 0, 6.3);
  g.stroke();
  g.beginPath();
  g.arc(0, 0, r * 0.46, 0, 6.3);
  g.stroke();
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * 6.2832;
    const l = i % 8 === 0 ? 5 : i % 2 === 0 ? 3.4 : 1.8;
    line(g, Math.cos(a) * r, Math.sin(a) * r, Math.cos(a) * (r - l), Math.sin(a) * (r - l));
  }
  const point = (a: number, len: number, wid: number, fillA: string, fillB: string) => {
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    const px = -uy;
    const py = ux;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(ux * wid + px * wid, uy * wid + py * wid);
    g.lineTo(ux * len, uy * len);
    g.closePath();
    g.fillStyle = fillA;
    g.fill();
    g.stroke();
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(ux * wid - px * wid, uy * wid - py * wid);
    g.lineTo(ux * len, uy * len);
    g.closePath();
    g.fillStyle = fillB;
    g.fill();
    g.stroke();
  };
  ink(g, 0.3);
  for (let i = 0; i < 8; i++) point(Math.PI / 8 + (i * Math.PI) / 4, r * 0.44, 2.2, PAPER_LIT, "rgba(84,112,124,.6)");
  for (let i = 0; i < 4; i++) point(Math.PI / 4 + (i * Math.PI) / 2, r * 0.66, 3.6, PAPER_LIT, INK);
  for (let i = 0; i < 4; i++) point((i * Math.PI) / 2, r * 0.9, 4.6, PAPER_LIT, i === 3 ? RED : INK);
  label(g, "N", 0, -r - 3.6, { face: "caps", size: 9, haloWidth: 2.4 });
  g.restore();
}

export function drawCartouche(
  g: Pen,
  box: { x: number; y: number; w: number; h: number },
  copy: { kicker: string; title: string; subtitle: string; caveat: string },
) {
  const { x, y, w, h } = box;
  g.save();
  g.translate(x, y);
  g.fillStyle = "rgba(246,240,224,.94)";
  g.fillRect(-w / 2, -h / 2, w, h);
  ink(g, 0.8);
  g.strokeRect(-w / 2, -h / 2, w, h);
  ink(g, 0.3);
  g.strokeRect(-w / 2 + 2.6, -h / 2 + 2.6, w - 5.2, h - 5.2);
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    g.beginPath();
    g.arc(sx * (w / 2 - 2.6), sy * (h / 2 - 2.6), 6, 0, 6.3);
    g.fillStyle = "rgba(246,240,224,1)";
    g.fill();
    g.stroke();
    dot(g, sx * (w / 2 - 2.6), sy * (h / 2 - 2.6), 1.1, RED);
  }
  label(g, copy.kicker, 0, -26, { italic: true, size: 9, halo: false });
  label(g, copy.title, 0, -6, { face: "caps", size: 22, spacing: 1.4, halo: false });
  ink(g, 0.3);
  line(g, -70, 0, -8, 0);
  line(g, 8, 0, 70, 0);
  dot(g, 0, 0, 1.2, RED);
  label(g, copy.subtitle, 0, 12, { italic: true, size: 7.6, halo: false });
  label(g, copy.caveat, 0, 22.6, { italic: true, size: 5.8, colour: SEPIA, halo: false });
  ink(g, 0.4);
  g.strokeRect(-60, 29, 120, 2.6);
  for (let i = 0; i < 5; i++) {
    if (i % 2 === 0) {
      g.fillStyle = INK;
      g.fillRect(-60 + i * 24, 29, 24, 2.6);
    }
  }
  label(g, "0", -60, 38.4, { size: 4.6, halo: false });
  label(g, "5", 0, 38.4, { size: 4.6, halo: false });
  label(g, "10 nm", 62, 38.4, { size: 4.6, halo: false });
  g.restore();
}

/** Uncharted waters: three coils of a sea serpent. */
export function drawSerpent(g: Pen, at: Vec, text: string) {
  g.save();
  g.translate(at.x, at.y);
  ink(g, 0.55, SEPIA);
  for (let i = 0; i < 3; i++) {
    const r = 5.4 - i * 0.5;
    g.beginPath();
    g.arc(-18 + i * 14, 0, r, Math.PI, 0);
    g.stroke();
    ink(g, 0.28, SEPIA);
    for (let j = 1; j < 5; j++) {
      const a = Math.PI + j * 0.63;
      line(g, -18 + i * 14 + Math.cos(a) * r, Math.sin(a) * r, -18 + i * 14 + Math.cos(a) * 3.2, Math.sin(a) * 3.2);
    }
    ink(g, 0.55, SEPIA);
  }
  g.beginPath();
  g.moveTo(20, 0);
  g.quadraticCurveTo(22, -12, 29, -10);
  g.quadraticCurveTo(33, -9, 31, -6);
  g.lineTo(27, -6.6);
  g.stroke();
  dot(g, 28.6, -8.6, 0.5, SEPIA);
  ink(g, 0.28, BLUE);
  line(g, -30, 1.6, -24, 1.6);
  line(g, -11, 1.6, -9, 1.6);
  line(g, 3, 1.6, 5, 1.6);
  line(g, 16, 1.6, 26, 1.6);
  label(g, text, 0, 12, { italic: true, size: 7, colour: SEPIA, haloWidth: 2 });
  g.restore();
}

/** A coffee ring. Lives are coffee. */
export function drawCoffeeRing(g: Pen, ring: { x: number; y: number; rotation: number }) {
  g.save();
  g.translate(ring.x, ring.y);
  g.rotate(ring.rotation);
  g.strokeStyle = "rgba(124,100,80,.16)";
  g.lineWidth = 3.2;
  g.beginPath();
  g.ellipse(0, 0, 33, 31.6, 0, 0.3, 5.9);
  g.stroke();
  g.strokeStyle = "rgba(124,100,80,.22)";
  g.lineWidth = 0.7;
  g.beginPath();
  g.ellipse(0, 0, 34.8, 33.2, 0, 0.2, 6);
  g.stroke();
  g.restore();
}

/** The harbour bridge across the mouth of Sydney's bay. */
export function drawBridge(g: Pen, bridge: { y: number; x0: number; x1: number }) {
  const { y, x0, x1 } = bridge;
  const mx = (x0 + x1) / 2;
  ink(g, 0.7);
  g.beginPath();
  g.moveTo(x0, y - 1);
  g.quadraticCurveTo(mx, y - 45, x1, y - 1);
  g.stroke();
  ink(g, 0.45);
  g.beginPath();
  g.moveTo(x0, y - 1);
  g.quadraticCurveTo(mx, y - 33, x1, y - 1);
  g.stroke();
  ink(g, 0.3);
  for (let x = x0 + 5; x < x1 - 2; x += 5) {
    const u = (x - x0) / (x1 - x0);
    const u2 = (x + 5 - x0) / (x1 - x0);
    const top = y - 1 - 4 * u * (1 - u) * 22;
    const low2 = y - 1 - 4 * u2 * (1 - u2) * 16;
    line(g, x, top, x, y - 1);
    if (x + 5 < x1 - 2) line(g, x, top, x + 5, low2);
  }
  ink(g, 0.55);
  rect(g, x0 - 16, y - 1.4, x1 - x0 + 32, 2.8);
  for (const px of [x0 - 8, x1 + 1]) {
    rect(g, px, y - 14, 7, 18);
    shade(g, px + 4.6, y - 14, 2.4, 18);
    line(g, px - 1, y - 14, px + 8, y - 14);
    ink(g, 0.3);
    line(g, px + 2, y - 10, px + 2, y - 5);
    ink(g, 0.55);
  }
}

/** The sheet's folds, the double neatline with its chequered border, and the grid letters. */
export function drawNeatline(g: Pen, sheet: Sheet, lettered: boolean) {
  const W = sheet.width;
  const H = sheet.height;
  for (const fx of [W / 3, (W * 2) / 3]) {
    ink(g, 0.5, "rgba(43,40,35,.07)");
    line(g, fx, -30, fx, H + 30);
    ink(g, 0.6, "rgba(255,252,240,.5)");
    line(g, fx + 0.7, -30, fx + 0.7, H + 30);
  }
  ink(g, 0.5, "rgba(43,40,35,.07)");
  line(g, -30, H / 2, W + 30, H / 2);
  ink(g, 0.6, "rgba(255,252,240,.5)");
  line(g, -30, H / 2 + 0.7, W + 30, H / 2 + 0.7);
  ink(g, 1.1, INK);
  g.strokeRect(-12, -12, W + 24, H + 24);
  ink(g, 0.35);
  g.strokeRect(-6, -6, W + 12, H + 12);
  g.fillStyle = INK;
  for (let i = 0; i * 60 < W; i += 2) {
    g.fillRect(i * 60, -10.6, 60, 3.2);
    g.fillRect(i * 60 + 60, H + 7.4, Math.min(60, W - i * 60 - 60), 3.2);
  }
  for (let i = 0; i * 60 < H; i += 2) {
    g.fillRect(-10.6, i * 60, 3.2, 60);
    g.fillRect(W + 7.4, i * 60 + 60, 3.2, Math.min(60, H - i * 60 - 60));
  }
  if (!lettered) return;
  for (let i = 0; i < W / 120; i++) {
    label(g, String.fromCharCode(65 + i), i * 120 + 60, -15.6, { face: "caps", size: 6.4, halo: false, colour: SEPIA });
  }
  for (let i = 0; i < H / 120; i++) {
    label(g, String(i + 1), -18.6, i * 120 + 62, { face: "caps", size: 6.4, halo: false, colour: SEPIA });
  }
}

/** A faint darkening toward the corners, in screen space. */
export function drawVignette(g: Pen, w: number, h: number) {
  const v = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.hypot(w, h) * 0.6);
  v.addColorStop(0, "rgba(87,71,58,0)");
  v.addColorStop(1, "rgba(87,71,58,.2)");
  g.fillStyle = v;
  g.fillRect(0, 0, w, h);
}
