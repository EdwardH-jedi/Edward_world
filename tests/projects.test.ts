import { describe, expect, it } from "vitest";
import { projects } from "@/data/projects";

describe("canonical project data", () => {
  it("contains the four approved flagship entries and no excluded projects", () => {
    expect(projects.map(({ id }) => id)).toEqual([
      "sportsgang",
      "afl-predict",
      "wardrobe",
      "soonpermario",
    ]);
    expect(JSON.stringify(projects)).not.toMatch(/PanSegAI|TOMODACHI/i);
  });

  it("carries a verified stack and reachable links for every project", () => {
    for (const project of projects) {
      expect(project.techStack?.length, project.id).toBeGreaterThan(0);
      expect(project.caseStudyUrl.startsWith("/case-studies/")).toBe(true);
      if (project.githubUrl) {
        expect(project.githubUrl.startsWith("https://github.com/")).toBe(true);
      }
    }
  });

  it("uses a unique id, slug, and world building for each project", () => {
    expect(new Set(projects.map(({ id }) => id)).size).toBe(projects.length);
    expect(new Set(projects.map(({ slug }) => slug)).size).toBe(projects.length);
    expect(new Set(projects.map(({ worldBuildingId }) => worldBuildingId)).size).toBe(
      projects.length,
    );
  });
});
