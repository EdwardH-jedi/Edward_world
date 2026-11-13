import { ink, INK, line, rect, RED, shade, type Pen } from "@/lib/chart-art/ink";

/** Field Station: an arc of sensor posts on a fence, the station hut and a mast. */
export function drawField(g: Pen) {
  ink(g, 0.5);
  let previous: { x: number; y: number } | null = null;
  for (let k = 0; k <= 14; k++) {
    const a = -2.75 + k * 0.17;
    const x = Math.cos(a) * 40;
    const y = Math.sin(a) * 26;
    if (previous) {
      ink(g, 0.3);
      g.beginPath();
      g.moveTo(previous.x, previous.y - 4.6);
      g.quadraticCurveTo((previous.x + x) / 2, (previous.y + y) / 2 - 3.6, x, y - 4.6);
      g.stroke();
      g.beginPath();
      g.moveTo(previous.x, previous.y - 2.6);
      g.quadraticCurveTo((previous.x + x) / 2, (previous.y + y) / 2 - 1.6, x, y - 2.6);
      g.stroke();
      ink(g, 0.5);
    }
    line(g, x, y, x, y - 5.4);
    if (k % 3 === 1) {
      g.fillStyle = RED;
      g.fillRect(x - 1, y - 7.4, 2, 2);
      ink(g, 0.3, RED);
      g.beginPath();
      g.arc(x, y - 6.4, 2.6, -2.2, -0.9);
      g.stroke();
      g.beginPath();
      g.arc(x, y - 6.4, 4, -2.2, -0.9);
      g.stroke();
      ink(g, 0.5);
    }
    previous = { x, y };
  }
  rect(g, -11, 0, 20, 11);
  shade(g, 3, 0, 6, 11);
  line(g, -12.5, 0, 10.5, 0);
  g.fillStyle = INK;
  g.fillRect(-3, 6.6, 2.4, 4.4);
  ink(g, 0.35);
  g.strokeRect(-8.5, 3, 3, 3);
  ink(g, 0.5);
  line(g, 16, 11, 16, -14);
  line(g, 13, 11, 16, 2, 19, 11);
  ink(g, 0.3);
  for (const r of [3, 5.4, 7.8]) {
    g.beginPath();
    g.arc(16, -14, r, -1.1, 0.5);
    g.stroke();
  }
  ink(g, 0.45);
  rect(g, -18, 7, 4.4, 4);
}
