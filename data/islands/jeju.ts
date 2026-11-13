import { box, chapterCard, doorOf, plot, planSize, scenery } from "@/data/islands/plan";
import type { IslandPlan } from "@/types/chart";

const academy = box(1060, 470, 150, 100);

export const jeju: IslandPlan = {
  landing: "jeju",
  size: planSize("jeju"),
  jetty: { x: 1026, y: 300 },
  places: [
    {
      id: "academy",
      name: "St Johnsbury Academy Jeju",
      kind: "chapter",
      rect: academy,
      door: doorOf(academy, "north"),
      action: chapterCard("St Johnsbury Academy Jeju", "jeju"),
      art: "academy",
    },
    scenery("hallasan", "Hallasan", box(760, 520, 300, 200), "mountain"),
    scenery("hareubang", "Dol hareubang", box(500, 560, 30, 30), "statue"),
    plot("A", box(560, 380, 110, 80)),
    plot("B", box(620, 700, 120, 80)),
    plot("C", box(940, 690, 110, 80)),
  ],
  paths: [
    [{ x: 1026, y: 300 }, { x: 1050, y: 360 }, doorOf(academy, "north")],
    [{ x: 1010, y: 320 }, { x: 900, y: 390 }, { x: 680, y: 410 }, { x: 560, y: 470 }, { x: 500, y: 541 }],
  ],
};
