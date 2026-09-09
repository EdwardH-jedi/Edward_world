# FINAL-QA — independent review of the SportsGang polish

**Verdict: CONDITIONAL.** The code passes its gates and the six requirements
behave as asked on a real screen, but the public golf leaderboard has no shared
storage in this environment, and in a production build it therefore does not
work at all — it says so honestly rather than faking a board, which is the
right behaviour and still not a working feature. Three defects were found by
looking at the running app; all three are fixed on this branch. Details below.

---

## 1 · What was reviewed, and where

| | |
|---|---|
| Reviewed SHA | `97c4944` (`polish/sg-d-integration`, D's last commit) |
| QA branch | `qa/sg-e`, branched from `97c4944` |
| Final SHA after QA fixes | `220386e` (see §7) |
| cwd | `/Users/edwardhwang/Desktop/Edward_world-sg-e` |
| Dev server | `npm run dev -- --port 3015` → `http://localhost:3015/?view=world` |
| Production build | `npm run build` then `npx next start --port 3016` → `http://localhost:3016/?view=world` |
| Board API | `/api/sportsgang/golf-board` on both |
| Node | v24.19.0 (`/opt/homebrew/opt/node@24/bin`), npm 11.17.0 |
| Browser | Chrome 152 via the chrome-devtools MCP, CDP device emulation |
| Viewports | 1440×900 DPR 2 (desktop) · 390×844 DPR 3, mobile + touch |

Both ports were confirmed to be serving **this** worktree by reading the
process's own working directory (`lsof -a -p <pid> -d cwd`), not by trusting the
port number. No other session's server was stopped or touched: 3003, 3004, 3013,
3014 and 4899 were running before this pass and are running after it. Nothing
was deployed.

### A disclosure about independence

The brief frames E as a new session that does not take D's report on trust. In
practice **this is the same conversation that performed session D.** The
independence is procedural, not organisational: a fresh worktree at D's commit,
every gate re-run from scratch, every claim re-observed on a running screen, and
the three defects below were found by looking rather than by reading D's notes.
It is not the independence of a second pair of eyes, and it should not be
described as such.

---

## 2 · Automated results

Run in this worktree, Node 24:

| Gate | Command | Result |
|---|---|---|
| lint | `npm run lint` | **PASS** — 0 problems, `--max-warnings 0` |
| typecheck | `npm run typecheck` | **PASS** — `tsc --noEmit`, exit 0 |
| unit | `npm test` | **PASS** — see the count below |
| build | `npm run build` | **PASS** — 11 routes |

### Counts, against the recorded baselines

| Point | Files | Tests |
|---|---|---|
| `main` at `4c75644` (BASELINE.md) | 29 | 391 |
| FOUNDATION_SHA `cdd593d` (QUALITY_GATES.md) | 30 | 450 |
| Reviewed SHA `97c4944`, re-run here | 41 | 665 |
| After this pass | **44** | **689** |

No test was deleted, skipped, or loosened to make it pass. One assertion was
made **more** precise (§4, defect E-1) and is documented there.

**Baseline separation.** BASELINE.md records no pre-existing failure, and
nothing failed at `97c4944` when re-run here, so every failure seen during this
pass was caused by this pass and every one of them is accounted for.

### Determinism — new in this pass

Session A left `tennis-schedule.test.ts`. Basketball, running and the golf hole
had **no equivalent**, so a browser painting at 30Hz or stuttering could have
changed a score and nothing would have caught it. `tests/qa-e-schedule.test.ts`
adds it for all three: one tick-indexed input script replayed under 60Hz, 30Hz,
120Hz and a ragged schedule (`[7, 41, 16.7, 3, 29, 11, 51, 2, 18, 33]` ms),
compared with `toEqual` — **tolerance zero**, not a delta. It also covers one
launch per golf swing under every schedule, the ball never leaving the tee
before the club arrives, the five-substep cap on a long stall, and a tap made
before a pause not firing on return.

**This is not an FPS or performance measurement.** Nothing was rendered and no
GPU was involved; it is a determinism test. No frame-rate claim is made anywhere
in this document.

---

## 3 · The six requirements

Evidence paths are relative to `docs/sportsgang-polish/`.

### Tennis motion — PASS (with one fixed defect)

| Check | Result |
|---|---|
| Five swings look different | **PASS** — distinct pose tables, distinct durations (0.16–0.46 s) and windows; seen on screen as SERVE, FOREHAND, BACKHAND, SMASH · `evidence-e/tennis-pose-forehand.png`, `tennis-smash-before.png` |
| All five actually chosen in ordinary play | **PASS** — measured, not assumed. Which swing you get depends where you stand: at the baseline, groundstrokes; camped at x≈35, VOLLEY ×2 and SMASH ×3; at the net, VOLLEY. Pinned by `tests/qa-e-tennis-serve.test.ts`. |
| Serve toss visible, and met by the racket | **PASS after fix** — was broken; see defect **E-1** |
| Smash only on reachable balls | **PASS** — a SMASH swung at a ball outside the racket box registered no contact (observed on screen, 12 ticks traced) |
| Movement / swing / 5 points / restart / mobile | **PASS** — full matches played to 5 on desktop; mobile controls exercised |

**A note on A's own claim.** `tests/tennis-swings.test.ts` contains a block
titled *"all five swings occur in ordinary play, not only in fixtures"* whose
assertions require **three** of them (`FOREHAND`, `BACKHAND`, `SERVE`, and
`size >= 3`). HANDOFF-A reports that row as PASS. The claim happens to be true —
this pass measured it — but the test did not check it. It is now checked, in a
QA-owned file rather than by editing A's.

### Tennis sync — PASS (after the fix)

| Check | Result |
|---|---|
| Contact position, reflection and spark are one event | **PASS** — traced tick by tick: player at x 34.885, ball at 34.97, `struck` flips, spark drawn at (34.97, 30.75), ball reverses from that point · `evidence-e/tennis-backhand-contact.png`, `tennis-backhand-after.png` |
| No swinging at air counted as a hit | **PASS** — observed a whole SMASH with the ball out of the box and no contact |
| No late reflection, no teleport | **PASS after fix** — this is exactly what **E-1** was |
| Survives 30/60/120Hz and a ragged schedule | **PASS** — `tennis-schedule.test.ts`, bit-exact |
| Tab return | **PASS** — clock reset and input cleared through one path; covered in `qa-e-schedule.test.ts` and observed in running (below) |

### Basketball — PASS

| Check | Result |
|---|---|
| Reads as a basketball at play size | **PASS** — 27×27 CSS px desktop, 15×15 mobile; orange sphere, four black seam paths curving over the surface, restrained radial shading · `evidence-e/basketball-desktop-stationary.png`, `basketball-mobile-stationary.png` |
| Not a plain circle or a `+` | **PASS** — 4 seam paths + 2 circles, seams are great circles projected and front-culled |
| Circular on mobile | **PASS** — width/height ratio **exactly 1.0000** at both viewports |
| Rotates about its own centre | **PASS** — **24 distinct** seam geometries across 60 flight ticks while the element box stays 27×27; the spin is baked into the path data, not a transform, so nothing the physics reads is moved |
| Arc, judgement and rim alignment intact | **PASS** — parabola peaks at 79.9 % and arrives at the ring (ball centre x 1029 vs ring centre 1052) · `basketball-desktop-in-flight.png`, `basketball-desktop-near-rim.png` |

### Running — PASS

Measured on the manual clock, so every number is a simulated interval.

| Check | Result |
|---|---|
| Arrows move along the track | **PASS** — right for 3 s: 200 → 184 m to go at pace 62 % (= `CRUISE_PACE` × 10 m/s) |
| Lane keys move across it, and clamp | **PASS** — runner `bottom` 22 % → 28 % and back to 16 %, held at the limits · `evidence-e/running-mobile-lane-up.png` |
| S spurts only while moving | **PASS** — right + S: pace 100 %, stamina 100 → 10 % |
| Standing still with S | **PASS** — 2 s of S alone: **distance unchanged, stamina unchanged at 100 %**, no creep, no waste |
| S released returns to base pace | **PASS** — 100 % → 69 % → 62 %, and `aria-pressed` follows the press, not an effect |
| Stamina recovery | **PASS** — eased off entirely: 3 % → 28 % (1 s) → 100 % (5 s). At exactly cruise pace it neither drains nor rebuilds — that is `CRUISE_PACE`'s definition, not a bug |
| Exhaustion | **PASS** — after the tank emptied, pace was capped at 28 % (`EXHAUSTED_PACE`) until stamina climbed back past the threshold |
| S does not also move down | **PASS** — `KeyS` is on its own `sprint` channel; lane stayed put through every spurt |
| No diagonal or back-and-forth exploit | **PASS** — pinned by `running-controls.test.ts` at 9 decimal places. The 12 m vs 13 m I first measured in the browser was the HUD rounding to whole metres, not a bonus |
| Keyboard + touch together | **PASS** — with a finger holding →, pressing `S` on the keyboard engaged the spurt; lifting the SPRINT finger left → still held (pace stayed above zero) |
| blur / cancel cleanup | **PASS** — a `blur` with two inputs held dropped both: pace to 0, and a later stray `keyup` did nothing |
| Progress and finish | **PASS** — a race completed at **1:18.3** over 200 m |

Evidence: `evidence-e/running-mobile-arrows-only.png`,
`running-mobile-arrows-plus-sprint.png`, `running-mobile-lane-up.png`,
`running-mobile-recovered-after-release.png`.

### Golf and the records — PASS on play, CONDITIONAL on the board

| Check | Result |
|---|---|
| Course, flag and cup visible | **PASS** — green, flagstick and a cup drawn at the hole; 5×2 px from 300 m away and full size on the putt · `evidence-e/golf-01-tee-course-flag-cup.png`, `golf-06-in-the-hole.png` |
| Timing input drives the club | **PASS** — power bar → BACKSWING → DOWNSWING, contact locked at meter 49.2 % → "PURE STRIKE" |
| Launch at impact, follow-through with the flight | **PASS** — the ball leaves on the IMPACT frame and `FOLLOW_THROUGH` runs for **24 frames while the ball climbs** · `golf-03-impact.png`, `golf-04-followthrough-and-flight.png` |
| Remaining metres, SHOT, TOTAL STROKES, penalties | **PASS** — SHOT 2 alongside TOTAL STROKES 1 after one struck shot; both shown separately, and both counted |
| Hole completable | **PASS** — holed in **3 on a par 4** (driver 215 m, approach, 7 m putt) · `golf-06-in-the-hole.png` |
| Abandoned run handled | **PASS** — "RUN ABANDONED · NOT RANKED", "Only a hole you finish can go on the board" · `golf-05-abandoned-not-ranked.png` |
| Nickname, consent, GUEST, IME | **PASS** — Korean accepted, whitespace collapsed, control characters stripped, IME composition kept, game keys inert while typing · `golf-08-nickname-consent.png` |
| Submission | **PASS** — row appears, "ON THE BOARD AS 에드워드 QA · RANK 1"; identity keys created **only at that press** · `golf-09-board-after-submit.png` |
| Duplicate prevention | **PASS** — same `runId` twice → `DUPLICATE`, board unchanged |
| Best per player | **PASS** — a worse run from the same anonymous id → `NOT_BETTER`, no second row; a better one replaced it |
| Shared rank | **PASS** — three players on 2 strokes all rank 1, next distinct score ranks **4** · `golf-10-board-shared-ranks.png` |
| Server computes the rank | **PASS** — a submission claiming `rank: 1` with a 7-stroke round was recorded at **rank 4** |
| Course / rules separation | **PASS** — `UNKNOWN_RULES` for the superseded `-1` version, `UNKNOWN_COURSE` for another hole |
| Payload validation | **PASS** — `NOT_COMPLETED`, `IMPLAUSIBLE_STROKES`, `NOT_A_RUN` (totals disagreeing), `MALFORMED_JSON` (400), `BODY_TOO_LARGE` (413) |
| Failure states | **PASS** — offline: "Could not reach the board. Your run was not submitted." + TRY AGAIN, which then recovered · `golf-11-board-offline-error.png` |
| Refresh | **PASS** — the row survived a reload and came back marked `isYou`; the anon id is not echoed in the response body |
| Independent browser session | **PASS** — a second isolated context with **empty localStorage** saw the same row, so the board is server-held |
| Honest labelling | **PASS** — `CASUAL · CLIENT-REPORTED SCORES · LOCAL-ONLY, THIS SERVER PROCESS`. Never called verified, never called global |
| **Real shared storage** | **FAIL / NOT_VERIFIED** — see §5 |

The server checks above were made against the **running server and its real
store**, through the same endpoint the client uses — not against a mock. They
are labelled API-level where they did not go through the UI.

### The world Exit — PASS

| Check | Result |
|---|---|
| At the right-hand end, reachable | **PASS** — the last prompt on the walk is `EXIT · E TO LEAVE` · `evidence-e/exit-01-gate-at-world-end.png` |
| Not locked behind anything | **PASS** — reached with no sport completed |
| E, click and keyboard focus | **PASS** — `E` opens it; the prompt is a real `<button>` and clicking it opens it too |
| Held `E` fires once | **PASS** — a keydown plus two `repeat` keydowns opened exactly one dialog |
| Walking past does not fire it | **PASS** — walked to the wall and back; never opened by itself |
| Exact copy | **PASS** — `Bye bye!` / `Hope to see you again, and have a great day!` |
| Fireworks finite and gentle | **PASS** — measured on the canvas: peak **232 lit pixels of 32,400 (0.7 %)**, zero by **4.2 s**, and no animation frame outstanding afterwards · `exit-02-farewell-fireworks.png` |
| Reduced motion | **PASS** — one held still frame, **528 lit pixels identical across 4 s**, and no frame ever scheduled · `exit-03-reduced-motion-still.png` |
| Escape / LOOK AROUND AGAIN | **PASS** — returns beside the gate (`EXIT · E TO LEAVE` immediately), does not re-fire |
| PROJECT INDEX | **PASS** — opens the index; **D had never clicked this button** |
| Repeat entry leaks nothing | **PASS** — five open/close cycles: window listener drift **{}**, rAF drift **0**, canvas drift **0**, no `<audio>` accumulation |
| Visitor counter not re-incremented | **PASS** — `/api/joins` called **0** times across the whole Exit sequence |
| Never closes the tab or navigates away | **PASS** — no such call exists |

### Preserved surfaces — PASS

Intro (`WELCOME TO EDWARD HWANG'S WORLD` → SKIP INTRO), WORLD/INDEX, Edward's
House (collection, 0 of 7), Wardrobe (rail, mannequin, SAVE LOOK), AFL Lab
(demonstration round, "no real clubs, no real results"), Arcade / Soonpermario
(cabinet, commits and bugs), and the music control (`aria-pressed` true → false,
`data-state` playing → muted). All opened and closed cleanly after the merge.

---

## 4 · Defects found, and what was done

### E-1 · P1 — the serve teleported

**Where:** `lib/game/minigames/tennis.ts`, the SERVE phase.

**Repro:** start a tennis match, watch any serve.

**Expected:** the toss is thrown, the racket meets it, the ball leaves the
strings. The code's own comment says so: *"the contact you see is the contact
that launches it."*

**Actual:** the toss is aimed at `SERVE_CONTACT_AT` = 0.664 s, but the phase ran
to a separate `PACE.SERVE_SECONDS` = 0.9 s before launching. In those **14
ticks** the toss kept falling — past the strings, past the ground, to
**y = −4.06, below the court surface** — then vanished, and the served ball
appeared **19.3 units above it**, already struck, with a spark. Measured both on
screen (last visible toss at `bottom: 17.9 %`, ball reappearing at `37.24 %`) and
in the simulation.

**Fix:** the SERVE phase now ends at `SERVE_CONTACT_AT`. Same anchor, same
target, same seed — the serve still lands where it did. Verified after: the last
toss frame is `38.02 %` and the ball appears at `37.24 %`, a gap of 0.78 % —
under one tick of travel. Evidence:
`evidence-e/tennis-serve-BEFORE-slowmo.gif` and
`tennis-serve-AFTER-slowmo.gif`, plus the individual frames.

**Consequence, named because it changed another test.** The serve's
follow-through is now still running when the rally starts. `tennis-swings.test.ts`
counted "a completed swing followed by the next one" as a mashing restart, which
used to be impossible. The check now distinguishes a swing whose clock went
backwards *before finishing* from one that ran its full duration; the assertion
is still `restarts === 0`. That is the one existing assertion this pass touched,
and it was made narrower, not weaker.

### E-2 · P1 — conceding gave a perfect golf record

**Where:** `lib/game/minigames/golf-result.ts`, `toSportResult`.

**Repro:** enter golf, press CONCEDE immediately. Twice.

**Expected:** an abandoned hole is not a score.

**Actual:** the visit standings read **`GOLF · 0 STROKES · 2 RUNS · BEST THIS
VISIT STANDS AT 0 STROKES`**. An abandoned run reports its `totalStrokes` —
nought, when nothing was struck — as the comparable number, ranked
lower-is-better, so nought beat every round anybody can finish. Three
concessions and your golf record is perfect. Seen on screen.

**Fix:** an abandoned hole reports no ranking number (`+Infinity` against a
lower-is-better direction) and displays `NO FINISHED HOLE`. It still says what
happened and still counts as an attempt. The **public board was never
affected** — the server refuses anything not `completed`, which was confirmed
against the running server (`NOT_COMPLETED`, 400). Pinned by
`tests/qa-e-abandoned-run.test.ts`.

### E-3 · P2 — the name box's button lied

**Where:** `components/sportsgang/golf-board-panel.tsx`.

**Repro:** submit a completed run, type 25 characters into the name box, press
the primary button.

**Expected:** either it submits, or it says why not before you press it.

**Actual:** the primary button silently relabelled itself `SUBMIT AS GUEST`, and
pressing it **refused** with "That is longer than 20 characters" instead of
submitting as guest. Separately, with an **empty** box, two adjacent buttons both
read `SUBMIT AS GUEST` and did the same thing.

**Fix:** the rejection is shown while the name is being typed and the primary is
disabled while it stands; the separate guest button is not rendered when the box
is empty, and returns the moment there is something in it — which is when it
means something different, and is also the way out of an unusable name.

### Not defects, recorded so they are not re-investigated

- **Low-power golf shots are unforgiving.** Distance goes as roughly the *square*
  of the power setting: a 0.15 swing of a 131 m club travels 3 m. A scripted
  player using a linear guess ran out of shots 3 m from the cup; the same player
  using `sqrt(distance / range)` holed out in 3. This is a difficulty
  observation, not a fault, and it has never been played by a person.
- **Stamina does not rebuild at cruise pace.** That is `CRUISE_PACE`'s
  definition — the pace that neither drains nor rebuilds. You have to ease off.
- **`PLAYER GUEST` in the golf HUD** even for a returning visitor with a stored
  nickname. Deliberate, and recorded as such in HANDOFF-D: the name is asked for
  at the moment of publishing, not the moment of playing.

---

## 5 · GLOBAL_LEADERBOARD

```
GLOBAL_LEADERBOARD = BLOCKED_CONFIG
```

None of `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `UPSTASH_REDIS_REST_URL` or
`UPSTASH_REDIS_REST_TOKEN` is set here; there is no `.env`. No credential was
requested, printed or created, and no service, account or paid resource was
provisioned. `STORAGE.md` documents the variable names and the steps for
whoever holds the account.

What this means in practice, and it is the reason for the verdict:

| Build | What the board does |
|---|---|
| dev (`:3015`) | `LOCAL_ONLY` — a real store shared by every browser hitting **this server process**, which is why an isolated second context saw the same rows. It dies with the process, and the screen says `LOCAL-ONLY, THIS SERVER PROCESS`. |
| production (`:3016`) | `UNAVAILABLE` — **"The public board is not available right now. Your run was not submitted."** · `evidence-e/prod-01-board-unavailable.png` |

Production refuses rather than falling back, which is correct: a per-instance
board would show each visitor their own submissions back as if they were a world
ranking. But it does mean **the public leaderboard is a non-functioning feature
in a production build until a Redis is provisioned.** Everything around it — the
API, the adapter, the schema, the ranking, the duplicate and rate guards, the
failure states — is built and verified.

**Test data.** The rows used for the tie and validation checks were written to
the dev server's in-process store and were cleared by restarting that server;
the board now reads `entries: []`. Nothing was written to any durable or
production store, because there is none.

---

## 6 · Advisor

Run via the configured `advisor` tool, twice: once after orientation and before
any code was written, once before this report. Per `CONTRACT.md` the tool
reports no model identity, so the backing model **cannot be verified from this
environment**; the brief names Fable 5.1, recorded as intent rather than fact.
Not `ADVISOR_NOT_RUN` — the tool ran.

**Accepted:** that the production `UNAVAILABLE` result decides the ceiling of
the verdict before anything else is examined, and should be written down first
so it cannot soften later; that the same-session independence problem had to be
disclosed rather than glossed; that the missing determinism suites for three of
the four sports were the real gap in the automated layer; that the four
handoffs' NOT_RUN lists are the right source for the browser checklist; that a
stepped-clock capture must be labelled a stepped reconstruction and never a
real-time recording.

**Held:** the suggestion to wire A-1 (`debug` into `TennisGame`) as QA tooling.
The DOM already exposes `data-swing` on both figures, which answered the
five-swings question in normal play without adding a production code path for a
test's benefit.

---

## 7 · Commits on this branch

| SHA | |
|---|---|
| `32c11d2` | fix(tennis): serve the ball on the frame the racket reaches it |
| `220386e` | fix: a conceded hole is not a nought, and the name box says why |
| *(this one)* | docs(qa): the QA report and its evidence |

Branched from `97c4944`. `main` is untouched at `4c75644`. Nothing was pushed,
merged or deployed, and no Vercel deployment was created.

---

## 8 · Not run

- **A durable shared store.** No credentials — `BLOCKED_CONFIG`.
- **A real touchscreen.** Mobile was CDP device emulation at 390×844 DPR 3.
- **Any browser but Chrome 152.** No Safari, Firefox or a real phone.
- **Audio.** The music control's state was checked; no sound was heard.
- **Performance and memory.** No profile was taken and no GPU work was measured,
  so this document makes no FPS, frame-time or memory claim. The only
  resource-shaped measurements here are counted listeners, animation-frame
  handles and canvas elements, which are exact.
- **A player's judgement of difficulty.** Nobody has played the golf hole by
  hand; §4 records what the scripted players found.
- **A VOLLEY struck by the visitor, on screen.** It is proven reachable in the
  simulation and was seen on screen played by ALEX; the player's own volley was
  not captured before the match ended.
- **The deferred requests** B-2, A-1, A-2, A-3 from HANDOFF-D. They are cleanup,
  not defects, and none of them caused one.

---

## 9 · Six things worth looking at yourself

Start the server first:

```bash
cd /Users/edwardhwang/Desktop/Edward_world-sg-e
npm run dev -- --port 3015
```

1. **The serve.** `http://localhost:3015/?view=world` → walk right → `E` at
   SPORTSGANG → TENNIS → ACCEPT → PRESS ENTER TO PLAY. Watch the ball leave the
   racket. Compare with `evidence-e/tennis-serve-BEFORE-slowmo.gif`, which is
   what it did before this pass.
2. **The basketball at play size.** SPORTSGANG → BASKETBALL, hold and release.
   Do not zoom: the question is whether it reads as a basketball at 27 px while
   it spins.
3. **Running, two fingers or two keys.** SPORTSGANG → RUNNING. Hold `→` and tap
   `S` on and off. The spurt should start and stop without the run stopping, and
   letting go of `S` alone should not let go of `→`.
4. **Conceding golf.** SPORTSGANG → GOLF → CONCEDE, twice, and read the RANK
   panel. It should say `NO FINISHED HOLE`, not `0 STROKES`.
5. **The name box.** Hole out, press SUBMIT TO THE PUBLIC BOARD, and type more
   than twenty characters. It should tell you while you type, and the submit
   button should be unavailable rather than promising something else.
6. **The way out.** Walk to the right-hand end of the world and press `E`. Then
   press Escape and walk past the gate a few times — it should never open by
   itself.
