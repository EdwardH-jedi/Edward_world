import { expect, test, type Page } from "@playwright/test";

/** The chart overworld at /chart. Phase 3 extends the journey ashore. */

async function setSail(page: Page) {
  await page.goto("/chart");
  const log = page.getByRole("dialog", { name: "It is a long story." });
  await expect(log).toBeVisible();
  await expect(page.getByRole("button", { name: /Set sail/ })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(log).toBeHidden();
}

test.describe("chart overworld", () => {
  test("log → set sail → Landings → Sydney Harbour → E → card → Esc → back at the anchorage", async ({ page }) => {
    await setSail(page);
    await expect(page.locator(".chart-sea")).toBeFocused();

    await page.getByRole("button", { name: /^Landings/ }).click();
    const panel = page.getByRole("dialog", { name: "Landings" });
    await expect(panel).toBeVisible();
    await panel.getByRole("listitem").filter({ hasText: "Sydney Harbour" }).getByRole("button").click();
    await expect(panel).toBeHidden();

    const prompt = page.getByRole("button", { name: /Drop anchor at Sydney Harbour/ });
    await expect(prompt).toBeVisible();
    await page.keyboard.press("e");

    const card = page.getByRole("dialog", { name: "Sydney Harbour" });
    await expect(card).toBeVisible();
    await expect(card.getByRole("button", { name: /Back to the boat/ })).toBeFocused();
    await expect(card.getByRole("link", { name: /Résumé/ })).toHaveAttribute("href", "/resume");

    await page.keyboard.press("Escape");
    await expect(card).toBeHidden();
    await expect(prompt).toBeVisible();
    await expect(page.locator(".chart-progress")).toContainText("Charted 1/8");
    await expect(page.locator(".chart-sea")).toBeFocused();
  });

  test("Escape closes the log, and M or Escape closes the Landings panel", async ({ page }) => {
    await page.goto("/chart");
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

  test("keeps Skip to index on screen in every state", async ({ page }) => {
    await page.goto("/chart");
    await expect(page.getByRole("link", { name: /Skip to index/ }).first()).toHaveAttribute("href", "/?view=index");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("link", { name: /Skip to index/ })).toBeVisible();
  });
});
