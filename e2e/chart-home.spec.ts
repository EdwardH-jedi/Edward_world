import { expect, test, type Page } from "@playwright/test";

/**
 * The chart as the front door (phase 5): `/` keeps the contract the town gave
 * it. A cold visit opens on the log, `?view=world` starts under way, and
 * `?view=index` opens the index over the voyage without ending it.
 */

const chartCanvas = (page: Page) => page.locator(".chart-stage > .chart-sea");
const log = (page: Page) => page.getByRole("dialog", { name: "It is a long story." });
const index = (page: Page) => page.getByRole("dialog", { name: "Portfolio Index" });

async function expectFocusIn(page: Page, selector: string) {
  await expect
    .poll(() => page.evaluate((s) => !!document.querySelector(s)?.contains(document.activeElement), selector))
    .toBe(true);
}

async function goAshoreAtSydney(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /Set sail/ }).click();
  await expect(log(page)).toBeHidden();
  await page.getByRole("button", { name: /^Landings/ }).click();
  const panel = page.getByRole("dialog", { name: "Landings" });
  await panel.getByRole("listitem").filter({ hasText: "Sydney Harbour" }).getByRole("button").click();
  await expect(page.getByRole("button", { name: /Drop anchor at Sydney Harbour/ })).toBeVisible();
  await page.keyboard.press("e");
  await expect(page.locator(".chart-island")).toBeVisible();
}

test.describe("the chart at /", () => {
  test("a cold visit opens on the log, and once under way a reload does not replay it", async ({ page }) => {
    await page.goto("/");
    await expect(log(page)).toBeVisible();
    await expect(page).toHaveTitle("Edward's World");
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);

    await page.keyboard.press("Enter");
    await expect(log(page)).toBeHidden();
    await expect(page).toHaveURL(/\/\?view=world$/);

    await page.reload();
    await expect(chartCanvas(page)).toBeFocused();
    await expect(log(page)).toHaveCount(0);
  });

  test("?view=index opens the index over the chart; closing it leaves the visitor sailing", async ({ page }) => {
    await page.goto("/?view=index");
    await expect(index(page)).toBeVisible();
    await expectFocusIn(page, ".index-dialog");
    await expect(log(page)).toHaveCount(0);
    // The chart does not hear keys meant for the index.
    await page.keyboard.press("m");
    await expect(page.getByRole("dialog", { name: "Landings" })).toHaveCount(0);

    await page.keyboard.press("Escape");
    await expect(index(page)).toBeHidden();
    await expect(page).toHaveURL(/\/\?view=world$/);
    await expect(log(page)).toHaveCount(0);
    await expect(chartCanvas(page)).toBeFocused();
    await expect(page.getByRole("button", { name: /Drop anchor at Incheon Port/ })).toBeVisible();
  });

  test("Skip to index on the log settles the log, and Back closes the index", async ({ page }) => {
    await page.goto("/");
    await log(page).getByRole("link", { name: /Skip to index/ }).click();
    await expect(index(page)).toBeVisible();
    await expect(page).toHaveURL(/\/\?view=index$/);
    await expectFocusIn(page, ".index-dialog");
    await expect(log(page)).toHaveCount(0);

    await page.goBack();
    await expect(index(page)).toBeHidden();
    await expect(log(page)).toHaveCount(0);
    await expect(page).toHaveURL(/\/\?view=world$/);
    await expect(chartCanvas(page)).toBeVisible();
  });

  test("ashore, the index opens over the island and one Escape closes only the index", async ({ page }) => {
    await goAshoreAtSydney(page);
    await page.locator(".chart-island").getByRole("link", { name: /Skip to index/ }).click();
    await expect(index(page)).toBeVisible();
    await expect(page.locator(".chart-island")).toBeAttached();

    await page.keyboard.press("Escape");
    await expect(index(page)).toBeHidden();
    await expect(page.locator(".chart-island")).toBeVisible();
    await expect(page.locator(".chart-progress")).toContainText("Charted 1/8");
    // Still ashore and still at the jetty, where Edward stepped off.
    await expect(page.locator(".chart-island .chart-prompt")).toContainText("Back to the boat");
  });

  test("the index closes an open interior and returns to its island", async ({ page }) => {
    await goAshoreAtSydney(page);
    await page.keyboard.down("ArrowRight");
    const door = page.getByRole("button", { name: /Enter Edward's House/ });
    await expect(door).toBeVisible({ timeout: 8_000 });
    await page.keyboard.up("ArrowRight");
    await page.keyboard.press("e");
    await expect(page.locator(".hs-house")).toBeVisible();

    await page.locator(".chart-skip").click();
    await expect(index(page)).toBeVisible();
    await expect(page.locator(".hs-house")).toHaveCount(0);

    await page.keyboard.press("Escape");
    await expect(index(page)).toBeHidden();
    await expect(page.locator(".chart-island")).toBeVisible();
    await expect(door).toBeVisible();
  });

  test("the music starts when the voyage does and steps back inside a room", async ({ page }) => {
    const music = page.locator("body > .music-control");
    await goAshoreAtSydney(page);
    await expect(music).toHaveAttribute("data-state", "playing");

    await page.keyboard.down("ArrowRight");
    await expect(page.getByRole("button", { name: /Enter Edward's House/ })).toBeVisible({ timeout: 8_000 });
    await page.keyboard.up("ArrowRight");
    await page.keyboard.press("e");
    await expect(page.locator(".hs-house")).toBeVisible();
    await expect(music).toHaveAttribute("data-state", "ducked");

    await page.keyboard.press("Escape");
    await expect(page.locator(".hs-house")).toBeHidden();
    await expect(music).toHaveAttribute("data-state", "playing");
  });

  test("arriving at the index arms the music, and the first key starts it", async ({ page }) => {
    const music = page.locator("body > .music-control");
    await page.goto("/?view=index");
    await expect(index(page)).toBeVisible();
    // No gesture yet: browsers allow no sound, so nothing has started.
    await expect(music).toHaveAttribute("data-state", "locked");
    await page.keyboard.press("Escape");
    await expect(music).toHaveAttribute("data-state", "playing");
  });

  test("a document's way back opens the index over the chart", async ({ page }) => {
    await page.goto("/resume");
    await page.getByRole("link", { name: "Back to portfolio" }).click();
    await expect(page).toHaveURL(/\/\?view=index$/);
    await expect(index(page)).toBeVisible();
    await expect(page.locator(".chart-stage")).toBeAttached();
  });

  test("/chart, where it was built, now lands on /", async ({ page }) => {
    await page.goto("/chart");
    await expect(page).toHaveURL(/\/$/);
    await expect(log(page)).toBeVisible();
  });

  test("the side-view town is kept, unlisted, at /town", async ({ page }) => {
    await page.goto("/town");
    await expect(page.locator(".title-enter")).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
});
