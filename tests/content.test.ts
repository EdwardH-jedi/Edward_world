import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { chapters, contact } from "@/data/personal";
import { getProjectBySlug, projects } from "@/data/projects";
import { timelineStations } from "@/data/timeline";

const sourceOf = (relativePath: string) =>
  readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), "utf8");

const DOCUMENT_PAGES = [
  "app/resume/page.tsx",
  "app/case-studies/[slug]/page.tsx",
] as const;

describe("document page content", () => {
  it("gives every project the repository's own words to quote", () => {
    for (const project of projects) {
      expect(project.repositorySummary?.trim(), project.id).toBeTruthy();
    }
  });

  /*
   * The AFL repository says paper-trading research, no live betting. A page
   * that dropped the framing, or grew an accuracy figure, would misrepresent
   * the work — so both are asserted rather than left to review.
   */
  it("keeps AFL Predict framed as research", () => {
    const afl = getProjectBySlug("afl-predict");
    expect(afl?.framingNote).toMatch(/paper-trading/i);
    expect(afl?.framingNote).toMatch(/not a live betting or tipping service/i);
    expect(JSON.stringify(afl)).not.toMatch(/%|\baccuracy\b|\bwin rate\b|\bodds\b/i);
  });

  it("states no metric anywhere in project or biography data", () => {
    const copy = JSON.stringify({ chapters, contact, projects });
    expect(copy).not.toMatch(/\d+(\.\d+)?\s?%/);
    expect(copy).not.toMatch(/\b(users|downloads|revenue|accuracy|uptime)\b/i);
  });

  /*
   * The pages render from `data/`; a number written straight into the markup
   * would be a fact nobody verified. Two-digit runs only, so `h2` and the like
   * do not trip it.
   */
  it("hard-codes no figure into either page", () => {
    for (const page of DOCUMENT_PAGES) {
      expect(sourceOf(page), page).not.toMatch(/\d{2,}|%/);
    }
  });

  /*
   * The timeline street and the index's Timeline section read the same
   * chapters. Every word a station shows is the chapter's own, and the index
   * renders its section through the same two helpers, so the world and the
   * index cannot drift apart.
   */
  it("words every timeline station only from its chapter", () => {
    timelineStations.forEach((station, index) => {
      const chapter = chapters[index];
      const action = station.interaction;
      expect(action.type).toBe("READ");
      if (action.type !== "READ") return;
      expect(action.heading).toBe(`${chapter.place} · ${chapter.years}`);
      expect(action.text).toBe(chapter.detail.join(" "));
      expect(chapter.place.startsWith(station.label), station.label).toBe(true);
    });
    const copy = JSON.stringify(timelineStations);
    expect(copy).not.toMatch(/\d+(\.\d+)?\s?%/);
    expect(copy).not.toMatch(/\b(users|downloads|revenue|accuracy|uptime)\b/i);
  });

  it("renders the index's Timeline from the chapters, through the stations' own wording", () => {
    const index = sourceOf("components/index/portfolio-index.tsx");
    expect(index).toMatch(/chapters\.map\(/);
    expect(index).toContain("stationHeading(chapter)");
    expect(index).toContain("stationText(chapter)");
  });

  it("holds the biography the resume is built from", () => {
    expect(chapters.length).toBeGreaterThan(0);
    for (const chapter of chapters) {
      expect(chapter.place, chapter.id).toBeTruthy();
      expect(chapter.years, chapter.id).toMatch(/\d{4}/);
      expect(chapter.detail.length, chapter.id).toBeGreaterThan(0);
    }
    expect(contact.email).toMatch(/@/);
    expect(contact.linkedin.startsWith("https://")).toBe(true);
    expect(contact.github.startsWith("https://")).toBe(true);
  });
});
