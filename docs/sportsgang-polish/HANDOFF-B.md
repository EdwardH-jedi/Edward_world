# HANDOFF-B — one hole of golf

Branch `polish/sg-b-golf`, worktree `/Users/edwardhwang/Desktop/Edward_world-sg-b`,
cut from FOUNDATION_SHA `cdd593d6018fefbc0e3cbb6038bba9eda302a677`
(tip of `polish/sg-00-foundation`). Not pushed, not merged, not deployed.

## What changed

The golf mini-game was one drive: stop two bars, get a carry number, done. It
is now one hole you can finish.

| | Before | After |
|---|---|---|
| Scope | a single tee shot | tee to the bottom of the cup |
| Distance | `carry`, counted up from 0 | measured between two points |
| Clubs | one | driver / approach / putter, by lie and range |
| Ending | the ball lands | holed, shot cap, or conceded |
| Score | metres | strokes, penalties included |
| Clock | `useGameLoop` (variable delta) | `useFixedStepGameLoop` (60 Hz fixed) |
| Character | one racket pose | six posed swing stages with a club arc |

### Files B owns and changed

```
lib/game/minigames/golf-course.ts          new — the course, and the projection
lib/game/minigames/golf-hole.ts            new — the simulation
lib/pixel/sg-golf.ts                       new — the swing and the flag
components/sportsgang/minigames/golf-game.tsx   rewritten
app/globals.css                            appended `.sg-golf-*` block only
tests/golf-course.test.ts                  new — 18 tests
tests/golf-hole.test.ts                    new — 31 tests
tests/golf-art.test.ts                     new — 13 tests
tests/golf-component.test.ts               new — 13 tests
docs/sportsgang-polish/REQUESTS.md          new
docs/sportsgang-polish/HANDOFF-B.md         this file
docs/sportsgang-polish/evidence/golf/       screenshots and the completion GIF
```

`lib/game/minigames/golf.ts` — the old drive — is **untouched**, on purpose.
See "Unresolved" below.

`app/globals.css` is **407 insertions and zero deletions**
(`git diff --stat` on the commit); no existing rule was edited, and the block
is fenced with `/* @owner:B golf */ … /* @end B */`.

Nothing outside that list was touched. No file on the frozen list was edited,
no dependency was added, `package.json` and `package-lock.json` are unchanged.

## The course, and what it does and does not claim

`lib/game/minigames/golf-course.ts` is the single configuration file.
**Every number in it is a game design value.** Nothing reproduces a real
course, a real ball, or the Rules of Golf, and the file says so at the top.
What it does guarantee is that the numbers shown to the player are the numbers
the simulation ran on.

```
courseId              "sg-meadow-hole-1"
rulesVersion          "golf-1h-2026-09-1"   (imported from golf-result.ts)
holeM 300 · par 4 · maxShots 8 · outOfBoundsPenalty 1
outOfBoundsRule       "stroke-and-distance"
fairway               20–285 m, ±18 m wide      green  radius 16 m
out of bounds         beyond ±40 m, behind −10 m, past 360 m
hole                  radius 0.60 m, captured at ≤ 3.0 m/s
approachRange         160 m  (further out, the driver comes back out)
friction m/s²         tee 6.5 · fairway 6.5 · rough 11 · green 2.3 · out 9
drag 0.0013 /m · gravity 9.81 m/s² · rest speed 0.15 m/s
```

Clubs — speed at full power and a centred strike, then loft, face error and
how much landing speed survives the bounce:

```
DRIVER    55.0 m/s · 27° · ±9° · 0.45     ≈ 225 m at full power off the tee
APPROACH  39.0 m/s · 34° · ±7° · 0.30     ≈ 131 m
PUTTER     9.4 m/s ·  0° · ±3° · 1.00     ≈  19 m on the green
```

Swing and shot tuning (`GOLF_SWING`, `GOLF_TUNING` in `golf-hole.ts`):

```
backswing 0.46 s · downswing 0.42 s · impact at 0.88 s
impact dwell 1/30 s · follow-through 0.45 s
power bar 0.95 bar-widths/s · minimum power 0.05
strike loss 0.42 × |contact| · no-contact strike 0.35 with full face error
aim ±20°, 14°/s · lie speed: fairway 1.00, rough 0.82
shot-end dwell 1.0 s · holed dwell 1.4 s · camera ease 4/s · shake decay 0.25 s
```

### Metres in, percentages out — in one place

