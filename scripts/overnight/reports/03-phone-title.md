# 03-phone-title — report

**Changed:** `components/title/title-screen.tsx` (a `TITLE_COPY` table holds every title string, with the long/short purpose pair and the keys/touch prompt pair; `onClick` on `<main>` starts the world unless the click came from a `button`). `app/globals.css` (`.title-*` rules, plus `.title-screen` added to the HUD's `--hud-h` `@supports` rule). `e2e/title-layout.spec.ts` extended, `e2e/title-tap.spec.ts` new, `tests/title-screen.test.ts` new (15 tests: copy in one place, the CSS-chosen pairs, the click routing, the shared `--hud-h`, and a raster-recording pin of the avatar box and horizon row that the e2e spec measures, read out of the spec itself so the two cannot drift), `docs/ARCHITECTURE.md` (pointer/touch and portrait title notes). `monolith.ts` is untouched: no crop change was needed.

**What was actually wrong (probed before editing):**
- **HUD overlap.** The portrait column started a flat 11 units down, but the HUD's bottom edge is `2u + round(up, 44px, u)`. At 390×844 (unit 6) that cleared by 6px, so the old spec passed. With a phone's browser bars showing (390×664, 360×640, 375×667: unit 4), WELCOME TO ran under WORLD/INDEX. The padding now uses the strip's own `--hud-h`, plus 3 units, so there is a one-unit gap at every unit.
- **Tagline over the avatar.** The purpose panel covered the avatar at every portrait size tested.
- **Tap.** In headless Chromium a tap on the title *text* did nothing because no handler existed. A tap on the `[ PRESS ENTER ]` button always worked. So on a real phone only the button started the world.
- **Landscape phones** (844×390, 667×375): WELCOME TO sat 4px above the viewport, and the 94%-wide copy box ran under the HUD.

**Readings taken:**
- **Tagline:** I did both options. On portrait it moves under the wordmark, over the sky, in the heading's ink with no panel. At ≤480px it uses the short form "A software and AI portfolio.", a strict cut of the long line; wider screens keep the long one.
- **CTA:** two spans swapped by `@media (hover: none) and (pointer: coarse)`, not by script. Server and client render identical markup, so there's no hydration mismatch and no flash of the wrong prompt. The hidden span is `display: none`, so the button's accessible name matches what's on screen.
- **"Any viewport where the title intersects the HUD"** includes landscape phones. There, at ≤950px wide only, the copy shrink-wraps to sit *beside* the strip and its top is clamped inside the viewport. I tried clearing the HUD vertically first, but it pushed the tagline onto the bridge. On short landscape PRESS ENTER also drops to 2 units with a 1-unit pad (24px min-height) so it clears the avatar's feet.
- **HUD taps:** the HUD is mounted outside `.title-screen`, so its taps never bubble into the new handler. VIEW PROJECTS is inside, which is what the `closest("button")` guard is for.

**Test contract changed (task-driven):** `title-layout.spec.ts` asserted the purpose line sits in the bottom 25%. It now asserts it sits directly under the wordmark and above the horizon, because the task moves it. The wordmark ≤20% band is kept for widths ≤480. New in that spec: the avatar rectangle (computed from art coordinates and `object-fit`) in the intersection set, an every-box-on-screen check, the short/long text check, and viewports 390×664, 360×640, 768×1024 and 844×390.

**Verified:**
- `npm run lint`, `npm run typecheck` and `npm run build` are clean; `npm test` 891/891; `npx playwright test` 55/55 (16 of them are the title cases).
- `title-tap.spec.ts` runs in a `hasTouch`/`isMobile` context:
  - `page.tap()` on the wordmark, and on the scene, brings up `.world-track`;
  - VIEW PROJECTS and HUD INDEX open the index and still read `view=index` after the pan's duration;
  - the music tap toggles `aria-pressed` and the title stays up;
  - with a mouse, the CTA reads PRESS ENTER, a click starts the world, Enter still starts it, and under reduced motion the CTA stays lit.
- Desktop is unchanged: a throwaway spec compared screenshots at 1024×768, 1280×800, 1440×900 and 1920×1080 byte for byte, before and after; all identical. A throwaway probe at 19 viewports from 320×568 to 1920×1080 found no intersections and nothing off-screen. Both specs are deleted.

**Screenshots** (`docs/review/title/`): `before-390x844.png` and `before-1280x800.png`; `after-390x844.png` and `after-390x664.png` (touch emulation, so they show TAP TO START); `after-1280x800.png`; `after-844x390.png`.

**Left out or not verified:**
- No real-device check; everything is Chromium touch emulation.
- `cursor: pointer` over the whole title isn't added, to keep the desktop look.
- The portrait art's cover-fit still scales by a fraction (about 6.25× at 844px tall). That's pre-existing and documented in ARCHITECTURE.
- Safe-area insets aren't handled, since the viewport isn't `viewport-fit=cover`.
- The full Playwright run rewrote `docs/review/interior-grid/arcade-800.png`, as it did last task. I restored it from HEAD with `git show`, and removed `test-results/`.
