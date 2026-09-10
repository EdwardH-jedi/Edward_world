# Basketball backboard, and tennis feel

The last narrow gameplay pass before deployment. Two things the owner found by
playing the build: the basketball went through the backboard or stuck to it,
and tennis was too hard with a bounce too flat to play off.

Nothing else was touched. Not pushed, not deployed.

| | |
|---|---|
| Repository | `/Users/edwardhwang/Desktop/Edward_world` |
| Branch | `fix/sg-final-basketball-tennis`, from `main` at `cfc849a` |
| Working tree at start | clean, apart from four pre-existing untracked items, all preserved |
| Node / npm | v24.19.0 (`/opt/homebrew/opt/node@24/bin`), 11.17.0 |
| Verified on | the existing dev server on `:3000`, Chrome 152, 1440×900 DPR 2 |

Three dev servers were already running from this checkout when the pass began
(`:3000`, `:3001`, `:3004`). None was stopped; Next refuses a second server for
the same project, so verification used the one on `:3000`, which serves this
same working tree.

---

## Basketball

### Root cause

**There was no ball.** This is the whole explanation, and it is worth stating
plainly because it is not what either symptom sounds like.

The simulation carried `flight`, a number from 0 to 1, and `release`, the
charge the button came up at. The outcome was decided by `judgeRelease(release)`
**at the instant of release**, before anything moved. The component then drew a
curve:

```
ballLeft   = SHOOTER_X + flight * travel * (RING_X - SHOOTER_X)
ballBottom = RELEASE_HEIGHT + climb + sin(π * flight) * 38 * reach
```

with `travel = min(release / 0.62, 1.25)`.

- **"Passes straight through it."** The backboard was a `<div>` in the
  stylesheet. Nothing in the simulation knew it existed, so a shot with too
  much on it drew a curve whose horizontal extent ran to `20 + 1.25 × 64 = 100`
  — off the right-hand edge of the court, straight across where the board is
  drawn. It was not tunnelling; there was no collision to tunnel through.
- **"Becomes stuck around the backboard."** At `flight = 1` the curve ends, and
  the ball was left at that final coordinate for the whole `FEEDBACK` beat and
  again on `DONE`. For a long shot that coordinate is on or behind the board,
  so the ball parked there for a second before the next shot reset it.

### Changes

The ball is now simulated, in the court-percent coordinates the renderer
already used (`left%`, `bottom%`), so there is one coordinate model and the
drawn position *is* the judged position.

**Court geometry**, read off `app/globals.css` and re-verified in the browser
against the live DOM — the measured element boxes matched every number exactly:

| | value | source |
|---|---|---|
| `RIM_NEAR_X` | 84 | `.sg-court__ring` left edge |
| `RIM_Y` | 51.9 | ring `top: 35%` of the hoop box |
| `BACKBOARD_X` | 89.6 | `.sg-court__backboard` front face |
| `BACKBOARD_TOP` / `BOTTOM` | 64.32 / 48.68 | board `top: 8%`, `height: 34%` |
| `BALL_RX` / `BALL_RY` | 1.5 / 3.97 | `.sg-ball` at 3% of a 900 × 340 box |

**Collision.** A swept test, not an overlap: the segment from where the ball was
to where it is going is intersected with the plane at `BACKBOARD_X - BALL_RX`.
A shot at full charge covers about two board-widths in one 60Hz step and five
of those in a frame after a stall, so an end-of-step overlap test would miss it.

Three rules keep it from sticking:

- reflection only when `vx > 0`, so a ball already moving away is never turned
  round again;
- the ball is placed at the face on the frame it arrives, with a `SEPARATION`
  of 0.01 so the next step's crossing test cannot re-trigger;
- the board's collidable span stops at the **ring**, not at the board's drawn
  lower edge — a ball that has dropped through cannot come back out and strike
  the strip underneath, which was making every made shot register a board
  contact and leaving no shot able to be a swish.

`BACKBOARD_RESTITUTION = 0.88`. It has to be high: a shot with a little too much
meets the board just above the ring, has almost no height left to fall, and
drops in — the bank. One with far too much meets the board high and comes away
with enough speed to carry back past the near lip before it falls to ring
height, which is a miss. Lower and every overshoot banks in; higher and it is
gaining energy, which it must not.

