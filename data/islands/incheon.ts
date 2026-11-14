import { box, doorOf, landingLinesCard, plot, planSize, scenery } from "@/data/islands/plan";
import type { IslandPlan } from "@/types/chart";

const towers = box(500, 430, 200, 150);
const quay = box(800, 470, 220, 90);

export const incheon: IslandPlan = {
  landing: "incheon",
  size: planSize("incheon"),
  jetty: { x: 963, y: 687 },
  places: [
    {
      id: "towers",
      name: "Apartment towers",
      kind: "chapter",
      rect: towers,
      door: doorOf(towers, "south"),
      action: landingLinesCard("Apartment towers", "incheon"),
      art: "towers",
    },
    scenery("quay", "Quay and cranes", quay, "quay"),
    plot("A", box(560, 650, 120, 80)),
    plot("B", box(430, 600, 100, 80)),
    plot("C", box(760, 330, 120, 80)),
  ],
  paths: [
    [{ x: 963, y: 687 }, { x: 860, y: 640 }, { x: 620, y: 580 }, { x: 500, y: 540 }, doorOf(towers, "south")],
    [{ x: 860, y: 640 }, { x: 940, y: 560 }, { x: 940, y: 440 }, { x: 830, y: 385 }],
  ],
};
