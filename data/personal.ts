/**
 * Who Edward is.
 *
 * Every entry here was read from Edward's own public repositories — the
 * biography table in `docs/IMPLEMENTATION_ROADMAP.md` records the sources.
 * Nothing in this file is inferred, rounded up, or written to sound better
 * than it is. If something is not known, it is `null` and the room says so.
 */

export interface Chapter {
  readonly id: string;
  readonly place: string;
  readonly years: string;
  readonly detail: readonly string[];
}

/** Korea to Sydney, in the order it happened. */
export const chapters: readonly Chapter[] = [
  {
    id: "jeju",
    place: "Jeju Island, Korea",
    years: "2017 – 2022",
    detail: [
      "St Johnsbury Academy Jeju.",
      "Capstone: an Arduino contactless coffee machine.",
      "Samsung Enterprise Competition — Grand Prize.",
    ],
  },
  {
    id: "seoul",
    place: "Seoul, Korea",
    years: "2021",
    detail: [
      "Research internship at Seoul National University.",
      "Materials Science & Engineering.",
    ],
  },
  {
    id: "sydney",
    place: "Sydney, Australia",
    years: "2022 – 2026",
    detail: [
      "University of Sydney.",
      "Bachelor of Advanced Computing, Computer Science.",
    ],
  },
  {
    id: "hungary",
    place: "Hungary",
    years: "2025 – 2026",
    detail: [
      "Sensorway — Ecopro.",
      "Computer Vision & Field Deployment internship.",
      "Around 750 sensors, Docker, data pipelines, live rollout.",
    ],
  },
];

export const contact = {
  name: "Edward (Soon Hyun) Hwang",
  location: "Sydney, NSW",
  email: "edwardhwang1223@gmail.com",
  linkedin: "https://linkedin.com/in/soon-hyun-hwang-7212a42b7",
  github: "https://github.com/EdwardH-jedi",
} as const;

/**
 * A hook, not a claim.
 *
 * Edward plays League of Legends. The rank is his to supply — until he does,
 * this stays null and the room says the shelf is empty rather than inventing a
 * tier. Wire a real value here, or a fetch that fills it, when there is one.
 */
export const leagueRank: string | null = null;
