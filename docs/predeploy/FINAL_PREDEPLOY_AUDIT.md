# Final pre-deployment independent audit

Date: 2026-09-10 (Australia/Sydney).

**NOT_READY — canonical main does not contain the completed SPORTSGANG polish.**

**GLOBAL_LEADERBOARD_NOT_VERIFIED**

This report audits the actual canonical checkout and localhost:3000, not the separate completed-polish worktree. The brief's premise that the polish is already in the deployment candidate is false for this checkout. A clarification was requested during the audit; no alternate snapshot was selected before this report was completed. No branches were merged or switched.

The owner's errors were not dismissed on the strength of passing tests. Two hydration errors were reproduced live in Chrome, including the development overlay. The existing canonical dev log also contains the third symptom, an exception in Urban VPN Proxy. Clean-browser development and production smoke tests did not emit JavaScript warnings/errors through the available console capture. The owner-profile overlay is still reproducible and therefore does not pass the brief's hard overlay gate.

## Environment and snapshot

| Item | Recorded value |
|---|---|
| Repository / cwd | `/Users/edwardhwang/Desktop/Edward_world` |
| Branch | `main` |
| START_SHA / audited application SHA | `4c7564458951b18dda70dd3e2c549dcd7f939a08` |
| Initial tracked changes | None |
| Initial untracked work, preserved | `docs/VISUAL_POLISH_PASS_2026-09-03.md`, `docs/WORK_SAMPLE_READINESS_AUDIT.md`, `docs/visual-polish/`, `scripts/` |
| Stash | Empty |
| Default shell runtime | Node `v26.7.0`, npm `11.19.0` |
| Required runtime | `.nvmrc`: `24`; package engine: `24.x` |
| Final automated / production runtime | Node `v24.19.0`, npm `11.17.0`, selected with `PATH=/opt/homebrew/opt/node@24/bin:$PATH` |
| Framework | Installed Next `16.3.3`, React `19.2.8` |
| Canonical dev server | PID 77038, parent 77037, `next dev`, listening on 3000; cwd verified by `lsof` |
| Dev executable | `/opt/homebrew/Cellar/node/26.7.0/bin/node` |
| Dev start | 2026-09-10 03:15:05, after HEAD's 2026-09-09 22:40:34 commit |
| Dev artifact | `.next/dev/build-manifest.json` timestamp 2026-09-10 03:15:12 |
| Production-local | Fresh `npm run build`, then `npm run start -- --port 3010`, canonical cwd, Node 24 |
| Tested URLs | `http://localhost:3000/`, `/?view=world`, `/?view=index`, `/api/joins`, `/api/sportsgang/golf-board`; `http://localhost:3010/`, `/?view=world`, `/?view=index`, `/case-studies/sportsgang`, `/api/joins` |
| Browsers | Owner Chrome profile and clean Codex in-app browser; development viewport 843 × 1028; production mobile viewport measured at 390 × 844 |

The canonical development process was reused, not replaced with a different worktree. No tracked source changes were present, and the server started after HEAD. Production was built afresh from the same application source; it did not reuse another worktree's `.next`. The existing development server remains user-owned. The audit's production server is stopped after verification.

Active worktrees at audit start (full paths and SHAs in [environment evidence](evidence/environment.txt)):

| Directory suffix | Branch | SHA |
|---|---|---|
| Edward_world | main | 4c75644 |
| Edward_world-bgm | feat/bgm-feel-polish | 4cb8685 |
| Edward_world-character | feat/character-avatar | 1a9685d |
| Edward_world-feel | feat/feel-calibration | 1166939 |
| Edward_world-sg-00 | polish/sg-00-foundation | cdd593d |
| Edward_world-sg-a | polish/sg-a-tennis | a53f950 |
| Edward_world-sg-b | polish/sg-b-golf | 1488c08 |
| Edward_world-sg-c | polish/sg-c-ball-running | 9a0a4c8 |
| Edward_world-sg-d | polish/sg-d-integration | 97c4944 |
| Edward_world-sg-e | qa/sg-e | 34d0f65 |
| Edward_world-tennis | feat/sportsgang-tennis | 57baebe |
| Edward_world-visitor | feat/visitor-counter | 39dc741 |

