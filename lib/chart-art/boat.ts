import type { Boat, Ripple } from "@/lib/game/chart/sailing";
import { BLUE, dot, ink, line, PAPER_LIT, poly, RED, type Pen } from "@/lib/chart-art/ink";
import type { Vec } from "@/types/chart";

/** The boat, its wake and the course it has sailed. */

/** A two-masted boat, heeling a little with speed and bobbing on the swell. `t` is 0 under reduced motion. */
export function drawBoat(g: Pen, boat: Boat, t: number) {
  const speed = Math.hypot(boat.vx, boat.vy);
  g.save();
  g.translate(boat.x, boat.y + Math.sin(t * 2.4) * 0.5);
  g.scale(boat.facing * 1.25, 1.25);
  g.rotate(Math.sin(t * 1.7) * 0.045 - Math.min(0.08, speed / 1400));
  ink(g, 0.3, BLUE);
  g.beginPath();
  g.moveTo(-10, 3.4);
  g.quadraticCurveTo(-7, 2.2, -4, 3.4);
  g.quadraticCurveTo(-1, 4.6, 2, 3.4);
  g.quadraticCurveTo(5, 2.2, 9, 3.4);
  g.stroke();
  ink(g, 0.55);
  g.beginPath();
  g.moveTo(-7.4, -1.4);
  g.lineTo(8.4, -1.4);
  g.quadraticCurveTo(6.6, 2.4, 3.4, 2.6);
  g.lineTo(-5, 2.6);
  g.quadraticCurveTo(-7.2, 1.6, -7.4, -1.4);
  g.closePath();
  g.fillStyle = PAPER_LIT;
  g.fill();
  g.stroke();
  ink(g, 0.7, RED);
  line(g, -6.6, -0.1, 7.2, -0.1);
  ink(g, 0.5);
  line(g, 0, -1.4, 0, -15.4);
  poly(g, [-0.7, -14.4, -0.7, -2.6, -7.6, -2.6], PAPER_LIT);
  poly(g, [0.8, -13, 0.8, -2.6, 7, -2.6], PAPER_LIT);
  ink(g, 0.25);
  line(g, -0.7, -9, -4.6, -2.6);
  line(g, 0.8, -8.4, 4.4, -2.6);
  const flutter = Math.sin(t * 6) * 0.7;
  ink(g, 0.4, RED);
  g.fillStyle = RED;
  g.beginPath();
  g.moveTo(0, -15.4);
  g.lineTo(-3.6, -16.3 + flutter);
  g.lineTo(0, -17.2);
  g.closePath();
  g.fill();
  g.restore();
}

/** The dashed vermilion course line, one run per passage. */
export function drawCourse(g: Pen, runs: readonly (readonly Vec[])[]) {
  ink(g, 0.6, "rgba(169,72,44,.82)");
  g.setLineDash([2.6, 2.4]);
  for (const run of runs) {
    if (run.length < 2) continue;
    g.beginPath();
    g.moveTo(run[0].x, run[0].y);
    for (let i = 1; i < run.length; i++) g.lineTo(run[i].x, run[i].y);
    g.stroke();
  }
  g.setLineDash([]);
}

export function drawRipples(g: Pen, ripples: readonly Ripple[]) {
  for (const r of ripples) {
    ink(g, 0.32, `rgba(84,112,124,${r.life * 0.8})`);
    const w = 3 + (1 - r.life) * 6;
    g.beginPath();
    g.arc(r.x, r.y + 3, w, Math.PI * 1.15, Math.PI * 1.85);
    g.stroke();
  }
}

/** On the small overview map the boat is a "you are here" target. */
export function drawBoatMarker(g: Pen, at: Vec) {
  dot(g, at.x, at.y, 9, PAPER_LIT);
  ink(g, 2.4, RED);
  g.beginPath();
  g.arc(at.x, at.y, 9, 0, 6.3);
  g.stroke();
  dot(g, at.x, at.y, 3.4, RED);
}
