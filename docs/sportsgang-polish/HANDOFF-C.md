# HANDOFF-C — the basketball, and running's controls

Branch `polish/sg-c-ball-running`, worktree `../Edward_world-sg-c`, port 3013.
Cut from `FOUNDATION_SHA = cdd593d6018fefbc0e3cbb6038bba9eda302a677`, verified
equal to `git rev-parse polish/sg-00-foundation`. **Not pushed, not merged, not
deployed.**

---

## 1 · What changed

### Part 1 — the basketball

The ball was a `div` 2% of the court wide with a background colour and an inset
shadow. At that size it is an orange dot; nothing about it says basketball.

New file **`lib/pixel/sg-ball.ts`** builds it from geometry. The four seams — two
through the middle, two bowing out to the sides, which is the pattern a real
ball has — are great circles on a unit sphere, given by their planes' normals.
Each spin phase rotates them about a fixed axis (Rodrigues), projects them
orthographically, and drops everything on the far hemisphere. Curvature and
occlusion therefore fall out of the model instead of being drawn in by hand,
which is what keeps the panels readable at every angle rather than only at the
one that was authored. 24 phases are baked at module load.

**SVG rather than `PixelCanvas`,** for the reason `sport-venue.tsx` already
gives for building the hoop out of elements: this layer gets scaled, and the
ball is the smallest thing in it — 27 CSS px on a desktop court, 15 on a phone.
A raster grid fine enough to carry a seam at 27px has no seam left at 15px,
where an art pixel falls below a CSS pixel. The evidence includes both sizes at
1:1 so this can be judged rather than taken on trust.

Also: the ball is now on screen **before** the shot, gathered in the player's
hands, so the court is never a basketball court with no basketball on it.

### Part 2 — running

Running had a throttle, not a control scheme: `up` nudged pace up, `down` nudged
it down, and the runner moved forward for ever whether or not anyone touched the
keyboard. The contract is now the one the brief specifies:

| Input | Does |
|---|---|
| `←` / `→` | Real movement along the track. Reverse input brakes, and the runner turns **only once stopped**. |
| `↑` / `↓` | Across the track's width, between lanes. Nothing else. |
| `S` held | Spurt: target pace rises from cruise to flat out while held, and costs what flat out has always cost. |
| `S` released | Straight back to cruise; recovery follows the existing rules. |
| nothing held | Target speed 0 — coasts to a stop. |
| `S` alone, standing | Nothing. No auto-advance, no stamina spent. |

`S` is on its own `sprint` channel via `RUNNING_KEY_MAP`, so steering while
spurting works and `S` no longer also means "down". `W`/`↑` no longer push.

Two properties are load-bearing and tested rather than assumed:

- **`distance` is a position on the forward axis, not a total.** Running back
  down the track subtracts; only reaching the far line finishes the race. 90
  seconds of pacing back and forth finishes nothing.
- **Lane movement never touches forward speed.** Weaving the full width the
  whole way covers exactly the same ground as running straight (asserted to 9
  decimal places), and a diagonal is no faster than a straight line.

Both games moved onto `useFixedStepGameLoop` with `onSuspend` wired to the
input's `clear`, and the PACER now reads `getPacerDistance(state.elapsed)` — the
simulation's own clock, so it cannot drift onto a second one.

### Files touched

```
lib/pixel/sg-ball.ts                                  new
lib/game/minigames/running.ts                         rewritten input, same body model
components/sportsgang/minigames/basketball-game.tsx
components/sportsgang/minigames/running-game.tsx
app/globals.css                                       two appended @owner:C blocks
tests/basketball-ball-art.test.ts                     new, 10 tests
tests/running-controls.test.ts                        new, 33 tests
tests/minigames.test.ts                               running block only — see REQUESTS C-1
tests/sportsgang-playthrough.test.ts                  running entry only — see REQUESTS C-2
docs/sportsgang-polish/{HANDOFF-C,REQUESTS}.md, evidence-c/
```

Nothing frozen was edited. No dependency added. No file belonging to A, B or D
was touched. `lib/game/minigames/basketball.ts` is **byte-for-byte unchanged**.

