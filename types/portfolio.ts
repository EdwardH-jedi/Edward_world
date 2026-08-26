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
}
