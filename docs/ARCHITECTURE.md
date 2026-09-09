# Edward's World — Architecture

The technical reference for this repository. For what the product is and why,
see the [README](../README.md); for the product thinking behind it, see the
[case study](./CASE_STUDY.md).

The layering is deliberate and load-bearing: portfolio content, world rules,
motion and rendering are separate, so any one of them can change without
replacing the others. Two rules hold across every surface — **simulations are
pure** (no React, no DOM, no `requestAnimationFrame`), and **timers drive state
while animation never does.**

## Application structure

A [Next.js 16](https://nextjs.org) application on the App Router, built with
Turbopack, React 19 and TypeScript in `strict` mode. There is no state library,
no CSS framework and no component library; the runtime dependency list is
`next`, `react`, `react-dom` and `animejs`.

| Path | What lives there |
| --- | --- |
| `app/` | Routes, the root layout and metadata, and `app/globals.css` |
| `components/` | React surfaces, grouped by the place they render |
| `lib/game/` | Pure rules and state machines. No React, no DOM |
| `lib/pixel/` | Procedural art: art-pixel drawing routines and the palette |
| `lib/motion/` | anime.js choreography, the shared rAF loop, motion preferences |
| `lib/audio/` | The background-music engine and its pure policy module |
| `lib/joins/` | The visitor counter: store bindings, route response, client latch |
| `lib/storage/` | Guarded `localStorage` access for the saved wardrobe look |
| `data/` | Canonical content: projects, world geometry, biography, garments |
| `types/` | Shared domain types |
| `tests/` | Vitest suites, all Node-environment |

### Routes

| Route | Rendering |
| --- | --- |
| `/` | Static. The whole world — a single client entry point below the layout |
| `/resume` | Static |
| `/case-studies/[slug]` | SSG, one page per project via `generateStaticParams` |
| `/api/joins` | Dynamic (`force-dynamic`). `GET` reads, `POST` increments |
| `/manifest.webmanifest`, `/robots.txt`, `/_not-found` | Static |

`/resume` and `/case-studies/*` are real routes, not overlays, so the component
tree under them is torn down and rebuilt on every visit. That constraint is why
the audio engine cannot live in React state — see [Audio](#audio).

The root `index.html` and `scenes.js` files are the approved concept-board
reference, not production entry points. They are intentionally versioned
without being imported by the Next.js application. The generated
`design/support.js` runtime is local-only and ignored.

## Runtime flow

```text
TITLE -> PAN -> SHRINE -> SELECTION -> NAME -> ASK -> TYPING -> UNLOCK -> WORLD
                                                       ^                   |
                                              waits for the visitor        |
                                                                           v
                                                        project locations · Edward's House
                                                                           |
INDEX  <------------------ available at every one of these ----------------+
```

`components/portfolio-experience.tsx` owns only top-level view and overlay
state, and it is the one place that decides whether an interaction opens a full
location experience or a summary dialog. The intro advances through the pure
state model in `lib/game/intro-machine.ts`; the stage list is
`INTRO_STAGES` in `types/intro.ts` and every automatic duration lives in
`INTRO_STAGE_TIMINGS`. Eight of the nine stages are timed; `TYPING` is gated on
the visitor and has no duration at all, which is why there is no single total
for the sequence — only `INTRO_SCRIPTED_MS`, the eight seconds the world
performs unprompted.

## Project content

`data/projects.ts` is **canonical**, and it is the only place a project fact is
written down. The world's dialogs, the INDEX grid, the four case-study routes
and their page metadata all resolve their copy from it instead of restating it,
so a project cannot say one thing in one surface and something else in another.

The shape is `PortfolioProject` in `types/portfolio.ts`, and the optional fields
carry a rule about provenance rather than convenience:

| Field | Contract |
| --- | --- |
| `techStack` | The project's real, shipped stack. Present only where it has actually been verified against the repository |
| `repositorySummary` | The repository's own description of itself, **verbatim**. Case studies quote it rather than paraphrasing, because a project stated in its own words is a fact and prose written around it would not be |
| `framingNote` | How the project may and may not be framed, where the repository is explicit. Present only where getting it wrong would misrepresent the work — so every surface that shows the project must show this too. AFL Predict carries one: *paper-trading research, not a live betting or tipping service* |
| `repositoryNotes` | Further detail read from the repository's own README |

`projects` is declared `as const satisfies readonly PortfolioProject[]`, so the
literal types stay narrow while the array is still checked against the
interface. `getProjectBySlug` deliberately widens on the way out: route code
reads a project through it and sees the whole optional shape rather than only
the fields the first entry happens to carry.

`tests/projects.test.ts` and `tests/content.test.ts` guard the invariants —
including that removed concepts do not reappear in the data.

**These stacks are facts about Edward's other repositories, not about Edward's
World.** Three.js, FastAPI, PostgreSQL, Docker, React Native and Python appear
in this codebase only as strings in this file. Nothing here depends on them.

The distinction between shared world infrastructure and a project's own
experience is drawn in
[Project location experiences](#project-location-experiences): every project
gets the same building, proximity reach, typed action and return trip, and then
its interior is entirely its own.

## Data and domain boundaries

- `types/world.ts` defines the player, buildings, signs, positions, interactables, and the discriminated interaction action union.
- `data/world.ts` supplies the world's real geometry and its typed object instances. Every coordinate is a whole number of art pixels, and every object's `y` is its ground line minus its height, so nothing floats or sinks.
- `lib/game/movement.ts` and `lib/game/interactions.ts` are pure and have no React or browser dependencies.
- `lib/motion/animate-element.ts` is the small anime.js boundary. Defaults and reusable presets can be tuned independently from component state.

## Input

Three input surfaces, all of which are supported everywhere they apply.

### Keyboard

| Surface | Keys |
| --- | --- |
| Title screen | `Enter` starts |
| Opening name gate | Any letter, `Backspace`, `Space`; `Escape` skips the gate |
| Main world, Edward's House, arcade floor | `A` / `D` / `←` / `→` to walk, `E` to interact |
| Golf | `Space` / `Enter` to stop each bar |
| Basketball | Hold `Space` / `Enter`, release in the band |
| Running | `W` / `↑` to push, `S` / `↓` to ease |
| Tennis | `A` / `D` / `←` / `→` to move, `Enter` / `Space` to swing |
| Arcade platformer | `←` `→` or `A` `D`, `Space` to jump |
| Every overlay and location | `Escape` leaves |

Walking updates a held-key set; a `requestAnimationFrame` loop multiplies speed
by elapsed seconds and clamps both the frame delta and the world position. A
`blur` listener clears held keys, so leaving the tab mid-stride does not leave
the player walking.

`components/sportsgang/minigames/use-minigame-input.ts` collapses keyboard and
pointer into one neutral input shape for every simulation. Press and release
edges are latched as they happen and cleared when the loop consumes them, so a
tap between two frames is never dropped and never double-counted, and
`event.repeat` never reads as a fresh press. Action-key capture is scoped: a
focused link, button or field that is not marked `data-minigame-control` keeps
its own native `Enter` and `Space`.

### Pointer and touch

- The world has on-screen walk buttons bound on `pointerdown`/`up`/`leave`/
  `cancel`, and its status bar is a real `<button>` that opens whatever the
  player is standing next to — so the world is fully playable with no keyboard.
- Each mini-game exposes its own tap controls through the same input hook.
- The arcade floor, walk pace and cabinet position are derived from the measured
  viewport, so the cabinet is centre stage on a phone as well as a desktop.
- The opening name gate is a real, visually suppressed text `<input>` sitting
  over the carved sockets: tapping the slab opens a phone's native keyboard, and
  assistive technology reads a labelled control. `lib/game/name-gate.ts` is
  modelled as a **text reducer** rather than a keystroke machine — the whole
  typed string goes in and the matched prefix comes out — which is what lets one
  code path serve a physical keyboard, a soft keyboard, a swipe keyboard, an IME
  and a paste.

### Accessibility

- WORLD / INDEX is always available, including mid-intro.
- INDEX and every interaction panel share one modal primitive
  (`components/ui/accessible-dialog.tsx`) with initial focus, a focus trap,
  `Escape` handling and focus restoration.
- Canvases are decorative and `aria-hidden`; the accessible names live on the
  charcoal label chips and the status bar beside them.
- A disabled world is marked `inert`, so its controls leave the focus order
  while an overlay is open rather than being tabbable behind it.
- A reduced-motion preference shortens anime.js durations and automatic
  intro-stage waits to a single millisecond while preserving the state sequence,
  and freezes the ambient frame counter. Reading-time dwells are floored to a
  readable minimum rather than collapsed — see the SportsGang machine.

## Pixel art layer

`lib/pixel/` holds the world's art. It is pure and browser-free apart from the
canvas binding, so it is unit-testable and safe to import anywhere:

- `palette.ts` — the approved colour tokens. Nothing outside this file names a colour.
- `raster.ts` — the `Raster` primitive (`draw(x, y, w, h, colour)` in **art pixels**) plus shared helpers: sprites, hills, roof pitches, windows, sign-band dashes, trees, lamps, smoke, and deterministic `scatter` noise.
- `buildings.ts` — one routine per structure, drawn bottom-anchored on a transparent background in its own local space.
- `characters.ts` — Edward's four-frame walk cycle, on the approved 12x16 grid.
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
  comes from the meter, the tennis verdict from how close the player was to the
  ball when they swung, make or miss from the release point, finishing time from
  the pace actually held.
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

The V4 eight-frame storyboard, and the one beat in the product that waits for
the visitor rather than performing at them.

`ENTER` on the title pans the camera east from pixel Sydney at dusk to a shrine
clearing. The letters of a name pull free of a carved monolith face and assemble
into SOON HYUN HWANG; an inscription slab surfaces and asks the visitor to type
it back into thirteen carved sockets. The assembled name stays on screen the
whole time — the gate tests presence, not memory. Completion unlocks the world.

| Module | Responsibility |
| --- | --- |
| `types/intro.ts` | `INTRO_STAGES`, and which of them are timed vs. shrine-drawn |
| `lib/game/intro-machine.ts` | Pure stage model, durations, and the camera pan easing |
| `lib/game/name-gate.ts` | The gate as a pure text reducer (see [Input](#input)) |
| `lib/pixel/opening.ts` | The dusk scenery — harbour, bridge, terraces, park — on its own palette, because the opening is a different time of day and place than the world |
| `lib/pixel/monolith.ts` | The monolith and the two scenes it stands in, drawn as six numbered phases matching the storyboard frames |

`MONOLITH_PHASE` in the intro machine is the single place the stage vocabulary
and the art module's frame numbering meet.

The whole scene is one fixed-aspect stage, so the backdrop, the carved sockets
and the letters share a coordinate space and nothing needs re-aligning at
another width.

Stages advance on timers, as everywhere else. The choreography differs from the
locations in one way: its timelines are **paused, never reverted**, because
each beat hands its end state to the next — reverting would wipe the creatures
back to invisible the moment they finished arriving. Each beat also pins the
state it depends on before animating, so it can start from a known place rather
than trusting the previous tween to have landed.

## Audio

One track — *Moss Gate Town* — and a single global engine that owns it.

### Why it is not React state

`/resume` and `/case-studies/*` are real routes, so the component tree under
them is torn down and rebuilt on every visit; anything that owned the music from
inside that tree would restart it on every navigation.

It is not plain module state either, which is the part that is easy to get
wrong. The root layout and the page are separate client entry points, so a
module-scoped `let` can be *instantiated twice* — the control would unlock one
copy while the world started the other, and the music would never play. The
mutable state therefore lives on a `Symbol.for` key on `globalThis`, the one
namespace every copy of the module genuinely shares.

### The split

| Module | Responsibility |
| --- | --- |
| `lib/audio/bgm.ts` | Everything that is a **decision**: the loop points, the fade and duck timings, the per-surface volume policy, the state resolver, and the stored mute preference. Pure — testable and readable with no `AudioContext` |
| `lib/audio/bgm-engine.ts` | Everything that is a **device**: the `AudioContext`, the master gain, the buffer source, decoding, and the `useSyncExternalStore` subscription |
| `components/audio/music-control.tsx` | The one control, mounted from the **root layout** so it exists on the routes where the world does not |
| `components/audio/bgm-surface.tsx` | Renders nothing; lets a server-rendered route declare which surface the visitor is on |

### Lifecycle

```text
LOCKED  --first gesture anywhere-->  READY  --world entered-->  PLAYING
                                                                 |  ^
                                              surface changes    v  |
                                                               DUCKED
```

`resolveBgmState` is the one place the six states — `LOCKED`, `READY`,
`PLAYING`, `DUCKED`, `MUTED`, `ERROR` — are decided, and the order it checks
them in encodes the priorities: a failure is reported even when muted, the
visitor's mute outranks playback, and nothing is `PLAYING` before a gesture has
unlocked it.

- **Autoplay restriction.** Browsers will not let a page make sound before a
  real user gesture. `MusicControl` registers a capture-phase, `once` listener
  on `pointerdown` and `keydown` that creates and resumes the `AudioContext`
  while that gesture is still on the stack. It does not start the music — that
  waits for the world.
- **Entry.** The world reveal gets 500 ms of its own before a 2 s fade in.
- **Interruption.** A `visibilitychange` listener resumes a context the OS or
  browser suspended while the tab was hidden.

### Ducking

The world is the only surface the music is written for. Everything else is
something being read or played *inside* it, so the music steps back by a
documented amount rather than an arbitrary one:

| Surface | Gain |
| --- | --- |
| World | 0.22 |
| Edward's House | 0.11 |
| A project location | 0.10 |
| A case study | 0.06 |
| The resume | 0.05 |

A surface change is a **ramp on the master gain, never a restart** — the source
node keeps running underneath, so leaving a project returns to the bar the world
was already playing. Cross-surface ramps take 700 ms; a same-surface correction
and every mute transition take 220 ms.

### Muting

The preference is stored per device under `edwards-world:bgm:muted`, guarded the
same way the wardrobe's saved look is: tolerant of storage being missing,
blocked, or holding something it did not write. An unreadable preference is
**not** muted — silence is never the safer guess to make on a visitor's behalf
when they have not asked for it. A custom event notifies subscribers in the same
tab after a write.

### Looping

The loop points are measured rather than chosen. The track runs at 93.75 BPM
with a 2.56 s bar; `START` (12.86 s) is bar 5, where the piano intro finishes,
and `END` (74.3 s) is bar 29, where the body gives way to the breakdown. The
span is 24 bars — six four-bar phrases — so the loop returns on a phrase
boundary rather than mid-thought. A 40 ms equal-power crossfade is baked into
the tail of the buffer at decode time, so the wrap is not a splice: without it
the join steps 26% of full scale and clicks.

### Failure

**Nothing in the audio layer throws.** Audio is the first thing a browser
refuses and the last thing that should be able to take the world down with it,
so every call into the platform is wrapped and failure resolves to `ERROR`,
which the control renders as unavailable and the world ignores entirely.

## The join counter

The world greets each arrival with **"You are the *N*-th player to join the
world."** The number is a single global integer — how many visitors have
entered — and nothing else is ever stored beside it. No identifiers, IPs,
cookies, user agents, or timestamps: `app/api/joins/route.ts` declares handlers
that take no `request` parameter, so there is no request object in scope to
read one from.

### The pieces

| File | Responsibility |
| --- | --- |
| `lib/joins/store.ts` | The `JoinStore` contract (`read`, `increment`) and its three bindings |
| `lib/joins/response.ts` | Turns a store call into a response; never throws, never serializes a broken total |
| `app/api/joins/route.ts` | `GET` reads, `POST` increments; `dynamic = "force-dynamic"` so the total is never baked into a static response |
| `lib/joins/client.ts` | Records this visitor's join at most once per browsing session, and publishes the result |
| `lib/joins/use-join-total.ts` | `useSyncExternalStore` view of that total, with a `null` server snapshot |
| `lib/joins/ordinal.ts` | English ordinals (the teens are the only hard part) and the sentence itself |

### Which store binds, and when

`getJoinStore()` picks one of three, in order:

1. **A Redis-compatible REST endpoint**, when the environment names one. This
   is the only binding that is correct across restarts and across concurrent
   Function instances, because `INCR` is atomic on the server rather than in
   any one process.
2. **An unavailable store** — every call throws — when nothing is provisioned
   and `NODE_ENV === "production"`. Falling back to an in-process counter here
   would greet the first visitor of every cold instance as "the 1st player",
   forever. A 500 that the client turns into silence is the honest answer.
3. **An in-process counter** otherwise, so `npm run dev` and the test suite
   have a working counter with no setup.

The route handler is identical in all three cases. Nothing in this codebase
provisions anything.

### Required configuration

The counter needs a Redis-compatible REST endpoint. Either pair works, and
whichever is present wins; the `KV_REST_API_*` names are what a Vercel
Marketplace Redis integration (Upstash) injects automatically, and the
`UPSTASH_*` names are what a directly-provisioned Upstash database gives you.

| Variable | Required | Notes |
| --- | --- | --- |
| `KV_REST_API_URL` | Either this pair… | REST base URL, e.g. `https://xxx.upstash.io` |
| `KV_REST_API_TOKEN` | | Bearer token, write-capable |
| `UPSTASH_REDIS_REST_URL` | …or this pair | Same thing, direct-provisioning names |
| `UPSTASH_REDIS_REST_TOKEN` | | |

Both are **server-only**. They are read inside a route handler, never prefixed
`NEXT_PUBLIC_`, and the token travels as an `Authorization: Bearer` header
rather than in a URL, so it is never in a log line or a referrer. Nothing about
the store reaches the browser except the integer itself.

To provision on Vercel: add a Redis store from the Marketplace
(`vercel integration add upstash` or the dashboard), connect it to the project,
and redeploy — the `KV_REST_API_*` pair is injected for you. `vercel env pull`
brings them into `.env.local` for local work. Half a pair counts as
unconfigured. The counter lives under one key, `edwards-world:joins`.

### Counting one visitor once

`recordJoinOnce()` is called from `components/portfolio-experience.tsx` the
first time the visitor actually holds the world, whichever of the three doors
they came through (the intro's timed unlock, SKIP INTRO, SKIP TO INDEX). Two
latches keep it to one:

- A **module-scope flag** covers a single page load — React re-mounts freely
  and StrictMode mounts everything twice in development, and module state
  outlives both. Opening INDEX, entering a project world, and returning from
  the House are all state changes within that same page, so none of them post.
- **`sessionStorage`** covers the reload the module flag cannot see: a refresh,
  a hard navigation to `/resume` and back, a restored tab. The position the
  visitor was given is written under `edwards-world:join-position` and read
  back thereafter, so a refresh shows the same ordinal instantly and posts
  nothing.

It is per-tab, clears itself when the tab closes, and never leaves the browser.
That is the whole privacy story: no cookie, no identifier, no fingerprint. A
visitor who returns in a new tab tomorrow counts as a new join, which is the
deliberate trade for not tracking anyone. Where `sessionStorage` is missing or
throws (Safari private browsing throws on access), the refresh latch is simply
lost and everything else still works.

### Failing quietly

The counter must never stand between a visitor and the world. It is a
`POST` fired from an effect after the world is already on screen — nothing
awaits it, and nothing renders behind it. If the store is unreachable,
unprovisioned, slow (requests abort after 2s), or returns something that is not
a count, the total stays `null` and `main-world.tsx` renders no line at all.
There is no error state, no spinner, and no technical message; the world simply
does not mention what number you are.

## Visual implementation seam

Every surface now has its real art. World objects expose stable
`data-object-id` hooks matching their typed IDs. Add tunable motion presets to the
existing motion layer rather than coupling anime.js timelines to portfolio data or
game rules. Ambient world animation runs off a single shared frame counter
(`lib/motion/use-ambient-frame.ts`), which freezes for reduced motion and whenever
the world is not the active surface.

## Testing and quality gates

Four gates. All four must pass before anything is called done.

| Command | What it runs |
| --- | --- |
| `npm run lint` | `eslint . --max-warnings 0` — `eslint-config-next`, zero tolerance for warnings |
| `npm run typecheck` | `tsc --noEmit`, `strict: true` |
| `npm test` | `vitest run` |
| `npm run build` | The production Next.js build, which type-checks again |

**Last full run — 2026-09-05:** lint clean, typecheck clean, **368 tests across
27 files passing**, production build succeeding with 10 routes generated.

### What the suite covers, and why there

Vitest runs in the **Node environment**, not jsdom. That is a consequence of the
architecture rather than a limitation of it: the parts where being wrong is
invisible are all pure, so they can be tested without a DOM at all.

- **The simulations** — golf, tennis, basketball, running, the platformer.
  Determinism, bounds, and the property that matters most: every number a sport
  reports is computed from what the player actually did. The platformer's
  finishability is proved by a **bot that plays it end to end**, not by an
  assertion; that is what caught the jump-cut regression a reading of the code
  went straight past.
- **The state machines** — the intro, SportsGang's stages, the name gate.
- **Geometry and art** — `tests/world-art.test.ts` fails if any art routine
  stops matching its object's world footprint, and pins the player's `48x64`
  hitbox as a literal so a future avatar swap cannot silently move it.
- **The join counter** — all three store bindings, the response contract, and
  the once-per-session client latch.
- **Audio policy** — state resolution, target volumes, ramp durations and the
  loop-crossfade maths, all without an `AudioContext`.
- **Content invariants** — `tests/projects.test.ts` and
  `tests/world-data.test.ts` assert that removed concepts stay removed and that
  no interactable is left stranded where a deleted object used to stand.

`vitest.config.ts` excludes `.claude/**` deliberately: agent worktrees hold
whole copies of this repository, and their test files would otherwise be globbed
in alongside the real ones — a silently doubled suite reporting on a stale
checkout.

### What the suite does not cover

Feel, timing and anything that only exists on screen. Every location in this
repository was also walked through in a real browser before being marked done,
and several of the defects in this project's history — a golf ball starting
outside its frame, a character's head not matching between two scenes, tennis
timing that was unwinnable for a first-time player — were found that way and
could not have been found any other way.

## Deployment model

A standard Next.js 16 application. `npm run build` produces a production build
and `npm start` serves it; any Node-compatible host that can run a Next.js
application will run this one. Node 20.9 or newer, per Next's own floor.

The application is **static apart from one route**. `/`, `/resume`, the four
`/case-studies/*` pages, the manifest and `robots.txt` are all prerendered; only
`/api/joins` is dynamic, and it is marked `force-dynamic` so the total is never
baked into a static response.

Nothing in this repository provisions infrastructure, and nothing is configured
for a specific host. There are no build-time environment variables: the only
environment the application reads is the optional Redis-compatible REST pair
described above, read inside the route handler at request time. Without it the
counter degrades to silence and every other part of the product is unaffected.

There is no live deployment yet.
