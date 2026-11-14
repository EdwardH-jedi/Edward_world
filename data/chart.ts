import { chapters, type Chapter } from "@/data/personal";
import { getProjectById } from "@/data/projects";
import type {
  Bottle,
  CardLink,
  Landing,
  LandingCard,
  LandingId,
  Rect,
  SeaName,
  Vec,
} from "@/types/chart";
import type { PortfolioProject, PortfolioProjectId } from "@/types/portfolio";

/**
 * The chart's content.
 *
 * `data/personal.ts` and `data/projects.ts` stay canonical: a tag, a card line
 * or a bottle that states a fact about Edward or a project reads it from there
 * rather than restating it. What is written here is the chart's own voice —
 * island names, the ledes, the handwritten notes — and the sheet's geometry.
 *
 * Copy flagged in the brief as a stand-in awaiting Edward's sign-off: the
 * captain's log, "Born here in 2002", the Shipyard's line, "Sea of Side
 * Projects", "the Danube, allegedly", "here be bugs", and the short notes.
 */

/** The sheet, in chart units. */
export const SHEET = { width: 1440, height: 960 } as const;

function chapter(id: string): Chapter {
  const found = chapters.find((entry) => entry.id === id);
  if (!found) throw new Error(`data/chart.ts: unknown chapter "${id}"`);
  return found;
}

function project(id: PortfolioProjectId): PortfolioProject {
  const found = getProjectById(id);
  if (!found) throw new Error(`data/chart.ts: unknown project "${id}"`);
  return found;
}

const rects = (...list: readonly (readonly [number, number, number, number])[]): Rect[] =>
  list.map(([x, y, w, h]) => ({ x, y, w, h }));

const at = (x: number, y: number): Vec => ({ x, y });

/** Eight landings, in the order the Landings panel numbers them. */
export const LANDINGS: readonly Landing[] = [
  {
    id: "incheon",
    name: "Incheon Port",
    tag: "2002",
    coord: "37°27′N 126°42′E",
    centre: at(260, 190),
    radii: at(109.25, 77),
    seed: 11,
    dockAngle: 0.55,
    anchorage: at(354, 247),
    landmark: { scale: 1.6, offset: at(-16, 20), main: { x0: -40, x1: 72, name: "the port: towers, quay and cranes" } },
    woodland: { density: 0.21, clearings: rects([-44, -50, 62, 52], [14, -18, 62, 36]) },
    source: {},
  },
  {
    id: "jeju",
    name: "Jeju Island",
    tag: chapter("jeju").years,
    coord: "33°30′N 126°32′E",
    centre: at(330, 520),
    radii: at(132, 81.9),
    seed: 23,
    dockAngle: -0.75,
    anchorage: at(411, 444),
    landmark: { scale: 1.6, offset: at(12, -8), main: { x0: -46, x1: 46, name: "Hallasan" } },
    woodland: {
      density: 0.29,
      fruit: true,
      clearings: rects([-48, -36, 96, 46], [44, -20, 46, 30], [-62, 8, 14, 18]),
    },
    source: { chapterId: "jeju" },
  },
  {
    id: "field",
    name: "Field Station",
    tag: `${chapter("hungary").place} · ${chapter("hungary").years}`,
    centre: at(760, 150),
    radii: at(68.2, 50.6),
    seed: 37,
    dockAngle: 2.2,
    anchorage: at(715, 212),
    landmark: { scale: 1.6, offset: at(-4, 20), main: { x0: -37, x1: 37, name: "the fenced station" } },
    woodland: { density: 0.15, clearings: rects([-44, -34, 88, 46]) },
    source: { chapterId: "hungary" },
  },
  {
    id: "shipyard",
    name: "The Shipyard",
    tag: "Under construction",
    centre: at(700, 430),
    radii: at(69.6, 50.6),
    seed: 41,
    dockAngle: Math.PI,
    anchorage: at(619, 430),
    landmark: { scale: 1.6, offset: at(-12, 8), main: { x0: -30, x1: 30, name: "the slipway and its hull" } },
    woodland: { density: 0.13, clearings: rects([-30, -24, 70, 42]) },
    source: {},
  },
  {
    id: "sydney",
    name: "Sydney Harbour",
    tag: chapter("sydney").years,
    coord: "33°52′S 151°13′E",
    centre: at(1060, 620),
    radii: at(170, 115),
    seed: 53,
    dockAngle: 3.45,
    anchorage: at(901, 569),
    carve: [{ x: 1090, y: 512, rx: 46, ry: 40 }],
    labelDx: -86,
    landmark: { scale: 2, offset: at(4, 8), main: { x0: -70, x1: 14, name: "the university quadrangle" } },
    woodland: {
      density: 0.24,
      clearings: rects(
        [-72, -58, 88, 72],
        [-16, 28, 55, 13],
        [33, -16, 38, 43],
        [38, -45, 24, 14],
        [-78, 14, 126, 4],
      ),
    },
    source: { chapterId: "sydney" },
  },
  {
    id: "sportsgang",
    name: "SportsGang Courts",
    tag: project("sportsgang").category,
    centre: at(760, 800),
    radii: at(72.6, 50.4),
    seed: 67,
    dockAngle: -0.55,
    anchorage: at(840, 751),
    landmark: { scale: 1.6, offset: at(-8, 4), main: { x0: -38, x1: 24, name: "the courts" } },
    woodland: { density: 0.14, clearings: rects([-42, -24, 76, 52]) },
    source: { projectId: "sportsgang" },
  },
  {
    id: "afl",
    name: "AFL Oval",
    tag: project("afl-predict").category,
    centre: at(1250, 330),
    radii: at(89.7, 61.6),
    seed: 71,
    dockAngle: 2.3,
    anchorage: at(1187, 400),
    landmark: { scale: 1.6, offset: at(8, -8), main: { x0: -47, x1: 27, name: "the oval" } },
    woodland: { density: 0.14, clearings: rects([-56, -34, 112, 60]) },
    source: { projectId: "afl-predict" },
  },
  {
    id: "arcade",
    name: "Arcade Pier",
    tag: project("soonpermario").category,
    centre: at(1300, 850),
    radii: at(59.8, 44),
    seed: 83,
    dockAngle: 3.6,
    anchorage: at(1231, 816),
    landmark: { scale: 1.6, offset: at(-4, 8), main: { x0: -17, x1: 17, name: "the arcade" } },
    woodland: { density: 0.11, clearings: rects([-32, -22, 64, 36]) },
    source: { projectId: "soonpermario" },
  },
];

