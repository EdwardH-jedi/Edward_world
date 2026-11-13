import { ink, line, rect, RED, shade, type Pen } from "@/lib/chart-art/ink";

/** AFL Oval: the ground with its centre square and goalposts, and the lab beside it. */
export function drawAfl(g: Pen) {
  g.fillStyle = "rgba(117,130,90,.3)";
  g.beginPath();
  g.ellipse(-10, -4, 37, 24, 0, 0, 6.3);
  g.fill();
  ink(g, 0.6);
  g.stroke();
  ink(g, 0.3);
  g.beginPath();
  g.ellipse(-10, -4, 34.6, 21.8, 0, 0, 6.3);
  g.stroke();
  g.strokeRect(-14, -8, 8, 8);
  g.beginPath();
  g.arc(-10, -4, 1.6, 0, 6.3);
  g.stroke();
  line(g, -10, -25.8, -10, -8);
  line(g, -10, 0, -10, 17.8);
  g.beginPath();
  g.arc(-44.6, -4, 14, -1.05, 1.05);
  g.stroke();
  g.beginPath();
  g.arc(24.6, -4, 14, Math.PI - 1.05, Math.PI + 1.05);
  g.stroke();
  for (const gx of [-48.5, 28.5]) {
    for (let k = 0; k < 4; k++) {
      const tall = k === 1 || k === 2;
      ink(g, tall ? 0.7 : 0.5);
      line(g, gx, -9 + k * 3.4, gx, -9 + k * 3.4 - (tall ? 9 : 5.6));
    }
  }
  ink(g);
  rect(g, 34, 11, 19, 11);
  shade(g, 47, 11, 6, 11);
  line(g, 32.6, 11, 54.4, 11);
  g.fillStyle = RED;
  g.fillRect(42, 17.6, 2.4, 4.4);
  ink(g, 0.35);
  g.strokeRect(36.6, 14, 3, 3);
  ink(g, 0.5);
  line(g, 50, 11, 50, -1);
  line(g, 47.4, 1, 52.6, 1);
  line(g, 48.4, 3.4, 51.6, 3.4);
}
