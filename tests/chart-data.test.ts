import { describe, expect, it } from "vitest";
import { chapters } from "@/data/personal";
import { getProjectById } from "@/data/projects";
import { BOTTLES, CAPTAINS_LOG, getLandingCard, LANDINGS, SHEET } from "@/data/chart";
import { cameraTarget, fitScale, playScale } from "@/lib/game/chart/camera";
import { LANDING_IDS } from "@/types/chart";

describe("chart data", () => {
  it("has the eight decided landings, once each, in panel order", () => {
    expect(LANDINGS.map((landing) => landing.id)).toEqual([...LANDING_IDS]);
    expect(LANDINGS.map((landing) => landing.name)).toEqual([
      "Incheon Port",
      "Jeju Island",
      "Field Station",
      "The Shipyard",
      "Sydney Harbour",
      "SportsGang Courts",
      "AFL Oval",
      "Arcade Pier",
    ]);
  });

  it("resolves every card, with nothing left undefined", () => {
    for (const id of LANDING_IDS) {
      const card = getLandingCard(id);
      expect(card.heading, id).not.toBe("");
      expect(card.lede, id).not.toBe("");
      expect(JSON.stringify(card), id).not.toMatch(/undefined|null/);
    }
    for (const bottle of BOTTLES) {
      expect(bottle.text.length, bottle.id).toBeGreaterThan(10);
      expect(bottle.text, bottle.id).not.toMatch(/undefined/);
    }
  });

  it("takes chapter and project facts from the canonical data, not a copy", () => {
    const jeju = chapters.find((c) => c.id === "jeju")!;
    expect(getLandingCard("jeju").lines).toEqual(jeju.detail);
    expect(getLandingCard("jeju").eyebrow.startsWith(jeju.years)).toBe(true);

    const afl = getProjectById("afl-predict")!;
    const aflCard = getLandingCard("afl");
    expect(aflCard.lines).toContain(afl.framingNote);
    expect(aflCard.stack).toEqual(afl.techStack);
    expect(aflCard.links.map((l) => l.href)).toEqual([afl.caseStudyUrl, afl.githubUrl]);
  });

  it("routes internal links inside the site and only GitHub outside it", () => {
    for (const id of LANDING_IDS) {
      for (const link of getLandingCard(id).links) {
        expect(link.external, `${id} ${link.label}`).toBe(link.href.startsWith("https://"));
      }
    }
    expect(getLandingCard("sydney").links.map((l) => l.href)).toEqual(["/resume", "/?view=index"]);
  });

  it("keeps the log short enough to read before setting sail", () => {
    expect(CAPTAINS_LOG.lines.length).toBeLessThanOrEqual(4);
  });
});

describe("chart camera", () => {
  it("frames the whole sheet for the log and comes down to the boat to sail", () => {
    const laptop = { width: 1280, height: 720 };
    expect(fitScale(laptop, SHEET)).toBeLessThan(playScale(laptop));
    expect(cameraTarget("sheet", laptop, SHEET)).toMatchObject({ cx: SHEET.width / 2, cy: SHEET.height / 2 });
    const phone = { width: 390, height: 780 };
    expect(playScale(phone)).toBeGreaterThanOrEqual(1.25);
  });

  it("does not look further than a margin past the sheet's edge", () => {
    const screen = { width: 1280, height: 720 };
    const view = cameraTarget({ x: 0, y: 0, vx: 0, vy: 0 }, screen, SHEET);
    expect(view.cx - screen.width / view.k / 2).toBeGreaterThanOrEqual(-34 - 1e-9);
    expect(view.cy - screen.height / view.k / 2).toBeGreaterThanOrEqual(-34 - 1e-9);
  });
});
