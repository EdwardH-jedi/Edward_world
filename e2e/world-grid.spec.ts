import { expect, test, type Page } from "@playwright/test";

const WORLD_RECTS = [
  ".world-track",
  ".world-player",
  ".world-object",
  ".world-object__label",
  ".world-object__stem",
  ".world-prompt",
  ".world-prompt__tail",
].join(", ");

type Box = { left: number; top: number; right: number; bottom: number };

/**
 * The bubble, its tail, Edward, and every sign with its stem and object, as
 * laid out (the pop's `translate` is left out, so a frame mid-pop measures
 * where it lands).
 */
async function chipGeometry(page: Page) {
  return page.evaluate(() => {
    const box = (element: Element | null) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      const { translate } = getComputedStyle(element);
      const dy = translate === "none" ? 0 : parseFloat(translate.split(" ")[1] ?? "0");
      return { left: rect.left, top: rect.top - dy, right: rect.right, bottom: rect.bottom - dy };
    };
    const unit = parseFloat(
      getComputedStyle(document.querySelector(".world-screen")!).getPropertyValue("--unit"),
    );
    const signs = [...document.querySelectorAll(".world-object")].map((object) => {
      const label = object.querySelector(".world-object__label")!;
      const stem = object.querySelector(".world-object__stem")!;
      return {
        id: object.getAttribute("data-object-id")!,
        object: box(object)!,
        label: box(label)!,
        stem: getComputedStyle(stem).display === "none" ? null : box(stem),
      };
    });
    return {
      unit,
      facing: document.querySelector(".world-player")!.getAttribute("data-facing"),
      player: box(document.querySelector(".world-player"))!,
      bubble: box(document.querySelector(".world-prompt")),
      tail: box(document.querySelector(".world-prompt__tail")),
      signs,
    };
  });
}

/** Whether two boxes, each with its one-unit offset shadow, would touch. */
function overlap(a: Box, b: Box, unit: number) {
  return (
    a.left < b.right + unit &&
    b.left < a.right + unit &&
    a.top < b.bottom + unit &&
    b.top < a.bottom + unit
  );
}

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
      await page.locator(".world-prompt").waitFor({ timeout: 20_000 });
      await page.keyboard.up("d");
      // 0%, 40% and 80% are the three keyframes; 75 ms is the middle step.
      for (const ms of [0, 75, 130]) {
        await freezeAt(page, ".world-prompt", ms);
        expect(await offGridRects(page), `prompt-pop at ${ms}ms`).toEqual([]);
      }
    });

    test("signs stand on their objects and the bubble speaks from Edward", async ({ page }) => {
      await page.goto("/?view=world");
      await page.locator(".world-track").waitFor();
      await page.evaluate(() => document.fonts.ready);
      // Edward starts at the directions post, so the bubble is already up.
      await page.locator(".world-prompt").waitFor();
      await page.waitForTimeout(400);
      const { unit, facing, player, bubble, tail, signs } = await chipGeometry(page);

      for (const { id, object, label, stem } of signs) {
        if (!stem) continue;
        // The post hangs from the chip's bottom edge, inside its border…
        expect(stem.top, `${id} stem top`).toBe(label.bottom);
        expect(stem.left, `${id} stem left`).toBeGreaterThanOrEqual(label.left + unit);
        expect(stem.right, `${id} stem right`).toBeLessThanOrEqual(label.right - unit);
        // …and reaches down onto the object, at least across the clear unit.
        expect(stem.bottom - stem.top, `${id} stem height`).toBeGreaterThanOrEqual(unit * 2);
        expect(stem.bottom, `${id} stem foot`).toBeGreaterThanOrEqual(object.top);
        expect(stem.bottom, `${id} stem foot`).toBeLessThan(object.bottom);
      }

      expect(bubble, "bubble").not.toBeNull();
      expect(tail, "tail").not.toBeNull();
      // The tail ends a clear unit over his head, at the middle of it.
      expect(tail!.bottom).toBe(player.top - unit);
      const fill = tail!.left + unit;
      expect(fill).toBe(player.left + unit * (facing === "left" ? 7 : 8));
      expect(bubble!.left).toBeGreaterThanOrEqual(0);
      expect(bubble!.right).toBeLessThanOrEqual(viewport.width);
      for (const { id, label } of signs) {
        expect(overlap(bubble!, label, unit), `bubble covers ${id}`).toBe(false);
      }
    });
  });
}

// G3: on a phone the House is wider than the screen, so its centred chip and
// prompt used to land wholly off the right edge. The sign is clamped on
// screen; the prompt is Edward's bubble now, clamped on screen too, and kept
// off the sign.
test.describe("390×844 nearby House", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("sign and bubble are on screen, apart, and on the unit grid", async ({ page }) => {
    await page.goto("/?view=world");
    await page.locator(".world-track").waitFor();
    const house = page.locator('[data-object-id="edwards-house"][data-nearby]');
    if (!(await house.count())) {
      await page.keyboard.down("d");
      await house.waitFor({ timeout: 20_000 });
      await page.keyboard.up("d");
    }
    const bubble = page.locator(".world-player .world-prompt");
    await expect(bubble).toHaveText("E TO ENTER");
    await page.waitForTimeout(400);

    for (const chip of [house.locator(".world-object__label"), bubble]) {
      const box = (await chip.boundingBox())!;
      expect(box.x, "left edge").toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, "right edge").toBeLessThanOrEqual(390);
    }
    const { unit, signs, bubble: bubbleBox } = await chipGeometry(page);
    const sign = signs.find(({ id }) => id === "edwards-house")!;
    expect(overlap(bubbleBox!, sign.label, unit), "bubble covers the House's sign").toBe(false);
    expect(await offGridRects(page)).toEqual([]);
  });
});
