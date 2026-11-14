import { BLUE, ink, label, line, NAVY, PAPER_LIT, RED, type Pen } from "@/lib/chart-art/ink";
import type { Bottle } from "@/types/chart";

/** A bottle still afloat, bobbing and turning a little. `t` is 0 under reduced motion. */
export function drawBottle(g: Pen, bottle: Bottle, index: number, t: number) {
  const { x, y } = bottle.at;
  g.save();
  g.translate(x, y + (t ? Math.sin(t * 2 + index) * 0.8 : 0));
  g.rotate(-0.5 + (t ? Math.sin(t * 1.3 + index) * 0.08 : 0));
  g.scale(1.5, 1.5);
  ink(g, 0.45);
  g.fillStyle = PAPER_LIT;
  g.beginPath();
  g.moveTo(-1.8, 3.6);
  g.lineTo(-1.8, -1.4);
  g.quadraticCurveTo(-1.8, -2.8, -0.7, -3.2);
  g.lineTo(-0.7, -5.4);
  g.lineTo(0.7, -5.4);
  g.lineTo(0.7, -3.2);
  g.quadraticCurveTo(1.8, -2.8, 1.8, -1.4);
  g.lineTo(1.8, 3.6);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = RED;
  g.fillRect(-0.9, -6.6, 1.8, 1.3);
  ink(g, 0.3, NAVY);
  line(g, -0.8, -0.4, 0.8, -0.4);
  line(g, -0.8, 1, 0.8, 1);
  g.restore();
  ink(g, 0.3, BLUE);
  line(g, x - 6, y + 4.6, x - 2.4, y + 4.6);
  line(g, x + 2, y + 5.2, x + 6.4, y + 5.2);
}

/** Where a bottle was fished out: a small cross and its note in handwriting. */
export function drawFishedNote(g: Pen, bottle: Bottle) {
  const { x, y } = bottle.at;
  ink(g, 0.5, NAVY);
  line(g, x - 1.8, y - 1.8, x + 1.8, y + 1.8);
  line(g, x + 1.8, y - 1.8, x - 1.8, y + 1.8);
  label(g, bottle.note, x + 5, y - 3, {
    face: "hand",
    size: 10.5,
    colour: NAVY,
    align: "left",
    rotation: -0.07,
    haloWidth: 2.2,
  });
}
