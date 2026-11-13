import { ink, INK, line, RED, type Pen } from "@/lib/chart-art/ink";

/** The Shipyard: a hull in frame on the slipway, staging, a crane and a hazard stripe. */
export function drawShipyard(g: Pen) {
  ink(g, 0.5);
  line(g, -30, 12, 30, 12);
  ink(g, 0.3);
  for (let x = -28; x < 30; x += 3) line(g, x, 12, x - 1.8, 14.6);
  ink(g, 0.65);
  g.beginPath();
  g.moveTo(-21, -3);
  g.quadraticCurveTo(-17, 8, 0, 8);
  g.quadraticCurveTo(17, 8, 23, -5);
  g.stroke();
  ink(g, 0.4);
  for (let x = -16; x <= 18; x += 3.4) {
    const u = x / 20;
    const yb = 8 - u * u * 4.4;
    g.beginPath();
    g.moveTo(x, -3.6 - u * 0.8);
    g.quadraticCurveTo(x + 0.9, (yb - 3) / 2, x, yb);
    g.stroke();
  }
  line(g, -19, 1.5, 21, 0.6);
  ink(g, 0.5);
  for (const x of [-13, 0, 13]) line(g, x, 8, x + Math.sign(x) * 2.6, 12);
  ink(g, 0.4);
  for (const x of [-26, 27]) line(g, x, 12, x, -15);
  line(g, -26, -15, 27, -15);
  line(g, -26, -6, -20, -6);
  line(g, 22, -6, 27, -6);
  for (let y = 10; y > -14; y -= 2.6) line(g, -26, y, -24, y);
  ink(g, 0.8, RED);
  line(g, 30, 12, 30, -17);
  line(g, 22, -17, 38, -18.4);
  line(g, 30, -21, 22, -17);
  line(g, 30, -21, 38, -18.4);
  ink(g, 0.4, RED);
  line(g, 36, -18, 36, -9);
  g.strokeRect(34.6, -9, 2.8, 2.4);
  for (let k = 0; k < 8; k++) {
    g.fillStyle = k % 2 ? INK : RED;
    g.fillRect(-16 + k * 4, 15, 4, 1.4);
  }
}