---

## 2 · Were the existing numbers preserved?

**Basketball: entirely.** `lib/game/minigames/basketball.ts` was not edited.
Charge speed, `IDEAL_RELEASE`, both scoring windows, the flight timing, the
judging and the scoring are the same code. The spin is read off `flight`, which
the simulation already computed, and decides nothing. The arc maths is
unchanged, and the spin lives *inside* the SVG rather than as a CSS rotate,
because the element carries the `translate(-50%, 50%)` that puts the ball centre
at the element's centre — composing a rotation onto that transform would move
the point the arc, the ring and the judging are measured against.

**Running: the body model is preserved; the input model is the thing that
changed, which is what was asked for.**

| Constant | Before | After | |
|---|---|---|---|
| `RACE_METRES` | 200 | 200 | kept |
| `CRUISE_PACE` | 0.62 | 0.62 | kept |
| `TOP_SPEED_MPS` | 10 | 10 | kept |
| `DRAIN_RATE` | 0.8 | 0.8 | kept |
| `DRAIN_CURVE` | 3 | 3 | kept |
| `RECOVER_RATE` | 0.2 | 0.2 | kept |
| `EXHAUSTED_PACE` | 0.28 | 0.28 | kept |
| `RECOVERY_THRESHOLD` | 0.45 | 0.45 | kept |
| exhaustion latch | `stamina <= 0.001` | same | kept |
| `SET_SECONDS` / `FINISH_SECONDS` | 0.9 / 1.2 | same | kept |
| `getStaminaRate` | quadratic above cruise, linear below | identical function | kept |
| `PACE_STEP` | 0.62 — throttle step | 0.62 — acceleration toward target | **repurposed, same value** |
| pace ceiling | 1 (clamp) | 1 (`SPRINT_PACE`) | **same number, new name** |
| pace floor | 0.15 (clamp) | 0 when nothing is held | **changed** |
| braking | — | `BRAKE_STEP = 2 × PACE_STEP` | **new** |
| lane | — | `LANE_SPEED 1.6`, `LANE_LIMIT ±1` | **new** |

Only two numbers really moved. The floor went from 0.15 to 0, because "nothing
held means stopped" is the brief. Braking is twice acceleration so a wrong turn
is recoverable inside the length of the track rather than costing a three-second
arc — it is still a cost, because you must reach zero before you turn.

**Stamina was not quietly made infinite.** Recovery still requires going *below*
cruise, which means letting go of the direction and losing ground; cruise itself
neither drains nor refills, exactly as before. Flat out from the gun still
empties the tank in under six seconds and still drops the legs to the 0.28
stagger until stamina climbs back past 0.45. `tests/running-controls.test.ts`
pins `getStaminaRate(1)` and `getStaminaRate(0)` to their exact values so a
later tuning pass has to be deliberate about it.

---

## 3 · Tests

Automated, run in this worktree on Node v24.19.0:

| Gate | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS — **493 tests / 32 files** |
| `npm run build` | PASS — 10 routes |

Baseline in this worktree before any change was **450 / 30**, so the pass adds
43 tests and no coverage was lost. `tests/sportsgang-foundation.test.ts` (the
contract suite) passes **unedited**.

New: `tests/basketball-ball-art.test.ts` (10) asserts four seams at every phase,
every point inside the silhouette, at most ~60% of each circle drawn (the proof
the far side is culled rather than the seams being a flat decal), the side seams
bowing out and mirroring, the two middle seams passing through the centre when
still, consecutive phases differing, a full turn returning to the start, frame
wrapping in both directions, a square centred box, and the seam/panel contrast.

New: `tests/running-controls.test.ts` (33) covers movement, coasting, braking
and turning, both directions at once, the start-line boundary, lane movement and
clamping, lane-does-not-advance, no diagonal bonus, spurt speed and cost,
standing + `S`, release and recovery, exhaustion enter/exit with hysteresis,
short taps, auto-repeat equivalence, no stuck pace, finish only on the forward
axis, back-and-forth finishing nothing, replay determinism, and the pacer.

