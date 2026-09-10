# SPORTSGANG integration and predeployment candidate

Date: 2026-09-10 (Australia/Sydney).

**PREDEPLOY_CANDIDATE_READY** — integrated and locally verified; not pushed or deployed.

## Provenance

| Reference | Value |
|---|---|
| Canonical repository / branch | `/Users/edwardhwang/Desktop/Edward_world` / `main` |
| PRE_INTEGRATION_MAIN_SHA | `8b59e3f7bac383f0dd8984e9cdcbdae046dd506b` |
| QA_SG_E_SHA | `34d0f658c8e1bf4ebe7ceac78f50fa1c7205efa4` |
| Verified application / merge SHA | `1882710a5c103ca25ad1bfd57dce66b6862b35cd` |
| FINAL_MAIN_SHA | The documentation commit tagged `predeploy-sportsgang-20260910`; resolve exactly with `git rev-parse predeploy-sportsgang-20260910^{commit}`. Its application tree is identical to the verified merge SHA. |
| Backup ref | `backup/pre-sportsgang-integration-20260910` at PRE_INTEGRATION_MAIN_SHA |

The final commit's own hash cannot be embedded in its contents. The immutable local candidate tag identifies that commit; the terminal handoff records its resolved hash. The only post-verification changes are this report, its evidence, and a historical-audit cross-reference.

Actual ancestry, condensed (arrows mean ancestry, not necessarily immediate parentage):

```text
4c75644 ── 8b59e3f (old main / retained backup) ───────────┐
   └─ cdd593d foundation                                │
       ├─ a53f950 tennis ── 17d5f40 merge A              │
       ├─ 1488c08 golf ───── 447f2e3 merge B              │
       └─ 9a0a4c8 ball/running ─ e349b35 merge C          │
                                └─ 97c4944 integration  │
                                    └─ QA fixes         │
                                        └─ 34d0f65 ─────┤
                                                   1882710 merge
                                                       └─ report / candidate tag
```

All six temporary tips had **zero commits outside qa/sg-e** and clean tracked/untracked status: classification **A, fully contained**. After the merge, each also had zero commits outside main. Full tips and classifications are preserved in [provenance.json](evidence/integration/provenance.json). Foundation, all sport tracks, integration, and QA contact/abandoned-hole/nickname fixes were confirmed by ancestry and source inspection, not branch names.

## Merge

Normal `git merge --no-ff qa/sg-e`, preserving both parents and the complete source history. Merge commit: `1882710a5c103ca25ad1bfd57dce66b6862b35cd`. **No conflicts; no manual resolutions.** Main's four earlier audit artifacts remain preserved.

The source-to-merged-main diff contained only those four main-side audit artifacts. Application, shared input, styles, audio, routing, world boundaries, package/lockfile, and deployment configuration matched qa/sg-e. No feature reconstruction, dependency regeneration, test weakening, or integration fixes were needed.

## Feature presence

Paths below are repository-relative.

| Feature | Expected files | Present | Notes |
|---|---|---|---|
| Tennis | `lib/game/minigames/tennis.ts`, `lib/pixel/sg-tennis.ts`, `components/sportsgang/minigames/tennis-game.tsx` | YES | Forehand, backhand, serve, volley, smash; simulation contact drives racket/ball/impact, including the QA serve and ALEX contact corrections. |
| Basketball | `components/sportsgang/minigames/basketball-game.tsx` | YES | Round orange SVG, curved seams, shading; inspected at desktop and phone sizes. |
| Running | `lib/game/minigames/input-core.ts`, `lib/game/minigames/running.ts`, `components/sportsgang/minigames/running-game.tsx` | YES | Directional movement, acceleration/braking, lane changes, S sprint/stamina channel distinct from ArrowDown; held-input clearing on suspension. |
| Golf | `lib/game/minigames/golf-hole.ts`, `golf-course.ts`, `lib/pixel/sg-golf.ts`, `components/sportsgang/minigames/golf-game.tsx` | YES | Playable hole, course/green/flag/cup, golfer swing, remaining distance, strokes, approach, putting, completion. |
| Nickname / leaderboard | `components/sportsgang/golf-board-panel.tsx`, `app/api/sportsgang/golf-board/route.ts`, `lib/sportsgang-board/` | YES | Opt-in named/guest submission, validation, server schema/store, explicit unavailable production fallback. |
| Far-right Exit | `data/world.ts`, `lib/pixel/world-exit.ts`, `components/world/farewell-scene.tsx` | YES | Walkable Exit at x=3720, exact requested farewell, finite fireworks, static reduced-motion path, return and Index controls. |

