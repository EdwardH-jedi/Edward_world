# Edward World — final production deployment

The controlled release of the completed SPORTSGANG work to
`https://edwards-world.vercel.app`, including the final basketball/tennis
gameplay fix. This file records what was deployed, how it was verified, and
what was cleaned up afterwards.

## The SHAs

| Name | SHA | What it is |
|---|---|---|
| `PRE_DEPLOY_MAIN_SHA` | `cfc849a0d6b8e56f5560947afeed02fee6c727a7` | Canonical `main` before this session. Already tagged `predeploy-sportsgang-20260910`. |
| `SPORTSGANG_QA_SHA` | `1882710a5c103ca25ad1bfd57dce66b6862b35cd` | The `merge: integrate reviewed SPORTSGANG polish` commit — `qa/sg-e` merged into main in the previous session. |
| `FINAL_FIX_SHA` | `2b34ba9f84ecbe0fb16b196a367b2b6a74ae446b` | `fix: tune tennis feel and basketball bank shots`. |
| `FINAL_MAIN_SHA` | `2b34ba9f84ecbe0fb16b196a367b2b6a74ae446b` | **The deployment candidate.** Identical to the fix SHA — see the integration note below. |
| Remote `main` | `2b34ba9f84ecbe0fb16b196a367b2b6a74ae446b` | Verified with `git ls-remote origin refs/heads/main`. |
| Previous live production source | `4c7564458951b18dda70dd3e2c549dcd7f939a08` | What `edwards-world.vercel.app` served before this deploy. |

### Recovery references

Two, because "before this deploy" means two different things and only one of
them already had a name.

| Ref | SHA | Why |
|---|---|---|
| `predeploy-sportsgang-20260910` (tag, pre-existing) | `cfc849a` | Canonical `main` as it stood before this session. **No new ref was created for it** — an equivalent one already pointed at that commit, and duplicating it would only add a second name for the same object. |
| `backup/pre-final-deploy-20260910` (branch, created here) | `4c75644` | The commit production was actually serving. Nothing else named it, and after the push `origin/main` no longer does, so this is the ref to roll back to. |
| `backup/pre-sportsgang-integration-20260910` (pre-existing) | `8b59e3f` | The older pre-integration point, left untouched. |

## Integration: how `2b34ba9` reached `main`

**Fast-forward.** Not a merge, not a cherry-pick — the ancestry made a merge
commit unnecessary and a cherry-pick actively wrong.

Verified before touching anything:

```
git merge-base main fix/sg-final-basketball-tennis  -> cfc849a  (= main's HEAD)
git log --oneline fix/sg-final-basketball-tennis..main -> (empty)
git merge-base --is-ancestor origin/main main       -> true
git rev-list --count main..origin/main              -> 0
```

`main` had nothing the fix branch lacked, and the remote had nothing `main`
lacked, so `git merge --ff-only` moved `main` from `cfc849a` to `2b34ba9`
without inventing a commit or rewriting provenance. **No later valid main work
could be lost**, because there was none: the remote was a strict ancestor,
32 commits behind.

`qa/sg-e` was **already integrated** before this session. The reflog records
`main@{1}: merge qa/sg-e` producing `1882710`, and `git merge-base --is-ancestor
1882710 main` is true. Nothing needed re-integrating.

### Source presence verified directly, not inferred from the merge

| Expected | Found |
|---|---|
| Basketball swept board collision | `BACKBOARD_X: 89.6`, `BACKBOARD_TOP: 64.32`, `RIM_Y: 51.9`, `BACKBOARD_RESTITUTION`, `stepFlight`, `BOARD_FACE`, `SEPARATION` |
| Renderer reads the simulation | `basketball-game.tsx` uses `state.ballX` / `state.ballY` |
| Tennis tuning | `RESTITUTION: 0.58`, `BOUNCE_DRAG: 0.9`, `TOLERANCE_Y_ART: 1.8`, `SMASH_MIN_Y: 17`, `PREDICTION_ERROR: 6` |
| The other sports, board, world exit | `golf*.ts`, `running.ts`, `lib/sportsgang-board/`, `components/world/farewell-scene.tsx` all present |

## Verification

Node 24.19.0 (`.nvmrc` = 24, `engines.node` = 24.x), npm 11.17.0.

