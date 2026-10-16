import { expect, test, type Page } from "@playwright/test";

const WORLD_RECTS =
  ".world-track, .world-player, .world-object, .world-object__label, .world-object__prompt";

// 800 divides the unit evenly; 801 and 844 leave a leftover strip under the
// track at units 5 and 6; 390 wide is the phone layout.
const VIEWPORTS = [
  { width: 1280, height: 800 },
  { width: 1280, height: 801 },
  { width: 1280, height: 844 },
  { width: 390, height: 844 },
];

async function offGridRects(page: Page) {
  return page.evaluate((selector) => {
    const unit = parseFloat(
      getComputedStyle(document.querySelector(".world-screen")!).getPropertyValue("--unit"),
    );
    return [...document.querySelectorAll(selector)].flatMap((element) => {
      const rect = element.getBoundingClientRect();
      return (["x", "y", "width", "height"] as const)
        .filter((key) => Math.abs(rect[key] / unit - Math.round(rect[key] / unit)) > 0.005)
        .map((key) => `${element.className} ${key}=${rect[key]} (unit ${unit})`);
    });
  }, WORLD_RECTS);
}

/** Pauses the matching CSS animations at `ms`, so a mid-flight frame can be measured. */
async function freezeAt(page: Page, selector: string, ms: number) {
  const frozen = await page.evaluate(
    ([sel, time]) => {
      const animations = document
        .getAnimations()
        .filter((a) => (a.effect as KeyframeEffect).target?.matches(sel as string));
      for (const a of animations) {
        a.pause();
        a.currentTime = time as number;
      }
      return animations.length;
    },
    [selector, ms] as const,
  );
  expect(frozen, `no animation on ${selector}`).toBeGreaterThan(0);
}

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport });

    test("settled world rects sit on the unit grid", async ({ page }) => {
      await page.goto("/?view=world");
      await page.locator(".world-track").waitFor();
      await page.waitForTimeout(800);
      expect(await offGridRects(page)).toEqual([]);
    });

    test("world-arrive frames stay on the unit grid", async ({ page }) => {
      await page.goto("/?view=world");
      await page.locator(".world-track").waitFor();
      for (const ms of [0, 40, 100]) {
        await freezeAt(page, ".world-screen", ms);
        expect(await offGridRects(page), `world-arrive at ${ms}ms`).toEqual([]);
      }
    });

    test("every prompt-pop frame stays on the unit grid", async ({ page }) => {
      await page.goto("/?view=world");
      await page.locator(".world-track").waitFor();
      await page.keyboard.down("d");
      await page.locator(".world-object__prompt").waitFor({ timeout: 20_000 });
      await page.keyboard.up("d");
      // 0%, 40% and 80% are the three keyframes; 75 ms is the middle step.
      for (const ms of [0, 75, 130]) {
        await freezeAt(page, ".world-object__prompt", ms);
        expect(await offGridRects(page), `prompt-pop at ${ms}ms`).toEqual([]);
      }
    });
  });
}

// G3: on a phone the House is wider than the screen, so its centred chip and
// prompt used to land wholly off the right edge. They are clamped on screen.
test.describe("390×844 nearby House", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("chip and prompt are on screen and on the unit grid", async ({ page }) => {
    await page.goto("/?view=world");
    await page.locator(".world-track").waitFor();
    const house = page.locator('[data-object-id="edwards-house"][data-nearby]');
    if (!(await house.count())) {
      await page.keyboard.down("d");
      await house.waitFor({ timeout: 20_000 });
      await page.keyboard.up("d");
    }
    const prompt = house.locator(".world-object__prompt");
    await prompt.waitFor();
    await page.waitForTimeout(400);

    for (const chip of [house.locator(".world-object__label"), prompt]) {
      const box = (await chip.boundingBox())!;
      expect(box.x, "left edge").toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, "right edge").toBeLessThanOrEqual(390);
    }
    expect(await offGridRects(page)).toEqual([]);
  });
});