## Verification

Runtime: **Node v24.19.0, npm 11.17.0**, selected with `PATH=/opt/homebrew/opt/node@24/bin:$PATH`. Existing dependencies matched the unchanged lockfile; no install or lockfile rewrite was necessary. Commands ran from canonical main after integration. [Exact command output](evidence/integration/checks.txt).

| Gate | Result | Count |
|---|---|---|
| `npm run lint` | PASS | Exit 0 |
| `npm run typecheck` | PASS | Exit 0 |
| `npm test` | PASS | 697 passed, 0 failed; 45 files |
| Explicit SPORTSGANG test selection | PASS | 389 passed, 0 failed; 20 files (subset of 697) |
| `npm run build` | PASS | Production build and route generation; exit 0 |
| `git diff --check` | PASS | Exit 0 |

Required automated commands: **6 PASS / 0 FAIL / 0 NOT_RUN**. The test counts above are not additive. No new source changes followed the build.

### Fresh localhost and browser smoke

Owner port 3000: PID **77038**, parent 77037, cwd canonical repository, Node 26.7.0. It predates this integration and was originally started against old main; its possible hot-reload state is not candidate evidence. It was left running. The separate pre-existing canonical port 3004 process was also left alone.

Candidate: freshly built canonical main at application SHA `1882710`, served with supported Node 24 via `npm run start -- --port 3001`; next-server PID **6712**, cwd `/Users/edwardhwang/Desktop/Edward_world`, executable `/opt/homebrew/Cellar/node@24/24.19.0/bin/node`. Browser verification used the clean Codex in-app browser at `http://localhost:3001/`, with desktop 1440×900 and phone 390×844 checks. Temporary viewport override was reset afterward. This production server remains available for local review.

| Flow | Fresh result |
|---|---|
| Title / intro / world | PASS: PRESS ENTER, SKIP INTRO, movement and venue interaction. |
| House | PASS: entered, opened THINGS I KEEP, returned to world. |
| Wardrobe | PASS: selected FIELD JACKET, added to archive, observed count 1, returned. |
| SPORTSGANG | PASS: sport selection, matching/acceptance, gameplay and results. |
| Tennis | PASS smoke: match completed, standings recorded 2 PT; observed SERVE, FOREHAND and SMASH animation states. All five actions/contact schedules covered by passing source tests. Backhand/volley and frame-by-frame contact appearance were not freshly captured in this live pass. |
| Basketball | PASS smoke: shot/recovery and recognizable ball. Measured SVG 27×27 desktop and 15×15 phone, with four paths and two circles. A full three-shot game was not the smoke scope. |
| Running | PASS smoke: idle stayed still; held right control reduced 200 M TO GO to 186 with pace 52%, stamina 100%. Player's rendered position advanced. Full simultaneous held S/direction and sustained stamina depletion remain a physical-input check; distinct key mapping and stamina behavior passed tests. |
| Golf | PASS: completed an actual hole through power/contact controls in **3 strokes**: driver 208 m, approach 88 m, final putt; remaining distance moved 300 → 92 → 4 → complete, with GOLF 3 STROKES / 1 RUN recorded. Course, flag/cup, golfer and HUD inspected. |
| Nickname | PASS: entered Korean plus Latin text with surrounding spaces; preview normalized to `한글 Edward`. A 26-character name showed the 20-character limit and disabled named submission. Guest fallback attempt on the completed hole failed safely with explicit unsubmitted text. Actual IME composition was not tested. |
| AFL Lab | PASS: Team A selected; model completed all six stages, displayed calibrated 59.0% and demonstration-only project summary. |
| Soonpermario | PASS smoke: walked to cabinet, started game, movement/jump and respawn observed; Escape produced RUN ENDED EARLY summary and return path. Full-level completion not claimed. |
| Exit | PASS: reached far-right gate by walking, exact “Bye bye!” / “Hope to see you again, and have a great day!” copy, live fireworks visible, LOOK AROUND AGAIN and repeat entry worked, PROJECT INDEX opened. Reduced-motion branch inspected and tested, not freshly emulated in-browser. |
| INDEX | PASS: opened from Exit; four canonical projects, project-detail links, background/contact and accessible close control present. |
| Console / overlay | PASS in clean browser: captured warning/error logs empty throughout sampled checks; no visible error overlay. Expected leaderboard HTTP 503 is recorded separately below. |

