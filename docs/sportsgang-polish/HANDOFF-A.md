# HANDOFF-A — tennis contact sync and five swings

Branch `polish/sg-a-tennis`, based on FOUNDATION_SHA `cdd593d`.
Worktree `/Users/edwardhwang/Desktop/Edward_world-sg-a`. Not pushed, not merged,
not deployed.

---

## 1. The actual cause

Measured from the source at `cdd593d` and from a running screen, not inherited
from any earlier explanation. There were four separate faults, and each one on
its own is enough to break the sync.

**1. Nothing connected the racket to the judgement.** The hit test was
`withinReach(ball, x)`:

```ts
Math.abs(ball.x - x) <= SWING.REACH_X      // 8, measured from the sprite centre
Math.abs(ball.y - COURT.CONTACT_Y) <= 7.5  // 10.5 — a fixed height, always
```

`x` is the player's sprite centre and `CONTACT_Y` is a constant. The racket was
drawn by `frameFor(swinging, moving)`, which returns one of three static poses.
So the judgement asked about a point on the player's midline at a fixed height,
while the strings were drawn wherever the "contact" pose happened to put them.
The two numbers never referred to the same place, and no code required them to.

**2. The strike zone was nearly twice the visible player.** 2 × `REACH_X` = 16
court units wide, against a sprite canvas of `CANVAS_WIDTH_PCT` = 8.5 — a ratio
of **1.88**. Balls a full racket's distance from the strings were struck.

**3. It was a point test against a ball moving faster than the zone is wide.**
The test ran once, on the post-step position. Measured over 400 rally ticks, the
ball moves a median of **1.24** units per 60 Hz step and a maximum of **30.96**
— against a zone under 5 wide once it is honest. A cleanly timed ball tunnels
straight through.

**4. Contact had no timing window at all.** One pose, one fixed duration, no
relationship between the animation's contact frame and the moment the physics
decided anything.

Ruled out by inspection, so no one repeats the search: **no CSS timing is
involved.** `.sg-tennis__figure` sets `transition: none` and the ball element
has no transition or animation — the visual lag was not a tween.

## 2. What changed

| Path | What it is |
|---|---|
| `lib/pixel/sg-tennis.ts` | **New.** Racket pose tables for all five swings, `racketPoseAt`, `racketHeadCentre`, `tennisRoutine`. The single source of truth read by *both* the renderer and the simulation. |
| `lib/game/minigames/tennis.ts` | `contactAnchor()` derives the strike point from the same pose table the renderer draws; `sweptHit`/`sweptHitLive` replace the point test; `SWING_SPEC` gives each swing its own duration, window and cooldown; `selectSwing` chooses the swing; one `TennisContact` event drives everything. |
| `components/sportsgang/minigames/tennis-game.tsx` | Renders `tennisRoutine(...)` at the live swing progress, runs on `useFixedStepGameLoop`, draws the toss ball, and carries the dev-only debug overlay. |
| `app/globals.css` | One appended `@owner:A` block, `.sg-tennis-*` only. **Additions only** — `git diff app/globals.css \| grep '^-'` is empty. |
| `tests/tennis-anchor.test.ts` | 13 tests: the projection constants, anchor vs. sprite centre, `sweptHit`. |
| `tests/tennis-swings.test.ts` | 27 tests: five distinct swings, selection, freezing, one event per collision, contact inside the box *and* inside the window. |
| `tests/tennis-schedule.test.ts` | 8 tests: bit-exact determinism across four schedules. |

**The fix, in one line:** the racket's own geometry is now the strike zone. The
anchor is `contactAnchor(side, x, swing, progress)`, taken from the same pose
table that draws the strings, and the ball is swept against it.

Three consequences worth naming, because they change how a match plays:

- **Serve targets moved** to `[58, 70]` / `[30, 42]` from `[58, 92]` / `[10, 40]`.
  With an honest strike zone the old serves were unreturnable — they landed
  past the service line, which is a fault in real tennis anyway.
- **The receiver stands at 66 / 34**, not 80 / 20, for the same reason.
- **Groundstroke impact poses were lowered.** After a serve bounces the ball
  peaks at y ≈ 6.9 (measured `|vy| ≈ 153` against the 178 needed to reach the
  old chest-height impact), so no groundstroke could reach it.

These were forced by the sync fix, not chosen as balance work. E should look
here first if the opening of a match feels different.

## 3. How to run it

