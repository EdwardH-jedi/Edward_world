import { box, doorOf, plot, planSize } from "@/data/islands/plan";
import type { IslandPlan } from "@/types/chart";

const clubhouse = box(450, 380, 200, 130);

export const sportsgang: IslandPlan = {
  landing: "sportsgang",
  size: planSize("sportsgang"),
  jetty: { x: 711, y: 232 },
  places: [
    {
      id: "clubhouse",
      name: "Clubhouse",
      kind: "project",
      rect: clubhouse,
      door: doorOf(clubhouse, "north"),
      action: { type: "OPEN_PROJECT", projectId: "sportsgang" },
      art: "clubhouse",
    },
    plot("A", box(640, 400, 70, 70)),
  ],
  paths: [[{ x: 711, y: 232 }, { x: 600, y: 290 }, doorOf(clubhouse, "north")]],
};