**Automated tests and on-screen checks are reported separately** — everything in
§4 was done by driving the real page, not by asserting in Node.

---

## 4 · On-screen verification

Dev server `npm run dev -- --port 3013`; Chrome via the devtools MCP; desktop
**1440×900** and mobile **390×844 (DPR 3, touch, CDP device emulation** — a
plain window resize floors at 500px wide and would not have been a phone).
Screenshots in `docs/sportsgang-polish/evidence-c/`.

### Basketball

| Check | Result |
|---|---|
| Reads as a basketball unaided, desktop | PASS — `basketball-desktop-detail-at-rest-27px.png` |
| Reads as a basketball unaided, mobile | PASS — `…mobile-detail-at-rest-15px.png`, all four seams survive at 15px |
| Panels readable while spinning | PASS — `…detail-in-flight-27px.png`: seams turned, shading still lit from the upper left |
| At rest / in flight / at the rim | PASS — three desktop captures |
| Size against the hoop | desktop ball 27px vs ring 51.8px = **1.92**; a real ball-to-rim is 1.88 |
| Mobile size floor | ball 15px vs ring 20.7px = 1.38 — the `clamp()` floor engages below ~500px of court, deliberately |
| Aspect ratio fixed | PASS — measured `width === height` exactly at both viewports; no ellipse |
| Shot behaviour unchanged | PASS — a full session played to **3 / 3 made**, three shots, scoring and RESULT panel correct |
| Other sports' balls | untouched — sizing is scoped to `.sg-ball`, which only basketball carries |

### Running

Measured off the live gauges and the runner's inline position.

| Check | Result |
|---|---|
| Right / left movement | PASS — pace 62%, position advancing / retreating |
| Up-down lane movement | PASS — runner `bottom` 22% → 28%, forward pace unchanged |
| Boundary | PASS — backing into the start line stops at 0 and drops pace to 0 |
| Diagonal gives no bonus | PASS — pace 62% with and without a lane key held |
| Distance / finish on the forward axis | PASS — finished 200 M, result `2:13.1` |
| Move + `S` vs move alone | PASS — 62% / stamina 100% → 100% / stamina falling |
| `S` release recovers | PASS — back to 62%, stamina climbing once below cruise |
| Exhaustion enter and exit | PASS — "STAMINA LOW", then "EMPTY — LEGS GONE", pace capped 28%, still capped at 25% stamina, released at 45% |
| Standing + `S` | PASS — pace 0%, stamina stays 100%, no advance |
| Opposite arrows together | PASS — pace 0%, heading unchanged |
| Very short tap | PASS — no lasting movement, nothing stuck |
| Key auto-repeat | PASS — 10 repeat events over a held key: one continuous hold |
| Long hold | PASS — held to exhaustion and to the finish |
| Keyboard + touch together | PASS — same channel held by both, **lifting the finger left the key running** |
| Move + spurt multi-touch | PASS — pace 100%, stamina falling; lifting only the spurt dropped to 62% and kept moving |
| Pointer cancel / lost capture | PASS — `pointercancel` brought the runner to rest, no stuck key |
| Focus loss / tab away and back | PASS — hidden mid-sprint with keys still down: coasted to a stop, and on return pace 0%, position unmoved, nothing queued fired |
| PACER on the same clock | PASS — scripted from `elapsed`, clamps at the line, did not jump on return |
| Nickname / IME | PASS **against a fixture** — see below |
| Finish and restart | PASS — replay starts at 0%, 100%, 200 M, position 8% |
| Other-sport regression | PASS — golf played through with Space; `S` inert there, prompt unchanged |
| Mobile controls | four-way pad + held SPRINT, keys 58×45px (above the 44px target) |
| HUD, hints, `aria-label`s | updated to the real controls; SPRINT reflects `aria-pressed` |

Console during play: clean apart from a pre-existing `/favicon.ico` 404 and the
`setPointerCapture` error the harness itself provoked (REQUESTS C-3).

