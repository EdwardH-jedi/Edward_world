import { chapterCard, doorOf, plot, planSize, rect, scenery } from "@/data/islands/plan";
import type { IslandPlan } from "@/types/chart";

/**
 * A straight footpath runs east from the jetty to Edward's House, whose door
 * faces it: holding one arrow key walks there. The quadrangle and the signposts
 * open off the same path.
 */
const quadrangle = rect(560, 570, 300, 130);
const house = rect(1200, 480, 120, 110);
const resume = rect(520, 560, 24, 24);
const index = rect(600, 476, 24, 24);

export const sydney: IslandPlan = {
  landing: "sydney",
  size: planSize("sydney"),
  jetty: { x: 459, y: 532 },
  places: [
    {
      id: "quadrangle",
      name: "University quadrangle",
      kind: "chapter",
      rect: quadrangle,
      door: doorOf(quadrangle, "north"),
      action: chapterCard("University of Sydney", "sydney"),
      art: "quadrangle",
    },
    {
      id: "edwards-house",
      name: "Edward's House",
      kind: "chapter",
      rect: house,
      door: doorOf(house, "west"),
      action: { type: "OPEN_LOCATION", locationId: "edwards-house" },
      art: "house",
    },
    {
      id: "resume-sign",
      name: "Résumé",
      kind: "chapter",
      rect: resume,
      door: doorOf(resume, "north", 12),
      action: {
        type: "OPEN_CARD",
        heading: "Résumé",
        body: ["The timeline, selected work and contact details, on one page."],
        links: [{ label: "Résumé", href: "/resume", external: false }],
      },
      art: "signpost",
    },
    {
      id: "index-sign",
      name: "Index",
      kind: "chapter",
      rect: index,
      door: doorOf(index, "south", 12),
      action: {
        type: "OPEN_CARD",
        heading: "Index",
        body: ["Every project, the code behind it, and its engineering details."],
        links: [{ label: "Index", href: "/?view=index", external: false }],
      },
      art: "signpost",
    },
    scenery("bridge", "Harbour bridge", rect(880, 240, 420, 30), "bridge"),
    scenery("opera", "Opera shells", rect(1330, 400, 120, 70), "opera"),
    plot("A", rect(960, 600, 130, 90)),
    plot("B", rect(1050, 780, 130, 80)),
    plot("C", rect(1380, 600, 100, 80)),
  ],
  paths: [
    [{ x: 459, y: 532 }, doorOf(house, "west")],
    [{ x: 710, y: 532 }, doorOf(quadrangle, "north")],
  ],
};
