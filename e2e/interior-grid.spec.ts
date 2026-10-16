import { expect, test, type Page } from "@playwright/test";

// Live units at these heights are 4, 5 and 6.
const VIEWPORTS = [
  { width: 1280, height: 600 },
  { width: 1280, height: 800 },
  { width: 1280, height: 900 },
];

const INTERIORS = [
  { label: "Edward's House", unitVar: "--room-unit" },
  { label: "Wardrobe", unitVar: "--unit" },
  { label: "SportsGang", unitVar: "--sg-court-unit" },
  { label: "AFL Lab", unitVar: "--unit" },
  { label: "Arcade", unitVar: "--ar-screen-unit" },
] as const;

/** SportsGang's phone, through the match-up and the court walk-on, to a live tennis court. */
async function enterTennis(page: Page) {
  await enter(page, "SportsGang");
  await page.locator(".sg-phone__sport", { hasText: "TENNIS" }).click();
  await page.getByRole("button", { name: /accept/i }).click({ timeout: 30_000 });
  await page.locator('.loc-experience[data-stage="MEET"]').waitFor({ timeout: 30_000 });
  await page.keyboard.press("Enter");
  await page.locator(".sg-tennis__court").waitFor({ timeout: 30_000 });
  await page.waitForTimeout(1000);
}

const CONTROLS = "button, a[href], input, [role='button']";

async function enter(page: Page, label: string) {
  await page.goto("/?view=world");
  await page.locator(".world-track").waitFor();
  await page.keyboard.down("d");
  await page
    .locator(`.world-object[data-nearby] .world-object__label:text-is("${label.toUpperCase()}"), .world-object[data-nearby] .world-object__label:text-is("${label}")`)
    .first()
    .waitFor({ timeout: 30_000 });
  await page.keyboard.up("d");
  await page.keyboard.press("e");
  await page.locator(".loc-experience").waitFor();
  // Past the dissolve, the entrance animations and the first paint.
  await page.waitForTimeout(1500);
}

/** Canvases whose backing store differs from their CSS size, and controls off their unit. */
async function offGrid(page: Page, unitVar: string) {
  return page.evaluate(
    ([controls, unitName]) => {
      const root = document.querySelector(".loc-experience")!;
      const style = getComputedStyle(root);
      const px = (name: string) => parseFloat(style.getPropertyValue(name));
      const interiorUnit = px(unitName);
      const hudUnit = px("--unit");
      const problems: string[] = [];
      for (const canvas of root.querySelectorAll("canvas")) {
        const rect = canvas.getBoundingClientRect();
        if (rect.width === 0 || getComputedStyle(canvas).visibility === "hidden") continue;
        if (Math.abs(canvas.width - rect.width) > 0.01 || Math.abs(canvas.height - rect.height) > 0.01) {
          problems.push(
            `canvas ${canvas.className} backing ${canvas.width}x${canvas.height} css ${rect.width}x${rect.height}`,
          );
        }
      }
      for (const control of root.querySelectorAll(controls)) {
        const rect = control.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        // Heights always come from unit multiples. A width is only checked where
        // the component sets one itself: text controls are as wide as their
        // bitmap-font label, and grid columns are as wide as the grid.
        const sized = (control as HTMLElement).style.width !== "";
        for (const [key, value] of [["width", rect.width], ["height", rect.height]] as const) {
          if (key === "width" && !sized) continue;
          const onInterior = Math.abs(value / interiorUnit - Math.round(value / interiorUnit)) < 0.005;
          const onHud = Math.abs(value / hudUnit - Math.round(value / hudUnit)) < 0.005;
          if (!onInterior && !onHud) {
            problems.push(`${control.tagName}.${control.className} ${key}=${value} (units ${interiorUnit}/${hudUnit})`);
          }
        }
      }
      return { problems, interiorUnit, hudUnit };
    },
    [CONTROLS, unitVar] as const,
  );
}

test.setTimeout(90_000);

for (const viewport of VIEWPORTS) {
  test.describe(`interiors at ${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport });

    for (const { label, unitVar } of [...INTERIORS, { label: "Tennis", unitVar: "--sg-court-unit" }]) {
      test(`${label} sits on its integer grid`, async ({ page }) => {
        if (label === "Tennis") await enterTennis(page);
        else await enter(page, label);
        const { problems, interiorUnit } = await offGrid(page, unitVar);
        expect(Number.isInteger(interiorUnit) && interiorUnit >= 2, `${unitVar}=${interiorUnit}`).toBe(true);
        expect(problems).toEqual([]);
        if (viewport.height === 800) {
          await page.screenshot({
            path: `docs/review/interior-grid/${label.toLowerCase().replace(/[^a-z]+/g, "-")}-800.png`,
          });
        }
      });
    }
  });
}

