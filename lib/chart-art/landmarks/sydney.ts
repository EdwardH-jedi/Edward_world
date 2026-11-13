import { group, house, ink, INK, label, LAND, line, PAPER_LIT, poly, rect, RED, SEPIA, shade, type Pen } from "@/lib/chart-art/ink";

/**
 * Sydney Harbour: the university quadrangle and its clock tower, a row of
 * terraces, Edward's House on its rise, and the opera shells on the point
 * east of the bay.
 *
 * Sydney is the largest island, so its quadrangle is the one drawing that
 * cannot reach the brief's 45% by scaling alone: it has thirteen arches here
 * rather than eleven, and the neighbourhood around it is drawn at 0.8 of the
 * routine's scale so the whole composition stays ashore. The shells are drawn
 * smaller again so they still fit on the point.
 */
export function drawSydney(g: Pen) {
  // Footpaths: from the western shore past the quadrangle to the house, and down to the terraces.
  ink(g, 0.4, SEPIA);
  g.setLineDash([1.4, 1.6]);
  line(g, -78, 16, 46, 16, 46, 12);
  line(g, 12, 16, 12, 28);
  g.setLineDash([]);

  group(g, -28, 2, 1, () => quadrangle(g));
  group(g, 12, 34, 0.8, () => terraces(g));
  group(g, 50, 4, 0.8, () => edwardsHouse(g));
  group(g, 50, -35.5, 0.6, () => operaShells(g));
}

/** The quadrangle, centred on its clock tower, standing on y = 0. */
function quadrangle(g: Pen) {
  g.fillStyle = "rgba(117,130,90,.3)";
  g.fillRect(-34, 2, 68, 9);
  ink(g, 0.3);
  g.strokeRect(-34, 2, 68, 9);
  line(g, 0, 2, 0, 11);

  ink(g);
  rect(g, -40, -22, 80, 22);
  shade(g, 26, -22, 14, 22);
  line(g, -42, -22, 42, -22);
  poly(g, [-40, -22, -34, -30, -28, -22], PAPER_LIT);
  poly(g, [28, -22, 34, -30, 40, -22], PAPER_LIT);
  ink(g, 0.35);
  for (let k = 0; k < 13; k++) {
    const ax = -36.6 + k * 6.1;
    if (Math.abs(ax) < 5) continue;
    g.beginPath();
    g.moveTo(ax - 1.9, 0);
    g.lineTo(ax - 1.9, -5);
    g.arc(ax, -5, 1.9, Math.PI, 0);
    g.lineTo(ax + 1.9, 0);
    g.stroke();
    g.strokeRect(ax - 1, -17, 2, 4.4);
  }

  ink(g);
  rect(g, -5.5, -42, 11, 42);
  shade(g, 2, -42, 3.5, 42);
  poly(g, [-7, -42, 0, -54, 7, -42], "rgba(43,40,35,.3)");
  line(g, 0, -54, 0, -58);
  g.fillStyle = PAPER_LIT;
  g.beginPath();
  g.arc(0, -35, 2.6, 0, 6.3);
  g.fill();
  g.stroke();
  ink(g, 0.35);
  line(g, 0, -35, 0, -37);
  line(g, 0, -35, 1.4, -34.4);
  g.fillStyle = INK;
  g.beginPath();
  g.moveTo(-2, 0);
  g.lineTo(-2, -5);
  g.arc(0, -5, 2, Math.PI, 0);
  g.lineTo(2, 0);
  g.fill();
}

/** Seven terraces in a row, centred on the origin. */
function terraces(g: Pen) {
  ink(g, 0.45);
  for (let k = 0; k < 7; k++) {
    const x = -32.5 + k * 9.2;
    rect(g, x, 0, 8.4, 8);
    poly(g, [x - 0.5, 0, x + 4.2, -5.4, x + 8.9, 0], k % 3 === 1 ? "rgba(43,40,35,.3)" : PAPER_LIT);
    g.fillStyle = INK;
    g.fillRect(x + 3.2, 4.6, 1.8, 3.4);
    g.strokeRect(x + 6, -3.6, 1.4, 2.4);
  }
}

/** Edward's House on its rise, with smoke from the chimney and its name beneath. */
function edwardsHouse(g: Pen) {
  ink(g, 0.3);
  for (let k = -5; k <= 5; k++) line(g, k * 4, 16 + Math.abs(k) * 0.5, k * 5, 20 + Math.abs(k) * 0.7);
  ink(g);
  house(g, -10, 15, 21, 13, RED);
  ink(g, 0.4);
  g.strokeRect(-7, 6, 3, 3);
  g.strokeRect(5, 6, 3, 3);
  ink(g, 0.5);
  rect(g, 5.5, -6.4, 3, 6);
  ink(g, 0.35);
  g.beginPath();
  g.moveTo(7, -7);
  g.bezierCurveTo(4, -11, 11, -13, 8, -17);
  g.bezierCurveTo(6, -20, 11, -21, 10, -24);
  g.stroke();
  label(g, "Edward's House", 1, 25, { italic: true, size: 5.2, haloWidth: 1.6, haloColour: LAND });
}

/** Four shells on their podium, standing on y = 0 and centred on the origin. */
function operaShells(g: Pen) {
  ink(g, 0.55);
  rect(g, -18, 0, 36, 3.4);
  ink(g, 0.3);
  for (let x = -16; x < 18; x += 2.4) line(g, x, 3.4, x, 5.6);
  ink(g, 0.55);
  const shell = (bx: number, s: number, flip = false) => {
    const d = flip ? -1 : 1;
    g.beginPath();
    g.moveTo(bx, 0);
    g.quadraticCurveTo(bx + d * s * 0.2, -s * 0.98, bx + d * s * 1.05, -s);
    g.quadraticCurveTo(bx + d * s * 0.96, -s * 0.34, bx + d * s * 0.9, 0);
    g.closePath();
    g.fillStyle = PAPER_LIT;
    g.fill();
    g.stroke();
    ink(g, 0.28);
    g.beginPath();
    g.moveTo(bx + d * s * 0.34, 0);
    g.quadraticCurveTo(bx + d * s * 0.5, -s * 0.6, bx + d * s * 1.02, -s * 0.96);
    g.stroke();
    ink(g, 0.55);
  };
  shell(-16, 13);
  shell(-7, 11);
  shell(1, 8.5);
  shell(18, 6.5, true);
}
