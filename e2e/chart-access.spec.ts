import { expect, test, type Page } from "@playwright/test";

/** The chart overworld's touch, reduced-motion, focus and layout guarantees. */

const chartCanvas = (page: Page) => page.locator(".chart-stage > .chart-sea");
const islandCanvas = (page: Page) => page.locator(".chart-island .chart-sea");

async function setSail(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /Set sail/ })).toBeFocused();
  await page.getByRole("button", { name: /Set sail/ }).click();
  await expect(page.getByRole("dialog", { name: "It is a long story." })).toBeHidden();
}

async function sailTo(page: Page, name: string) {
  await page.getByRole("button", { name: /^Landings/ }).first().click();
  const panel = page.getByRole("dialog", { name: "Landings" });
  await panel.getByRole("listitem").filter({ hasText: name }).getByRole("button").click();
  await expect(panel).toBeHidden();
  // E acts once the chart has the boat at the anchorage, which the prompt shows.
  await expect(page.getByRole("button", { name: new RegExp(`Drop anchor at ${name}`) })).toBeVisible();
}

/** A finger held on the screen, as real touch input, so the page sees touch pointer events. */
async function holdTouch(page: Page, x: number, y: number, ms: number) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await page.waitForTimeout(ms);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

test.describe("touch", () => {
  test.use({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true });

  test("a finger held on the water sails the boat, and one held on the ground walks Edward", async ({ page }) => {
    await setSail(page);
    await expect(page.getByText("Hold a finger on the water to sail toward it.")).toBeVisible();
    const home = page.getByRole("button", { name: /Drop anchor at Incheon Port/ });
    await expect(home).toBeVisible();
    await holdTouch(page, 370, 330, 1_200);
    await expect(home).toBeHidden();

    await sailTo(page, "Sydney Harbour");
    // No keyboard on a phone: the prompt itself is the way ashore.
    await page.getByRole("button", { name: /Drop anchor at Sydney Harbour/ }).tap();
    await expect(page.locator(".chart-island")).toBeVisible();
    const jetty = page.locator(".chart-island .chart-prompt");
    await expect(jetty).toContainText("Back to the boat");
    await holdTouch(page, 375, 400, 900);
    await expect(jetty).toBeHidden();
    await page.getByRole("button", { name: /Back to the boat/ }).first().tap();
    await expect(page.locator(".chart-island")).toBeHidden();
  });
});

test("the E prompts are buttons too: a click goes ashore and back", async ({ page }) => {
  await setSail(page);
  await page.getByRole("button", { name: /Drop anchor at Incheon Port/ }).click();
  await expect(page.locator(".chart-island")).toBeVisible();
  await page.locator(".chart-island .chart-prompt").click();
  await expect(page.locator(".chart-island")).toBeHidden();
});

test.describe("reduced motion", () => {
  test("holds the chart and the island perfectly still: no zoom, bobbing, pulse or ripples", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator(".chart-log__line").first()).toHaveCSS("animation-name", "none");
    await page.getByRole("button", { name: /Set sail/ }).click();
    await page.waitForTimeout(150);
    const a = await chartCanvas(page).screenshot();
    await page.waitForTimeout(900);
    expect((await chartCanvas(page).screenshot()).equals(a)).toBe(true);

    await sailTo(page, "Arcade Pier");
    await page.keyboard.press("e");
    await expect(page.locator(".chart-island")).toHaveCSS("animation-name", "none");
    await page.waitForTimeout(150);
    const b = await islandCanvas(page).screenshot();
    await page.waitForTimeout(900);
    expect((await islandCanvas(page).screenshot()).equals(b)).toBe(true);
  });

  test("without it, the chart is alive: the same two frames differ", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await page.getByRole("button", { name: /Set sail/ }).click();
    await page.waitForTimeout(1_500);
    const a = await chartCanvas(page).screenshot();
    await page.waitForTimeout(400);
    expect((await chartCanvas(page).screenshot()).equals(a)).toBe(false);
  });
});

test.describe("focus", () => {
  test("the log keeps Tab inside itself", async ({ page }) => {
    await page.goto("/");
    const sail = page.getByRole("button", { name: /Set sail/ });
    await expect(sail).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("dialog").getByRole("link", { name: /Skip to index/ })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(sail).toBeFocused();
  });

  test("the Landings panel hands focus back to where it was opened", async ({ page }) => {
    await setSail(page);
    await sailTo(page, "Jeju Island");
    await page.keyboard.press("e");
    await expect(islandCanvas(page)).toBeFocused();

    await page.keyboard.press("m");
    const panel = page.getByRole("dialog", { name: "Landings" });
    await expect(panel.getByRole("button", { name: /Close/ })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(islandCanvas(page)).toBeFocused();

    await page.keyboard.press("m");
    await panel.getByRole("listitem").filter({ hasText: "AFL Oval" }).getByRole("button").click();
    await expect(page.locator(".chart-island")).toBeHidden();
    await expect(chartCanvas(page)).toBeFocused();
    await expect(page.getByRole("button", { name: /Drop anchor at AFL Oval/ })).toBeVisible();
  });
});

test.describe("layout", () => {
  for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 780 }]) {
    test(`nothing in the HUD overlaps at ${viewport.width}×${viewport.height}, at sea or ashore`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await setSail(page);
      await expect(page.getByRole("button", { name: /Drop anchor at Incheon Port/ })).toBeVisible();

      const overlaps = (layer: string) =>
        page.evaluate((layer) => {
          const nodes = [
            ...document.querySelectorAll(
              `${layer} > .chart-progress, ${layer} > .chart-island__title, ${layer} > .chart-actions > *, ${layer} > .chart-dock > *`,
            ),
            document.querySelector("body > .music-control"),
          ].filter((node): node is Element => Boolean(node));
          const boxes = nodes.map((node) => ({ name: node.className, r: node.getBoundingClientRect() }));
          const hits: string[] = [];
          boxes.forEach((a, i) =>
            boxes.slice(i + 1).forEach((b) => {
              if (a.r.left < b.r.right && b.r.left < a.r.right && a.r.top < b.r.bottom && b.r.top < a.r.bottom) {
                hits.push(`${a.name} × ${b.name}`);
              }
            }),
          );
          return hits;
        }, layer);

      expect(await overlaps(".chart-stage")).toEqual([]);
      await sailTo(page, "Sydney Harbour");
      await page.keyboard.press("e");
      await expect(page.locator(".chart-island .chart-prompt")).toBeVisible();
      expect(await overlaps(".chart-island")).toEqual([]);
    });
  }
});