The previous owner-profile `bis_skin_checked`, `bis_register`, `__processed_*` hydration mutations and Urban VPN `M_ID` exception remain classified **EXTERNAL_BROWSER_EXTENSION**, supported by the historical audit and absence in this clean environment. Owner Chrome was not retested during integration. No suppression, Strict Mode disabling, or application workaround was added. Existing earlier QA screenshots/docs are preserved as historical evidence, not represented as fresh captures.

## Persistence

**BLOCKED_CONFIG**.

The route exists in the production build. Repeated local production GETs returned **HTTP 503**, `cache-control: no-store`, and `{"mode":"UNAVAILABLE","error":"BOARD_UNAVAILABLE"}`. No configured KV/Upstash URL-token pair was available to this candidate. Production configuration was not changed or independently retrieved from Vercel.

The live UI said: “The public board is not available right now. Your run was not submitted.” It preserved the local completed-hole result. There is no global-persistence claim. Development fallback is process-local memory; visit standings reset on page reload. Neither qualifies as durable/global storage.

Source and tests verify schema/course/rules validation, nickname normalization, duplicate-run protection, per-player best results/ties, concurrency, rate limiting, and mocked Redis REST behavior. The durable implementation uses an atomic script with a seen-run marker. **Actual durable writes, duplicate protection against a live backend, and refresh/separate-session persistence are NOT_RUN because backend configuration is absent.** No test namespace was available; no external accounts/services or fake production rows were created. This optional infrastructure absence does not block the honest unavailable experience.

## Worktree cleanup

All six were rechecked immediately before removal: clean tracked state, no nonignored untracked files, zero commits outside main. Ignored contents were dependency/build/type-generation artifacts only; no uncertain user files were discarded. Tracked QA docs/evidence were already preserved by the merge. Five servers running from sg-c/d/e (PIDs 7595, 46366, 74796, 75605, 84472) were stopped before removing their directories; canonical servers were preserved.

| Worktree | Result | Reason |
|---|---|---|
| `Edward_world-sg-00` | REMOVED | Clean; all work reachable from main. |
| `Edward_world-sg-a` | REMOVED | Clean; all work reachable from main. |
| `Edward_world-sg-b` | REMOVED | Clean; all work reachable from main. |
| `Edward_world-sg-c` | REMOVED | Clean; all work reachable from main. |
| `Edward_world-sg-d` | REMOVED | Clean; all work reachable from main. |
| `Edward_world-sg-e` | REMOVED | Clean; all work reachable from main. |

Used `git worktree remove` without force, then `git worktree prune`. All six directories are confirmed absent. [Cleanup results](evidence/integration/cleanup.json).

## Branch cleanup

| Local branch | Result |
|---|---|
| `polish/sg-00-foundation` | DELETED |
| `polish/sg-a-tennis` | DELETED |
| `polish/sg-b-golf` | DELETED |
| `polish/sg-c-ball-running` | DELETED |
| `polish/sg-d-integration` | DELETED |
| `qa/sg-e` | DELETED |

All deleted with ordinary `git branch -d` after ancestry verification and worktree removal. No force deletion. The backup branch remains; all source commits remain reachable through main.

## Remaining folders

Canonical `Edward_world` remains on main. These five unrelated worktrees remain because the request explicitly excluded them:

| Folder | Branch |
|---|---|
| `Edward_world-bgm` | `feat/bgm-feel-polish` |
| `Edward_world-character` | `feat/character-avatar` |
| `Edward_world-feel` | `feat/feel-calibration` |
| `Edward_world-tennis` | `feat/sportsgang-tennis` |
| `Edward_world-visitor` | `feat/visitor-counter` |

No duplicate final/deploy/clean folders were created. Eight original untracked owner files under the four original status entries remain byte-for-byte unchanged (SHA-256 comparison). They were not staged. [Filesystem snapshot and hashes](evidence/integration/final-filesystem.json) were recorded after cleanup, before the documentation commit.

## Deployment status

**PREDEPLOY_CANDIDATE_READY**. No unresolved P0/P1 integration defect found. Source integrated, required automated gates passed, clean-browser runtime smoke passed, six temporary worktrees removed and six branches safely deleted. The candidate is local main tagged `predeploy-sportsgang-20260910`; this is not a production release.

Manual follow-ups before broader production claims:

1. Inspect all five tennis actions and precise contact timing on a physical browser.
2. Exercise sustained simultaneous running direction/S sprint and stamina on physical keyboard/touch controls.
3. Check reduced-motion visuals and physical-device audio interruption/resume.
4. Check real Korean IME composition in the nickname field.
5. If enabling the public board, verify configured test-backend persistence, duplicate-run handling, and separate sessions before claiming global durability.

**No push. No deployment. No Vercel configuration changes.**
