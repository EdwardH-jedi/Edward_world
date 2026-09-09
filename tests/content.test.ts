import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { chapters, contact } from "@/data/personal";
import { getProjectBySlug, projects } from "@/data/projects";

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
