import { ink, line, rect, RED, shade, PAPER_LIT, type Pen } from "@/lib/chart-art/ink";

/** Incheon Port: apartment towers, a container quay and two gantry cranes. */
export function drawIncheon(g: Pen) {
  ink(g);
  for (const [x, y, w, h] of [
    [-40, -6, 13, 34],
    [-25, -8, 13, 44],
    [-10, -4, 13, 30],
  ]) {
    rect(g, x, y - h, w, h);
    shade(g, x + w - 3.6, y - h, 3.6, h);
    rect(g, x + 3, y - h - 2.2, 5, 2.2);
    ink(g, 0.3);
    for (let wy = y - h + 4; wy < y - 2; wy += 3.6) line(g, x + 2, wy, x + w - 5.2, wy);
    ink(g);
  }
  line(g, 16, 12, 70, 12);
  ink(g, 0.3);
  for (let x = 18; x < 70; x += 2.6) line(g, x, 12, x - 1.6, 14.4);
  ink(g, 0.45);
  const fills = [PAPER_LIT, "rgba(169,72,44,.55)", "rgba(84,112,124,.5)", PAPER_LIT, "rgba(43,40,35,.35)"];
  for (let r = 0; r < 3; r++) {
    for (let k = 0; k < 4 - (r > 1 ? 1 : 0); k++) {
      rect(g, 20 + k * 6.6 + r * 1.2, 8 - r * 3.8, 6, 3.6, fills[(k + r * 2) % 5]);
    }
  }
  ink(g, 0.8, RED);
  for (const x of [50, 61]) {
    line(g, x - 2.4, 12, x - 0.6, -12);
    line(g, x + 2.4, 12, x + 0.6, -12);
    line(g, x - 9, -12, x + 11, -13.4);
    line(g, x - 9, -12, x, -17, x + 11, -13.4);
    ink(g, 0.4, RED);
    line(g, x + 9, -13, x + 9, -5);
    g.strokeRect(x + 7.8, -5, 2.4, 2);
    ink(g, 0.8, RED);
  }
}
