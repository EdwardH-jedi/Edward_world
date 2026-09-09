import type { PortfolioProject } from "@/types/portfolio";

export const projects = [
  {
    id: "sportsgang",
    slug: "sportsgang",
    displayName: "SportsGang / Protin",
    shortDescriptor: "A mobile sports matchmaking and community product.",
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
    // Evidence: Protin docs/PORTFOLIO_FACTS.md; apps/api/app/services/bookings.py,
    // matches.py and challenges.py. World boundary: components/sportsgang/.
    details: {
      problem:
        "Arranging a game involves finding a partner, agreeing on a time and venue, " +
        "and following through. SportsGang brings that coordination into a sports " +
        "matchmaking and community application.",
      implementation: [
        "A React Native / Expo client connects to a FastAPI service over PostgreSQL. " +
          "The implemented flow includes partner discovery, mutual matching, chat, " +
          "session booking and challenge results.",
        "Booking transitions are checked on the server. Reputation records and " +
          "queued notifications are written alongside the booking update; a separate " +
          "worker handles notification delivery.",
      ],
      decision:
        "Legal booking transitions and permitted actors live in one explicit table. " +
        "Keeping those rules in the backend makes the workflow auditable: the " +
        "client requests a change, and the server decides whether it is allowed. " +
        "Related records share a database commit with the booking update.",
      currentState:
        "The repository contains the mobile application, API, migrations and " +
        "automated tests. Booking outcomes still depend on participant reports: " +
        "the reputation system does not independently verify attendance.",
      worldRepresentation:
        "Edward’s World presents bounded playable sports experiences inspired by " +
        "the product. They run locally in this portfolio; they do not connect to " +
        "live matchmaking, accounts or venue bookings.",
    },
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
    // Evidence: AFL_predict/backtesting/splits.py, models/ensemble.py,
    // examples/backtest_canonical.json; world boundary: lib/game/afl-pipeline.ts.
    details: {
      problem:
        "A match forecast is only useful if its evaluation respects time. AFL " +
        "Predict investigates probabilistic forecasting and compares models with " +
        "a bookmaker-consensus benchmark.",
      implementation: [
        "The Python workflow covers data ingestion, pre-match feature engineering, " +
          "probability models, calibration, ensemble prediction and backtesting. " +
          "A FastAPI service exposes research outputs.",
        "Saved evaluation artifacts include match-level predictions, aggregate " +
          "scores and run provenance, so the reported result can be inspected " +
          "beyond a dashboard headline.",
      ],
      decision:
        "Evaluation uses expanding training windows followed by a later test " +
        "season. The split code rejects training data that reaches into the test " +
        "period. Preserving that ordering limits the data available to each fold " +
        "but makes the test closer to forecasting an unseen season.",
      currentState:
        "In the canonical saved evaluation, the bookmaker benchmark has lower " +
        "Brier score and log loss than the models. This is historical research; " +
        "it does not establish a live forecasting advantage or profitability.",
      worldRepresentation:
        "The lab in Edward’s World demonstrates the workflow with seeded fictional " +
        "fixtures and a small deterministic scoring pipeline. Its generated " +
        "probabilities are illustrative, not predictions from the original trained " +
        "models or evidence of their performance.",
    },
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
    techStack: [
      "React",
      "TypeScript",
      "Vite",
      "IndexedDB",
      "Three.js (experimental)",
      "FastAPI (experimental)",
    ],
    // Trimmed at the sentence boundary: the repository description ends by
    // restating the stack, and the stack is canonical in `techStack` above.
    repositorySummary:
      "Local-first digital wardrobe — browser-persisted garment archive, " +
      "outfit composition, and a scoped proxy-3D experiment.",
    // Evidence: wadrobe/src/app/providers/archiveReducer.ts,
    // src/lib/storage/archiveStorage.ts and docs/PORTFOLIO_FACTS.md.
    // World boundary: data/wardrobe.ts and components/wardrobe/.
    details: {
      problem:
        "A useful wardrobe archive needs both a record of individual garments " +
        "and a way to see them together. The original project, The Archive, " +
        "keeps that catalogue and outfit workflow in the browser.",
      implementation: [
        "The React / TypeScript application supports garment image capture and " +
          "import, cropping, drafted metadata with confirmation, category filtering " +
          "and layered outfit composition on a mannequin.",
        "A pure reducer manages archive and outfit changes. IDs and timestamps " +
          "arrive through action payloads, letting the domain logic be tested " +
          "independently of browser storage and clocks.",
      ],
      decision:
        "The storage facade probes IndexedDB, then localStorage, then memory. " +
        "Keeping the core workflow local avoids an account requirement; the " +
        "tradeoff is no automatic cross-device sync, and no persistence when " +
        "only the memory fallback is available.",
      currentState:
        "The repository implements the archive and outfit loop, backup transfer " +
        "and automated tests. Optional network integrations and proxy-3D work " +
        "are separate from that core; the mannequin is a composition preview, " +
        "not a garment-fit simulation.",
      worldRepresentation:
        "Edward’s World uses a curated preset rail to demonstrate capture, " +
        "archiving, layering and saving a look on this browser when storage is " +
        "available. It does not upload a visitor’s clothing photos or run the " +
        "original image-processing or experimental 3D services.",
    },
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
    // Evidence: github.com/EdwardH-jedi/soonpermario (README.md, game.js,
    // index.html); embedded implementation: lib/game/arcade/platformer.ts.
    details: {
      problem:
        "Soonpermario turns a career timeline into a playable browser story. " +
        "The original Edward’s Career Quest uses platforming, collectibles and " +
        "a job-hunt boss to introduce Edward’s background.",
      implementation: [
        "The original uses HTML5 Canvas and vanilla JavaScript for level maps, " +
          "movement, collision, enemies and skill projectiles. It opens from an " +
          "HTML file without a build step.",
      ],
      decision:
        "The embedded arcade rebuild separates movement and collision state " +
        "from rendering. Its pure simulation can be advanced in tests, including " +
        "checking jump reach against platform geometry. A compact level keeps " +
        "the interaction manageable inside the wider portfolio.",
      currentState:
        "The original repository contains the complete career-themed game and " +
        "a headless smoke-test script. The portfolio’s arcade has its own " +
        "bounded level, pickups, hazards and completion state.",
      worldRepresentation:
        "Edward’s World contains a short rebuilt segment, not the full original " +
        "game. Its career-themed collectibles are a playful introduction; " +
        "Background & contact provides the direct professional timeline.",
    },
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
