# In-world signage and a speech-bubble prompt

## Why

Every building and sign carries two DOM chips stacked in the sky above it: the name label and, when Edward is nearby, the "E TO ENTER" prompt. They float far above tall buildings (at unit 7 the Arcade's chips sit ~120 px over its roof) and read as debug UI rather than part of the town. Reference indie pixel games put the name on the building and the "press E" next to the player.

## What to change

1. **Labels sit on the object, not in the sky.**
   - In `app/globals.css` (`.world-object__label`) and `components/world/world-label.tsx`, move the label chip to hang just above the object's top edge — one unit gap, so it reads as a sign fixed to the facade — instead of `(k + 6)` units up. Keep it a DOM chip (it is the accessible name) and keep every edge on the unit grid; `e2e/world-grid.spec.ts` must still pass.
   - Give it a small pixel bracket/post so it reads as signage rather than a tooltip: a one-unit-wide stem of `--world-char` beneath the chip touching the object (CSS `::after`, unit-sized), or an equivalent on-grid detail. No gradients, no rounded corners, no box-shadow beyond the existing one-unit offset shadow.
   - The crop clamp introduced in `feat/world-feel-pass` (`--crop`, `--object-top`, `--chip-floor`) must keep working for the hill house; simplify it if the new placement makes part of it unnecessary.

2. **The prompt follows Edward, as a speech bubble.**
   - Render the interaction prompt (`components/world/interaction-prompt.tsx`) above the **player** rather than above the object: a small bubble anchored over Edward's head, with a one-unit tail, in the existing `--world-sign` / `--world-cream` colours. It appears when `nearbyObject` exists, keeps the `prompt-pop` two-step entrance (on-grid steps only), and stays within the viewport horizontally (reuse `useUnitChipWidth`'s clamping).
   - The prompt text stays what `getInteractionPrompt` returns. The bottom bar's `interaction-status` button stays as the touch/accessibility path.
   - The bubble must not cover the label of the object he is standing in front of; if they would overlap, the bubble wins and the label is unchanged (do not hide the label).

3. **Nearby state stays legible on the object itself.** `data-nearby` already flips the label to cream-on-char; keep that, and consider a one-unit `signAccent` underline on the nearby label so "this is the thing you'd enter" reads at a glance. `tests/palette-accents.test.ts` governs where `signAccent` may be used — the chip is already an allowed surface.

## Constraints

- Pixel grid: every chip edge, the stem and the tail are whole units at every unit in `MIN_PIXEL_UNIT..MAX_PIXEL_UNIT`. Extend `e2e/world-grid.spec.ts`'s selector list with the new elements.
- Mobile 390x844: the house is wider than the screen; its label must still be on screen (`e2e/world-grid.spec.ts` "nearby House" test) and the bubble over Edward must not leave the viewport.
- Don't change `data/world.ts` positions or the backdrop for this task.
- Reduced motion: no new animation beyond the existing stepped pop.

## Verify

All quality gates. Then screenshots at 1280x800 and 390x844 of (a) the house with Edward nearby, (b) the Arcade with Edward nearby, (c) mid-walk with nothing nearby — save them under `docs/review/signage/` and list them in the report.
