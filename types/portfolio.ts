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

export interface PortfolioProject {
  id: PortfolioProjectId;
  slug: string;
  displayName: string;
  shortDescriptor: string;
  category: PortfolioCategory;
  githubUrl?: string;
  caseStudyUrl: string;
  worldBuildingId: WorldBuildingId;
  /**
   * The project's real, shipped stack. Canonical: any surface that shows a
   * stack reads it from here rather than restating it. Optional because it is
   * only filled in for projects whose stack has actually been verified.
   */
  techStack?: readonly string[];
  /**
   * The repository's own description of itself, verbatim. Case studies quote
   * this rather than paraphrasing it: a project stated in its own words is a
   * fact, and prose written around it would not be.
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
