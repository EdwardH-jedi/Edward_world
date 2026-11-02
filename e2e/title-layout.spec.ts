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

// The approach art (`APPROACH_ART_SIZE`) and, inside it, the avatar standing on
// the lawn: `tinyAvatar(draw, 118, 104)` in `drawApproach` at camera offset 0,
// six art pixels wide and eight tall.
const ART = { width: 240, height: 135 };
const AVATAR = { x: 118, y: 104, width: 6, height: 8 };
// Where the water starts. Above it the frame is sky (and the skyline against it).
const HORIZON_ROW = 64;

// 390x664 and 360x640 are a phone with its browser bars showing: the unit drops
// to 4px, which is where the heading used to run under the HUD strip. 844x390
// is the same phone on its side, where WELCOME TO used to sit under the strip
// and off the top of the screen.
const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 390, height: 664 },
  { width: 360, height: 640 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
  { width: 844, height: 390 },
];

interface Box {
  name: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const intersects = (a: Box, b: Box) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

for (const viewport of VIEWPORTS) {
  test(`${viewport.width}×${viewport.height}: title text, HUD and avatar do not intersect`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.locator(".title-enter").waitFor();
    // PRESS ENTER blinks (opacity only); its box is there regardless.
    const { boxes, avatar, horizon } = await page.evaluate(
      ([selectors, art, figure, horizonRow]) => {
        const boxes = selectors.map((selector) => {
          const element = document.querySelector(selector);
          if (!element) throw new Error(`missing ${selector}`);
          const { bottom, left, right, top } = element.getBoundingClientRect();
          return { bottom, left, name: selector, right, top };
        });
        // Where the art lands inside the canvas element, honouring object-fit:
        // cover on portrait (uniform scale, centred crop), fill on landscape.
        const canvas = document.querySelector<HTMLCanvasElement>(".title-scene")!;
        const c = canvas.getBoundingClientRect();
        const cover = getComputedStyle(canvas).objectFit === "cover";
        const sx = cover ? Math.max(c.width / art.width, c.height / art.height) : c.width / art.width;
        const sy = cover ? sx : c.height / art.height;
        const ox = c.left + (c.width - art.width * sx) / 2;
        const oy = c.top + (c.height - art.height * sy) / 2;
        return {
          boxes,
          avatar: {
            name: "avatar",
            left: ox + figure.x * sx,
            top: oy + figure.y * sy,
            right: ox + (figure.x + figure.width) * sx,
            bottom: oy + (figure.y + figure.height) * sy,
          },
          horizon: oy + horizonRow * sy,
        };
      },
      [TEXT_BLOCKS, ART, AVATAR, HORIZON_ROW] as const,
    );

    const all = [...boxes, avatar];
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        expect(intersects(all[i], all[j]), `${all[i].name} intersects ${all[j].name}`).toBe(false);
      }
    }

    // Nothing is clipped: every block, and the avatar, is wholly on screen.
    for (const box of all) {
      expect(box.top, `${box.name} top`).toBeGreaterThanOrEqual(0);
      expect(box.left, `${box.name} left`).toBeGreaterThanOrEqual(0);
      expect(box.bottom, `${box.name} bottom`).toBeLessThanOrEqual(viewport.height);
      expect(box.right, `${box.name} right`).toBeLessThanOrEqual(viewport.width);
    }

    // The heading block reads together over the sky, wherever the frame crops.
    const byName = Object.fromEntries(boxes.map((box) => [box.name, box]));
    for (const name of [".title-welcome", ".title-wordmark", ".title-purpose"]) {
      expect(byName[name].bottom, `${name} above the water`).toBeLessThanOrEqual(horizon);
    }

    // A phone gets the short purpose line; anything wider keeps the sentence.
    const purpose = await page.locator(".title-purpose").innerText();
    if (viewport.width <= 480) {
      expect(purpose).toBe("A SOFTWARE AND AI PORTFOLIO.");
    } else {
      expect(purpose).toBe("A SOFTWARE AND AI PORTFOLIO YOU CAN EXPLORE.");
    }

    await page.screenshot({ path: `test-results/title-${viewport.width}x${viewport.height}.png` });

    if (viewport.width < viewport.height) {
      // Portrait bands: WELCOME TO / wordmark / purpose stacked under the HUD
      // strip, the purpose line straight under the wordmark rather than down on
      // the lawn, and the two controls in the bottom quarter, below the avatar.
      const hudBottom = Math.max(
        byName[".world-index-control"].bottom,
        byName[".music-control"].bottom,
      );
      expect(byName[".title-welcome"].top).toBeGreaterThanOrEqual(hudBottom);
      expect(byName[".title-purpose"].top).toBeGreaterThanOrEqual(byName[".title-wordmark"].bottom);
      expect(byName[".title-purpose"].top - byName[".title-wordmark"].bottom).toBeLessThanOrEqual(
        viewport.height * 0.05,
      );
      if (viewport.width <= 480) {
        expect(byName[".title-wordmark"].bottom).toBeLessThanOrEqual(viewport.height * 0.2);
      }
      for (const name of [".title-enter", ".title-skip"]) {
        expect(byName[name].top, name).toBeGreaterThanOrEqual(viewport.height * 0.75);
        expect(byName[name].top, `${name} below the avatar`).toBeGreaterThanOrEqual(avatar.bottom);
        expect(byName[name].bottom, name).toBeLessThanOrEqual(viewport.height);
      }
    }
  });
}
