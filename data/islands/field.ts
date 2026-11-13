import { box, chapterCard, doorOf, plot, planSize, scenery } from "@/data/islands/plan";
import type { IslandPlan } from "@/types/chart";

const hut = box(440, 400, 110, 70);

export const field: IslandPlan = {
  landing: "field",
  size: planSize("field"),
  jetty: { x: 346, y: 531 },
  places: [
    {
      id: "station-hut",
      name: "Station hut",
      kind: "chapter",
      rect: hut,
      door: doorOf(hut, "south"),
      action: chapterCard("Sensorway", "hungary"),
      art: "hut",
    },
    scenery("sensor-fence", "Sensor fence", box(450, 270, 260, 40), "fence"),
    plot("A", box(600, 400, 90, 70)),
    plot("B", box(300, 380, 80, 70)),
  ],
  paths: [[{ x: 346, y: 531 }, { x: 400, y: 480 }, doorOf(hut, "south")]],
};
