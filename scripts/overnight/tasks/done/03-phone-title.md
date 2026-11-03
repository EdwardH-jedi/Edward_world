# Phone title screen: layout and tap-to-start

## Why

At 390x844 the title screen breaks: the WORLD / INDEX / ♪ HUD buttons sit on top of "WELCOME TO", the tagline panel ("A SOFTWARE AND AI PORTFOLIO YOU CAN EXPLORE.") covers the avatar on the lawn, and the call to action says "[ PRESS ENTER ]" on a device with no Enter key. In a headless Chromium run a tap on the title did not enter the world; confirm whether a real tap works and make sure it does.

## What to change

`components/title/title-screen.tsx`, its CSS in `app/globals.css` (`.title-screen` rules), and `lib/pixel/monolith.ts` only if the approach art needs a different crop on portrait.

1. **Layout on portrait (≤ 480 px wide, and any viewport where the title block would intersect the HUD):**
   - The HUD controls (`.world-index-control`, `.music-control`) and the title text must not intersect — extend `e2e/title-layout.spec.ts` (it already has an intersection check) to include the HUD rectangles.
   - Stack the title block so "WELCOME TO / EDWARD HWANG'S WORLD / tagline" sit together over the sky, and the tagline never covers the avatar: either shorten the tagline on narrow screens with a second, shorter copy string (keep the long one for desktop) or move it under the title. All on the unit grid.
   - The avatar on the lawn stays visible.

2. **Call to action matches the input.** Show "[ TAP TO START ]" when the device has a coarse pointer / no hover (`@media (hover: none) and (pointer: coarse)` or `navigator.maxTouchPoints > 0` resolved after hydration without a hydration mismatch), "[ PRESS ENTER ]" otherwise. Keep `VIEW PROJECTS →` as is.

3. **Tap enters the world.** Make the whole title screen a single tap/click target that starts the world (it is already documented as "Enter, click, or tap"); make sure the HUD buttons and VIEW PROJECTS still receive their own taps and are not swallowed. Verify with a Playwright test using a touch context (`hasTouch: true, isMobile: true`) that `page.tap()` on the title leads to `.world-track` appearing.

4. **Reduced motion and focus**: the title's Enter handler, focus ring and reduced-motion behaviour stay as they are.

## Constraints

- Don't change the desktop (≥ 1024 px) appearance except where the HUD intersection check requires it.
- Keep the pixel unit logic: the title uses `usePixelUnit()`; do not switch it to the world unit.
- Copy stays in one place (`data/personal.ts` or the title component); no duplicated strings across files beyond the long/short tagline pair.

## Verify

All quality gates, plus the two new Playwright cases. Save 390x844 and 1280x800 title screenshots under `docs/review/title/` and list them in the report.
