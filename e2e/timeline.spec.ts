import { expect, test, type Page } from "@playwright/test";
import { timelineStations } from "@/data/timeline";

/**
 * The timeline street, walked the way a visitor walks it: right from the
 * Arcade, stopping at each of Edward's chapters in order, reading it with E,
 * closing it with Escape, and finishing at the exit gate.
 */

const WORLD_RECTS = [
  ".world-track",
  ".world-player",
  ".world-object",
  ".world-object__label",
  ".world-object__stem",
  ".world-prompt",
  ".world-prompt__tail",
].join(", ");

/** The prompt is Edward's speech bubble, not a chip on the object. */
const bubble = (page: Page) => page.locator(".world-player .world-prompt");

/**
 * Whether the bubble (and its one-unit shadow) touches the sign of `id`,
 * measured once its pop has landed. The bubble may lift over a sign; it never
 * covers one, and the sign never moves for it.
 */
async function bubbleCoversSign(page: Page, id: string) {
  await page.waitForTimeout(250);
  return page.evaluate((objectId) => {
    const unit = parseFloat(
      getComputedStyle(document.querySelector(".world-screen")!).getPropertyValue("--unit"),
    );
    const a = document.querySelector(".world-prompt")!.getBoundingClientRect();
    const b = document
      .querySelector(`.world-object[data-object-id="${objectId}"] .world-object__label`)!
      .getBoundingClientRect();
    return (
      a.left < b.right + unit &&
      b.left < a.right + unit &&
      a.top < b.bottom + unit &&
      b.top < a.bottom + unit
    );
  }, id);
}

const nearby = (page: Page, id: string) =>
  page.locator(`.world-object[data-object-id="${id}"][data-nearby]`);

/**
 * Walks right until `id` is the object Edward is standing at.
 *
 * A station's stretch of street is about a fifth of a second of walking, and
 * Playwright's own selector polling backs off to half a second, so it would
 * watch him walk straight past. The page is polled on every animation frame
 * instead, and a key released a frame late is corrected by stepping back a
 * pixel or two at a time until he is on it.
 */
async function walkTo(page: Page, id: string) {
  const selector = `.world-object[data-object-id="${id}"][data-nearby]`;
  const target = nearby(page, id);
  if (!(await target.count())) {
    await page.keyboard.down("d");
    await page.waitForFunction((sel) => document.querySelector(sel) !== null, selector, {
      polling: "raf",
      timeout: 30_000,
    });
    await page.keyboard.up("d");
  }
  for (let step = 0; step < 40 && !(await target.count()); step += 1) {
    await page.keyboard.down("a");
    await page.waitForTimeout(16);
    await page.keyboard.up("a");
    await page.waitForTimeout(60);
  }
  await expect(target).toHaveCount(1);
}

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

test.describe("1280×800 timeline street", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("walking right from the Arcade reads every chapter in order, and the exit still works", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/?view=world");
    await page.locator(".world-track").waitFor();

    await walkTo(page, "arcade");

    for (const station of timelineStations) {
      if (station.interaction.type !== "READ") throw new Error(`${station.id} is not readable`);
      const { heading, text } = station.interaction;

      await walkTo(page, station.id);
      const object = page.locator(`.world-object[data-object-id="${station.id}"]`);
      await expect(object.locator(".world-object__label")).toHaveText(station.label);
      await expect(bubble(page)).toHaveText("E TO READ");
      await expect(page.locator(".interaction-status")).toContainText(station.label);
      expect(await offGridRects(page), `${station.id} off the unit grid`).toEqual([]);
      // The stations stand as tall as Edward, so their signs are at his head
      // height: the bubble lifts over the sign rather than covering it.
      expect(await bubbleCoversSign(page, station.id), `bubble covers ${station.id}`).toBe(false);

      await page.keyboard.press("e");
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog.locator("#dialog-title")).toHaveText(heading);
      await expect(dialog).toContainText(text);

      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      // Back in the world, still standing at the same chapter.
      await expect(nearby(page, station.id)).toHaveCount(1);
    }

    await walkTo(page, "world-exit");
    await expect(bubble(page)).toHaveText("E TO LEAVE");
    expect(await bubbleCoversSign(page, "world-exit"), "bubble covers the exit").toBe(false);
    // The gate stands at the camera's right-hand clamp; the bubble stays on screen.
    const box = (await bubble(page).boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(1280);
    await page.keyboard.press("e");
    await expect(page.locator(".sg-exit")).toBeVisible();
  });
});

/*
 * The stations stand closer together than anything else in the world, so
 * their chips are the ones that could run into each other. At `--k` 3 (the
 * usual type size) and 4 (viewports under 600px tall), every chip from the
 * Arcade's to the exit's keeps at least a unit of clear space to its right,
 * so its one-unit shadow never touches the next.
 */
for (const viewport of [
  { width: 1280, height: 800 },
  { width: 1280, height: 560 },
]) {
  test.describe(`${viewport.width}×${viewport.height} street chips`, () => {
    test.use({ viewport });

    test("never overlap their neighbours", async ({ page }) => {
      await page.goto("/?view=world");
      await page.locator(".world-track").waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(400);

      const ids = ["arcade", ...timelineStations.map(({ id }) => id), "world-exit"];
      const { unit, boxes } = await page.evaluate((objectIds) => {
        const screen = document.querySelector(".world-screen")!;
        return {
          unit: parseFloat(getComputedStyle(screen).getPropertyValue("--unit")),
          boxes: objectIds.map((id) => {
            const chip = document.querySelector(
              `.world-object[data-object-id="${id}"] .world-object__label`,
            )!;
            const rect = chip.getBoundingClientRect();
            return { id, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
          }),
        };
      }, ids);

      for (let index = 1; index < boxes.length; index += 1) {
        const left = boxes[index - 1];
        const right = boxes[index];
        const sameRow = left.top < right.bottom && right.top < left.bottom;
        if (!sameRow) continue;
        expect(
          right.left - left.right,
          `${left.id} chip runs into ${right.id} (unit ${unit})`,
        ).toBeGreaterThanOrEqual(unit);
      }
    });
  });
}