**Scoring** is a downward crossing of `RIM_Y` with the ball's centre inside the
opening — between the ring's near lip and the board, both inset by the ball's
radius, so "it fitted through" is the actual test. Set once per shot. An upward
crossing never scores. Touching the board is not scoring; `SWISH` is a score
with no board contact and `SCORED` is one with it.

**Calibration.** The screen says *"let go in the band"*, and the band it draws
is `IDEAL_RELEASE ± 0.085`. That sentence has to be true, so `getShotReach`
became a power curve whose slope at the ideal release maps that band onto the
ring's opening. Measured, the range that scores is now

```
IDEAL_RELEASE − 0.086  →  IDEAL_RELEASE + 0.143      (drawn band: ±0.085)
```

so every release inside the drawn band goes in, and a release at the **top** of
it banks off the board — the owner's bank shot happens inside normal play
rather than as a trick. Releasing at ±0.3, or holding to the top of the meter,
still misses.

Against the old declared windows the short side is unchanged (−0.086 against
−0.085) and the long side is more forgiving (+0.143 against +0.085). That extra
room is the bank shot, and it is the direct consequence of the feature that was
asked for; it is not a general difficulty reduction. The release mechanic,
charge speed, meter, shot count and result panel are untouched.

`judgeRelease` and `getShotReach` are still exported and still do what their
tests say. `judgeRelease` is no longer the judge — the flight is — and it now
carries a comment saying so.

### Tests

`tests/basketball-bank.test.ts`, 17 tests. **PASS.**

| Required case | Where |
|---|---|
| direct clean make | "drops the ideal release cleanly through the ring" |
| backboard bank make | "counts a bank shot", "puts a bank shot inside that band" |
| board hit then miss | "does not count the board itself" |
| does not pass through the board | "never lets the ball past its face" (every release, 0→1) |
| large delta / tunnelling | "does not let a fast ball step over it in one go" — frames of 16.7, 50, 100 and 250 ms through the real `createFixedStepper` |
| does not stick | "does not trap the ball against itself" — exactly one contact, and the shot ends by landing |
| no repeated score | "scores one shot once, whatever the frame schedule" — five schedules |
| no score travelling upward | "never scores a ball travelling upward through the ring" |
| existing miss behaviour | `minigames.test.ts` "misses short when the player releases immediately", **unedited** |

`tests/minigames.test.ts`, `tests/sportsgang-playthrough.test.ts` and
`tests/qa-e-schedule.test.ts` cover basketball and were **not edited**. They
pass unchanged, which is the compatibility proof.

### Manual result — **PASS**

On `:3000`, driving the game one simulation tick at a time so each frame could
be read. Charged to 70.8% (inside the band, past the ideal):

```
… → (86.18, 54.59) → (88.09, 53.34) ← on the board face, face is 88.10
   → (86.01, 51.64) → (84.97, 50.72) → (83.93, 49.77) → …
   verdict SCORED · "SCORED OFF THE RIM" · MADE 1
```

Highest `x` reached across the flight was **88.09**, with the face at **88.10** —
never past it. (An earlier run of the same shot peaked at 87.70, before contact
resolution was changed to stop the ball *on* the face rather than a ball-width
short of it, so that the touch is visible on screen. Two runs, not a range.)
Evidence: `evidence/final-fix/bank-1-approach.png`, `bank-2-contact.png` (the
ball drawn against the board), `bank-3-rebound-through-ring.png`,
`bank-4-scored.png`.

One further change came out of watching it: the ball originally turned round
*before* reaching the face, because the remaining fraction of the contact step
was carried out with the new velocity and the ball was never drawn touching
anything. It now stops at the face for that frame. The measured make band is
identical either way.

---

## Tennis

Tuning only. **No logic changed** — the diff of `lib/game/minigames/tennis.ts`
is constants and comments.

### Old → new