Read `AGENTS.md` and `CLAUDE.md` (`@AGENTS.md`). All nine requested files under `docs/sportsgang-polish/` are absent on canonical main: BASELINE, CONTRACT, QUALITY_GATES, RUNBOOK, HANDOFF-A/B/C/D, FINAL-QA. The installed Next server/client-component guide was read. No application code was written.

## The three reported localhost errors

Complete browser error messages forwarded to the canonical development log are preserved in [dev-browser-errors.json](evidence/dev-browser-errors.json). Browser and server copies of the same forwarded message are not counted as independent defects.

| ID | Exact symptom | Root cause / source | Files / components implicated | Fix | Reproduction status | Final status |
|---|---|---|---|---|---|---|
| ERROR-1 | `A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up.` Root-layout diff includes `bis_skin_checked`, `bis_register`, `__processed_*`; earlier occurrence also includes Grammarly attributes. | Browser extension mutates server HTML before React hydration. Stack points at Next metadata wrapper and RootLayout, but the mismatching attributes are injected, not emitted by repository code. | `app/layout.tsx` / Next MetadataWrapper; external extension content script. | No application patch; retest owner's profile with the implicated extension excluded from localhost. | Reproduced live after Chrome reload; visible overlay page 1/2. Absent in clean in-app browser. | Explained external cause; owner-profile overlay remains. |
| ERROR-2 | Same hydration message, with `bis_skin_checked="1"` on `experience-shell`, `title-stage`, and `title-copy`. | Same DOM-mutation family as ERROR-1, reported at a separate hydration boundary. Not evidence of three independent application bugs. | `components/portfolio-experience.tsx`, `components/title/title-screen.tsx` as affected DOM owners; external extension mutation. | Same environment remedy; no `suppressHydrationWarning` or console suppression. | Reproduced live after Chrome reload; second issue in the overlay and console. Absent throughout clean-browser exercised flows. | Explained external cause; owner-profile overlay remains. |
| ERROR-3 | `unhandledRejection: TypeError: Cannot read properties of undefined (reading 'M_ID')` at `Y (.../executors/200.js:1:761)` and `E (.../executors/200.js:1:1442)`. | Script URL is `chrome-extension://eppiocemhmnlbhjplcgkofciiegomcon/executors/200.js`. Installed manifest resolves this ID to **Urban VPN Proxy**, version `5.14.4_0`. | Outside repository. | No application patch can repair this extension's undefined object. | Captured six times in the existing canonical server's browser log before this audit's fresh Chrome reload. Not reproduced again in the audit-created Chrome tab; absent in clean browser. | Historical symptom accounted for; fresh recurrence NOT_REPRODUCED. |

Trigger / steps for ERROR-1 and ERROR-2: run canonical `npm run dev`; open `http://localhost:3000/` in the owner's Chrome profile; reload; open the Next issues badge. The audit saw **2 Issue**, not exactly three fresh overlay entries. ERROR-3's original logged trigger was initial page loading with the extension enabled; asynchronous extension execution explains why every reload need not repeat it. The earlier log contains repeated occurrences, not six additional application root causes.

Classification: ERROR-1/2 are related symptoms of injected markup across two boundaries. ERROR-3 is an extension runtime failure, not an application cascade proven to originate in SPORTSGANG. Hydration diagnostics/overlay are development-specific; extension DOM mutation itself is not restricted to development. The extension exception can affect that browser independently of deployment mode. Under the brief's severity definition, the remaining owner-profile localhost overlay fails the **P1 deployment environment gate**. No application P0 root cause was established for these messages.

Clean verification went beyond the homepage: title → skipped intro → world → INDEX → House → Wardrobe → all four sports → AFL → Arcade → far-right boundary → INDEX return. The clean production path included intro/world/INDEX/project details, mobile world movement and basketball, and mute/reload. This supports an extension diagnosis; it is not a claim that every acceptance test passed.

