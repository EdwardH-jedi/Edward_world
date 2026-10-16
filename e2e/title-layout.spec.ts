import { expect, test } from "@playwright/test";

// Every piece of visible text on the title screen. The HUD controls are part of
// it: a heading that slid under INDEX would be as unreadable as one that slid
// under the purpose panel.
const TEXT_BLOCKS = [
  ".title-welcome",
  ".title-wordmark",
  ".title-purpose",
  ".title-enter",
  ".title-skip",
  ".world-index-control",
  ".music-control",
];

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
]) {
  test(`${viewport.width}×${viewport.height}: title text blocks do not intersect`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.locator(".title-enter").waitFor();
    // PRESS ENTER blinks (opacity only); its box is there regardless.
    const boxes = await page.evaluate((selectors) => {
      return selectors.map((selector) => {
        const element = document.querySelector(selector);
        if (!element) throw new Error(`missing ${selector}`);
        const { bottom, left, right, top } = element.getBoundingClientRect();
        return { bottom, left, name: selector, right, top };
      });
    }, TEXT_BLOCKS);

    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        const overlaps =
          a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
        expect(overlaps, `${a.name} intersects ${b.name}`).toBe(false);
      }
    }
    await page.screenshot({ path: `test-results/title-${viewport.width}x${viewport.height}.png` });

    if (viewport.width < viewport.height) {
      // Portrait bands: heading in the top 20 %, everything else in the bottom 25 %.
      const byName = Object.fromEntries(boxes.map((box) => [box.name, box]));
      expect(byName[".title-wordmark"].bottom).toBeLessThanOrEqual(viewport.height * 0.2);
      for (const name of [".title-purpose", ".title-enter", ".title-skip"]) {
        expect(byName[name].top, name).toBeGreaterThanOrEqual(viewport.height * 0.75);
        expect(byName[name].bottom, name).toBeLessThanOrEqual(viewport.height);
      }
    }
  });
}
