# Edward's World foundation

This repository intentionally separates portfolio content, world rules, motion, and rendering so the approved visual concept can be added without replacing the interaction model.

## Runtime flow

```text
TITLE
  -> APPROACH -> STOP -> GLYPH_REVEAL -> EDWARD_FORMATION
  -> DOOR_UNLOCK -> DOOR_OPEN -> WORLD
                              \
                               -> INDEX (available at any time)
```

`components/portfolio-experience.tsx` owns only top-level view and overlay state. The intro sequence advances through the pure state model in `lib/game/intro-machine.ts`. All automatic stage durations live in `INTRO_STAGE_TIMINGS`.

## Data and domain boundaries

- `data/projects.ts` is the canonical portfolio project list. The world and index resolve project content from it instead of duplicating copy.
- `types/world.ts` defines the player, buildings, NPCs, signs, positions, interactables, and the discriminated interaction action union.
- `data/world.ts` supplies placeholder geometry and typed object instances.
- `lib/game/movement.ts` and `lib/game/interactions.ts` are pure and have no React or browser dependencies.
- `lib/motion/animate-element.ts` is the small anime.js boundary. Defaults and reusable presets can be tuned independently from component state.

## Input and accessibility

- A / D and ArrowLeft / ArrowRight update a held-key set. A `requestAnimationFrame` loop multiplies speed by elapsed seconds and clamps both the frame delta and world position.
- E dispatches the nearby object's typed action.
- WORLD / INDEX is always available. INDEX and interaction panels share a modal primitive with initial focus, a focus trap, Escape handling, and focus restoration.
- Reduced-motion preference shortens anime.js animation durations and automatic intro-stage waits to a single millisecond while preserving the state sequence.

## Visual implementation seam

Replace placeholder DOM inside `IntroSequence` and `MainWorld` with asset-backed presentational components while preserving their props, typed records, state transitions, and interaction dispatch. World objects expose stable `data-object-id` hooks matching their typed IDs. Add tunable motion presets to the existing motion layer rather than coupling anime.js timelines to portfolio data or game rules.

The root `index.html` and `scenes.js` files are the approved concept-board reference, not production entry points. They are intentionally versioned without being imported by the Next.js application. The generated `design/support.js` runtime is local-only and ignored.