```bash
cd /Users/edwardhwang/Desktop/Edward_world-sg-a
npm run lint && npm run typecheck && npm test && npm run build
npx vitest run tests/tennis-anchor.test.ts tests/tennis-swings.test.ts tests/tennis-schedule.test.ts
npm run dev -- --port 3011      # then: title → ENTER → SKIP → SPORTSGANG → TENNIS → ACCEPT → PRESS ENTER TO PLAY
```

Move with A/D, swing with Enter or Space, or use the on-screen buttons. The
match is still first to 5, and restart still works.

The debug overlay is behind the `debug` prop on `TennisGame`, defaulting to
`false`. It shows ball centre, racket anchor, hit region, shot type, phase and
simulation tick. It is **not reachable in production**: nothing passes `debug`,
so the overlay markup is never rendered and its styles are never triggered.

## 4. PASS / FAIL / NOT_RUN

| Check | Result | Evidence |
|---|---|---|
| `npm run lint` | **PASS** | 0 problems, `--max-warnings 0` |
| `npm run typecheck` | **PASS** | `tsc --noEmit`, exit 0 |
| `npm test` | **PASS** | 498 tests across 33 files — 30 pre-existing, 3 new. No pre-existing test file was edited. |
| `npm run build` | **PASS** | exit 0 |
| Determinism 30/60/120 Hz + irregular | **PASS** | `tennis-schedule.test.ts`. Tolerance: **0 — bit-exact** `toEqual` on a 17-field signature including the contact list. |
| One contact event per collision | **PASS** | `tennis-swings.test.ts`; reflection, spark and verdict all read `lastContact`. |
| Contact inside the racket's own box | **PASS** | asserted at `STRIKE_HALF_X + drift` / `STRIKE_HALF_Y + 0.5`, not a loose tolerance |
| Contact inside the declared timing window | **PASS** | asserted against `SWING_SPEC[kind].windowStart/End` |
| Five swings genuinely distinct | **PASS** | ≥5 monotonic key poses each, ≥4 distinct durations and paces |
| All five occur in ordinary play | **PASS** | `tennis-swings.test.ts`, six positioning biases |
| No mash-to-win | **PASS** | a swing cannot be restarted mid-flight; cooldown enforced |
| Difficulty not spiked | **PASS** | an idle player still loses, and still concedes ≤ 2 points |
| Visual sync, in-app | **PASS** | four real browser frames: the ball reverses direction exactly at the strike frame, on the strings, `verdict=PERFECT` |
| Per-tick contact strip | **PASS** | `evidence/tennis-contact-ticks.svg` |
| **Normal-speed video** | **NOT_RUN** | no encoder on this machine — `ffmpeg` is not installed. Frames stand in for it. |
| **Debug overlay captured in-app** | **NOT_RUN** | the overlay is implemented and defaults off, but turning it on in the running app means passing `debug` from `sportsgang-experience.tsx`, which OWNERSHIP assigns to **Session D**. See §6. |

The visual PASS above rests on browser frames and the per-tick strip, **not on
unit tests**. Where a visual check could not be performed it is NOT_RUN, not
PASS.

### The evidence

`docs/sportsgang-polish/evidence/` (104 KB):

- `tennis-contact-ticks.svg` — seven cells, **one simulation tick each**, around
  a real contact. Ball, racket anchor, dashed strike zone, player, and per cell
  the tick, swing, progress and coordinates:

  | tick | swing | p | ball | anchor | \|dx\| | \|dy\| | |
  |---|---|---|---|---|---|---|---|
  | 336 | FOREHAND | 0.22 | (26.6, 7.2) | (27.0, 5.0) | 0.40 | 2.20 | |
  | 337 | FOREHAND | 0.28 | (26.0, 7.1) | (26.2, 5.4) | 0.20 | 1.70 | |
  | 338 | FOREHAND | 0.33 | (25.4, 6.9) | (25.4, 5.9) | 0.00 | 1.00 | |
  | 339 | FOREHAND | 0.39 | (25.4, 6.8) | (24.7, 6.4) | 0.70 | 0.40 | **HIT t=0.12 LATE** |
  | 340 | FOREHAND | 0.44 | (26.2, 9.0) | (24.1, 6.8) | — | — | departing |
  | 341 | FOREHAND | 0.50 | (27.1, 11.2) | (23.2, 8.0) | — | — | |
  | 342 | FOREHAND | 0.56 | (28.0, 13.2) | (22.4, 9.3) | — | — | |

  Contact at 0.70 / 0.40 from the anchor, against half-extents of 2.317 / 4.775
  — inside the box, not at its edge — and at progress 0.39, inside the
  FOREHAND window [0.34, 0.58].

