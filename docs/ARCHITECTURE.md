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

## Wardrobe

An archive rather than a game, so it needs no timed machinery:

- `types/wardrobe.ts` + `data/wardrobe.ts` — the five steps and the garments.
  Garment metadata is structural only: name, layer, colour, fabric, season.
  Nothing is inferred, scored or claimed about recognition.
- `lib/game/wardrobe-archive.ts` — the rules as a pure reducer. A garment
  cannot be worn before it is archived, a layer takes only its own kind, and a
  look needs enough on it to be a look.
- `lib/storage/saved-look.ts` — the product's philosophy made literal. The look
  is written to `localStorage` on this device and read back on the next visit;
  nothing is sent anywhere. Every read and write is guarded, and a stored value
  the catalogue does not recognise is discarded rather than trusted.
- `lib/storage/use-saved-look.ts` — reads that store through
  `useSyncExternalStore`. The snapshot is the raw string, not a parsed object,
  because React compares snapshots by identity and a fresh parse every read
  would never settle.

The interior is DOM and CSS rather than canvas: every garment is a real control
that can be clicked, tabbed to and read out, and there is no cover-fitted
backdrop to align against.

## AFL Lab

A prediction lab has to show numbers, and inventing them would be a lie about a
project whose own repository says *paper-trading research, no live betting*.
`lib/game/afl-pipeline.ts` resolves that: the fixture is demonstration data —
seeded, no real clubs, no real results — and every figure downstream is
genuinely computed from it. Features are differences you can check by eye,
two small models blend into an ensemble, and calibration is temperature
scaling, so the visitor watches an overconfident raw number get pulled back
towards even. That is the part worth understanding.

The lab reports agreement between the visitor's pick and the model's, and
nothing else: one run over demonstration data cannot support a claim about
accuracy, and the repository publishes none for this to borrow.

The room is split from the instruments on purpose. `lib/pixel/afl-lab.ts`
draws the room — wall, cable tray, match board, field reference, and the bay of
machinery under the bench — as one deterministic `ArtRoutine`, while the six
stage panels standing on that bench are live DOM, because every number on them
is one the pipeline computed and has to stay selectable, announceable text
rather than rasterised pixels. `LAB_LAYOUT.benchY` is the seam between the two:
the CSS positions the rack against that same fraction, so the panels sit on the
drawn bench at any viewport taller than 16:9, and the rack casts its own
contact shadow to cover the percent or two of drift when it is wider.

`lib/motion/afl-choreography.ts` carries the motion, under the same rule as
every other choreography module here — it never advances state. The stage
machine keeps its own time on `setTimeout`; the packet crossing from one panel
to the next and the tube coming up out of its scan line only describe what that
looks like. Each hop is measured live from the DOM rather than once per run, so
the bench re-flowing from six columns to three to two needs no separate
handling, and `settleCrt` pins a panel lit whether or not its animation ever
arrived — which is what keeps a backgrounded tab from stranding a screen
squashed into a scan line.

## Arcade

`lib/game/arcade/platformer.ts` is one segment of Edward's Career Quest rebuilt
small: move, jump, close three bugs, clear three pits, reach the offer. Pure
and deterministic like every other simulation here, and unit-tested for the one
property that matters most — that it can actually be finished, proved by a bot
that plays it rather than by assertion.

Two things the tests caught that reading the code would not have:

- The jump cut was a per-frame multiplier, so any jump not held for its whole
  rise collapsed to nothing. It is a clamp now: a tap clears a bug, a hold
  clears a gap.
- Landing on a bug killed the player. The original's own README says stomping
  works, so it does here: falling onto a bug closes it and bounces you off.

The arcade floor reuses `movePlayerX` and `getCameraX` from the world's own
movement module, so walking to the cabinet feels like walking anywhere else.
Pressing `E` at the cabinet runs the same screen-to-slot expansion the phone
uses in SportsGang — `measureScreenProjection` and `applyScreenProjection` are
shared for exactly that reason.

## Edward's House

`data/personal.ts` is the single source for biography and contact, and every
line in it was read from Edward's own public repositories — the roadmap's
*Verified facts* table records where. Nothing is inferred or rounded up. What
is not known is `null`, and the room says so: the League of Legends shelf is a
typed hook waiting for a real value rather than an invented rank.

The room is walked, not read. Six objects, the world's own `movePlayerX`, a
proximity reach, and `E` to look — the same verbs as outside. Opening a
non-project location goes through a typed `OPEN_LOCATION` action rather than
being special-cased on a building id.

## The opening ritual

Six seconds exactly (`INTRO_TOTAL_MS`), spent on the two beats that carry
meaning — the creatures arriving and the word forming — rather than on the
door. `lib/pixel/glyphs.ts` holds six original letterforms, one per letter of
EDWARD, each with a single glowing eye. `lib/pixel/intro.ts` draws the clearing.

The whole scene is one fixed-aspect stage, so the backdrop, the six carved
slots and the creatures share a coordinate space and nothing needs re-aligning
at another width.

Stages advance on timers, as everywhere else. The choreography differs from the
locations in one way: its timelines are **paused, never reverted**, because
each beat hands its end state to the next — reverting would wipe the creatures
back to invisible the moment they finished arriving. Each beat also pins the
state it depends on before animating, so it can start from a known place rather
than trusting the previous tween to have landed.

## Visual implementation seam

Every surface now has its real art. World objects expose stable
`data-object-id` hooks matching their typed IDs. Add tunable motion presets to the
existing motion layer rather than coupling anime.js timelines to portfolio data or
game rules. Ambient world animation runs off a single shared frame counter
(`lib/motion/use-ambient-frame.ts`), which freezes for reduced motion and whenever
the world is not the active surface.

The root `index.html` and `scenes.js` files are the approved concept-board reference, not production entry points. They are intentionally versioned without being imported by the Next.js application. The generated `design/support.js` runtime is local-only and ignored.