## SPORTSGANG acceptance

Legend: PASS means the described check actually passed, with its evidence scope stated. FAIL means a requirement is contradicted by current source or observed behavior. NOT_RUN means the behavior could not be verified; static tests alone are not visual acceptance.

| Requested improvement | Status | Independent evidence |
|---|---|---|
| Tennis five distinct actions | FAIL | `tennis-game.tsx:40` returns the single `contact` frame whenever swinging. Both figures use this routine; no five-action renderer from the polish branch is present. Normal tennis was started, Enter/Swing exercised, and ALEX's points advanced from 0 to 3. |
| Basketball recognizability | FAIL | Desktop shot and mobile production shot exercised. At 390px, live ball measured 7.171875 × 7.171875 px, `border-radius: 0px`, solid `rgb(192,122,63)` with one inset shadow. `app/globals.css:3502` has no panel seams or round ball. |
| Running directional movement + S sprint | FAIL | Live HUD says `W / ↑ TO PUSH · S / ↓ TO EASE`. `use-minigame-input.ts:11` aliases S and ArrowDown. Without held directional input, runner covered 200m and recorded `0:32.3`. |
| Golf tee-to-hole playthrough and HUD | FAIL | Actually played SET POWER → STRIKE → flight → standings (`GOLF 30 M 1 RUN`). `lib/game/minigames/golf.ts:10` explicitly implements a single driver shot; phases at line 18 contain no approach/putt/cup entry. |
| Visitor nickname / shared board | FAIL | No nickname or golf-board UI/API exists on main. `/api/sportsgang/golf-board` returns 404. Existing standings honestly say `YOUR STANDINGS · THIS VISIT`. Backend absence alone is not the deployment blocker. |
| Far-right Exit / farewell | FAIL | Walked to x=3792, exactly 3840 world width minus 48 player width. Screenshot and DOM show no Exit; interaction button disabled. Pressing E does nothing. No farewell component/action exists here. |

### Tennis details

| Checks | Status | Evidence / limit |
|---|---|---|
| Forehand, backhand, serve, volley, smash as five distinct normal-play animations | FAIL | Each named action lacks the requested distinct renderer; single `contact` pose selected for any swing. |
| Preparation, impact, follow-through, recovery, racket trajectory for each of the five actions | FAIL | Required pose progression is absent from the rendered component. This is structural absence, not a judgement based on a missed screenshot. |
| Serve/rally feature path starts | PASS | Live court, Swing controls, ALEX scoring and Escape back to world exercised. |
| Visible racket contact = physics event = trajectory change = effect | NOT_RUN | No frame-by-frame collision capture was made of this legacy renderer. Cannot credit newer branch's contact tests or evidence to main. |
| Late reflection, invisible hitbox, teleporting ball, double hits, missed collisions, frame-rate sensitivity | NOT_RUN | Existing simulation unit tests pass; that does not establish these visual conditions. |

### Basketball details

| Check | Status | Evidence / limit |
|---|---|---|
| Round shape; readable panel/seam lines | FAIL | Square CSS box; no seam pattern at actual gameplay size. |
| Shading appropriate to a recognizable basketball | FAIL | Single inset corner shadow on the square does not satisfy the requested renderer. |
| Desktop and mobile shot rendering | PASS | Shot path started at 843px dev and 390px production; controls visible. This is rendering availability, not visual acceptance. |
| Rotation does not distort trajectory | NOT_RUN | No ball rotation exists in this renderer. |
| Shot physics unchanged by this audit | PASS | No application changes. Physics tests pass. |
| Three-shot completion | NOT_RUN | First shot/recovery to shot 2 exercised; full basketball result not completed. |

### Running details