export function getLanding(id: LandingId): Landing {
  const found = LANDINGS.find((landing) => landing.id === id);
  if (!found) throw new Error(`data/chart.ts: unknown landing "${id}"`);
  return found;
}

/** The chart's own lines for each landing. Facts are pulled in by `getLandingCard`. */
const CHART_LINES: Readonly<Record<LandingId, { lede?: string; lines?: readonly string[] }>> = {
  incheon: {
    lede: "Home port.",
    lines: ["Born here in 2002.", "Every chapter after this one starts with a crossing."],
  },
  jeju: { lede: "Five years on an island." },
  field: { lede: "Hungary has no coast. The chart takes liberties." },
  shipyard: { lede: "Something is on the slipway.", lines: ["Reserved for the next project."] },
  sydney: {
    lede: "Where the boat is moored now.",
    lines: ["Edward's House, the résumé and the index are ashore here."],
  },
  sportsgang: {},
  afl: {},
  arcade: {},
};

const SYDNEY_LINKS: readonly CardLink[] = [
  { label: "Résumé", href: "/resume", external: false },
  { label: "Index", href: "/?view=index", external: false },
];

function projectLines(entry: PortfolioProject): string[] {
  if (entry.framingNote) return [entry.framingNote];
  // Soonpermario's one line on the chart is the README's own joke about it.
  const note = entry.repositoryNotes?.find((line) => /coins are commits/i.test(line));
  return note ? [note] : [];
}

/** The card `E` opens at an anchorage, resolved from the canonical data. */
export function getLandingCard(id: LandingId): LandingCard {
  const landing = getLanding(id);
  const own = CHART_LINES[id];
  const eyebrow = landing.coord ? `${landing.tag} · ${landing.coord}` : landing.tag;
  const base = { eyebrow, heading: landing.name };

  if (landing.source.projectId) {
    const entry = project(landing.source.projectId);
    const links: CardLink[] = [
      { label: "Case study", href: entry.caseStudyUrl, external: false },
    ];
    if (entry.githubUrl) links.push({ label: "GitHub", href: entry.githubUrl, external: true });
    return {
      ...base,
      lede: own.lede ?? `${entry.displayName}. ${entry.shortDescriptor}`,
      lines: [...projectLines(entry), ...(own.lines ?? [])],
      stack: entry.techStack ?? [],
      links,
    };
  }

  const detail = landing.source.chapterId ? chapter(landing.source.chapterId).detail : [];
  return {
    ...base,
    lede: own.lede ?? "",
    lines: [...detail, ...(own.lines ?? [])],
    stack: [],
    links: id === "sydney" ? SYDNEY_LINKS : [],
  };
}