| Gate | Result |
|---|---|
| `npm run lint` | **PASS** — `eslint . --max-warnings 0`, no output |
| `npm run typecheck` | **PASS** — `tsc --noEmit`, exit 0 |
| `npm test` | **PASS** — **714 tests / 46 files** |
| SPORTSGANG subset | **PASS** — 106 tests / 6 files (`basketball-bank`, `tennis-anchor`, `qa-e-tennis-serve`, `qa-e2-tennis-rally-integrity`, `minigames`, `qa-e-schedule`) |
| `npm run build` | **PASS** — 11 routes |
| `git diff --check` | **PASS** — clean |

714/46 is the count at `FINAL_MAIN_SHA`. It is not the "expected baseline"
restated: the previous baseline was measured independently by checking out
`cfc849a` in a throwaway worktree, which runs **697 / 45**. The 17 added tests
are `tests/basketball-bank.test.ts`.

### Local clean-browser smoke

Production build (`next start -p 3021`) — **not** the dev server on `:3000`,
which belongs to another session and was left running. The serving process was
confirmed to be the right one before testing: PID 24827, `cwd`
`/Users/edwardhwang/Desktop/Edward_world`, `HEAD` `2b34ba9` on `main`.

Browser: the chrome-devtools-mcp profile, which carries no DOM-mutating
extensions. Confirmed empirically rather than assumed — a sweep for
`bis_*` / `__processed_*` attributes returned **0** on every screen. No
`suppressHydrationWarning`, StrictMode change, or console suppression was
added anywhere.

| Screen | Result |
|---|---|
| Title → world | PASS |
| WORLD / INDEX toggle | PASS — index renders the portfolio content |
| Edward's House | PASS — collection (clarinet, jersey, …) |
| Wardrobe | PASS — garment rail, saved-look panel |
| AFL Predict | PASS — match data / features pipeline |
| Soonpermario (Arcade) | PASS — cabinet loads |
| Far-right Exit | PASS — farewell card, returns cleanly |
| Mute toggle | PASS — `aria-pressed` flips both ways |
| Next.js error overlay | **None** |

## SPORTSGANG acceptance

### Basketball — the backboard

Measured from the live DOM, sampling the ball's rendered `left`/`bottom` each
frame. The board's collidable face is at `BACKBOARD_X - BALL_RX` = **88.10**.

| Shot | Released at | Max `x` reached | Behaviour | Verdict |
|---|---|---|---|---|
| Clean, in band | charge 0.6233 | **88.09** | reached the face, came back | SCORED |
| Deliberate bank | charge 0.7083 | **88.09** | 88.09 → 87.05 → 86.01 → 84.97 | **SCORED** |

- **No tunnelling** — the ball never exceeded the face on any shot.
- **No sticking** — it reversed on the contact frame and kept moving away;
  the shot ended by landing, not by timing out.
- **The rebound is visible** — three sampled frames of backward travel before
  it dropped through.
- **A bank still scores**, and touching the board does not score by itself:
  the same release plus 0.3 hits the board and misses.
- **No duplicate score** — the tally read MADE 1, then 2, one per shot.

### Tennis — the bounce

`ballBottom = 22 + ball.y`, so simulation height is the rendered percentage
minus the 22% surface. Genuine post-bounce apexes, with duplicate render frames
removed before finding maxima:

| | value |
|---|---|
| Previous build's apex | 5.93 |
| Observed apexes, this build | **7.9 – 15.9** |
| Racket contact height | 10.5 |

The ball now arrives at or above racket height instead of below the knee — the
waist-to-chest zone the brief asked for. **All five swing actions appeared in a
single live match**: SERVE, FOREHAND, BACKHAND, VOLLEY, SMASH.

Contact quality stayed meaningful rather than collapsing to all-PERFECT: one
sampled match registered LATE 168 / GOOD 420 / PERFECT 264, and ALEX competed
throughout, winning most rallies against a crude scripted opponent.

**On "easier than the previous build":** the higher bounce and the wider reach
are measured facts, above. The *playability* comparison (median rally 3 → 5,
points 100–80 → 97–47) comes from the headless proxy runs recorded in
`BASKETBALL_TENNIS_FINAL_FIX.md`, not from this session — the DOM-driven bot
used here is too crude to stand as evidence of difficulty either way, and it is
not being presented as such.

**Ball/contact desync:** none. The spark is drawn at `impactX/impactY`, the
contact point, and deliberately persists 0.2 s while the ball flies on, so its
distance from the ball's *current* position is not a desync measure. The real
invariant — spark position equals the contact point at the contact instant — is
asserted to nine decimal places in `qa-e2-tennis-rally-integrity.test.ts`,
which passes on all four frame schedules.

