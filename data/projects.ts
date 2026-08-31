import type { PortfolioProject } from "@/types/portfolio";

export const projects = [
  {
    id: "sportsgang",
    slug: "sportsgang",
    displayName: "SportsGang / Protin",
    shortDescriptor: "A sports community product spanning mobile and web.",
    category: "Full-stack product",
    githubUrl: "https://github.com/EdwardH-jedi/SportsGang",
    caseStudyUrl: "/case-studies/sportsgang",
    worldBuildingId: "sportsgang",
    // Verified against the repository itself, not inferred.
    techStack: [
      "React Native / Expo",
      "FastAPI",
      "PostgreSQL",
      "Redis",
      "Docker",
    ],
    // The repository's own description, quoted rather than paraphrased.
    repositorySummary:
      "Peer sports matchmaking on mobile — find opponents by sport, issue " +
      "challenges, book nearby courts, and track results through a ranking and " +
      "honour system.",
  },
  {
    id: "afl-predict",
    slug: "afl-predict",
    displayName: "AFL Predict",
    shortDescriptor: "An evidence-led AFL forecasting and evaluation system.",
    category: "Data science",
    githubUrl: "https://github.com/EdwardH-jedi/AFL_predict",
    caseStudyUrl: "/case-studies/afl-predict",
    worldBuildingId: "afl-lab",
    // Named in the repository description; languages from the repository itself.
    techStack: ["Python", "FastAPI", "TypeScript"],
    repositorySummary:
      "Paper-trading AFL research system — scheduled ingestion, temporal " +
      "feature engineering, calibrated ensemble models, backtesting, and a " +
      "FastAPI service.",
    // The repository is explicit about this, so every surface that shows the
    // project shows it too — including the page metadata, which is the part a
    // search result quotes.
    framingNote: "Paper-trading research. Not a live betting or tipping service.",
  },
  {
    id: "wardrobe",
    slug: "wardrobe",
    displayName: "Wardrobe",
    shortDescriptor: "A local-first digital wardrobe and outfit experience.",
    category: "Full-stack product",
    githubUrl: "https://github.com/EdwardH-jedi/wadrobe",
    caseStudyUrl: "/case-studies/wardrobe",
    worldBuildingId: "wardrobe",
    techStack: ["React", "TypeScript", "Vite", "Three.js", "FastAPI"],
    // Trimmed at the sentence boundary: the repository description ends by
    // restating the stack, and the stack is canonical in `techStack` above.
    repositorySummary:
      "Local-first digital wardrobe — browser-persisted garment archive, " +
      "outfit composition, and a scoped proxy-3D experiment.",
  },
  {
    id: "soonpermario",
    slug: "soonpermario",
    displayName: "Soonpermario",
    shortDescriptor: "An interactive browser experiment in playful movement.",
    category: "Interactive experience",
    githubUrl: "https://github.com/EdwardH-jedi/soonpermario",
    caseStudyUrl: "/case-studies/soonpermario",
    worldBuildingId: "arcade",
    // The repository's own README: "pure HTML5 Canvas + vanilla JavaScript".
    techStack: ["JavaScript", "HTML5 Canvas", "No build step"],
    repositorySummary:
      "“Edward’s Career Quest” — an HTML5 Canvas and vanilla " +
      "JavaScript platformer with no build step.",
    // Mechanics as the README states them; nothing about how it plays is
    // inferred from the version rebuilt inside this world.
    repositoryNotes: [
      "Move, and hold jump to go higher.",
      "Throw a skill with X or J.",
      "?-blocks drop résumé skills.",
      "Coins are commits; lives are coffee.",
      "The final flag is the graduate offer.",
      "The final boss, THE JOB, is damaged only by thrown skills.",
    ],
  },
] as const satisfies readonly PortfolioProject[];

export function getProjectById(
  id: PortfolioProject["id"],
): PortfolioProject | undefined {
  return projects.find((project) => project.id === id);
}

/**
 * Widening is the point: `projects` is `as const`, so a field only some
 * projects carry is absent from the literal type. Route code reads a project
 * through here and sees the whole optional shape.
 */
export function getProjectBySlug(slug: string): PortfolioProject | undefined {
  return projects.find((project) => project.slug === slug);
}