/** "a, b and c". */
function listOf(items: readonly string[]): string {
  if (items.length < 2) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

const jeju = chapter("jeju");
const seoul = chapter("seoul");
const hungary = chapter("hungary");
const sportsgang = project("sportsgang");
const afl = project("afl-predict");
const arcade = project("soonpermario");

/**
 * Eight bottles. The positions are authored; `settleBottles` nudges any that
 * landed too close to a coast back out to sea. The `note` is the short line
 * handwritten on the chart once a bottle is fished out.
 */
export const BOTTLES: readonly Bottle[] = [
  {
    id: "seoul",
    at: at(402, 118),
    note: `SNU research intern, ${seoul.years}`,
    text: `${seoul.years}, Seoul. ${seoul.detail.join(" ")}`,
  },
  {
    id: "capstone",
    at: at(478, 566),
    note: "Arduino coffee machine",
    text: `${jeju.detail[0]} ${jeju.detail[1]}`,
  },
  { id: "samsung", at: at(196, 648), note: "Samsung Grand Prize", text: jeju.detail[2] },
  {
    id: "sensors",
    at: at(884, 236),
    note: "~750 sensors, live rollout",
    text: `${hungary.detail[0]} ${hungary.detail[2]}`,
  },
  {
    id: "sportsgang-stack",
    at: at(628, 700),
    note: "Expo · FastAPI · Postgres",
    text: `${sportsgang.displayName} runs on ${listOf(sportsgang.techStack ?? [])}.`,
  },
  {
    id: "paper-trading",
    at: at(1118, 404),
    note: "paper trading only",
    text: `${afl.displayName}. ${afl.framingNote ?? ""}`.trim(),
  },
  {
    id: "coins",
    at: at(1196, 792),
    note: "coins = commits",
    text: `${arcade.displayName}: ${projectLines(arcade)[0] ?? ""}`,
  },
  {
    id: "engine",
    at: at(1090, 540),
    note: "no game engine here",
    text: "This world is Next.js, React and Canvas 2D. No game engine. You found the one under the bridge.",
  },
];

export const SEA_NAMES: readonly SeaName[] = [
  { text: "Yellow Sea", at: at(118, 345), rotation: -0.22, size: 15 },
  { text: "Jeju Strait", at: at(520, 392), rotation: 0.12, size: 13 },
  { text: "Tasman Sea", at: at(1338, 610), rotation: -1.36, size: 15 },
  { text: "Port Jackson", at: at(1090, 476), rotation: 0, size: 7 },
  { text: "Sea of Side Projects", at: at(1016, 786), rotation: -0.06, size: 13 },
  { text: "the Danube, allegedly", at: at(812, 232), rotation: 0.05, size: 7.5 },
];

/** Fixed furniture on the sheet. */
export const ROSE = { x: 975, y: 300, r: 52 } as const;
export const CARTOUCHE = { x: 450, y: 836, w: 250, h: 96 } as const;
export const SERPENT = at(1040, 872);
export const COFFEE_RING = { x: 606, y: 596, rotation: 0.4 } as const;
export const BRIDGE = { y: 510, x0: 1040, x1: 1140 } as const;

export const CARTOUCHE_COPY = {
  kicker: "A Chart of",
  title: "Edward's World",
  subtitle: "from Incheon to Sydney, surveyed 2002 – 2026",
  caveat: "Not to be used for navigation.",
} as const;

export const SERPENT_COPY = "here be bugs";

/** The opening card. */
export const CAPTAINS_LOG = {
  eyebrow: "Captain's log · Entry 1",
  heading: "It is a long story.",
  lede: "Here is the short version.",
  lines: [
    "2002. Incheon. Soon Hyun Hwang is born beside a port.",
    "He has been crossing water ever since. Jeju first, then Sydney.",
    "The rest is on this chart. Take the boat.",
  ],
} as const;

/** The landing the boat starts at. */
export const HOME_LANDING: LandingId = "incheon";
