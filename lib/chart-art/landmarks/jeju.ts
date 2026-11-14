import { dot, house, ink, INK, label, LAND, line, PAPER_LIT, poly, RED, type Pen } from "@/lib/chart-art/ink";

/** Jeju: Hallasan, St Johnsbury Academy Jeju, a dol hareubang, and the stone walls. */
export function drawJeju(g: Pen) {
  ink(g, 0.7);
  g.beginPath();
  g.moveTo(-46, 6);
  g.quadraticCurveTo(-22, -3, -9, -30);
  g.lineTo(-4, -26.5);
  g.lineTo(3, -26.5);
  g.lineTo(8, -30);
  g.quadraticCurveTo(22, -3, 46, 6);
  g.fillStyle = PAPER_LIT;
  g.fill();
  g.stroke();
  ink(g, 0.3);
  for (let i = -7; i <= 7; i++) {
    const a = i / 7;
    line(g, i * 1.5 + a * 3, -22 + Math.abs(a) * 2, i * 5.6, 1 + Math.abs(a) * 3.4);
    if (i % 2) line(g, i * 2.4, -12, i * 4.2, -3);
  }
  label(g, "Hallasan  1,947 m", 0, 15, { italic: true, size: 5.4, haloWidth: 1.6, haloColour: LAND });
  ink(g);
  house(g, 50, 6, 30, 13, "rgba(169,72,44,.5)");
  ink(g, 0.35);
  for (const wx of [54, 59, 70, 75]) g.strokeRect(wx, -3, 2.2, 3);
  ink(g, 0.5);
  line(g, 84, 6, 84, -20);
  poly(g, [84, -20, 91, -18, 84, -16], RED);
  // Dol hareubang.
  ink(g, 0.5);
  g.fillStyle = PAPER_LIT;
  g.beginPath();
  g.ellipse(-56, 19, 3, 5.4, 0, 0, 6.3);
  g.fill();
  g.stroke();
  g.beginPath();
  g.arc(-56, 12, 2.8, 0, 6.3);
  g.fill();
  g.stroke();
  g.fillStyle = INK;
  g.beginPath();
  g.arc(-56, 10.6, 3.2, Math.PI, 0);
  g.fill();
  dot(g, -57, 12.4, 0.4);
  dot(g, -55, 12.4, 0.4);
  line(g, -58, 19, -56, 20.4, -54, 19);
  // Basalt walls.
  ink(g, 0.35);
  for (let i = 0; i < 26; i++) {
    g.beginPath();
    g.arc(-98 + i * 2.5, 36 + Math.sin(i * 0.5) * 2.6, 0.95, 0, 6.3);
    g.stroke();
  }
  for (let i = 0; i < 18; i++) {
    g.beginPath();
    g.arc(30 + i * 2.5, 42 + Math.cos(i * 0.55) * 2, 0.95, 0, 6.3);
    g.stroke();
  }
}