**A layout defect was found on screen and fixed.** On a phone an existing rule
moves the whole HUD from above the court to below it; the three-row pad made the
HUD 274px tall and pushed 73px of it — the `↓` key and the hint — off the bottom
of a 390×844 screen. The pad now flattens to one row `← ↑ ↓ →` under 640px. HUD
bottom is now 839px against an 844px viewport. Fixed in C's own CSS block only.

### NOT_RUN

- **Real multi-touch on a real touchscreen.** Verified with synthetic
  `PointerEvent`s, which required stubbing `setPointerCapture` (REQUESTS C-3) —
  so the *channel* logic is proven and the *capture* path is not. Worth one pass
  on a physical phone.
- **The real nickname box** — it does not exist yet; D owns it. Verified against
  an injected `<input>` fixture instead: `S`, all four arrows and `Enter` reached
  the field, the game did not move, and an IME composition (`keyCode 229`,
  `isComposing`) was ignored. Re-check when the real box lands (REQUESTS C-4).
- **Tennis and AFL/Wardrobe/House/intro/BGM/visitor regression passes** — golf
  and basketball were played through; the rest were not, and C touched no file
  they use.
- **Reduced-motion and landscape-phone layouts** for the new pad.

---

## 5 · Advisor

Run via the configured `advisor` tool, once before committing to an approach.
Per CONTRACT.md the tool takes no model parameter and reports no model identity,
so **the backing model could not be verified from this environment**; the brief
names Fable 5.1, recorded as intent, not as a verified fact. Not ADVISOR_NOT_RUN
— the tool ran.

What it changed:

- **It caught that `tests/sportsgang-playthrough.test.ts` would break**, which I
  had wrongly assumed was safe because it drives the simulations directly — that
  is exactly why it was not safe. It told me to read it before the design set.
  It drove running with action-key taps and would have hung on `MAX_TICKS`.
- Told me to measure the real test baseline first, because the docs disagree
  (BASELINE says 391/29, QUALITY_GATES 450/30, RUNBOOK 433/30). The truth in
  this worktree is **450 / 30**.
- Recommended the surgical-edit-plus-REQUESTS route over handing D red gates.
- Suggested exporting `getPacerDistance` so the pacer is provably on the
  simulation clock and testable. Adopted.
- Suggested keeping `.sg-play__ball` on the wrapper for position and the
  centring transform and scoping only sizing to a new class. Adopted — this is
  what keeps the physics centre and the other sports' balls untouched.
- Warned that the shared MCP Chrome profile might be held by another session and
  to record `NOT_RUN` rather than fabricate. It was free.

I did not take its suggestion of a `PixelCanvas` raster ball; the size analysis
(15px on a phone, below one CSS pixel per art pixel) pointed to SVG, and
`sport-venue.tsx` already sets that precedent for this layer. Recorded here
because it is a deliberate departure.

---

## 6 · Shared-change requests

All in `docs/sportsgang-polish/REQUESTS.md`:

- **C-1** — `tests/minigames.test.ts`, running block: **already edited**, needs D
  to ratify or revert. Inputs only; every assertion unchanged.
- **C-2** — `tests/sportsgang-playthrough.test.ts`, running entry: **already
  edited**, same standing.
- **C-3** — request: wrap `setPointerCapture` in a `try`/`catch` in the frozen
  `use-minigame-input.ts`. Nothing in C is blocked by it.
- **C-4** — note: re-run the nickname/IME check against the real box when D
  builds it.

C-1 and C-2 are the only places this session went outside its ownership list,
both confined to running's own tests, both because the brief's control contract
made the old inputs meaningless.

---

## 7 · Commits

On `polish/sg-c-ball-running`, from `cdd593d`:

| SHA | |
|---|---|
| `077b37d` | `feat: make the basketball look like a basketball` |
| `efd65b4` | `feat: give running an input that means something` |
| *(this one)* | `fix: keep the running pad on screen on a phone` + docs and evidence |

Nothing pushed. `main` untouched, still at `4c75644`; the canonical checkout was
never checked out onto another branch and still has exactly its four
pre-existing untracked items. The `next dev` on port 3004 was left running.
