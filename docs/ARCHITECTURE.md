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

## Pixel art layer

`lib/pixel/` holds the world's art. It is pure and browser-free apart from the
canvas binding, so it is unit-testable and safe to import anywhere:

- `palette.ts` — the approved colour tokens. Nothing outside this file names a colour.
- `raster.ts` — the `Raster` primitive (`draw(x, y, w, h, colour)` in **art pixels**) plus shared helpers: sprites, hills, roof pitches, windows, sign-band dashes, trees, lamps, smoke, and deterministic `scatter` noise.
- `buildings.ts` — one routine per structure, drawn bottom-anchored on a transparent background in its own local space.
- `characters.ts` — Edward's four-frame walk cycle and TOMODACHI, on the approved 12x16 grid.
- `backdrop.ts` — sky, hills, terrain, path, stream, oval and town props as one full-width layer.

`lib/game/terrain.ts` is the pure ground profile. It is a stepped function on
purpose: constant-height terraces keep everything standing on it aligned to the
pixel grid, which is what enforces "no sub-pixel positions, ever".

Rendering is a hybrid on purpose. `components/world/pixel-canvas.tsx` renders one
routine per canvas, and `MainWorld` places those canvases *inside* the existing
`world-object` divs. The DOM structure, the `data-object-id` hooks, the label
text and the interaction dispatch are all unchanged — canvases are decorative
and `aria-hidden`, and the charcoal label chips carry the accessible names.

Scale is fixed: `PIXEL_UNIT` CSS pixels per art pixel, and every position and
size in `data/world.ts` is a whole multiple of it. `tests/world-art.test.ts`
fails if any art routine stops matching its object's world footprint.

## Project location experiences

`data/projects.ts` stays the single source of project truth, including the real
`techStack`. A project opens a full location experience instead of a summary
dialog purely by being listed in `EXPERIENCE_PROJECTS` in
`components/portfolio-experience.tsx`; everything else keeps the dialog. The
experience renders as a fixed layer over a still-mounted `MainWorld`, which is
passed `disabled` so the world freezes and keeps the player's position for the
return trip. Opening INDEX or WORLD leaves the experience.

SportsGang is the first one:

- `types/sportsgang.ts` — the linear stage list, split into stages that advance
  on a timer and stages that wait for the visitor.
- `lib/game/sportsgang-machine.ts` — pure transitions and all timings. Reduced
  motion shortens each dwell to a readable floor rather than collapsing it to
  1ms as `getIntroStageDuration` does: these durations are reading time, not
  motion.
- `lib/motion/sportsgang-choreography.ts` — anime.js timelines, and nothing
  else. No function here advances state.
- `lib/pixel/sportsgang.ts` — the venue and courtside backdrops plus the two
  players, on the same grid and palette as the world.
- `components/sportsgang/*` — the stage host, the pixel phone, and the venue.

### Mini-games

A third timing regime lives inside `PLAY`: the player is driving, in real time.

- `lib/game/minigames/<sport>.ts` — pure, tick-based simulations shaped as
  `advance(state, input, dt) -> state`. No React, no DOM, no rAF. Golf, tennis,
  basketball and running each have one, and each is unit-tested for
  determinism, bounds and the property that matters most: **every number a
  sport reports is computed from what the player actually did.** Carry distance
  comes from the meter, the tennis verdict from the timing delta, make or miss
  from the release point, finishing time from the pace actually held.
- `lib/motion/use-game-loop.ts` — the only rAF loop, delta-clamped, stopped
  when inactive or unfocused. Pausing player-controlled play in a background
  tab is correct, where pausing a scripted stage would not be.
- `components/sportsgang/minigames/use-minigame-input.ts` — keyboard and
  pointer collapsed into one neutral input shape, with press/release edges
  latched so a tap between frames is never lost or double-counted.
- `components/sportsgang/minigames/index.ts` — the registry. Adding a sport is
  a simulation, a component and one line here; the phone, the matchmaking and
  the venue transition need no changes.

`PLAY` is a gated stage, never a timed one: it lasts exactly as long as the
player takes, and the mini-game reports its own completion.

Two rules make the sequence robust:

1. **Timers drive state; animation never does.** anime.js runs on
   `requestAnimationFrame`, which browsers throttle hard in background tabs, so
   a stage that waited on a timeline's completion would stall. Stages advance on
   `setTimeout`; choreography is fired and forgotten.
2. **End states are pinned, not tweened into.** `settleCourtExpansion` sets the
   post-transition state explicitly when the stage leaves, so a timeline still
   mid-flight cannot strand the phone half-faded.

## Visual implementation seam

`MainWorld` is done. `IntroSequence` still holds placeholder DOM: replace it with
asset-backed presentational components while preserving its props, typed records,
state transitions, and interaction dispatch. World objects expose stable
`data-object-id` hooks matching their typed IDs. Add tunable motion presets to the
existing motion layer rather than coupling anime.js timelines to portfolio data or
game rules. Ambient world animation runs off a single shared frame counter
(`lib/motion/use-ambient-frame.ts`), which freezes for reduced motion and whenever
the world is not the active surface.

The root `index.html` and `scenes.js` files are the approved concept-board reference, not production entry points. They are intentionally versioned without being imported by the Next.js application. The generated `design/support.js` runtime is local-only and ignored.