| Constant | Old | New | Why |
|---|---|---|---|
| `PHYSICS.RESTITUTION` | 0.4 | **0.58** | The bounce. See below — this is the one the owner asked for. |
| `PHYSICS.BOUNCE_DRAG` | 0.86 | **0.9** | A lively bounce that immediately stops going forward is not reachable; this keeps it travelling into the strike zone. |
| `STRIKE.TOLERANCE_Y_ART` | 0.6 | **1.8** | Forced by the bounce. Raising the bounce **on its own made the game harder**, measured — the ball now arrives above where the racket was. Vertical half-reach 4.775 → 6.275. |
| `STRIKE.TOLERANCE_X_ART` | 1 | **1.5** | Small sideways forgiveness to go with it. Horizontal half-reach 2.317 → 2.553, still well under half the drawn sprite. |
| `SWING.ACTIVE_SECONDS` | 0.18 | **0.22** | A slightly longer live window. |
| `SWING.COOLDOWN_SECONDS` | 0.34 | **0.3** | Slightly quicker recovery between shots. |
| `MOVE.PLAYER_SPEED` | 46 | **52** | Enough to reach a ball placed wide without running the whole rally. |
| `RALLY_PACE.PER_SHOT` | 0.09 | **0.05** | Early exchanges accelerate about half as fast. |
| `RALLY_PACE.FLOOR` | 0.5 | **0.58** | A long rally is still quick, but no longer twice the opening speed. |
| `ALEX.REACTION_MIN` / `MAX` | 0.32 / 0.6 | **0.4 / 0.72** | He starts chasing a little later. |
| `ALEX.PREDICTION_ERROR` | 4.5 | **6** | His read of the bounce is a little worse. |
| `SWING_CHOICE.SMASH_MIN_Y` | 13 | **17** | Consequence of the bounce, and the one the brief predicted. At 13 an ordinary bounced groundstroke now qualified as an overhead and the volley stopped being selected. 17 sits above what a bounce reaches and below a lob. |

`ALEX.SHANK_CHANCE`, `REACH_X`, `REACH_BONUS`, `TIMING_ERROR`, `SHOT_SECONDS`
and `PLACEMENT_REACH` are **unchanged**: the goal was not an opponent who
misses.

### What the numbers say

Measured in the simulation, before and after, with the same policies.

**Bounce height.** The first bounce on the player's side, with nobody
interfering, peaks at:

| | apex, in simulation `y` |
|---|---|
| before | **5.93** (range 4.70 – 7.23) |
| after | **11.87** (range 9.91 – 12.75) |

The figure spans y 0–20 and the racket's contact height is 10.5. So the bounce
went from below knee height to **waist-to-chest**, which is the target the brief
set. On screen: the ball's rendered `bottom` peaks at 32–35% of the court with
the surface at 22%, i.e. around the middle of the player's body
(`evidence/final-fix/tennis-bounce-apex.png`).

**Playability**, from 20 matches against a deliberately imperfect player — one
that reacts 0.22 s late, chases where the ball *is* rather than where it will
land, and mistimes every press by a walking offset.

One thing to read honestly about this table: the proxy decides when to press by
reading the exported `STRIKE_HALF_X`/`STRIKE_HALF_Y`, so the *after* column also
has the benefit of the wider racket — the proxy was not held fixed while the
game changed under it. That is deliberate, because a proxy swinging at the old
reach would be modelling a racket the game no longer has, but it does mean the
gap below is the combined effect of the bounce and the reach rather than the
bounce alone:

| | before | after |
|---|---|---|
| points, player – ALEX (20 matches) | 100 – 80 | **97 – 47** |
| median rally | 3 | **5** |
| mean rally | 2.89 | **5.38** |
| rallies of 3–8 exchanges | 67% | **70%** |

**Guardrails**, all still holding:

- A player who never moves still loses **0 – 5**. The difficulty floor is intact.
- Contact quality stays meaningful and is not all PERFECT: over 12 matches the
  imperfect player got LATE 87, PERFECT 16, GOOD 10. If anything it errs the
  other way, which is the right direction.
- All five swings still occur in ordinary play, and were seen on screen in one
  browser match: FOREHAND 11, BACKHAND 12, SMASH 5, VOLLEY 1, SERVE 1.

### Manual result — **PASS**