| Check | Status | Evidence / limit |
|---|---|---|
| Directional movement; S sprint; S distinct from ArrowDown; stationary S does not cause travel | FAIL | Legacy pace simulation automatically advances and S means ease; no stationary directional model. |
| Direction + S simultaneously; release S changes sprint/pace correctly | FAIL | Requested sprint channel is absent. Brief key taps did not measurably change pace; the source mapping establishes the failure. |
| Lane/vertical movement; track bounds; lateral movement cannot inflate finish distance | NOT_RUN | No lane/lateral gameplay exists in this snapshot. The new controls cannot be accepted. |
| Text/name focus suppresses all game controls | FAIL | `use-minigame-input.ts` checks interactive targets only for action keys, not direction branches; no nickname form exists to exercise the requested flow. |
| Mobile pointer holds/release, blur/tab-switch clearing, stamina feel after redesign | NOT_RUN | Source contains pointer cancel/up/leave and blur cleanup; no mobile multi-touch/held-key acceptance was completed. |
| Legacy race completion and standings | PASS | Auto-paced race completed in `0:32.3`, one recorded run. It demonstrates why the new movement requirement fails. |

### Golf details

| Check | Status | Evidence / limit |
|---|---|---|
| Tee-to-hole progression: fairway, approach, putting, actual hole completion | FAIL | Game ends after one drive, observed at 30m. |
| Tee/fairway scene, green-shaped decoration, flag and flagpole visible | PASS | Observed in live golf screenshot; these are scenery, not evidence of playable cup mechanics. |
| Rough as playable lie; visible physical cup; cup-entry rather than proximity completion | FAIL | No lie/putt/cup completion model in the active golf simulation. |
| Driver backswing, downswing, impact, follow-through, finish pose; launch synchronized to impact | FAIL | Active component has meter/ball rendering and venue figures, not the new articulated golfer and contact-phase implementation. |
| HUD: player name, hole, par, current shot, total strokes, penalties, distance remaining, last shot, current club | FAIL | Current game exposes meter, prompt and carry distance. These requested distinctions are absent. |
| Normal tee shot / imperfect timing | PASS | Power/contact input produced `DRAWN LEFT`, 30m, result and one standings entry. Quality of a normal full-power drive was not separately established. |
| Overshoot and remaining distance, approach, putting | NOT_RUN | No playable hole exists; impossible in this build. |
| Restart/replay | PASS | Continued from golf standings to summary, selected REPLAY and entered another sport. |

### Visitor name / leaderboard details

| Check | Status | Evidence / limit |
|---|---|---|
| Nickname input; Korean/English; IME; GUEST path; whitespace/length; unsafe markup handling; typing shortcut isolation | NOT_RUN | The requested nickname submission feature is absent. Do not infer anything from the separate intro name puzzle. |
| A completed local result is recorded once | PASS | Golf and running each showed `1 RUN`; later replay did not duplicate the earlier displayed golf run. |
| Refresh semantics | PASS (source + tests) | `sportsgang-standings.ts` stores module memory, not sessionStorage/localStorage. UI explicitly discloses reload reset; standings tests pass. Browser refresh of a populated board was not independently completed. |
| Best-score comparison / ties | PASS (unit only) | Standings tests pass; `isBetter` uses strict greater/less comparison so a tie is not an improvement. |
| Global ordering, duplicate run IDs, course/rules-version separation, DNF exclusion on new golf board | NOT_RUN | New board/API/result contract absent. |
| Separate-session genuine shared backend | NOT_RUN | No golf backend configured or implemented in canonical main. No fake production QA identities submitted. |

**Persistence truth:** current sports standings are page-module memory, surviving feature exit/re-entry but not reload. They are not browser storage and not a server/Redis/DB leaderboard. Wardrobe saved-look storage is a separate feature. Development visitor count is server-process memory. Production-local visitor count has no configured durable backend and degrades to no number. `.env.local` contains an OIDC token but no Redis credential pair; values were not printed or committed.

### World Exit details

| Check | Status | Evidence / limit |
|---|---|---|
| Actual far-right affordance; keyboard, mouse, touch Exit action | FAIL | Boundary reached; no action, target or affordance. E tested there. |
| Exact `Bye bye!` and `Hope to see you again, and have a great day!` copy | FAIL | Farewell implementation absent. |
| Fireworks; Skip; reduced motion; return to world; INDEX from farewell | NOT_RUN | No farewell scene to exercise. |
| Repeated farewell entry/exit: timers, RAF, listeners, BGM, counts, submissions | NOT_RUN | No Exit path exists. Ordinary feature/INDEX returns were exercised separately. |
| Normal SPORTSGANG Escape is distinct from World Exit | FAIL | Normal back behavior exists and works, but the second, distinct Exit does not. |

