import type { Walker } from "@/lib/game/chart/island-walk";
import { dot, ink, INK, NAVY, RED, type Pen } from "@/lib/chart-art/ink";

/**
 * Edward from above, in plan units: a code-drawn placeholder until Edward
 * supplies his own figure. Feet step with the distance walked, so he is still
 * when he stands still and under reduced motion.
 */
export function drawFigure(g: Pen, walker: Walker) {
  const swing = Math.sin(walker.stride / 5) * 3;
  g.save();
  g.translate(walker.x, walker.y);
  g.fillStyle = "rgba(43,40,35,.18)";
  g.beginPath();
  g.ellipse(1.5, 2.5, 8, 6, 0, 0, 6.3);
  g.fill();
  g.rotate(walker.heading);
  // Feet, then shoulders, then head: the order you see them from above.
  ink(g, 0.6);
  for (const side of [-1, 1]) {
    g.fillStyle = INK;
    g.beginPath();
    g.ellipse(side * swing * 0.6 + 1, side * 3, 2.6, 1.6, 0, 0, 6.3);
    g.fill();
  }
  g.fillStyle = NAVY;
  g.beginPath();
  g.ellipse(0, 0, 4.6, 7.4, 0, 0, 6.3);
  g.fill();
  g.stroke();
  ink(g, 1.1, RED);
  g.beginPath();
  g.arc(0, 0, 4.2, -0.9, 0.9);
  g.stroke();
  dot(g, 0.6, 0, 3.6, "#3a2d24");
  ink(g, 0.5);
  g.beginPath();
  g.arc(0.6, 0, 3.6, 0, 6.3);
  g.stroke();
  dot(g, 4.4, 0, 0.8, "#d9b99a");
  g.restore();
}
