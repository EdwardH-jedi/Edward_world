# Edward's World — Implementation Roadmap

The persistent source of truth for remaining implementation work. **Read this
file, `PROJECT_STATUS.md` and `ARCHITECTURE.md` before touching code.** Do not
rely on conversation history.

Statuses: `TODO` · `IN PROGRESS` · `DONE` · `BLOCKED`

---

## Ground rules

- The visual direction, architecture and Claude Design references are approved.
  **Do not redesign.** `index.html` + `scenes.js` at the repo root are the
  approved concept board and are reference only — never imported, never edited.
- Never fabricate project facts, metrics, education, personal details or
  product claims. Verified sources are listed in [Verified facts](#verified-facts).
  If something is unavailable, use an explicit placeholder and record it here.
- Never overwrite working functionality purely to restructure.
- No destructive git commands.
- A visual phase is not done on code inspection alone — run the site and look.

## Per-phase execution loop

1. Mark the phase `IN PROGRESS` here.
2. Inspect the existing implementation before modifying it.
3. Implement the smallest coherent architecture.
4. Run the site; inspect visually; fix obvious visual/interaction problems.
5. `npm test` · `npm run lint` · `npm run typecheck` · `npm run build`.
6. Update `ARCHITECTURE.md` and `PROJECT_STATUS.md`.
7. Commit; record the hash in this file; mark `DONE`.

---

## Verified facts

Everything below was read from Edward's own public repositories on 2026-08-27.
Nothing here is inferred. **Use these; do not invent alternatives.**

| Source | Facts |
|---|---|
| `github.com/EdwardH-jedi/Sportsgang` | "Peer sports matchmaking on mobile — find opponents by sport, issue challenges, book nearby courts, and track results through a ranking and honour system." Stack: React Native/Expo, FastAPI, PostgreSQL, Redis, Docker. |
| `github.com/EdwardH-jedi/wadrobe` | "Local-first digital wardrobe — browser-persisted garment archive, outfit composition, and a scoped proxy-3D experiment. React, TypeScript, Vite, Three.js, with a FastAPI image service." |
| `github.com/EdwardH-jedi/AFL_predict` | "Paper-trading AFL research system — scheduled ingestion, temporal feature engineering, calibrated ensemble models, backtesting, and a FastAPI service. **No live betting.**" Python-dominant. |
| `github.com/EdwardH-jedi/soonpermario` | "Edward's Career Quest" — HTML5 Canvas + vanilla JavaScript platformer, no build step. Mechanics: move, jump (hold for higher), throw a skill (X/J), ?-blocks drop résumé skills, coins are commits, lives are coffee, final flag is the graduate offer. Final boss "THE JOB" damaged only by thrown skills. |
| soonpermario `README.md` (biography) | Jeju Island 2017–2022: St Johnsbury Academy Jeju; Arduino contactless coffee machine capstone; Samsung Enterprise Competition Grand Prize. Seoul 2021: Materials Science & Engineering research internship, Seoul National University. University of Sydney 2022–2026: Bachelor of Advanced Computing (Computer Science). Sensorway — Ecopro, Hungary 2025–2026: Computer Vision & Field Deployment internship, ~750 sensors, Docker, data pipelines, live rollout. |
| soonpermario `README.md` (contact) | Edward (Soon Hyun) Hwang — Sydney, NSW · edwardhwang1223@gmail.com · linkedin.com/in/soon-hyun-hwang-7212a42b7 · github.com/EdwardH-jedi |

**AFL framing constraint:** the repository explicitly says *paper-trading
research, no live betting*. The AFL Lab must present itself as a research
pipeline, never as a live forecasting or tipping service, and must not display
invented accuracy figures.

---

## Open decisions for Edward

Carry these forward until resolved. None of them block implementation.

| # | Decision | Current handling |
|---|---|---|
| D1 | Public contact surface | **Resolved for now.** Using the email + LinkedIn published in the soonpermario README, surfaced in the Index and in Edward's House. Swap if a different contact surface is preferred. |
| D2 | Resume content | `/resume` is a placeholder. Structure can be built from the verified biography above, but a resume is an identity document and needs sign-off before it ships as fact. |
| D3 | League of Legends rank (Phase 5) | Build a data hook and an explicit placeholder only. Never display a number that was not supplied. |
| D4 | Case study bodies | `/case-studies/[slug]` are placeholder routes. Real write-ups are Edward's to author. |

---

## Phase 0 — Baseline

**Status:** DONE

**Scope.** Commit the two approved but uncommitted deliverables so every later
phase has a real parent, and establish the roadmap.

**Acceptance criteria.**
- [x] Working tree clean.
- [x] Each commit is independently coherent and buildable.
- [x] Roadmap and status documents exist.

**Validation.** lint, typecheck, 35 tests (8 files), production build all pass
before each commit. Working tree clean afterwards.

**Commits.** `0e95e47` world visual pass · `3846f22` SportsGang location.

---

## Phase 1 — SportsGang complete experience

**Status:** DONE

**Scope.** Turn SportsGang into the most interactive location: a reusable
mini-game architecture plus four selectable sports. Preserve the existing
phone → matchmaking → physical sport concept and the FLIP court transition.

Architecture to build:

```
SportsGang
├── Phone            (exists)
├── Matchmaking      (exists)
├── SportTransition  (exists — FLIP court expansion, generalise per sport)
└── MiniGames
    ├── Golf         power/timing meter → swing → flight → camera → distance
    ├── Tennis       convert scripted rally to timed returns, ~3 points
    ├── Basketball   timing release → trajectory → make/miss, ~3 shots
    └── Running      pace vs stamina management to the finish
```

Timing regimes must stay separate:
- `setTimeout` drives stage state (existing).
- anime.js drives scripted choreography, fire-and-forget (existing).
- `requestAnimationFrame` drives player-controlled play (**new**).

Pure simulation per sport in `lib/game/minigames/<sport>.ts` as
`advance(state, input, dt) → state`; no React, no DOM, no rAF. One shared
`useGameLoop` hook. One shared meter primitive (golf power, tennis timing,
basketball release are the same component).

**Acceptance criteria.**
- [x] Four sports selectable from the existing phone `SPORT_SELECT` stage.
- [x] Every displayed number derives from real player input.
- [x] Keyboard **and** pointer/touch input for every sport.
- [x] Each sport returns to the shared result → project-context state, reading
      links and stack from canonical project data.
- [x] Pure simulations unit-tested for determinism and bounds.
- [x] Escape exits; sequence replayable; sport switchable via REPLAY.
- [~] Reduced motion: stage dwell and choreography are guarded, but the media
      query still cannot be emulated with the available tooling. Carried to
      Phase 10.

**Validation result.**

Gates: lint, typecheck, **58 tests (9 files)**, production build — all pass.

Browser, entering the real way (walk to the building, press `E`):

| Sport | Evidence |
|---|---|
| Golf | 88% power + centred contact → **245 M, FAIRWAY, PURE STRIKE**. Control run at 29% power → **80 M**. Distance tracks input. |
| Tennis | Three points swung on the window → **3 PERFECT, 3–0**. |
| Basketball | Three releases inside the band → **3/3 made, 3 swishes**. |
| Running | Push-then-ease pacing → **200 m in 0:31.5, 62% stamina left, "JUDGED IT WELL"**; ~34s wall clock. |

Four defects found by looking rather than by reading code, all fixed:
1. The 800 m race took ~3 minutes. Retuned to 200 m so pacing bites inside a
   demonstration; locked in by a test asserting the race stays 15–50s.
2. Going all out beat pacing, because exhaustion cleared the instant stamina
   ticked above zero. Exhaustion now latches until the tank is 45% back.
3. The court was invisible during play — the stylesheet still keyed visibility
   on the old `RALLY` stage name after the rename to `PLAY`.
4. The golf flag floated above the green and the basketball arc ended at floor
   level rather than at the ring; the hoop had no post and collided with a
   backdrop banner.

**Commit.** `4f75600`

---

## Phase 2 — Wardrobe

**Status:** DONE

**Scope.** An interactive clothing archive, **not** a mini-game. Compact pixel
interior consistent with the world. Flow: `CAPTURE → ARCHIVE → ORGANISE →
COMPOSE → SAVE LOOK`. Visitor inspects/selects a garment, archives it, sees
basic metadata, arranges garments, composes an outfit on a mannequin, saves the
look. Interaction should explain the product philosophy: local-first,
browser-persisted, the archive is yours.

**Acceptance criteria.**
- [x] All five flow steps reachable and legible, each gated on its own
      precondition.
- [x] Garment metadata is structural only — name, layer, colour, fabric,
      season. No inferred style, no confidence score, no product claims.
- [x] Composition reads clearly; layers stack in body order.
- [x] Ends in the shared project-context state with real links and stack.
- [x] Every garment is a real focusable control; pointer and keyboard both work.

**Validation result.**

Gates: lint, typecheck, **73 tests (10 files)**, production build — all pass.

Browser, entering the real way: captured six garments, walked CAPTURE → ARCHIVE
→ ORGANISE → COMPOSE → SAVE, dressed all four layers, saved.
`localStorage` genuinely held
`{"TOP":"grey-hoodie","BOTTOM":"faded-denim","SHOES":"leather-boots"}`.
Left to the world and came back: **the recall notice appeared** — "YOUR SAVED
LOOK IS STILL HERE · STORED IN THIS BROWSER · NOTHING LEFT THIS DEVICE". That
return visit is the point of the location: the philosophy is enacted, not
described. Mobile at 390x844: everything inside the viewport, no horizontal
scroll. Console clean.

Defects found by looking: the panel was pushed off-centre because anime.js
writes `transform` and overwrote the CSS `translateX(-50%)` centring (now
centred with margin); the room read as a vast empty wall (picture rail, raised
floor, minimum column heights); and on mobile the columns sat at content width
rather than stretching.

Also added, from the same verified sources as Phase 0: real `techStack` for
Wardrobe, AFL Predict and Soonpermario, and Soonpermario's GitHub URL, which
was previously `undefined`.

**Commit.** `0f85d71`

---

## Phase 3 — AFL Lab

**Status:** DONE

**Scope.** An interactive prediction *research* lab. The visitor picks a winner
first, then runs the pipeline: `MATCH DATA → FEATURES → MODELS → CALIBRATION →
PREDICTION → EVALUATION`, visualised with pixel CRTs and data movement. The
user's pick is compared with the model's pick.

**Acceptance criteria.**
- [x] `WHO WINS?` → pick → `RUN MODEL` → the rack lights stage by stage →
      picks compared. `RUN MODEL` is disabled until a side is chosen.
- [x] Teams are `TEAM A` / `TEAM B`. No real clubs, fixtures or results.
- [x] Framed as paper-trading research; the summary states plainly that it is
      not a tipping service, not a forecast, and claims no accuracy.
- [x] Each stage shows what it actually computed, so the pipeline explains
      itself — most of all calibration, where the raw number is visibly pulled
      back towards even.
- [x] Ends in the shared project-context state.

**Validation result.**

Gates: lint, typecheck, **84 tests (11 files)**, production build — all pass.

Browser: walked in, picked a side, ran the model. All six CRTs progressed
`1 → 6`; every panel showed figures traceable from the demonstration round:
form diff `+3.6` → ensemble `+0.694` → **raw `66.7%` calibrated to `59.0%`,
"PULLED TOWARDS EVEN"** → `TEAM A 59.0% / TEAM B 41.0%`. Picking the other
side correctly reported disagreement. Console clean.

The pipeline is unit-tested for determinism by seed, feature symmetry (swapping
the sides flips every sign), calibration always shrinking confidence towards
even, probabilities staying probabilities across 300 seeds, and the evaluation
copy never containing a verdict word.

Defect found by looking: at `RESULT` the console and the project summary were
both anchored to the bottom and overlapped. `ProjectSummary` now accepts
children, so the outcome lives inside it and the console steps aside.

**Commit.** `782bf96`

---

## Phase 4 — Soonpermario arcade

**Status:** DONE

**Scope.** Arcade interior; approach the cabinet; `E TO PLAY`; the machine
screen expands (reuse the SportsGang FLIP transition); one polished playable
segment of roughly 15–30 seconds. Mechanics: move, jump, obstacle, finish.
Preserve the playful identity of "Edward's Career Quest" using original assets
only — no Nintendo likenesses.

**Acceptance criteria.**
- [x] Walk the arcade floor with the world's own movement, approach the
      cabinet, `E TO PLAY`; the cabinet's display expands into the game using
      the same screen-to-slot projection the SportsGang phone uses.
- [x] Move, jump, three patrolling bugs, three pits, a flag. Keyboard and
      on-screen touch controls.
- [x] Completable in about eleven seconds; falls and hits cost a coffee and
      return you to a checkpoint, so failure is recoverable.
- [x] Original geometry, original wording, original art. No Nintendo likeness.
- [x] Ends in the shared project-context state with the run's own figures.

**Validation result.**

Gates: lint, typecheck, **99 tests (12 files)**, production build — all pass.

Completability is proved by a bot that plays the level rather than by
assertion: it finishes in ~10.7s with one recoverable fall. Two real defects
surfaced only because that bot kept dying:

1. The jump cut was a per-frame multiplier, so it compounded and any jump not
   held for its whole rise collapsed to nothing. It is a clamp now — a tap
   clears a bug, a hold clears a gap.
2. Landing on a bug killed the player, which made the level close to
   unplayable. The original's own README says stomping works, so it does here.

Browser: walked the floor (prompt changes from "WALK TO THE CABINET" to
"SOONPERMARIO · E TO PLAY", the play button enables only in range), pressed
`E`, the screen expanded, played, and reached the summary. The camera was
confirmed scrolling (259px) with the player clearing the first pit. Console
clean.

A third defect found by looking: the camera translate was applied in unscaled
pixels while the level itself was scaled, so the view would have drifted as the
player advanced. The scale now lives on a wrapper and the camera translates in
level units inside it.

**Commit.** `786ed03`

---

## Phase 5 — Edward's House

**Status:** DONE

**Scope.** The personal/About experience, discovered through objects rather
than a page. Interactions: map (Korea → Sydney), desk (Computer Science /
university), computer (GitHub / development), document (resume), clothing
(fashion interest), gaming PC (League of Legends — placeholder + data hook, D3).
Communicates *who Edward is*, where the other buildings communicate *what he
builds*. Personal details stay subtle.

**Acceptance criteria.**
- [x] Six objects — map, desk, computer, papers, rail, gaming PC — each a
      short beat you walk up to and look at.
- [x] Every biographical line traceable to [Verified facts](#verified-facts),
      via `data/personal.ts`.
- [x] No About panel: the room is walked with `A`/`D` and `E`, the same verbs
      as the world outside. Objects are also clickable.
- [x] The League of Legends shelf is a typed `leagueRank: string | null` hook.
      While it is null the room says the rank is not published rather than
      inventing a tier (D3).

**Validation result.**

Gates: lint, typecheck, **99 tests (12 files)**, production build — all pass.

Browser: entered from the world, walked the room, opened all six objects and
confirmed each carries only verified content — Jeju/Seoul/Sydney/Hungary with
real years, the University of Sydney degree, the Sensorway internship, the
published contact address, the Wardrobe cross-link, and the honest
"rank not published here yet" placeholder. Progress read `6 OF 6 LOOKED AT`.

Non-project locations now open through a typed `OPEN_LOCATION` action, so the
router does not have to special-case a building id.

Defect found by looking: the objects were positioned in absolute pixels and
crowded the left two-thirds of the room. They are laid out as fractions of a
centred stage now, so the room holds its shape at any width.

**Commit.** `37586cc`

---

## Phase 6 — Index mode final pass

**Status:** DONE

**Scope.** Finish the recruiter fast path. One interaction must expose:
SportsGang, AFL Predict, Wardrobe, Soonpermario, About, Resume, GitHub,
Contact. Stays clean, contemporary, editorial — never pixel-game UI. Every
project must be understandable without playing the world.

**Acceptance criteria.**
- [x] All eight destinations in one interaction: the four projects (each with a
      case study and a GitHub link), Resume, GitHub, LinkedIn and Contact.
      About is a section in the same panel.
- [x] Contact resolved (D1) — email and LinkedIn as published in the
      soonpermario README, plus the GitHub profile.
- [x] Each project readable without entering the world: name, the role the
      world gives it, the canonical descriptor, the verified stack, both links.
- [x] Editorial throughout — warm off-white, charcoal, numbered grid, grotesk
      headings with mono metadata. No pixel or game styling anywhere in it.

**Validation result.**

Gates: lint, typecheck, 99 tests, production build — all pass.

Browser: opened the index from the world control and confirmed all twelve links
resolve to the right places, all four projects carry their verified stack, and
the panel keeps the dialog's focus trap and Escape handling.

Two fixes: the panel drew a heavy orange focus ring around itself because it
takes focus programmatically — that ring belongs on controls a keyboard moves
between, not on a container. And the old index stylesheet left three orphaned
selectors behind, now removed.

**Commit.** `1120cbe`

---

## Phase 7 — Title screen

**Status:** DONE

**Scope.** `WELCOME TO / EDWARD HWANG'S WORLD`, `[ PRESS ENTER ]`,
`SKIP TO INDEX →`, over the existing world as visual context. Enter-key
activation plus clickable/touch controls. Restrained — not elaborate.

**Acceptance criteria.**
- [x] `Enter` starts the world; `[ PRESS ENTER ]` and `SKIP TO INDEX →` are
      real focusable buttons, so pointer and touch work too. Enter is ignored
      while a button has focus, so it activates that button instead.
- [x] The backdrop is the **actual world** — the same `drawBackdrop` and the
      same building art the player walks through a moment later, not a separate
      illustration.
- [x] The blink is a CSS loop and is disabled under `prefers-reduced-motion`.

**Validation result.**

Gates: lint, typecheck, 99 tests, production build — all pass.

Browser: the composition matches the approved board — `WELCOME TO` in spaced
mono, the wordmark in bitmap, `SYDNEY, AU — 2026`, the world behind with
Edward's House and the Wardrobe, and `SKIP TO INDEX →` in the corner. `Enter`
moved the sequence to `APPROACH`.

Defect found by looking: `[ PRESS ENTER ]` was charcoal on dark earth and
almost invisible mid-blink. It is cream with a shadow now, and the blink floor
was raised from 0.25 to 0.45.

**Commit.** `<phase-7>`

---

## Phase 8 — Six-second intro

**Status:** TODO

**Scope.** The approved opening ritual, only once the world and project
experiences work. `Edward approaches → stops → glyph creatures emerge →
E D W A R D → glyphs move into door → door unlocks → world reveal`, ~6s, anime.js
choreography, original glyph creatures only (reference forms exist in
`scenes.js`). `SKIP INTRO` always available; `prefers-reduced-motion` respected.

**Acceptance criteria.**
- [ ] Full sequence in ~6s; existing `intro-machine` timings reused.
- [ ] Skip works at every stage.
- [ ] Reduced motion collapses motion without breaking the sequence.

**Validation result.** _(pending)_ · **Commit.** _(pending)_

---

## Phase 9 — World polish / TOMODACHI

**Status:** TODO

**Scope.** Final world-life pass — ambient animation, signs, props, small
details, NPC positioning, transitions, TOMODACHI dialogue and easter eggs.
TOMODACHI stays a small NPC. Do not overload the world.

**Acceptance criteria.**
- [ ] Improvements are additive; nothing approved is regressed.
- [ ] TOMODACHI has a few lines with light state; still incidental.
- [ ] No measurable frame-time regression in the world.

**Validation result.** _(pending)_ · **Commit.** _(pending)_

---

## Phase 10 — Release pass

**Status:** TODO

**Scope.** Full production pass: desktop, mobile, keyboard, touch, reduced
motion, accessibility, focus behaviour, responsive layout, animation cleanup,
clipping, pixel rendering, performance, console errors, broken links,
metadata/SEO, 404, production build.

**Acceptance criteria.**
- [ ] Every route and every location checked in a real browser at desktop and
      mobile sizes.
- [ ] No console errors anywhere.
- [ ] All links resolve; metadata and 404 correct.
- [ ] Keyboard-only traversal of the whole product is possible.

**Validation result.** _(pending)_ · **Commit.** _(pending)_

---

## Known gaps carried forward

- **Touch entry into buildings.** Entering a location is keyboard-only (`E`);
  the world has no touch affordance for interaction. Locations lay out
  correctly on mobile but are unreachable there. Fix in Phase 10 at the latest.
- **Reduced motion is not browser-verified.** The stage machines are
  unit-tested and the choreography is guarded by `prefersReducedMotion()`, but
  the media query cannot be emulated with the available tooling. Verify
  manually in Phase 10.
- **Case studies and resume are placeholder routes** (D2, D4).