## Full-world regression

| Experience / check | Status | Evidence |
|---|---|---|
| Title and intro skip | PASS | Title renders, PRESS ENTER opens sequence, SKIP INTRO reaches world in dev and production. |
| Complete unskipped intro/name ritual | NOT_RUN | Intro skip used. Requested visitor nickname feature absent. |
| World movement/interactions | PASS | Held pointer drags traversed all venue positions to exact right bound; E entered SPORTSGANG. |
| WORLD / INDEX | PASS | Open/close, focus return, project links and production project page exercised. |
| Edward's House | PASS | Entered, opened COLLECTION/THINGS I KEEP, returned to world. |
| Wardrobe | PASS | FIELD JACKET → ADD TO ARCHIVE, archive count became 1, Escape returned. Saving a complete look was not retested. |
| AFL Predict | PASS | TEAM A → RUN MODEL → all six stages → 59.0% result and honest generated-data explanation. |
| SPORTSGANG legacy smoke | PASS | Entered all four sports; golf/running completed, replay and Escape exercised. Requested polish acceptance remains FAIL. |
| Soonpermario / Arcade | PASS (entry/exit only) | Walked to cabinet, E PLAY, game opened, Escape produced RUN ENDED EARLY and summary. Actual sustained platform traversal/jump response NOT_RUN; short key taps are insufficient evidence. |
| BGM control and mute persistence | PASS | Production music control set off, reload retained off. Audio engine tests pass. |
| Audible mix / physical device interruption | NOT_RUN | No listening or device interruption measurement performed. |
| Responsive layout / mobile controls | PASS (limited smoke) | Measured 390 × 844, scrollWidth 390; held mobile world pointer controls reached SPORTSGANG; mobile basketball played. Full six-feature mobile acceptance NOT_RUN. |
| Clean-browser console after major experiences | PASS (observed path) | Available JavaScript console capture returned no error/warn entries after House, Wardrobe, sports, AFL, Arcade and final world return. |

## Automated checks

Commands come from the real package scripts. Final reproducible output is in [automated-checks.txt](evidence/automated-checks.txt), all under Node 24. Earlier default-Node-26 lint/typecheck/tests also passed; they are not substituted for the Node-24 checks.

| Command | PASS | FAIL | NOT_RUN |
|---|---:|---:|---:|
| `npm run lint` | 1 | 0 | 0 |
| `npm run typecheck` | 1 | 0 | 0 |
| `npm test` | 391 tests / 29 files | 0 | 0 |
| `npm run build` | 1 | 0 | 0 |
| `npm test -- tests/minigames.test.ts tests/sportsgang-machine.test.ts tests/sportsgang-playthrough.test.ts tests/sportsgang-standings.test.ts` | 83 tests / 4 files | 0 | 0 |
| `git diff --check` | 1 | 0 | 0 |
| `npm run start -- --port 3010` | 1 startup + limited browser smoke | 0 | 0 |
| Tests existing only on `qa/sg-e` | 0 | 0 | All — not this audited source |

The 83 sport-specific tests are a subset of the 391, not 83 additional distinct tests. Core script gate count: **4 PASS / 0 FAIL / 0 NOT_RUN**. No tests or checks were weakened. Production build generated the expected case-study routes and `/api/joins`; no golf-board route appears.

## Browser console and network/API

The clean browser's JavaScript log API and Next overlay were inspected. The existing canonical terminal-to-file log was read, including server-forwarded browser errors. Complete historical browser errors are preserved rather than only quoting one line. Raw original terminal scrollback and a comprehensive browser HAR/request-failure stream were **not captured**: the available browser interface supplied console logs and UI inspection, not network event subscriptions. Consequently no claim of zero network failures, zero CORS failures or zero third-party requests is made for all flows.

