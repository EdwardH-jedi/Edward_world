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
| D1 | Public contact surface | Using the email + LinkedIn published in the soonpermario README. Swap if a different contact surface is preferred. |
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

**Status:** TODO

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
- [ ] Four sports selectable from the existing phone `SPORT_SELECT` stage.
- [ ] Every displayed number derives from real player input — golf distance
      from meter accuracy, tennis verdict from timing delta, basketball
      make/miss from release point, running finish from the actual pace curve.
      No random or invented metrics.
- [ ] Keyboard **and** pointer/touch input for every sport.
- [ ] Each sport returns to the shared result → project-context state, reading
      links and stack from canonical project data.
- [ ] Pure simulations unit-tested for determinism and bounds.
- [ ] Reduced motion respected; Escape exits; sequence replayable.
- [ ] Existing 35 tests still pass; existing tennis flow still works end to end.

**Validation result.** _(pending)_

**Commit.** _(pending)_

---

## Phase 2 — Wardrobe

**Status:** TODO

**Scope.** An interactive clothing archive, **not** a mini-game. Compact pixel
interior consistent with the world. Flow: `CAPTURE → ARCHIVE → ORGANISE →
COMPOSE → SAVE LOOK`. Visitor inspects/selects a garment, archives it, sees
basic metadata, arranges garments, composes an outfit on a mannequin, saves the
look. Interaction should explain the product philosophy: local-first,
browser-persisted, the archive is yours.

**Acceptance criteria.**
- [ ] All five flow steps reachable and legible.
- [ ] Garment metadata is structural (type, colour, season) — no fabricated AI
      accuracy, no invented product data.
- [ ] Mannequin composition reads clearly at the existing pixel scale.
- [ ] Ends in the shared project-context state with real links and stack.
- [ ] Keyboard and pointer paths; reduced motion respected.

**Validation result.** _(pending)_ · **Commit.** _(pending)_

---

## Phase 3 — AFL Lab

**Status:** TODO

**Scope.** An interactive prediction *research* lab. The visitor picks a winner
first, then runs the pipeline: `MATCH DATA → FEATURES → MODELS → CALIBRATION →
PREDICTION → EVALUATION`, visualised with pixel CRTs and data movement. The
user's pick is compared with the model's pick.

**Acceptance criteria.**
- [ ] `WHO WINS?` → pick → `RUN MODEL` → pipeline animates → picks compared.
- [ ] Teams are neutral/demo labels. No real AFL fixtures, results, accuracy
      figures or model metrics.
- [ ] Framed as paper-trading research, never a live service (see the AFL
      framing constraint above).
- [ ] The pipeline stages explain how the project works.
- [ ] Ends in the shared project-context state.

**Validation result.** _(pending)_ · **Commit.** _(pending)_

---

## Phase 4 — Soonpermario arcade

**Status:** TODO

**Scope.** Arcade interior; approach the cabinet; `E TO PLAY`; the machine
screen expands (reuse the SportsGang FLIP transition); one polished playable
segment of roughly 15–30 seconds. Mechanics: move, jump, obstacle, finish.
Preserve the playful identity of "Edward's Career Quest" using original assets
only — no Nintendo likenesses.

**Acceptance criteria.**
- [ ] Cabinet is a world-consistent interactable; screen expands into play.
- [ ] Move / jump / obstacle / finish all work on keyboard and touch.
- [ ] A run is completable in well under a minute; failure is recoverable.
- [ ] Original art only.
- [ ] Ends in the shared project-context state.

**Validation result.** _(pending)_ · **Commit.** _(pending)_

---

## Phase 5 — Edward's House

**Status:** TODO

**Scope.** The personal/About experience, discovered through objects rather
than a page. Interactions: map (Korea → Sydney), desk (Computer Science /
university), computer (GitHub / development), document (resume), clothing
(fashion interest), gaming PC (League of Legends — placeholder + data hook, D3).
Communicates *who Edward is*, where the other buildings communicate *what he
builds*. Personal details stay subtle.

**Acceptance criteria.**
- [ ] Six object interactions, each a short discovered beat.
- [ ] Every biographical claim traceable to [Verified facts](#verified-facts).
- [ ] No conventional About panel inside the room.
- [ ] LoL rank is an explicit placeholder with a typed data hook.

**Validation result.** _(pending)_ · **Commit.** _(pending)_

---

## Phase 6 — Index mode final pass

**Status:** TODO

**Scope.** Finish the recruiter fast path. One interaction must expose:
SportsGang, AFL Predict, Wardrobe, Soonpermario, About, Resume, GitHub,
Contact. Stays clean, contemporary, editorial — never pixel-game UI. Every
project must be understandable without playing the world.

**Acceptance criteria.**
- [ ] All eight destinations reachable in one interaction.
- [ ] Contact resolved (D1) with the source noted.
- [ ] Each project readable — descriptor, stack, links — without the world.
- [ ] Editorial styling preserved; no pixel/game styling leaks in.

**Validation result.** _(pending)_ · **Commit.** _(pending)_

---

## Phase 7 — Title screen

**Status:** TODO

**Scope.** `WELCOME TO / EDWARD HWANG'S WORLD`, `[ PRESS ENTER ]`,
`SKIP TO INDEX →`, over the existing world as visual context. Enter-key
activation plus clickable/touch controls. Restrained — not elaborate.

**Acceptance criteria.**
- [ ] Enter activates; the buttons are real focusable controls.
- [ ] World art is the backdrop, matching the approved board composition.
- [ ] Works on touch; reduced motion respected.

**Validation result.** _(pending)_ · **Commit.** _(pending)_

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
