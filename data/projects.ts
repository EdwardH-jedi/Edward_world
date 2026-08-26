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
  },
  {
    id: "soonpermario",
    slug: "soonpermario",
    displayName: "Soonpermario",
    shortDescriptor: "An interactive browser experiment in playful movement.",
    category: "Interactive experience",
    githubUrl: undefined,
    caseStudyUrl: "/case-studies/soonpermario",
    worldBuildingId: "arcade",
  },
] as const satisfies readonly PortfolioProject[];

export function getProjectById(id: PortfolioProject["id"]) {
  return projects.find((project) => project.id === id);
}