### Golf

Full hole, tee to cup: **HOLED OUT in 6 strokes**, longest drive 216 m, 0
penalty, clubs stepping 225 m → 131 m → 19 m. Verified on both local and
production.

A run that reaches `maxShots: 8` without holing out correctly ends as **RUN
ABANDONED** and reports no ranking number — this is the designed stroke cap and
the session-E fix, observed live as "NEW BEST · PREVIOUS NO FINISHED HOLE".

### Running

| Input | Pace | Stamina | Distance |
|---|---|---|---|
| Arrow only | 62% | 100% | 200 → 195 m |
| Arrow + S | **100%** | 100 → 71% | → 184 m |
| After releasing S | back to 62% | recovering | → 172 m |

Directional movement and the S spurt are intact, and the lane keys move the
runner. Identical figures on production.

### World Exit

Farewell card ("Bye bye! Hope to see you again…") appears on `E TO LEAVE`, and
**LOOK AROUND AGAIN** returns to the world cleanly with the HUD restored.

## Leaderboard

**`BLOCKED_CONFIG`**

The implementation is server-backed — `app/api/sportsgang/golf-board/route.ts`
over a Redis-compatible REST store — but **no environment variables are
configured on the Vercel project** (`vercel env ls` returns none), so no
durable store can bind. Live production returns:

```
GET /api/sportsgang/golf-board -> 503
{"mode":"UNAVAILABLE","error":"BOARD_UNAVAILABLE"}
```

No paid backend was provisioned in this session.

**The degradation is safe and honest, so this does not block the release.** The
panel renders an alert reading *"The public board is not available right now.
Your run was not submitted."* with a TRY AGAIN button. Nothing crashes, and the
UI does not claim global persistence it does not have: "GOLF · PUBLIC BOARD"
names the feature, while the mode line (`CASUAL · CLIENT-REPORTED SCORES`, plus
`· LOCAL-ONLY, THIS SERVER PROCESS` when that is the binding) and the error
state carry the truth. No copy fix was needed.

The anonymous join counter is the same class: `POST /api/joins` returns 500
without a store, and `main-world.tsx` renders the line only when
`joinTotal !== null`, so the world simply says nothing rather than inventing a
number. Both are documented, deliberate choices in `lib/joins/store.ts`.

## Deployment

| | |
|---|---|
| Project | `edwards-world` (`prj_PexV1nxNv864XuwswE8fGQSyfCKA`) |
| Deployment ID | `dpl_Bkup7uLZwSHcw1emfcg6i16iaoNT` |
| Deployment URL | `https://edwards-world-cvrlf8yi3-edwardhwang1223-1698s-projects.vercel.app` |
| **Production URL** | **`https://edwards-world.vercel.app`** |
| Deployed at | 2026-09-10 22:45:45 AEST (Ready, target production) |
| Previous production deployment | `edwards-world-60pld2st9-…` — the rollback target |

The project is **not** Git-connected: `vercel project inspect` shows no linked
repository, the existing production deployments were all CLI-made, and no
deployment fired on its own in the 45 s after the push. So the existing
workflow is `vercel deploy --prod`, which is what was used. No second project
was created and no domain or project identity was changed.

To keep "production is `FINAL_MAIN_SHA`" literally true, the deploy was run
from a throwaway worktree checked out at `2b34ba9` (with `.vercel/project.json`
copied in) rather than from the canonical checkout, whose four untracked user
files would otherwise have been uploaded. That worktree was removed afterwards.

### Confirming production really is `2b34ba9`

A CLI deploy attaches no git commit metadata, so this was established by
content rather than by trusting "upload complete":

- The live bundle at `/_next/static/immutable/chunks/10_iay812uwlo.js` contains
  `89.6`, `64.32` and `51.9` — the backboard and rim constants.
- Those three literals appear **zero** times in the previous live source
  (`git show 4c75644:lib/game/minigames/basketball.ts`).
- They are defined in `git show 2b34ba9:lib/game/minigames/basketball.ts`.
- `48.68` is correctly *absent* from the bundle: `BACKBOARD_BOTTOM` is unused
  by the collision logic, which starts the board at the rim, so it is minified
  away.

The alias was confirmed to have moved: `edwards-world.vercel.app` →
`edwards-world-cvrlf8yi3-…`.

## Production smoke

Run against `https://edwards-world.vercel.app` in the same clean profile
(0 extension attributes).