| Path / operation | Observed result | Interpretation |
|---|---|---|
| Dev homepage | HTTP 200; title/intro/world usable | No compile failure observed. |
| Dev `/api/joins` GET | HTTP 200, `{"total":3}` before and after multi-experience traversal | In-memory development store; UI remained 3RD throughout returns, supporting no extra count on feature re-entry. Not a packet-level duplicate POST audit. |
| Production-local `/api/joins` GET | HTTP 500, `{"error":"failed to read join count"}` | Explained missing optional Redis backend (`store.ts:168`, `response.ts:31`). World omits count and remains usable. A network resource error may still appear in a browser's network console. |
| Main `/api/sportsgang/golf-board` GET | HTTP 404 | Diagnostic probe of an absent route, not a failing background fetch. |
| SPORTSGANG start, golf result, leaderboard | No server golf submission exists | Current results use module memory. Cannot certify new board fetch/submission/deduplication behavior. |
| INDEX navigation / project details | Both dev INDEX and production detail page rendered successfully | No JS error captured. |
| Exit | NOT_RUN | Missing feature. |
| CORS / all failed assets / repeated polling / all duplicate POSTs | NOT_RUN (full capture) | Source inspection finds client fetches for `/api/joins` and local BGM only. Source inspection is not a HAR. |

Optional infrastructure absence did not crash the world. No production service records were populated with fake names. Local development joins caused by normal entry are process-local. The 500 is explained and documented, not hidden or converted into a warning.

## Scope drift and integration history

Main's latest commits are `4c75644` (House documentation), `fc37520` (v1.0 release), and `1a9685d` (Phase 14 notes). None of the polish integration/QA commits is on main. `main` is an ancestor of `qa/sg-e`, whose full tip is `34d0f658c8e1bf4ebe7ceac78f50fa1c7205efa4`.

The separate branch contains the shared input/clock foundation, merges of A/B/C, golf board and Exit integration, serve timing fixes and subsequent tennis contact QA. `git diff main..qa/sg-e --stat` reports 204 files, 15,570 insertions and 381 deletions including evidence artifacts. This is not a minimal local defect patch. The branch was inspected for provenance/name-level scope only; its implementation report, tests and screenshots were not treated as current verification.

| Area requested for drift inspection | Difference main → qa/sg-e |
|---|---|
| AFL Predict, Wardrobe, Soonpermario/Arcade, House, Intro source | No direct source-file changes in that comparison. Main's earlier release changes are legitimate existing work. |
| Global audio | No direct audio source changes. |
| Global movement / world | Intentional-looking Exit integration in `main-world.tsx`, `data/world.ts`, `types/world.ts`, `lib/game/interactions.ts`; portfolio/interaction routing also changes. Not integrated here; correctness not approved. |
| Shared minigame input | Changed on polish branch and used by Arcade too; future integration requires regression testing. |
| Global CSS | Large addition; can affect other surfaces, so a fresh integrated runtime audit is necessary. |
| Project metadata, README, deployment/Vercel config | No changes in this polish comparison. No production configuration was touched. |
| Existing untracked visual-polish/report/scripts work | Preserved and excluded from audit commit. |

No accidental unrelated drift was established from this comparison. This is not approval of the separate branch.

## Performance sanity

SPORTSGANG was run four times in the clean development session (golf, running, basketball, tennis), including replay and world re-entry. No visible sustained slowdown or additional JavaScript error was observed. After those runs and other venue smoke tests, a measured world → INDEX → world cycle returned from **110 elements / 9 canvases** to **110 elements / 9 canvases**. Visitor display remained 3RD; the API total remained 3.

Source cleanup exists for the shared game RAF, resize listeners, stage timers, animation reversion and input listeners. This is not a measured listener/heap/RAF census. FPS, memory growth, duplicate AudioContext/BGM instances and tab-switch held-input behavior are **NOT_RUN**; no invented measurements are provided. Fireworks accumulation is not testable because fireworks are absent.

