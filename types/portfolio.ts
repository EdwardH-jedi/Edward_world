export type PortfolioProjectId =
  | "sportsgang"
  | "afl-predict"
  | "wardrobe"
  | "soonpermario";

export type PortfolioCategory =
  | "Full-stack product"
  | "Data science"
  | "Interactive experience";

export type WorldBuildingId =
  | "edwards-house"
  | "wardrobe"
  | "sportsgang"
  | "afl-lab"
  | "arcade"
  | "construction-area";

export interface ProjectDetails {
  problem: string;
  implementation: readonly string[];
  decision: string;
  currentState: string;
  worldRepresentation: string;
}

export interface PortfolioProject {
  id: PortfolioProjectId;
  slug: string;
  displayName: string;
  shortDescriptor: string;
  category: PortfolioCategory;
  githubUrl?: string;
  caseStudyUrl: string;
  worldBuildingId: WorldBuildingId;
  /** Concise, source-verified account of the original project and its demo. */
  details: ProjectDetails;
  /**
   * The project's implemented stack. Canonical: any surface that shows a
   * stack reads it from here rather than restating it. Optional because it is
   * only filled in for projects whose stack has actually been verified.
   */
  techStack?: readonly string[];
  /**
   * The repository's own concise description, retained alongside the
   * source-verified implementation account in `details`.
   */
  repositorySummary?: string;
  /**
   * How the project may and may not be framed, where the repository is
   * explicit about it. Present only where getting the framing wrong would
   * misrepresent the work, so a surface that shows the project must show this.
   */
  framingNote?: string;
  /**
   * Further detail recorded from the repository's own README. Optional because
   * most repositories say all they say in one line.
   */
  repositoryNotes?: readonly string[];
}