`xPercent`, `heightPercent`, `depthPercent`, `mapPercent` and `cameraSpanFor`
are the only conversion from the world to the screen, and **they take no
viewport, no pixel size and no element**. A test asserts their arity and
round-trips `xPercent`; another asserts the component contains no
`innerWidth` / `getBoundingClientRect` / `devicePixelRatio` and never writes
the hole length down a second time.

Measured in the browser at two sizes, mid-hole, same moment:

```
1440×900   TO HOLE 300 M   ball at 5.882 % across the play box
 390×844   TO HOLE 300 M   ball at 5.879 %
```

Ground position (`x`), sideways error (`y`) and flight height (`z`) are three
separate axes with three separate projections. The camera reaches none of the
rules.

## The flow

```
AIM → POWER → SWING → IMPACT → FLIGHT → ROLL → SHOT_END → AIM (next shot)
                                                        ↘ HOLED → RESULT
                                          shot cap / concede ↗
```

`done` is `phase === "RESULT"`, and `advanceGolfHole` on a finished hole
returns **the same object**, so the host cannot bank a run twice.

- **The ball leaves at IMPACT and only there.** `IMPACT` is a phase entered
  when the club head arrives, not a flag. `impactCount` is asserted to be
  exactly 1 per shot, and evidence frame `06-swing-impact.png` is the impact
  frame: the ball is still on the tee, `TO HOLE 300 M`, and the stroke is
  already counted.
- **The swing clock keeps running through FLIGHT**, which is what plays the
  follow-through over the ball's flight rather than after it.
- **No input is never rewarded.** A player who never presses the second button
  gets `noContactStrike` — a fixed bad number, not whatever the bar happened
  to be showing, which would sometimes have been a free perfect strike.
- **The cup needs two conditions**: the ball's path this step passed within
  0.6 m of the centre *and* it was travelling at ≤ 3.0 m/s. A putt struck too
  hard crosses the hole and the distance goes back up.
- **Out of bounds** is stroke and distance: `penaltyStrokes + 1` and the ball
  returns to where the shot was played from. Both halves, or it is not the
  rule it claims to be.
- **The shot cap and conceding are endings, not wins.** Both report
  `status: "abandoned"`, and the panel says `RUN ABANDONED`. Conceding while
  the ball is already in the cup reports `completed` — that one was an advisor
  catch.

## HUD

`PLAYER` (name or `GUEST`) · `HOLE 1 · 300 M · PAR 4` · `SHOT` ·
`TOTAL STROKES` · `TO HOLE` · `LAST SHOT` · `CLUB` · `RANGE` · the power or
contact bar · the prompt · the next key. A course map is always on, seen from
above, because sideways error is the one thing a side-on view cannot show.

`SHOT` is `nextShotNumber(state)` before the ball is struck and `shotCount`
after — never derived from `totalStrokes`, because a penalty raises the score
without handing out another ball. Verified live: after an out-of-bounds drive,
`SHOT 1` and `TOTAL STROKES 2` on screen at the same time.

Data is kept exact; only the display rounds.

## Contract use

- `useMinigameInput(active)` — `consume`, `bind("left"/"right"/"action")`,
  `clear`. Keys are `event.code`; `bind` gives touch a real path in.
- `useFixedStepGameLoop(active, consume, step, { onSuspend: clear })` — the
  clock and the input source suspend at the same moment.
- `stepper.markRunStart()` on mount; `elapsedSimulationMs` is
  `stepper.elapsedSinceRunStartMs`, never a wall clock and never `elapsedMs`.
- `createGolfRunResult(draftGolfRun(...))` → `onFinish(toSportResult(run))`
  **and** `onGolfRun?.(run)`, once, through one effect keyed on `done`.
- `runId` is `crypto.randomUUID()` in the component. The simulation has no
  clock, no randomness and no storage — enforced by the foundation's purity
  test, which reads every file in `lib/game/minigames/`.
- Art: new file `lib/pixel/sg-golf.ts`; `lib/pixel/sportsgang.ts` untouched.
- CSS: appended `.sg-golf-*` block, prefix ownership respected.

## Tests

`npm run lint` · `npm run typecheck` · `npm test` · `npm run build` — all pass.

```
baseline at FOUNDATION_SHA   450 tests / 30 files
now                          525 tests / 34 files      (+75 golf tests, +4 files)
  golf-course 18 · golf-hole 31 · golf-art 13 · golf-component 13
build                        compiles, 10 routes
```

The foundation's 59 contract tests and the two frozen golf suites pass
**unedited**.

