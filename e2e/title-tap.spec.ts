import { expect, test, type Page } from "@playwright/test";

// The title starts the world on Enter, a click or a tap anywhere — and every
// control on it still answers its own tap. The pan to the world takes 800ms,
// so "did not also start the world" is checked after waiting past it.
const PAN_AND_SOME_MS = 1_200;

async function openTitle(page: Page) {
  await page.goto("/");
  await page.locator(".title-enter").waitFor();
}

test.describe("on a phone (touch, no hover)", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("the call to action asks for a tap", async ({ page }) => {
    await openTitle(page);
    await expect(page.locator(".title-enter")).toHaveText("[ TAP TO START ]", { useInnerText: true });
    await expect(page.locator(".title-enter__keys")).toBeHidden();
    await expect(page.getByRole("button", { name: "[ TAP TO START ]" })).toBeVisible();
  });

  test("a tap on the title text enters the world", async ({ page }) => {
    await openTitle(page);
    await page.tap(".title-wordmark");
    await expect(page.locator(".world-track")).toBeVisible();
  });

  test("a tap on the scene enters the world", async ({ page }) => {
    await openTitle(page);
    // The element's centre is the harbour: no control is anywhere near it.
    await page.tap(".title-screen");
    await expect(page.locator(".world-track")).toBeVisible();
  });

  test("VIEW PROJECTS opens the index and does not also start the world", async ({ page }) => {
    await openTitle(page);
    await page.tap(".title-skip");
    await expect(page.locator(".index-dialog")).toBeVisible();
    await page.waitForTimeout(PAN_AND_SOME_MS);
    await expect(page).toHaveURL(/[?&]view=index\b/);
    await expect(page.locator(".index-dialog")).toBeVisible();
  });

  test("the HUD's INDEX opens the index and does not also start the world", async ({ page }) => {
    await openTitle(page);
    await page.tap(".world-index-control button >> text=INDEX");
    await expect(page.locator(".index-dialog")).toBeVisible();
    await page.waitForTimeout(PAN_AND_SOME_MS);
    await expect(page).toHaveURL(/[?&]view=index\b/);
  });

  test("the HUD's music note toggles the music and leaves the title up", async ({ page }) => {
    await openTitle(page);
    const music = page.locator("body > .music-control");
    const before = await music.getAttribute("aria-pressed");
    await page.tap("body > .music-control");
    await expect(music).not.toHaveAttribute("aria-pressed", before ?? "");
    await page.waitForTimeout(PAN_AND_SOME_MS);
    await expect(page.locator(".title-screen")).toBeVisible();
    await expect(page.locator(".world-track")).toHaveCount(0);
  });
});

test.describe("with a keyboard and mouse", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("the call to action asks for Enter", async ({ page }) => {
    await openTitle(page);
    await expect(page.locator(".title-enter")).toHaveText("[ PRESS ENTER ]", { useInnerText: true });
    await expect(page.locator(".title-enter__touch")).toBeHidden();
  });

  test("a click on the scene enters the world", async ({ page }) => {
    await openTitle(page);
    await page.mouse.click(640, 420);
    await expect(page.locator(".world-track")).toBeVisible();
  });

  test("Enter still enters the world", async ({ page }) => {
    await openTitle(page);
    await page.keyboard.press("Enter");
    await expect(page.locator(".world-track")).toBeVisible();
  });

  test("under reduced motion the prompt holds still, lit", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openTitle(page);
    // Three ambient ticks: a running clock would have blinked it off by now.
    await page.waitForTimeout(1_400);
    await expect(page.locator(".title-enter")).toHaveAttribute("data-lit", "true");
  });
});
