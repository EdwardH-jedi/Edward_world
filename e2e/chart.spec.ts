import { expect, test, type Page } from "@playwright/test";

/** The chart overworld at `/`. Phase 3 extends the journey ashore; phase 5 makes it the front door. */

async function setSail(page: Page) {
  await page.goto("/");
  const log = page.getByRole("dialog", { name: "It is a long story." });
  await expect(log).toBeVisible();
  await expect(page.getByRole("button", { name: /Set sail/ })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(log).toBeHidden();
}

test.describe("chart overworld", () => {
  test("log → set sail → Landings → Sydney → E → walk to Edward's House → enter → Esc, Esc → back at Sydney's anchorage", async ({ page }) => {
    await setSail(page);
    await expect(page.locator(".chart-stage > .chart-sea")).toBeFocused();

    await page.getByRole("button", { name: /^Landings/ }).click();
    const panel = page.getByRole("dialog", { name: "Landings" });
    await expect(panel).toBeVisible();
    await panel.getByRole("listitem").filter({ hasText: "Sydney Harbour" }).getByRole("button").click();
    await expect(panel).toBeHidden();

    const anchor = page.getByRole("button", { name: /Drop anchor at Sydney Harbour/ });
    await expect(anchor).toBeVisible();
    await page.keyboard.press("e");

    const island = page.locator(".chart-island");
    await expect(island).toBeVisible();
    await expect(island.getByRole("heading", { name: "Sydney Harbour" })).toBeVisible();
    await expect(island.getByRole("link", { name: /Skip to index/ })).toBeVisible();

    // One straight footpath runs east from the jetty to Edward's House, whose door faces it.
    await page.keyboard.down("ArrowRight");
    const door = page.getByRole("button", { name: /Enter Edward's House/ });
    await expect(door).toBeVisible({ timeout: 8_000 });
    await page.keyboard.up("ArrowRight");
    await page.keyboard.press("e");

    const house = page.locator(".hs-house");
    await expect(house).toBeVisible();
    await expect(page.locator(".chart-skip")).toBeVisible();

    // The house leaves on Escape while none of its own cards is open.
    await page.keyboard.press("Escape");
    await expect(house).toBeHidden();
    await expect(island).toBeVisible();
    await expect(door).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(island).toBeHidden();
    await expect(anchor).toBeVisible();
    await expect(page.locator(".chart-progress")).toContainText("Charted 1/8");
    await expect(page.locator(".chart-stage > .chart-sea")).toBeFocused();
  });

  test("a place's card opens from its door and closes back onto the island", async ({ page }) => {
    await setSail(page);
    await page.keyboard.press("m");
    await page.getByRole("dialog", { name: "Landings" }).getByRole("listitem").filter({ hasText: "The Shipyard" }).getByRole("button").click();
    await expect(page.getByRole("button", { name: /Drop anchor at The Shipyard/ })).toBeVisible();
    await page.keyboard.press("e");
    await expect(page.locator(".chart-island")).toBeVisible();

    // The slipway's door faces the jetty.
    await page.keyboard.down("ArrowRight");
    await expect(page.getByRole("button", { name: /Read Slipway/ })).toBeVisible({ timeout: 6_000 });
    await page.keyboard.up("ArrowRight");
    await page.keyboard.press("e");
    const card = page.getByRole("dialog", { name: "Slipway" });
    await expect(card).toBeVisible();
    await expect(card).toContainText("Reserved for the next project.");
    await page.keyboard.press("Escape");
    await expect(card).toBeHidden();
    await expect(page.locator(".chart-island")).toBeVisible();
  });

  test("a project's place opens its existing interior, and Escape comes back to its door", async ({ page }) => {
    await setSail(page);
    await page.keyboard.press("m");
    await page.getByRole("dialog", { name: "Landings" }).getByRole("listitem").filter({ hasText: "SportsGang Courts" }).getByRole("button").click();
    await expect(page.getByRole("button", { name: /Drop anchor at SportsGang Courts/ })).toBeVisible();
    await page.keyboard.press("e");
    await expect(page.locator(".chart-island")).toBeVisible();

    // Inland from the jetty, then along the footpath past the clubhouse's door. Edward walks
    // through the door's reach rather than stopping at a wall, so watch for it every frame.
    await page.keyboard.down("ArrowLeft");
    await page.waitForTimeout(350);
    await page.keyboard.up("ArrowLeft");
    await page.keyboard.down("ArrowDown");
    await page.waitForTimeout(330);
    await page.keyboard.up("ArrowDown");
    await page.keyboard.down("ArrowLeft");
    await page.waitForFunction(
      () => document.querySelector(".chart-island .chart-prompt")?.textContent?.includes("Enter Clubhouse"),
      null,
      { polling: "raf", timeout: 6_000 },
    );
    await page.keyboard.up("ArrowLeft");
    await page.keyboard.press("e");

    const interior = page.locator(".loc-experience");
    await expect(interior).toBeVisible();
    await expect(page.locator(".chart-skip")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(interior).toBeHidden();
    await expect(page.getByRole("button", { name: /Enter Clubhouse/ })).toBeVisible();
  });

  test("holding E at an anchorage goes ashore once, not ashore and back", async ({ page }) => {
    await setSail(page);
    await expect(page.getByRole("button", { name: /Drop anchor at Incheon Port/ })).toBeVisible();
    // A second keyboard.down on a held key is sent with `repeat: true`, as auto-repeat is.
    await page.keyboard.down("e");
    await expect(page.locator(".chart-island")).toBeVisible();
    // Unguarded, this one repeat would take Edward straight back to the boat.
    await page.keyboard.down("e");
    await page.keyboard.up("e");
    await page.waitForTimeout(200);
    await expect(page.locator(".chart-island")).toBeVisible();
  });

  test("Escape closes the log, and M or Escape closes the Landings panel", async ({ page }) => {
    await page.goto("/");
    // Focus on "Set sail" means the log's key handling is live (hydrated).
    await expect(page.getByRole("button", { name: /Set sail/ })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "It is a long story." })).toBeHidden();

    const panel = page.getByRole("dialog", { name: "Landings" });
    await page.keyboard.press("m");
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("button", { name: /Close/ })).toBeFocused();
    await page.keyboard.press("m");
    await expect(panel).toBeHidden();
    await page.keyboard.press("m");
    await expect(panel).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
  });

  test("the helm moves the boat off the anchorage, and nothing is locked", async ({ page }) => {
    await setSail(page);
    const home = page.getByRole("button", { name: /Drop anchor at Incheon Port/ });
    await expect(home).toBeVisible();
    await page.keyboard.down("d");
    await expect(home).toBeHidden({ timeout: 4_000 });
    await page.keyboard.up("d");

    await page.keyboard.press("m");
    const panel = page.getByRole("dialog", { name: "Landings" });
    await expect(panel.getByRole("listitem")).toHaveCount(8);
    await expect(
      panel.getByRole("listitem").filter({ hasText: "Arcade Pier" }).getByRole("button"),
    ).toBeEnabled();
    await expect(panel.getByRole("button", { name: "Sail to Arcade Pier" })).toBeAttached();
  });

  test("sailing through a bottle unfolds its message and counts it", async ({ page }) => {
    await setSail(page);
    await page.getByRole("button", { name: /^Landings/ }).click();
    const panel = page.getByRole("dialog", { name: "Landings" });
    await panel.getByRole("listitem").filter({ hasText: "AFL Oval" }).getByRole("button").click();
    await expect(panel).toBeHidden();

    // The paper-trading bottle floats a little west of AFL Oval's anchorage.
    await page.keyboard.down("a");
    await expect(page.locator(".chart-progress")).toContainText("Bottles 1/8", { timeout: 4_000 });
    await page.keyboard.up("a");
    await expect(page.locator(".chart-toast")).toBeVisible();
    await expect(page.locator(".chart-toast__text")).toContainText("Paper-trading research");
    await expect(page.locator(".chart-toast .chart-eyebrow")).toHaveText("Message in a bottle · 1/8");
  });

  test("keeps Skip to index on screen in every state", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /Skip to index/ }).first()).toHaveAttribute("href", "/?view=index");
    await expect(page.getByRole("button", { name: /Set sail/ })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("link", { name: /Skip to index/ })).toBeVisible();
  });
});
