import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

/**
 * Review screenshots for the chart overworld phases, written to
 * docs/chart-overworld/review/<phase>/. Off by default so `test:e2e` does not
 * rewrite them on every run:
 *
 *   CHART_REVIEW=1 npx playwright test e2e/chart-review.spec.ts
 *
 * Reduced motion keeps the frames still: no zoom, bobbing, pulse or ripples.
 */

const PHASE = process.env.CHART_REVIEW_PHASE ?? "phase-1";
const OUT = `docs/chart-overworld/review/${PHASE}`;

const LANDINGS = [
  "Incheon Port",
  "Jeju Island",
  "Field Station",
  "The Shipyard",
  "Sydney Harbour",
  "SportsGang Courts",
  "AFL Oval",
  "Arcade Pier",
] as const;

const SIZES = [
  { name: "1280x720", viewport: { width: 1280, height: 720 }, touch: false },
  { name: "390x780", viewport: { width: 390, height: 780 }, touch: true },
] as const;

const slug = (name: string) => name.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
}

test.skip(!process.env.CHART_REVIEW, "Set CHART_REVIEW=1 to refresh the review screenshots.");

for (const size of SIZES) {
  test.describe(size.name, () => {
    test.use({ viewport: size.viewport, hasTouch: size.touch, isMobile: size.touch });

    test("the whole chart, the log, and every landing", async ({ page }) => {
      test.setTimeout(90_000);
      mkdirSync(OUT, { recursive: true });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/chart");
      await expect(page.getByRole("dialog", { name: "It is a long story." })).toBeVisible();
      await settle(page);
      await page.screenshot({ path: `${OUT}/captains-log-${size.name}.png` });

      // The whole sheet is only on screen behind the log; lift the log for this one frame.
      const lifted = await page.addStyleTag({ content: ".chart-log { display: none !important; }" });
      await settle(page);
      await page.screenshot({ path: `${OUT}/chart-whole-${size.name}.png` });
      await lifted.evaluate((node) => node.parentNode?.removeChild(node));

      await page.getByRole("button", { name: /Set sail/ }).click();
      for (const [i, name] of LANDINGS.entries()) {
        await page.getByRole("button", { name: /^Landings/ }).click();
        const panel = page.getByRole("dialog", { name: "Landings" });
        await panel.getByRole("listitem").filter({ hasText: name }).getByRole("button").click();
        await expect(panel).toBeHidden();
        await expect(page.getByRole("button", { name: new RegExp(`Drop anchor at ${name}`) })).toBeVisible();
        await settle(page);
        await page.screenshot({ path: `${OUT}/landing-${i + 1}-${slug(name)}-${size.name}.png` });
      }
    });
  });
}
