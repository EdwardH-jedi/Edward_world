import { dot, ink, INK, label, line, PAPER_LIT, poly, rect, RED, shade, type Pen } from "@/lib/chart-art/ink";

/** Arcade Pier: the arcade on its piles, its marquee lights chasing, and bunting either side. */
export function drawArcade(g: Pen, t: number) {
  ink(g, 0.4);
  for (const x of [-16, -8, 0, 8, 16]) line(g, x, 9, x, 13);
  ink(g);
  rect(g, -15, -8, 30, 17);
  shade(g, 6, -8, 9, 17);
  g.fillStyle = RED;
  g.fillRect(-17, -16, 34, 8.4);
  g.strokeRect(-17, -16, 34, 8.4);
  label(g, "ARCADE", 0, -9.8, { face: "caps", size: 5.6, colour: PAPER_LIT, halo: false, spacing: 0.8 });
  for (let k = 0; k < 9; k++) dot(g, -15 + k * 3.75, -6.2, 0.7, (k + Math.floor(t * 2.2)) % 2 ? PAPER_LIT : INK);
  g.fillStyle = INK;
  g.beginPath();
  g.moveTo(-2.6, 9);
  g.lineTo(-2.6, 3);
  g.arc(0, 3, 2.6, Math.PI, 0);
  g.lineTo(2.6, 9);
  g.fill();
  ink(g, 0.35);
  g.strokeRect(-11.4, 0, 4.6, 4.6);
  g.strokeRect(6.8, 0, 4.6, 4.6);
  ink(g, 0.3);
  g.beginPath();
  g.moveTo(-17, -16);
  g.quadraticCurveTo(-24, -20, -30, -17);
  g.stroke();
  g.beginPath();
  g.moveTo(17, -16);
  g.quadraticCurveTo(24, -20, 30, -17);
  g.stroke();
  for (const [x, y] of [
    [-21, -18.2],
    [-26, -18.4],
    [21, -18.2],
    [26, -18.4],
  ]) {
    poly(g, [x - 1, y, x + 1, y, x, y + 2.4], RED);
  }
}
