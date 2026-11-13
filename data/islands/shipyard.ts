import { box, doorOf, landingLinesCard, plot, planSize } from "@/data/islands/plan";
import type { IslandPlan } from "@/types/chart";

const slipway = box(450, 380, 170, 100);

export const shipyard: IslandPlan = {
  landing: "shipyard",
  size: planSize("shipyard"),
  jetty: { x: 232, y: 373 },
  places: [
    {
      id: "slipway",
      name: "Slipway",
      kind: "idea",
      rect: slipway,
      door: doorOf(slipway, "west"),
      action: landingLinesCard("Slipway", "shipyard"),
      art: "slipway",
    },
    plot("A", box(610, 360, 80, 80)),
    plot("B", box(450, 490, 110, 44)),
  ],
  paths: [[{ x: 232, y: 373 }, doorOf(slipway, "west")]],
};