One deviation worth recording: `lib/pixel/sg-golf.ts` was written before its
tests, unlike every other file here. Rather than claim a red-green cycle that
did not happen, the tests were verified by mutation — freezing the body so
only the arm and club move, which is the shortcut the brief rules out. The
first version of `moves the whole body, not one arm` **passed** that mutation,
because the club's shaft crossed the rows it was reading; keyed on colour
instead, it fails as it should. The mutation and the restore are in the
session log, and the fix is in `e838079`.

Golf tests, mapped to the brief's checklist:

| Asked for | Where |
|---|---|
| same input, same result | `is identical run to run from identical input` (deep equality of the whole final state) |
| power and timing matter | `sends the ball further the harder it is struck`, `costs distance and line when the face is not square`, `punishes not swinging at all` |
| every state transition | `walks the whole state flow in order` (asserts the ordered phase list) |
| one IMPACT | `fires exactly one impact per shot`, `holds the ball on the tee until the impact event` |
| no duplicate count or callback | `refuses to advance once it has reported itself` (same reference back) |
| distance rises after overshoot | `will not hole a ball that crosses the cup at speed`, `counts distance back up once the ball is past the hole` |
| approach and putting switch | `changes club as the hole gets shorter, with no menu to open` |
| rest, roll, capture speed | `stops, rather than rolling for ever…`, `drops a ball that reaches the cup slowly`, `will not hole a ball that merely finishes near the cup` |
| out of bounds, cap, concede | `records a penalty for going out…`, `stops at the shot cap…`, `can be conceded part way…` |
| render schedule independence | `reaches the same state at 60, 30, 20 and 12 frames a second` |
| same metres on any screen | `takes no pixels…` plus the browser measurement above |
| the club meets the ball | `puts the impact pose's club head exactly on the stated anchor` plus the browser measurement below |

**On "same seed":** there is no seed, because there is no random source
anywhere in `lib/game/minigames/` — the foundation's purity test fails the
build if one appears. Determinism is tested as identical input giving an
identical final state, twice over, and confirmed in the browser: two separate
scripted runs both returned `HOLED OUT · 3 STROKES · longest drive 211 M`.

## Browser verification — RUN

Chrome 1440×900 and 390×844 against `next dev` on port 3012, driven over CDP.

> The `chrome-devtools-mcp` profile was held by another session and the
> `claude-in-chrome` extension was not connected, so rather than disturb
> either, Chrome was launched with its own profile on its own debugging port.
> Nothing else on the machine was touched.

| Check | Result |
|---|---|
| Tee to holed out, **keyboard** (real CDP key events) | PASS — `HOLED OUT · 3 STROKES · longest drive 222 M` |
| Tee to holed out, **mobile touch** (390×844, real touch events) | PASS — `HOLED OUT · 3 STROKES · longest drive 218 M` |
| Club auto-switch with no menu | PASS — DRIVER → APPROACH → PUTTER |
| Distance rises after running past the cup | PASS — `TO HOLE` read 1 → 2 → 3 → 4 → 5 → 6 M as the ball rolled past |
| Out of bounds | PASS — `OUT OF BOUNDS · +1 PENALTY`, `SHOT 1` beside `TOTAL STROKES 2`, `TO HOLE` back to 300 M |
| Concede | PASS — `RUN ABANDONED`, not a score |
| Tab away mid-play and return | PASS — phase, shot and distance unchanged, nothing queued fired |
| Same metres at 1440×900 and 390×844 | PASS — 300 M and 5.882 % vs 5.879 % |
| Club head on the ball at impact | PASS — measured: club-head anchor (322.94, 564.45), ball centre (322.94, 564.45) |
| Six distinguishable swing poses | PASS — all six captured live, matched by timestamp |
| Determinism | PASS — two runs, identical result |
| Reduced motion changes the shake and nothing else | PASS — see below |

Evidence in `docs/sportsgang-polish/evidence/golf/`, including
`golf-hole-completion.gif` — a full tee-to-cup completion, 150 frames sampled
from a live screencast of the run, played back faster than real time.

`10-close-follow-through.png` is named for what it shows: the close crop
intended for impact raced past the 33 ms impact window. The true impact frame
is `06-swing-impact.png`, matched to the pose by timestamp.

### Reduced motion, run as a controlled pair

Same scripted player, same hole, once with
`prefers-reduced-motion: reduce` emulated from before the page loaded and once
without:

```
reduce   matchMedia true    play-layer transform: none, for the whole run
control  matchMedia false   transform shakes 3px → 0 after each strike
both     RUN ABANDONED · 11 STROKES · longest drive 205 M · 27 M SHORT
```

The identical result is the point: the shake is the only thing that changed.
The power bar, the contact window, the strike and the score are the same game
either way. (That run reached the shot cap rather than holing out — the
scripted player used a fixed full power instead of reading the range — so it
also exercises the cap and out-of-bounds paths end to end.)