| Check | Result |
|---|---|
| Homepage / title | PASS |
| Enter world, WORLD / INDEX | PASS |
| SPORTSGANG | PASS |
| Basketball | PASS — clean shot and bank shot both peak at 88.09 vs the 88.10 face, rebound, and score; "SCORED OFF THE RIM", MADE 2 |
| Tennis | PASS — apexes 8.5–15.9 vs 5.93; all five swing kinds |
| Golf | PASS — HOLED OUT, 6 strokes, 216 m drive |
| Running | PASS — 62% → 100% → 62%, stamina 100 → 71 → 64 |
| Far-right Exit | PASS — farewell, returns cleanly |
| Next.js error overlay | **None** |
| Key routes | `/`, `/resume`, `/case-studies/sportsgang`, `/manifest.webmanifest` all 200 |

**Failed requests, all expected and safe:**

| Request | Status | Why it is not a defect |
|---|---|---|
| `POST /api/joins` | 500 | Unprovisioned counter; the UI omits the line entirely |
| `GET /api/sportsgang/golf-board` | 503 | Unprovisioned board; the UI says so plainly |
| `GET /favicon.ico` | 404 | **Pre-existing** — no icon file exists at `4c75644` either, so it was already 404 on the previous production build. Cosmetic; not a regression from this release. |

No application runtime errors in the console. No hydration errors. The owner's
local `bis_skin_checked` overlays were an extension artefact and did not appear
here; nothing was patched to suppress them.

## Rollback

Not needed — no P0/P1 issue was found in production. Should one appear:

```
vercel alias set edwards-world-60pld2st9-edwardhwang1223-1698s-projects.vercel.app edwards-world.vercel.app
```

and the Git state is recoverable from `backup/pre-final-deploy-20260910`
(`4c75644`). No history was rewritten and no force push was used.

## Cleanup

### Temporary SPORTSGANG worktrees — 0 removed here, 6/6 already absent

All six (`Edward_world-sg-00`, `-sg-a`, `-sg-b`, `-sg-c`, `-sg-d`, `-sg-e`)
were **already removed in the previous session**, with `git worktree remove`
(no force) followed by `git worktree prune`, as recorded in
`SPORTSGANG_INTEGRATION_REPORT.md`. Re-confirmed here: none appear in
`git worktree list`, and none exists on disk. This session removed none of them
because there was nothing left to remove.

Their work is preserved in `main`: `qa/sg-e` merged as `1882710`, which is an
ancestor of `FINAL_MAIN_SHA`.

### Temporary SPORTSGANG branches — 1 of 7 removed here, 6 already absent

| Branch | State |
|---|---|
| `polish/sg-00-foundation` | already deleted (previous session) |
| `polish/sg-a-tennis` | already deleted |
| `polish/sg-b-golf` | already deleted |
| `polish/sg-c-ball-running` | already deleted |
| `polish/sg-d-integration` | already deleted |
| `qa/sg-e` | already deleted |
| `fix/sg-final-basketball-tennis` | **deleted this session** with `git branch -d` after the fast-forward, which is why the safe form succeeded |

One temporary worktree was created and removed within this session:
`/tmp/sg-deploy`, the clean deploy checkout.

### Deliberately preserved

- `backup/pre-final-deploy-20260910`, `backup/pre-sportsgang-integration-20260910`,
  and the `predeploy-sportsgang-20260910` tag — recovery points.
- The five unrelated worktrees and their branches — `Edward_world-bgm`,
  `-character`, `-feel`, `-tennis`, `-visitor` — untouched, to be audited
  separately.
- Four untracked files in the canonical checkout that belong to other work:
  `docs/VISUAL_POLISH_PASS_2026-09-03.md`, `docs/WORK_SAMPLE_READINESS_AUDIT.md`,
  `docs/visual-polish/`, `scripts/`. Never staged; `git add .` was not used.
- The dev server on `:3000`, which belongs to another session.

No `Edward_world-final`, `-production`, `-deploy` or similar folder was
created. The canonical source remains `/Users/edwardhwang/Desktop/Edward_world`
on `main`.

## Known limitation

The golf public board is unavailable in production because no store
credentials are configured (`BLOCKED_CONFIG`). It degrades honestly and does
not affect the rest of the site. Provisioning a Redis-compatible store and
setting either the `KV_REST_API_*` or `UPSTASH_REDIS_REST_*` pair would bind it
with no code change; the same pair also enables the anonymous join counter.
