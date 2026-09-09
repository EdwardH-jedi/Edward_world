# FINAL-QA — independent review of the SportsGang polish

**Verdict: CONDITIONAL.** Two QA passes have now run over this branch. The code
passes its gates, and the six requirements behave as asked on a real screen. The
blocker is unchanged and is not a code defect: **the public golf leaderboard has
no shared storage, in this environment or on the deploy target**, so in a
production build it does not work at all. It refuses honestly rather than faking
a board, which is the right behaviour and still not a working feature.

Four defects have been found by looking at the running app across the two
passes, and all four are fixed on this branch — E-3 with a caveat named in §4.

**§10 is the second pass** (a genuinely separate session, no session-D context),
which re-ran every gate from scratch, re-derived the evidence rather than reading
it, and found one further P1 that the first pass missed.

---

## 1 · What was reviewed, and where

| | |
|---|---|
| Reviewed SHA | `97c4944` (`polish/sg-d-integration`, D's last commit) |
| QA branch | `qa/sg-e`, branched from `97c4944` |
| Final SHA after QA fixes | `220386e` (see §7) |
| cwd | `/Users/edwardhwang/Desktop/Edward_world-sg-e` |
| Dev server | `npm run dev -- --port 3015` → `http://localhost:3015/?view=world` |
| Production build | `npm run build` then `npx next start --port 3016` → `http://localhost:3016/?view=world`. Rebuilt at `957aabc` after the fixes, so the production check below is against the branch being shipped, not the reviewed commit. |
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

Two passes, and they are not equally independent.

**The first pass (§1-§9) was the same conversation that performed session D.**
Its independence was procedural, not organisational: a fresh worktree at D's
commit, every gate re-run, every claim re-observed on a running screen. It was
not a second pair of eyes and was not described as one.

**The second pass (§10) is a separate session** with no session-D context in it,
which is the independence the brief asks for. It did not take this document on
trust: it re-ran the gates, re-derived the numbers, and treated the claims below
as things to check rather than things to read. Where it reproduced a figure, it
says so and gives its own measurement.

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
| Five swings look different | **PASS** — distinct pose tables, distinct durations (0.16–0.46 s) and windows; seen on screen as SERVE, FOREHAND, BACKHAND and a SMASH swing (which missed — see the row below) · `evidence-e/tennis-pose-forehand.png`, `tennis-smash-before.png` |
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
backwards *before finishing* from one that ran its full duration. The condition
went from `now.elapsed < before.elapsed` to
`now.elapsed < before.elapsed && before.elapsed + DT < before.duration`; the
assertion is still `restarts === 0`. That is the one existing assertion this pass touched,
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

**What the fix does not do, so it is not filed again.** In the *invalid-name*
state the disabled primary still reads `SUBMIT AS GUEST` beside the working
guest button, so the two identical labels are still there — one greyed out, with
the error underneath saying why. A disabled control plus an inline error is a
standard and readable pattern, and removing the duplication entirely would mean
relabelling the primary while a name is being rejected, which is a copy decision
rather than a defect fix. The reported case — an *empty* box showing two
identical, identically-behaving buttons — is gone.

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

**What the second review corrected**, before this report was handed over:

- It caught the headline claiming E-3 was fixed outright when my own re-test
  showed the invalid-name state still renders two identically-labelled buttons.
  That caveat is now in §4 and in the verdict, so the next reader does not file
  it a second time.
- It caught that the production server was still the one built at `97c4944` —
  the reviewed commit, not the branch being shipped. It has been rebuilt at
  `957aabc` and the `UNAVAILABLE` result re-confirmed against it. The check that
  decides the verdict should not be run against stale output.
- It asked for the tightened assertion's before/after condition to be written
  out inline rather than left to the diff, and for the missed SMASH to be
  described as a miss.

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
| `957aabc` | docs(qa): the independent review, its evidence and the verdict |
| *(last)* | docs(qa): what the second review corrected; production build at HEAD |

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

Start a server first — this is the one the second pass used:

```bash
cd /Users/edwardhwang/Desktop/Edward_world-sg-e
npm run dev -- --port 3015          # then http://localhost:3015/?view=world
```

1. **The serve.** Walk right → `E` at SPORTSGANG → TENNIS → PLAY A MATCH →
   ACCEPT → press Enter. Watch the ball leave the racket rather than appear
   above it. Compare with `evidence-e/tennis-serve-BEFORE-slowmo.gif`, which is
   what it did before this branch.
2. **ALEX's returns.** Same match, but watch *his* end. When he strikes, the
   spark should be on the strings, not on a ball that has already travelled past
   them. On roughly one return in seven it used to be visibly off; see §10.5.
3. **The basketball at play size.** SPORTSGANG → BASKETBALL, hold and release.
   Do not zoom — the question is whether it reads as a basketball at 27 px while
   it spins. `evidence-e2/ball-desktop-magnified.png` is the same ball enlarged.
4. **Running: stand still and hold `S`.** SPORTSGANG → RUNNING. The metres must
   not move. Then hold `→` and tap `S` on and off — the spurt should start and
   stop without the run stopping. Lane changes need the arrow *held*, not tapped.
5. **Conceding golf, and the name box.** GOLF → CONCEDE twice, and read the RANK
   panel: it must say `NO FINISHED HOLE`, not `0 STROKES`. Then hole out, press
   SUBMIT TO THE PUBLIC BOARD and type more than twenty characters — it should
   tell you while you type and disable the submit rather than promise something
   else.
6. **The way out.** Walk to the right-hand end and press `E`; then Escape and
   walk past the gate a few times — it must never open by itself. With
   `prefers-reduced-motion: reduce` the fireworks become one still frame.

---

## 10 · Second pass — an independent re-review

A separate session, holding no session-D context, re-reviewed this branch. It
did not take §1-§9 on trust. What follows is its own work.

### 10.1 What was reviewed, and where

| | |
|---|---|
| Reviewed SHA | `aab5c39` — the head of `qa/sg-e`, i.e. D's integration **plus** the first pass's own fixes |
| Integration commit underneath | `97c4944` (`polish/sg-d-integration`), confirmed an ancestor |
| Final SHA after this pass | `a385ce9` (see §10.7) |
| cwd | `/Users/edwardhwang/Desktop/Edward_world-sg-e` |
| Dev server | already running on `:3015`; `http://localhost:3015/?view=world` |
| Production server | **`:3017`, started by this pass** — `npm run build` then `npx next start --port 3017`. A fresh port was used deliberately so that no other session's server was stopped. |
| Node | v24.19.0 via `/opt/homebrew/opt/node@24/bin` (the shell's default is v26.7.0; `engines` says `24.x`, so gates were run on 24) |
| Browser | Chrome **152.0.7977.83**, headless, driven over CDP by a dependency-free driver written for this pass |
| Viewports | 1440×900 DPR 2 (desktop) · 390×844 DPR 3 mobile+touch, via `Emulation.setDeviceMetricsOverride` |

**Both ports were confirmed to be serving this worktree** by reading each
process's own working directory (`lsof -a -p <pid> -d cwd`), not by trusting the
port number: pids 74796 (`:3015`) and 75605 (`:3016`) both report
`/Users/edwardhwang/Desktop/Edward_world-sg-e`. No other session's server was
stopped and no other session's files were touched.

**A note on `:3016`.** The first pass's production server is still up, but this
pass ran `npm run build`, which rewrote `.next` underneath it. `:3016` is
therefore in a mixed state and **was not used for any check**; `:3017` was built
and started from the code under review instead.

**Browser tooling — what was actually available.** The chrome-devtools MCP could
not be used: its profile was already held by a live Chrome (pid 7896) belonging
to another session, and killing it was out of scope. The claude-in-chrome
extension was not connected. Rather than claim a browser check that did not
happen, this pass launched **its own isolated headless Chrome** and drove it
over the DevTools Protocol directly. Everything in §10.4 was measured through
that, in a real browser, against a real server.

### 10.2 Gates, re-run from scratch

| Gate | Result at `aab5c39` | Result at `a385ce9` |
|---|---|---|
| `npm run lint` | PASS, 0 problems | PASS |
| `npm run typecheck` | PASS, exit 0 | PASS |
| `npm test` | **44 files / 689 tests**, all passing | **45 files / 697 tests**, all passing |
| `npm run build` | PASS | PASS, 11 routes |

The first pass's headline count (44 / 689) **reproduced exactly**. No test was
deleted, skipped, or loosened by this pass. One fixture constant moved and is
accounted for in §10.5.

### 10.3 Re-verifying the first pass's own claims

The two claims most worth a second pair of eyes, because a report is the wrong
place to grade its own homework:

- **"The one assertion we touched was made narrower, not weaker."** Checked
  empirically rather than by reading: the old and new conditions were run side by
  side over the same 30 ticks. The old condition fires **once** — at tick 13,
  where a SERVE at `elapsed 0.4500` of a `0.4600` duration is followed by a fresh
  FOREHAND at `0.0000`. That is a swing which ran to its full length being
  succeeded by the next shot, not a restart. The new condition excuses exactly
  that one event and nothing else. **The claim holds.**
- **`qa-e-schedule.test.ts` tests what it says.** Read, not trusted. It replays a
  tick-indexed script through the real `createFixedStepper` at 60/30/120Hz and a
  ragged schedule, compares with `toEqual` and not a delta, compares whole state
  objects (`history`, `shotLog`, `ball`) rather than a scalar, and carries
  self-guards that fail if the run was trivially empty. **Genuine.**

**The bug class behind E-2 was checked for the other three sports.** A conceded
run scoring well is only possible where the rank direction is `lower`. Tennis and
basketball rank `higher`, so abandoning scores worse. Running ranks by elapsed
time — `lower`, the dangerous direction — but its simulation reaches `DONE` only
through `FINISHED`, i.e. by crossing the line, and `finishPlay` is called only
when a sport reports itself, so there is no early-exit path to exploit. **The
E-2 fix is correctly scoped to golf.**

### 10.4 What was measured in the browser

Every figure below is this pass's own measurement, from its own Chrome.

| Requirement | Result |
|---|---|
| **Basketball** | Independently reproduced: **27×27 CSS px desktop, 15×15 mobile, width/height ratio exactly 1.0000** at both. The SVG carries **4 seam paths + 2 circles**. Magnified 10× at play size it reads as a basketball — orange sphere, curved great-circle seams, radial shading — and is plainly not a circle or a `+`. · `evidence-e2/ball-desktop-magnified.png`, `ball-mobile-magnified.png`, `basketball-*-stationary.png` |
| **Running — arrows** | 200 → 189 m in 3 s at pace 62 % (cruise), stamina 100 %. |
| **Running — spurt** | `→` + `S`: pace 100 %, stamina 100 → 12 %. Released: pace back to 62 %. |
| **Running — standing + S** | **Distance unchanged at `128 M TO GO`, pace 0 %**, through 2 s of `S` alone; stamina recovered 53 → 100 %. No creep. |
| **Running — lanes** | A *held* `↑` moves the runner `bottom` 22 % → 28 % after ~750 ms; a held `↓` returns it 28 % → **16 %** and clamps there. A momentary tap does not change lane — worth knowing, and the reason an earlier attempt in this pass read as a failure before it was chased down. · `evidence-e2/running-*.png` |
| **Tennis — five swings** | All five were seen **on screen in ordinary play**: FOREHAND, SERVE, BACKHAND, SMASH and VOLLEY, read from `data-swing` on the two figures during a live match. |
| **Tennis — contact sync** | The frames either side of two of ALEX's contacts were captured on a **stepped clock** (see below): the ball reverses on the contact frame with the spark at his strings. FOREHAND: ball `left` 63.579 → **64.002** → 63.271 %. SMASH: 62.266 → **62.317** → 61.489 %. · `evidence-e2/tennis-alex1-{before,contact,after}.png`, `tennis-alex2-*.png` |
| **Golf — course** | Green, flagstick and a visible cup, distance markers to 250 m, and the full HUD: `SHOT 1`, `TOTAL STROKES 0`, `TO HOLE 300 M`, `LAST SHOT`, `CLUB DRIVER`, `RANGE 225 M`, `HOLE 1 · 300 M · PAR 4`. · `evidence-e2/golf-1-tee.png` |
| **Golf — shot cycle** | Power bar → accuracy → contact, with `SOLID CONTACT` and `131 M · ON THE FAIRWAY` recorded, and `NO CONTACT` for a mistimed swing. Distances and stroke counts update separately. |
| **Exit** | `EXIT · E TO LEAVE` at the right-hand end; walking past never opens it; `E` opens exactly the copy `Bye bye!` / `Hope to see you again, and have a great day!`, with `LOOK AROUND AGAIN`, `PROJECT INDEX` and `ESC · BACK TO THE WORLD`. Returning lands beside the gate. |
| **Exit — fireworks** | Measured on the `sg-exit__sky` canvas (240×135 = 32,400 px): lit pixels **88 → 220 → 172 → 176 → 88 → 0 by t+4.2 s**. Peak **0.68 %** of the canvas. Independently reproduces the first pass's 232 px / 0.7 % / 4.2 s. |
| **Exit — reduced motion** | With `prefers-reduced-motion: reduce`, the same canvas holds **528 lit pixels, identical across all seven samples over 4.2 s** — one still frame. Reproduces the first pass's figure exactly. |
| **Exit — visitor count** | `/api/joins` was called **0 times** across the entire exit sequence, including the return. |
| **Preserved surfaces** | On the **production** build (`:3017`): Edward's House (COLLECTION), Wardrobe, SportsGang, AFL Lab, Arcade/Soonpermario and the Exit all opened and closed cleanly, with the farewell copy intact. |

**How the contact frames were taken.** `requestAnimationFrame` was replaced with a
queue and `performance.now` with a virtual clock **before the app mounted**, so the
whole world — walking, the venue, the match — was driven one 16.7 ms step at a
time by this pass. That makes the run reproducible: the same two contacts land on
the same steps (227 and 758) across separate runs, which is how the frames either
side of them could be captured at all. **These are a stepped reconstruction, not
a real-time recording**, exactly as the first pass's serve frames were.

**Honest limits on the above.** The reduced-motion check proves the sky canvas is
a held still frame; this pass hooked `requestAnimationFrame` globally, so it
cannot separately claim the fireworks module scheduled no frame of its own — the
first pass's stronger claim was not re-derived. Mobile was CDP device emulation,
not a real touchscreen. No GPU work was measured and **no FPS, frame-time or
memory claim is made anywhere in this section.**

### 10.5 E2-1 · P1 — ALEX's spark was drawn where the ball had already got to

**Where:** `lib/game/minigames/tennis.ts`, `returnFromAlex`.

**Found by:** asking a question the first pass did not — it traced *one player
contact* tick by tick and concluded "contact position, reflection and spark are
one event". That is true on Edward's side. It was never checked on ALEX's.

**Expected:** the ball is struck where the swept hit test says the racket met it.
The function's own comment says exactly that: *"Struck where the swept test says
the racket met it, not wherever the ball had already reached by the end of the
step."*

**Actual:** the code did the second thing. It took `state.ball` — the integrated,
end-of-step position — so `lastContact`, `impactX/impactY` (the spark) and the
launch point of the return were all placed up to a whole step of travel past the
strings. `t`, the swept parameter, was stored and never used to place anything.

**Measured, over 84 of ALEX's returns across six matches:**

| | |
|---|---|
| Contact placed past the strings | median **1.65**, max **5.53** court units |
| For scale | the strike box half-width is 2.32 units, the ball's own radius 0.9 |
| Drawn *outside* the striking side's box | **ALEX 12 of 84 (14 %)**, up to **1.87×** his box |
| The same measurement for Edward | **0 of 78**, max exactly 1.00× — always touching |

So on roughly one return in seven the spark was drawn on a ball visibly clear of
the racket head, on one side of the net only. That is the late reflection the
brief names, and it is a visible asymmetry rather than a physics nicety.

**Fix:** the interpolation Edward's block already performs — the pre-integration
ball position is passed in and the contact is placed at `t`. Both `lastContact`
and the spark derive from that one value, so they move together.

**Deliberately not changed:** ALEX's `judgeSwingTiming` still reads the
end-of-step progress. That is a gameplay number, not a drawn position, and moving
it would shift his shank rate. Recorded as a residual asymmetry, not a defect.

**Consequences, named because they are real.** Correcting where the return
launches from moves ALEX's arcs slightly:

- **The smash window narrowed.** Sweeping every standing position from 8 to 44
  puts the band that produces an overhead at **33-35 and 37-41 before, 37-41
  after**. All five swings are still played in ordinary rallies; station 35
  simply stopped being one of them, so `qa-e-tennis-serve.test.ts` moves its
  up-court station **35 → 39**. That is a fixture constant. **Its assertions are
  untouched and still demand all five swings.**
- **Difficulty.** With 1, 2 or 3 frames of swing lag a scripted visitor's results
  are **identical either side of the change** (1:5, 1:5, 2:5). Only frame-perfect
  play benefits (2:5 → 5:2). Measured on one deterministic seed each, so this is
  four data points, not a win rate.

**New regression cover.** `tests/qa-e2-tennis-rally-integrity.test.ts` asserts
over *whole matches* on all four frame schedules what the first pass observed on
a single contact: the ball never goes through the floor, the serve toss never
does either (the E-1 class), no contact is counted twice, the spark sits on the
contact, and **no strike happens outside the striking side's own box** — ALEX's
box being `STRIKE_HALF + REACH_BONUS`, which is a deliberate 0.6-unit handicap
and is why holding him to Edward's box reports a phantom hit that is really his
reach.

### 10.6 GLOBAL_LEADERBOARD — checked against the deploy target

```
GLOBAL_LEADERBOARD = BLOCKED_CONFIG
```

This pass verified the board's behaviour against the **running servers and their
real store**, through the same endpoint the client uses:

| Check | Result |
|---|---|
| Dev `:3015` | `mode: LOCAL_ONLY`, `verification: "client-reported"` |
| Production `:3017` | **`{"mode":"UNAVAILABLE","error":"BOARD_UNAVAILABLE"}`** |
| Submit a 4-stroke round | `RECORDED`, rank 1 |
| Same `runId` again | `DUPLICATE`, board unchanged |
| Same player, a worse round | `NOT_BETTER`, no second row |
| A second player also on 4 | both rank **1** |
| A third player on 6 | ranks **3** — competition ranking, ties consume places |
| An abandoned run | `NOT_COMPLETED`, refused |
| The superseded rules version | `UNKNOWN_RULES`, refused |
| A non-uuid `runId` / `anonId` | `BAD_RUN_ID` / `BAD_ANON_ID`, refused |
| Display name | forced to `GUEST`; the client's `playerDisplayName` in the run payload is **not trusted** |
| `isYou` | present only on the requesting anon id's own row |

**What the first pass could not say, and this one can.** The deploy target was
checked directly, read-only: `vercel env ls production` for
`edwardhwang1223-1698s-projects/edwards-world` reports **"No Environment
Variables found."** There is no `.env` locally either. So it is not merely that
this machine lacks credentials — **the project this would deploy to has none
set at all**, and a production deploy today would serve
`BOARD_UNAVAILABLE` to every visitor. No credential was requested, printed or
created, and nothing was provisioned or deployed.

**Test data.** Three rows were written to the dev server's in-process store by
the checks above. That store is per-process and dies with `:3015`; nothing was
written to any durable or production store, because there is none.

### 10.7 Commits from this pass

| SHA | |
|---|---|
| `a385ce9` | `fix(tennis): spark ALEX's return where the strings met it` |
| `a0a13b9` | `docs(qa): the second pass, its evidence and the corrected verdict` |
| *(last)* | `docs(qa): the contact frames, and tidying this pass left` |

Branched from `aab5c39`. `main` is untouched at `4c75644`. Nothing was pushed,
merged or deployed, and no Vercel deployment was created.

### 10.8 A process note worth recording

`OWNERSHIP.md` says of session E: *"Writes only `docs/sportsgang-polish/` and new
test files. E does not fix product code; E reports."* Both passes have edited
product code — the first pass `tennis.ts` and the frozen `golf-result.ts`, this
pass `tennis.ts`. That is on the explicit instruction of the brief, which asks QA
to fix clear in-scope defects with minimal changes, and the freeze exists to stop
sessions colliding *mid-flight*, which they no longer are. Flagged so the
contradiction is a decision on the record rather than a thing nobody noticed.

### 10.9 Advisor

Run via the configured `advisor` tool, three times: after orientation and before
any code was written, before changing simulation code, and before this report.
Per `CONTRACT.md` the tool reports no model identity, so the backing model
**cannot be verified from this environment**; the brief names Fable 5.1, recorded
as intent rather than fact. Not `ADVISOR_NOT_RUN` — the tool ran.

**Accepted:** that the reviewed SHA is `aab5c39` and this pass is therefore
reviewing the first pass's fixes too; that severity for E2-1 had to be set from
the *rendered frame* rather than the internal gap, which is what turned a
physics nicety into a P1; that `judgeSwingTiming` was out of scope for the fix;
that a failing tuning test is a decision to surface rather than a tolerance to
widen; that the independence disclosure in §1 is false for this pass and had to
be corrected rather than inherited; and that the deploy target's own env should
be checked before settling GLOBAL_LEADERBOARD.

**Corrected by the advisor before it reached this document:** a latent bug in
this pass's own new test — it rebuilt the contact anchor assuming `contact.progress`
is the blended progress, which is true for Edward but not for ALEX, whose block
stores the end-of-step progress. Left uncorrected it would have failed after the
fix and invited exactly the tolerance-widening the brief forbids.

**Held:** nothing material.

### 10.10 Still not run, after two passes

- **A durable shared store**, and therefore any real public-board verification.
- **A real touchscreen**, a real phone, and any browser but Chrome 152.
- **Audio.** The music control's state was checked; no sound was heard.
- **Performance, memory and GPU.** No profile was taken; no FPS claim is made.
- **A person playing the golf hole by hand.** Both passes used scripted players.
- **A full 3-shot hole-out in this pass** — the first pass holed out in 3 and
  captured it (`evidence-e/golf-06-in-the-hole.png`); this pass confirmed the
  shot cycle, the HUD arithmetic and the course furniture but did not re-hole it.
- **A normal-speed video recording** of a tennis contact. Both passes captured
  stepped frames and stills; neither produced a real-time recording, so any
  claim resting on one is `VISUAL_NOT_VERIFIED`. The E2-1 frames in §10.4 are a
  stepped reconstruction and are labelled as one.
