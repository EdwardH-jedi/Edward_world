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

  it("uses a unique id, slug, and world building for each project", () => {
    expect(new Set(projects.map(({ id }) => id)).size).toBe(projects.length);
    expect(new Set(projects.map(({ slug }) => slug)).size).toBe(projects.length);
    expect(new Set(projects.map(({ worldBuildingId }) => worldBuildingId)).size).toBe(
      projects.length,
    );
  });
});
