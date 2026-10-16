import { expect, test } from "@playwright/test";

// The name reference drawn over the shrine, in art pixels (drawShrine, phase 5-7).
const SHRINE = { width: 220, height: 124 };
const NAME_BOX = { x: 12, y: 10, width: 76, height: 58 };

test.use({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });

test("portrait monolith keeps the name on screen and the input clear of Skip", async ({
  page,
}) => {
  await page.goto("/?view=world");
  await page.locator(".world-track").waitFor();
  const house = page.locator('[data-object-id="edwards-house"][data-nearby]');
  if (!(await house.count())) {
    await page.keyboard.down("d");
    await house.waitFor({ timeout: 20_000 });
    await page.keyboard.up("d");
  }
  await page.keyboard.press("e");
  await page.locator(".hs-thing", { hasText: "THE MONOLITH" }).click();
  await page.locator(".intro-inscription").waitFor({ timeout: 20_000 });

  const rects = await page.evaluate(
    ([art, box]) => {
      const canvas = document.querySelector<HTMLCanvasElement>(".intro-screen--gate .intro-scene")!;
      const c = canvas.getBoundingClientRect();
      // Where the art itself lands inside the element, honouring object-fit.
      const fit = getComputedStyle(canvas).objectFit;
      const sx = c.width / art.width;
      const sy = c.height / art.height;
      const scale = fit === "cover" ? Math.max(sx, sy) : fit === "contain" ? Math.min(sx, sy) : 0;
      const ax = scale ? scale : sx;
      const ay = scale ? scale : sy;
      const ox = c.x + (c.width - art.width * ax) / 2;
      const oy = c.y + (c.height - art.height * ay) / 2;
      const rect = (el: Element) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      };
      return {
        name: { x: ox + box.x * ax, y: oy + box.y * ay, width: box.width * ax, height: box.height * ay },
        input: rect(document.querySelector(".intro-inscription")!),
        skip: rect(document.querySelector(".intro-skip")!),
      };
    },
    [SHRINE, NAME_BOX] as const,
  );

  const { name, input, skip } = rects;
  expect(name.x, "name left edge").toBeGreaterThanOrEqual(0);
  expect(name.y, "name top edge").toBeGreaterThanOrEqual(0);
  expect(name.x + name.width, "name right edge").toBeLessThanOrEqual(390);
  expect(name.y + name.height, "name bottom edge").toBeLessThanOrEqual(844);

  const intersects =
    input.x < skip.x + skip.width &&
    skip.x < input.x + input.width &&
    input.y < skip.y + skip.height &&
    skip.y < input.y + input.height;
  expect(intersects, `input ${JSON.stringify(input)} vs skip ${JSON.stringify(skip)}`).toBe(false);
});