A full match played in the browser on the manual clock finished 2 – 5 with a
**longest rally of 17**, against a median of 2–3 exchanges before the pass. The
five swing animations all appeared, the ball, its shadow and the contact spark
stayed together, and the serve still leaves the strings on the frame the racket
reaches it (the fix from the earlier QA pass, still pinned).

No invisible assistance was added. Nothing auto-hits; the reach is a larger
box, and it is the box the tests now assert.

---

## Regression

| Gate | Result |
|---|---|
| `npm run lint` | **PASS** — 0 problems, `--max-warnings 0` |
| `npm run typecheck` | **PASS** — `tsc --noEmit`, exit 0 |
| `npm test` | **PASS** — **714 tests / 46 files**. The baseline was measured, not inferred: `cfc849a` checked out in a throwaway worktree runs **697 / 45**. |
| `npm run build` | **PASS** — compiled, 11 routes |

### Three existing tests changed, and why

None was weakened to pass. Each is recorded here because changing a test to
accommodate a change is exactly the move that needs justifying.

1. **`tests/tennis-anchor.test.ts`** — re-pinned `STRIKE_HALF_X` / `STRIKE_HALF_Y`
   from 2.317 / 4.775 to 2.553 / 6.275. That test exists to catch the strike
   zone drifting silently; this pass moved it deliberately, so the pin moves
   with it. Its real assertion — that the zone is a racket and not a fifth of
   the court (`STRIKE_HALF_X < CANVAS_WIDTH_PCT / 2`) — is unchanged and still
   passes.

2. **`tests/qa-e2-tennis-rally-integrity.test.ts`** — "never leaves the ball
   inside the net's plane below the tape" gained a guard for a rally **reset**.
   The two failures it reported were not net crossings: both were a dead ball
   resting at `x ≈ −0.5` (out past the baseline) being replaced by the next
   point's serve at `(80, 10.5)`, which the crossing detector counted as the
   ball traversing the net plane. The invariant is about a travelling ball; a
   reset is now excluded, detected by the bounce count going back to zero. The
   simulation never moved a ball through the net.

3. **`tests/qa-e-tennis-serve.test.ts`** — its policy asked `timeToStrike` about
   a `2.4 × 5` box, a copy of the strike zone's dimensions from when the test
   was written. With the zone widened, that stale box made the policy decline
   volleys the visitor can plainly make, and the test reported that the volley
   had stopped occurring when it had not. It now uses the exported
   `STRIKE_HALF_X` / `STRIKE_HALF_Y`. The assertion — all five swings, in
   ordinary play — is unchanged.

---

## Changed files

| File | What |
|---|---|
| `lib/game/minigames/basketball.ts` | Ball physics, backboard collision, rim scoring, calibration |
| `components/sportsgang/minigames/basketball-game.tsx` | Reads the ball's position from the simulation instead of drawing its own curve |
| `lib/game/minigames/tennis.ts` | Tuning constants and their comments. No logic |
| `tests/basketball-bank.test.ts` | **New**, 17 tests |
| `tests/tennis-anchor.test.ts` | Re-pinned strike-zone size |
| `tests/qa-e2-tennis-rally-integrity.test.ts` | Reset guard on the net invariant |
| `tests/qa-e-tennis-serve.test.ts` | Policy uses the real strike zone |
| `docs/predeploy/BASKETBALL_TENNIS_FINAL_FIX.md` | This report |
| `docs/predeploy/evidence/final-fix/*.png` | Five screenshots |

**Anything outside the requested scope: no.** Golf, running, the leaderboard,
the nickname flow, the world Exit, AFL, Wardrobe, Soonpermario, the House, the
intro and the BGM are untouched — no file belonging to any of them appears in
the diff. The four pre-existing untracked items in the working tree
(`docs/VISUAL_POLISH_PASS_2026-09-03.md`, `docs/WORK_SAMPLE_READINESS_AUDIT.md`,
`docs/visual-polish/`, `scripts/`) were left exactly as they were and are not
staged.

## Not done

- No push, no deployment, no merge to `main`.
- Not played on a real touchscreen, and not in any browser but Chrome 152.
- The tennis "easier" claim rests on a scripted imperfect player and one
  browser match, not on a person playing it. The numbers above are what was
  measured; whether it *feels* right is the owner's call.
