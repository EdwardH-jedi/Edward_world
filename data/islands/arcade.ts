import { box, doorOf, plot, planSize } from "@/data/islands/plan";
import type { IslandPlan } from "@/types/chart";

const arcade = box(430, 360, 140, 100);

export const arcadePier: IslandPlan = {
  landing: "arcade",
  size: planSize("arcade"),
  jetty: { x: 236, y: 250 },
  places: [
    {
      id: "arcade",
      name: "Arcade",
      kind: "project",
      rect: arcade,
      door: doorOf(arcade, "west"),
      action: { type: "OPEN_PROJECT", projectId: "soonpermario" },
      art: "arcade",
    },
    plot("A", box(560, 340, 50, 60)),
  ],
  paths: [[{ x: 236, y: 250 }, { x: 300, y: 300 }, doorOf(arcade, "west")]],
};
