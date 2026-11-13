import { house, ink, line, poly, RED, rect, type Pen } from "@/lib/chart-art/ink";

/** SportsGang Courts: a tennis court, a basketball half-court, the clubhouse and a putting green. */
export function drawSportsgang(g: Pen) {
  g.fillStyle = "rgba(117,130,90,.3)";
  g.fillRect(-38, -16, 32, 19);
  ink(g, 0.5);
  g.strokeRect(-38, -16, 32, 19);
  ink(g, 0.3);
  g.strokeRect(-36, -13.6, 28, 14.2);
  line(g, -29, -6.5, -15, -6.5);
  line(g, -29, -13.6, -29, 0.6);
  line(g, -15, -13.6, -15, 0.6);
  ink(g, 0.8);
  line(g, -22, -17.4, -22, 4.4);
  ink(g, 0.4);
  g.strokeRect(2, -14, 22, 16);
  g.beginPath();
  g.arc(13, -14, 6.4, 0, Math.PI);
  g.stroke();
  g.strokeRect(9.6, -14, 6.8, 6);
  ink(g, 0.6);
  line(g, 13, -14, 13, -25);
  rect(g, 9.8, -26, 6.4, 4.4);
  ink(g, 0.6, RED);
  g.beginPath();
  g.ellipse(13, -20.4, 2.2, 0.8, 0, 0, 6.3);
  g.stroke();
  ink(g);
  house(g, -13, 22, 17, 9.5);
  g.fillStyle = "rgba(117,130,90,.4)";
  g.beginPath();
  g.ellipse(24, 18, 7, 3.4, 0, 0, 6.3);
  g.fill();
  ink(g, 0.3);
  g.stroke();
  ink(g, 0.45);
  line(g, 25, 18, 25, 8);
  poly(g, [25, 8, 30, 9.4, 25, 10.8], RED);
}
