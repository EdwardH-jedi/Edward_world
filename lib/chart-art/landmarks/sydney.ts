import { house, ink, INK, label, LAND, line, PAPER_LIT, poly, rect, RED, SEPIA, shade, type Pen } from "@/lib/chart-art/ink";

/**
 * Sydney Harbour: the university quadrangle and its clock tower, a row of
 * terraces, Edward's House on its rise, and the opera shells on the point.
 */
export function drawSydney(g: Pen) {
  ink(g, 0.4, SEPIA);
  g.setLineDash([1.4, 1.6]);
  line(g, -150, -34, -88, -34, -88, -8, 62, -8, 62, 12);
  line(g, -8, -8, -8, 44);
  g.setLineDash([]);

  // The quadrangle and its clock tower.
  g.fillStyle = "rgba(117,130,90,.3)";
  g.fillRect(-78, -12, 56, 9);
  ink(g, 0.3);
  g.strokeRect(-78, -12, 56, 9);
  line(g, -50, -12, -50, -3);
  ink(g);
  rect(g, -84, -36, 68, 22);
  shade(g, -30, -36, 14, 22);
  line(g, -86, -36, -14, -36);
  poly(g, [-84, -36, -78, -44, -72, -36], PAPER_LIT);
  poly(g, [-28, -36, -22, -44, -16, -36], PAPER_LIT);
  ink(g, 0.35);
  for (let k = 0; k < 11; k++) {
    const ax = -81 + k * 6.1;
    if (Math.abs(ax + 50) < 5) continue;
    g.beginPath();
    g.moveTo(ax - 1.9, -14);
    g.lineTo(ax - 1.9, -19);
    g.arc(ax, -19, 1.9, Math.PI, 0);
    g.lineTo(ax + 1.9, -14);
    g.stroke();
  }
  for (let k = 0; k < 11; k++) {
    const ax = -81 + k * 6.1;
    if (Math.abs(ax + 50) < 5) continue;
    g.strokeRect(ax - 1, -31, 2, 4.4);
  }
  ink(g);
  rect(g, -55.5, -56, 11, 42);
  shade(g, -48, -56, 3.5, 42);
  poly(g, [-57, -56, -50, -68, -43, -56], "rgba(43,40,35,.3)");
  line(g, -50, -68, -50, -72);
  g.fillStyle = PAPER_LIT;
  g.beginPath();
  g.arc(-50, -49, 2.6, 0, 6.3);
  g.fill();
  g.stroke();
  ink(g, 0.35);
  line(g, -50, -49, -50, -51);
  line(g, -50, -49, -48.6, -48.4);
  g.fillStyle = INK;
  g.beginPath();
  g.moveTo(-52, -14);
  g.lineTo(-52, -19);
  g.arc(-50, -19, 2, Math.PI, 0);
  g.lineTo(-48, -14);
  g.fill();

  // Terraces.
  ink(g, 0.45);
  for (let k = 0; k < 7; k++) {
    const x = -26 + k * 9.2;
    rect(g, x, 50, 8.4, 8);
    poly(g, [x - 0.5, 50, x + 4.2, 44.6, x + 8.9, 50], k % 3 === 1 ? "rgba(43,40,35,.3)" : PAPER_LIT);
    g.fillStyle = INK;
    g.fillRect(x + 3.2, 54.6, 1.8, 3.4);
    g.strokeRect(x + 6, 46.4, 1.4, 2.4);
  }

  // Edward's House on its rise.
  ink(g, 0.3);
  for (let k = -5; k <= 5; k++) line(g, 62 + k * 4, 31 + Math.abs(k) * 0.5, 62 + k * 5, 35 + Math.abs(k) * 0.7);
  ink(g);
  house(g, 52, 30, 21, 13, RED);
  ink(g, 0.4);
  g.strokeRect(55, 21, 3, 3);
  g.strokeRect(67, 21, 3, 3);
  ink(g, 0.5);
  rect(g, 67.5, 8.6, 3, 6);
  ink(g, 0.35);
  g.beginPath();
  g.moveTo(69, 8);
  g.bezierCurveTo(66, 4, 73, 2, 70, -2);
  g.bezierCurveTo(68, -5, 73, -6, 72, -9);
  g.stroke();
  label(g, "Edward's House", 63, 40, { italic: true, size: 5.2, haloWidth: 1.6, haloColour: LAND });

  // Opera shells on the point east of the bay.
  ink(g, 0.55);
  rect(g, 82, -79, 36, 3.4);
  ink(g, 0.3);
  for (let x = 84; x < 118; x += 2.4) line(g, x, -75.6, x, -73.4);
  ink(g, 0.55);
  const shell = (bx: number, s: number, flip = false) => {
    const d = flip ? -1 : 1;
    g.beginPath();
    g.moveTo(bx, -79);
    g.quadraticCurveTo(bx + d * s * 0.2, -79 - s * 0.98, bx + d * s * 1.05, -79 - s);
    g.quadraticCurveTo(bx + d * s * 0.96, -79 - s * 0.34, bx + d * s * 0.9, -79);
    g.closePath();
    g.fillStyle = PAPER_LIT;
    g.fill();
    g.stroke();
    ink(g, 0.28);
    g.beginPath();
    g.moveTo(bx + d * s * 0.34, -79);
    g.quadraticCurveTo(bx + d * s * 0.5, -79 - s * 0.6, bx + d * s * 1.02, -79 - s * 0.96);
    g.stroke();
    ink(g, 0.55);
  };
  shell(84, 13);
  shell(93, 11);
  shell(101, 8.5);
  shell(118, 6.5, true);
}