## Remaining defects and minimal-fix decision

| ID | Severity | Defect / consequence | Minimum correct direction |
|---|---|---|---|
| P1-1 | P1 | The deployment candidate lacks the completed polish: tennis animations, running intent, full golf, nickname/board and far-right Exit do not match the acceptance brief. | Select/integrate the intended reviewed snapshot deliberately, then rerun this audit against that exact HEAD. Do not recreate 15k lines as an audit patch or silently switch the server to another worktree. |
| P1-2 | P1 environment gate | Owner-profile Next overlay remains reproducible from extension DOM mutations; extension M_ID failure is historically logged. | Exclude Urban VPN Proxy from localhost in the owner browser (and inspect any remaining injected attributes), then reload and rerun the same entry/feature path. Browser configuration was not changed by this audit. |
| P2-1 | P2 | Basketball remains a small square without seams. This is also part of P1-1's missing acceptance work. | Use the intended polished renderer during explicit integration; avoid a competing cosmetic patch here. |

No application P0 was reproduced. No small, independently correct application fix resolves either blocking cause. Accordingly **no application files were modified**. There is no symptom-suppression patch, no assertion removal and no React Strict Mode change. This report is a documented failed readiness gate, not a claim that all requested work is complete or that the separate branch is safe.

Fix ledger: application fixes **none**; root causes and minimum directions above. Files changed by this audit are the report and three supporting evidence files. Regression risk is documentation-only; lint/typecheck/test/build passed at the unchanged application SHA. The original triggers remain documented as reproducible in the owner profile / absent in clean browser, rather than marked fixed because terminal output became quiet.

## Git changes

- START_SHA: `4c7564458951b18dda70dd3e2c549dcd7f939a08`.
- Application source after audit: identical to START_SHA.
- QA_COMMIT / FINAL_SHA: the documentation-only commit containing this report, titled `docs: record final predeploy audit blockers`. Its exact SHA is reported in the audit response; obtain it locally with `git log -1 --format=%H -- docs/predeploy/FINAL_PREDEPLOY_AUDIT.md`. A committed file cannot contain its own final Git content hash.
- FILES_CHANGED: `docs/predeploy/FINAL_PREDEPLOY_AUDIT.md`, `docs/predeploy/evidence/environment.txt`, `docs/predeploy/evidence/dev-browser-errors.json`, `docs/predeploy/evidence/automated-checks.txt`.
- Only those paths are staged. Existing untracked user work is excluded. No stash/reset/checkout/history rewrite/merge/push/deploy or production Vercel configuration change.

## Manual owner checks (six maximum)

These are checks after choosing the intended deployment snapshot; they are not a substitute for its missing integration or independent audit.

1. **Chrome, localhost:3000:** exclude Urban VPN Proxy from this site, reload, enter the world and open SPORTSGANG. Success: no hydration overlay or M_ID exception; investigate any remaining extension attributes rather than suppressing React diagnostics.
2. **SPORTSGANG → Tennis:** serve, rally on both sides, approach the net and hit an overhead. Success: five distinct actions with ball, racket and spark meeting at the visible contact frame.
3. **SPORTSGANG → Running, desktop and phone:** wait without direction, press S alone, then direction+S, release, switch tabs and return. Success: stationary without direction; S sprints only with movement; stamina recovers and controls never stick.
4. **SPORTSGANG → Golf:** play tee, imperfect approach, overshoot and putt into the cup; replay. Success: correct remaining distance, strokes/penalties/HUD and actual hole completion, with launch at impact.
5. **Golf result / board:** use a non-production namespace if shared storage is configured; try Korean IME, English and GUEST, refresh and check a separate session. Success: honest scope label, one submission per completed run, correct ties/version separation and no DNF best score.
6. **Far-right World Exit:** activate by keyboard and phone touch, test Skip/reduced motion, return and INDEX twice. Success: exact farewell copy, bounded fireworks, usable navigation and no repeated music/count/submission side effects.

**Final verdict: NOT_READY. Do not push or deploy this snapshot as the completed SPORTSGANG polish.**
