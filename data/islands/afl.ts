import { box, doorOf, plot, planSize } from "@/data/islands/plan";
import type { IslandPlan } from "@/types/chart";

const lab = box(560, 390, 260, 160);

export const afl: IslandPlan = {
  landing: "afl",
  size: planSize("afl"),
  jetty: { x: 387, y: 631 },
  places: [
    {
      id: "lab",
      name: "Lab",
      kind: "project",
      rect: lab,
      door: doorOf(lab, "south"),
      action: { type: "OPEN_PROJECT", projectId: "afl-predict" },
      art: "oval",
    },
    plot("A", box(770, 420, 80, 70)),
  ],
  paths: [[{ x: 387, y: 631 }, { x: 450, y: 560 }, doorOf(lab, "south")]],
};