- `tennis-rally-{before,contact,after}.png`, `tennis-serve-contact.png` — real
  frames from the running app at `localhost:3011`.

  A caution for whoever reads them: these were captured through a CDP
  screenshot round-trip, so **consecutive PNGs are many ticks apart, not one**.
  The `struck` flag persists for 0.12 s (~7 ticks), so the ball is already
  well away from the racket in the frame that still reports `struck=true`.
  Per-tick truth is in the SVG, not in the PNG sequence.

## 5. Advisor

Called four times: on the initial approach, twice during the diagnosis, and once
before this commit.

What it changed:

- It refused to accept a diagnosis argued from the source alone and required the
  desync be quantified from a running screen. That produced the 1.88× and
  30.96-units-per-step numbers in §1.
- During the "idle player concedes 4 points" regression it insisted on measuring
  each hypothesis instead of adjusting constants until the test passed. A
  `TIMING_ERROR` sweep from 0.55 to 0.05 changed nothing, which ruled out the
  obvious suspect and led to the real one: every extra point was ALEX failing to
  return a serve that had landed past the service line.
- On the final review it challenged the browser evidence directly — the
  `struck=true` frame with the ball 4 units outside the box — as a possible
  out-of-zone contact. Two candidate mechanisms were proposed. **Both were
  measured and disproved**: a prep-pose sweep is impossible for all five swings
  (the earliest live step is well past progress 0 in every case), and the PNG
  frames are many ticks apart. But the same review's third point was **correct
  and found a real defect** — see below.

**A defect the final review found.** `swingIsLive` tests the state at the *end*
of a step, so a window that opened part-way through a step let the whole step
count as live. Measured: hits registered up to **0.0275 progress** before the
window opened — about half a step of hit window that no constant declares and
no player can see. Exactly the kind of invisible widening the brief forbids.
Fixed by `sweptHitLive`, which clamps the sweep to the live sub-interval on both
rackets, and pinned by a test asserting every contact's progress lies inside
`SWING_SPEC[kind]`'s window.

The advisor's environment does not report a model identity, so the backing model
is recorded as unverified, exactly as `CONTRACT.md` records it.

## 6. Requests for shared changes

None were made unilaterally. Each of these needs the owner of the file.

**To Session D — one line, so the overlay can be seen.**
`components/sportsgang/minigames/tennis-game.tsx` accepts `debug?: boolean`,
default `false`. Passing it from `sportsgang-experience.tsx` behind a dev-only
condition (`process.env.NODE_ENV !== "production"` plus an opt-in flag) would
let E capture the overlay in-app. Nothing else is required, and with no change
the overlay simply stays off.

**To the foundation owner — delete a verbatim copy.**
`lib/pixel/sg-tennis.ts` contains a **verbatim copy** of `EDWARD_BODY`,
`OPPONENT_BODY`, their colour maps, `READY_LEGS` and `withReadyStance` from
`lib/pixel/sportsgang.ts`, because they are module-private there and that file
is frozen for this session. Exporting those five bindings would let the copy be
deleted outright. Until then the copy is a real duplication risk: an edit to the
originals will not reach tennis.

**To D / E — a superseded API is still exported.**
`judgeContact` and `SWING.REACH_X / PERFECT_X / GOOD_X` are dead in the
simulation, superseded by `judgeSwingTiming` and the `STRIKE` box. They are
retained *only* because `tests/minigames.test.ts` pins them and that file is not
owned by Session A. They now carry `@deprecated`. Whoever owns that test can
delete both together.

## 7. Unresolved

- **No video.** No encoder is installed. Frames and the tick strip stand in.
- **The overlay has never been seen on screen.** It is implemented, typed and
  styled, but every check on it so far is structural. It needs D's one line.
- **`selectSwing` runs `flightPreview` up to three times per call** (once per
  candidate swing, up to 120 iterations each), and ALEX calls it on every step
  he has no swing — roughly 500 iterations per step. At 60 Hz this is
  comfortable and was not optimised, but it is the first thing to look at if
  tennis ever shows up in a profile.
- **ALEX's AI was deliberately not rewritten**, per the brief. He gained
  arrival-time triggering and mirrored swing selection; his four difficulty
  numbers are untouched.
- **The strike box is axis-aligned** and does not rotate with the racket head.
  For a 4×5-pixel head at this scale the difference is under a pixel, so it was
  not worth the complexity — but that is the next honest refinement.