**Not verified:** audio, and any browser other than Chrome.

## Advisor

Three reviews. Per CONTRACT.md the tool reports no model identity, so the
backing model **could not be verified from this environment** — the brief
names Fable 5.1 and that is recorded as intent, not as fact. All edits, git
operations and gate runs were done by the primary executor.

1. **Before implementation.** Put the hole in new `golf-*` files rather than
   editing `golf.ts`, so the frozen tests stay green unedited. Do not emit an
   abandoned run on unmount — React StrictMode would fire a phantom run on
   every play in dev — add an explicit CONCEDE control instead. Give "never
   pressed" its own constant so it is distinguishable from the worst possible
   press. All three taken.
2. **After the simulation passed its own tests.** Found that `rollRetention`
   was applied inside `estimateShotDistanceM` and nowhere else, so a driver
   that landed at 204 m ran out to **299 m** while the HUD's `RANGE` said
   219 m. Confirmed by a test written first (298.9 m against an advertised
   218.8 m), then fixed by moving the bounce into `stepBallMotion`, the one
   place a ball lands. Also caught that conceding while the ball was already
   in the cup reported `abandoned`. Both fixed in `fa6618f`.
3. **Before handover** (this document).

## Unresolved

1. **The venue draws a second flag and two spectators over the hole.**
   `sport-venue.tsx` is frozen and `sportsgang-experience.tsx` is D's, so B
   could not fix it. Visible in `06-swing-impact.png`. Full request, with the
   exact change, in REQUESTS.md **B-1**. This is the one thing that most needs
   doing before anyone would call the hole finished.
2. **`lib/game/minigames/golf.ts` still exists** and still backs the two
   frozen golf suites. Retargeting them at the hole and deleting the old drive
   is REQUESTS.md **B-2**, for D once integrated. QUALITY_GATES.md says to
   escalate rather than edit a contract test, so B did not.
3. **A putt of more than ~19 m cannot reach the cup** — the putter's full
   range. A ball that finishes on the far edge of a 16 m-radius green is
   reachable; one that finishes 19 m away across the green needs two putts.
   That is the intended shape of the hole rather than a defect, but it has not
   been play-tested by a person.
4. **Difficulty is untuned by a human.** The scripted player holes out in 3
   from a perfect strike every time; nobody has played it by hand to say
   whether the 0.42 s contact window is fair.
5. **No audio.** The BGM engine is out of scope and untouched; there is no
   sound on the strike.

## D integration points

Two lines, at `components/sportsgang/sportsgang-experience.tsx:364`:

```tsx
<Minigame
  active
  onFinish={finishPlay}
  onGolfRun={handleGolfRun}                 // GolfRunResultV1 → wherever D sends it
  playerDisplayName={nickname ?? undefined} // absent is fine; B stamps GUEST
/>
```

Both props are already optional on `MinigameProps` and already wired inside
`golf-game.tsx`, so the call site compiles unchanged today and every run is
correctly stamped `GUEST` until D supplies a name.

What D receives, once per run, exactly once:

```ts
{ version: 1, runId, courseId: "sg-meadow-hole-1",
  rulesVersion: "golf-1h-2026-09-1",
  status: "completed" | "abandoned",
  shotCount, penaltyStrokes, totalStrokes,   // totalStrokes is derived
  elapsedSimulationMs,                        // stepper run clock, not wall clock
  remainingDistanceM,                         // 0 when holed
  longestDriveM, playerDisplayName,
  shotLog: [{ index, atSimulationMs, carryM, penalty }] }
```

`shotLog[].carryM` is the ground distance the shot finished from where it was
struck — carry plus roll, which is the same number the HUD shows as
`LAST SHOT`. A server can re-derive `totalStrokes` from the log rather than
trust it; `isGolfRunResultV1` is the gate for anything coming back over the
network.

B writes nothing to storage and makes no network call. Ranking is
lower-is-better on `totalStrokes` — the opposite direction from the old
carry-distance drive, which is why the hole needed its own contract.

## Commits

```
485a1ff  feat(golf): simulate one hole instead of one drive
fa6618f  fix(golf): bounce the ball in play, not only in the estimate
e838079  feat(golf): draw the swing as a body turning, not an arm rotating
6d69998  feat(golf): play the hole on screen, on the SportsGang clock
f92f2f5  docs(golf): hand over the hole with its evidence
```

Five commits on `polish/sg-b-golf`, all golf-only. Nothing pushed, nothing
merged to `main`, nothing deployed.
