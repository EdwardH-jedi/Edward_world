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
| D5 | Where `ESC` leaves the ritual | The board pairs "ESC or SKIP TO INDEX exits the ritual at any time", but those are two destinations here. **Resolved:** `ESC` and `SKIP GATE` leave the ritual for the world; `SKIP TO INDEX` goes to the index. Both are on screen throughout, and `ESC` is bound at **every** intro beat — not only while the gate is asking — which is what "at any time" says. Change if Edward reads it the other way. |

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

**Status:** DONE — **superseded by Phase 11.** The screen below shipped and
worked; the design's V4 revision then moved the title off the world backdrop
and onto the dusk approach scene. Kept here for the record.

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

**Commit.** `3f4ebf4`

---

## Phase 8 — Six-second intro

**Status:** DONE — **superseded by Phase 11.** The glyph-creature ritual below
shipped and worked; the design's V4 revision replaced it with the approach and
the name gate. Its six-second budget is deliberately not carried forward — see
Phase 11. Kept here for the record.

**Scope.** The approved opening ritual, only once the world and project
experiences work. `Edward approaches → stops → glyph creatures emerge →
E D W A R D → glyphs move into door → door unlocks → world reveal`, ~6s, anime.js
choreography, original glyph creatures only (reference forms exist in
`scenes.js`). `SKIP INTRO` always available; `prefers-reduced-motion` respected.

**Acceptance criteria.**
- [x] `Edward approaches → stops → glyph creatures emerge → E D W A R D →
      glyphs move into the door → door unlocks → world reveal`, in **6000ms
      exactly**, asserted by a test on `INTRO_TOTAL_MS`.
- [x] `SKIP INTRO →` and `SKIP TO INDEX` are present at every stage.
- [x] Six original glyph creatures, one per letter, each with one glowing eye.
      No borrowed alphabet.
- [x] Reduced motion collapses every tween to a millisecond while the stage
      sequence still plays.

**Validation result.**

Gates: lint, typecheck, **100 tests (12 files)**, production build — all pass.

Browser: pressed Enter and watched the machine walk
`APPROACH → STOP → GLYPH_REVEAL → EDWARD_FORMATION → DOOR_UNLOCK → DOOR_OPEN →
WORLD` in **6071ms** wall clock. At the formation beat all six creatures were
lined up at 30–70% across, fully visible. Skipping mid-sequence landed straight
in the world.

Two defects found by looking. The creatures were invisible through the whole
formation beat: each stage's cleanup reverted its timeline, which wiped the
opacity the previous beat had just animated in. The intro's timelines are
paused now, and each beat pins the state it inherits. And the old placeholder
stylesheet still defined `.intro-stage` and `.intro-door`, which quietly
overrode the real scene — 64 stale lines removed.

**Commit.** `6ca3ad2`

---

## Phase 9 — World polish / TOMODACHI

**Status:** DONE

**Scope.** Final world-life pass — ambient animation, signs, props, small
details, NPC positioning, transitions, TOMODACHI dialogue and easter eggs.
TOMODACHI stays a small NPC. Do not overload the world.

**Acceptance criteria.**
- [x] Additive only. No approved art, geometry or interaction was changed.
- [x] TOMODACHI has five conversations that progress as you keep stopping, and
      keeps its last word rather than running out. Lines are capped at three
      per conversation and 72 characters each, tested, so it stays a small NPC
      and never pitches the portfolio.
- [x] It wanders near the house, closing the deviation recorded in Phase 1.
      The drift is visual only — the interaction range is still measured from
      where it lives, so the prompt can never slide out from under someone
      standing next to it.
- [x] The wander rides the world's existing ambient frame, so it costs nothing
      new: no extra timer, no extra loop.

**Validation result.**

Gates: lint, typecheck, **103 tests (13 files)**, production build — all pass.

Browser: walked to TOMODACHI, watched it drift back and forth across eight
distinct positions, and held four conversations in a row — each one different,
in order.

Deliberately **not** done: no new props, signs or ambient layers. The world
reads as a place already, and the brief asks not to overload it.

**Commit.** `dc6160e`

---

## Phase 10 — Release pass

**Status:** DONE

**Scope.** Full production pass: desktop, mobile, keyboard, touch, reduced
motion, accessibility, focus behaviour, responsive layout, animation cleanup,
clipping, pixel rendering, performance, console errors, broken links,
metadata/SEO, 404, production build.

**Acceptance criteria.**
- [x] Every route and every location checked in a real browser at 1440x900 and
      390x844.
- [x] No console errors or warnings anywhere.
- [x] All links resolve; metadata, robots, manifest and 404 correct.
- [x] Keyboard-only traversal of the whole product is possible — **and now
      pointer-only traversal too**.

**Validation result.**

Gates: lint, typecheck, **103 tests (13 files)**, production build — all pass.

| Check | Result |
|---|---|
| Routes | `/`, `/resume`, four case studies, `/robots.txt`, `/manifest.webmanifest` all 200; unknown path 404s with the right body. |
| Metadata | Titles template correctly (`Wardrobe \| Edward's World`), descriptions and Open Graph present, `lang="en"`, theme colour set. |
| External links | All six resolve 200: four project repos, the GitHub profile, LinkedIn. |
| Desktop | Title, index, world and all five locations mount, each with a visible exit; Escape returns to the world every time. |
| Mobile 390x844 | No horizontal document scroll on any screen. (The world track is deliberately wider than the viewport inside a clipped container.) |
| Accessibility | Landmarks and `aria-label`s present, a polite live region per surface, **every canvas `aria-hidden`**, no image without alt, focus moves to the right control on each beat and is restored on exit. |
| Reduced motion | **Browser-verified at last.** World ambient motion freezes completely; the intro collapses to an instant cut; SportsGang dwells ~810ms per stage instead of 1ms — the documented divergence, working. |
| Performance | A full backdrop repaint costs **0.4ms**. Frame time measured a flat 33.3ms with a p95 of 33.7ms — and stayed identical with every app timer stopped, so that is the display presenting at 30Hz, not the app. |
| Console | Clean on every surface. |

**The one real gap closed here:** entering a building was keyboard-only, so the
locations laid out correctly on a phone but could not be reached on one. The
world now has pointer walk controls and the status bar doubles as the tap
target for whatever is in reach — verified by moving 345px and opening Edward's
House without touching the keyboard.

**Commit.** `007a6bf`

---

## Phase 11 — V4 intro revision: the approach and the name gate

**Status:** DONE

**Scope.** The design project's newest board, headed *"4A — INTRO REVISION —
V4 · CAMERA SHIFT + TYPING GATE — TITLE + INTRO ONLY · WORLD & INDEX
UNCHANGED"*. Two changes to the shipped intro. The title screen no longer shows
the monument: the visitor meets a richer pixel Sydney first, and `ENTER` pans
the camera east to the shrine clearing. And after the letters assemble into
`SOON HYUN HWANG`, the world asks the visitor to type it — a carved inscription
slab, not a form.

The board's "WORLD & INDEX UNCHANGED" claim was checked rather than trusted:
its V1 section copy was extracted and diffed against the shipped `index.html`,
which returned *identical copy: True*. Nothing outside the intro was touched.

**The eight-frame storyboard**, one stage each, `types/intro.ts`:

| Frame | Stage | Monolith phase |
|---|---|---|
| F1 | `TITLE` | — (monument off-screen) |
| F2 | `PAN` | — (distant crown entering) |
| F3 | `SHRINE` | 3 · dormant |
| F4 | `SELECTION` | 4 · letters pulling free |
| F5 | `NAME` | 5 · assembled, sockets behind |
| F6 | `ASK` | 6 · the inscription slab surfaces |
| F7 | `TYPING` | 7 · the monument answers |
| F8 | `UNLOCK` | 8 · seam, doorway, bloom |

**Acceptance criteria.**
- [x] The title screen shows no monument — only the faint warm glow past the
      right treeline that the scene draws at camera offset zero.
- [x] `ENTER` pans east with parallax at 0.25 / 0.55 / 1.0, ending on the
      offset the board's own F2 frame is drawn at.
- [x] Thirteen carved sockets, one per letter, gaps for the spaces. No input
      box, no border-radius, no focus ring.
- [x] A wrong key flashes its socket dark and types nothing; backspace lifts
      the last letter back out; case is ignored; spaces auto-skip; keys that
      are not letters are ignored rather than counted as mistakes.
- [x] Channels brighten every third letter, the apex ring wakes at halfway,
      the braziers catch on the final word, and completion is a door — never
      a success toast.
- [x] The assembled name stays on screen while typing: the gate tests
      presence, not memory.
- [x] `ESC` / `SKIP GATE` and `SKIP TO INDEX` are on screen at every stage,
      and `ESC` is bound at every beat of the intro rather than only at the
      gate (D5).
- [x] Reduced motion collapses the six scripted beats but leaves the gate
      waiting, because a gate is interaction, not motion.

**Architecture.** `lib/game/name-gate.ts` is pure — no React, no DOM, no
timers — so the component decides nothing. It records *that* a key missed and
*where* (`missAt` plus a monotonic `misses`), and the view owns how long the
flash lasts. The monument's response is derived from the name (`APEX_AT`,
`BRAZIER_AT`) rather than hardcoded, so the thresholds cannot drift from the
letters. `lib/pixel/opening.ts` keeps its own palette: the opening is a
different time of day and a different place from the world.

**Deliberate departures from the design source**, each because a static board
cannot express what its own copy asks for:

1. The miss flash is held by the view for 260ms. The source gates it on
   `frame % 2`, and `frame` is the 450ms ambient tick — a wrong key could show
   no feedback at all, or blink forever if the visitor stopped typing.
2. The tablet cursor draws on even parity instead of odd, so a frozen
   reduced-motion frame still shows where the next letter lands.
3. The phase-7 channel brightens with the letters typed. The board's copy
   asks for "every third correct letter: monument channels brighten one step";
   its code, having no live gate, draws a constant. The constant is now the
   floor rather than the whole behaviour.

One latent bug in the design source was resolved rather than copied:
`flowers(..., P.blue2)` names a palette entry that `opening.js` does not
define, which on a canvas silently reuses the previous fill. The port passes
`P.water`, the nearest defined colour.

**Validation result.**

Gates: lint, typecheck, **127 tests (14 files)**, production build — all pass.

Browser, at 1440x900. The title screen reads as intended: harbour, bridge,
terraces, canopy trees, first stars, drifting motes, Edward on the path, no
monument. Walked the whole sequence and drove the gate by dispatched keystroke:
`s o o` set three letters, `x` typed nothing, backspace dropped back to two,
`Tab`/`ArrowLeft`/`F5`/`1` were ignored, and `ON HYUN HWANG` — spaces included —
finished the name and advanced to `UNLOCK`, then into the world. The bloom
transitions to full opacity before the cut. Under a forced
`prefers-reduced-motion` the six scripted beats collapsed straight to `TYPING`,
which correctly kept waiting. Console clean on every frame.

Five defects found by looking, none visible in source:

- `[ PRESS ENTER ]` sat exactly on the seam between the stone path and the
  soil, unreadable. The soil band starts at 87% of the frame, so the call to
  action was moved onto it and the position checked by measurement rather than
  by eye.
- The intro's `SKIP` controls were positioned against the screen while the
  scene is a letterboxed 16:9 frame, so they floated in the black margin below
  it. They live inside the frame now, where the title's always did.
- The pan had been given an invented distance of 150 art pixels, which slid
  the near layer far enough to carry both framing canopy trees out of shot.
  The board draws its F2 frame at 60 — the crown just entering the right edge —
  so that is what the pan lands on.
- **One `Tab` press killed the gate.** The keydown handler yielded to any
  focused button before deciding whether the key was one the gate takes, so
  tabbing to `SKIP` left every letter and backspace silently swallowed, with
  no feedback, until the visitor clicked away. A button owns `Enter` and
  `Space` and nothing else; the guard says so now. Verified by focusing
  `.intro-skip` and typing into it: the letter lands, backspace lifts it out,
  and a space is still left to the button.
- `ESC` was bound only during the gate, but the board says the ritual can be
  left "at any time" and the `SKIP INTRO` button is already on screen at every
  beat. `ESC` from the middle of the camera pan now lands in the world (D5).

One non-defect worth recording, since it cost time: the bloom's computed
opacity stayed at `0` through an entire `UNLOCK` beat. It was not the app. A
synthetic element with the same class and attribute behaved identically in that
browser session, and setting `transition: none` snapped it to `1` — the page
had simply stopped advancing its animation clock, which is also why screenshots
had begun timing out. A fresh page showed the transition running normally.

**Commit.** `5c57f54`

---

## Phase 12 — The monument intro as a real interaction

**Status:** DONE

**Scope.** Close the gaps between the shipped V4 storyboard and the approved
brief: a typing gate that works on a phone, letters that are visibly taken from
the monument one at a time, anime.js owning the scripted motion, and tests for
the transitions and the name validation. No redesign — the V4 visual
implementation stays the source of truth.

**Stage vocabulary.** The brief names its states
`TITLE / MONUMENT_REVEAL / LETTER_SELECTION / NAME_REVEAL / NAME_INPUT /
UNLOCK / WORLD` and allows equivalents. The shipped machine already has them,
split a little finer, and was extended rather than renamed:

| Brief | This machine |
|---|---|
| `TITLE` | `TITLE` |
| `MONUMENT_REVEAL` | `PAN` → `SHRINE` |
| `LETTER_SELECTION` | `SELECTION` |
| `NAME_REVEAL` | `NAME` |
| `NAME_INPUT` | `ASK` → `TYPING` |
| `UNLOCK` | `UNLOCK` |
| `WORLD` | `WORLD` |

**Acceptance criteria.**
- [x] The gate is a real focused text input over the carved sockets, so a tap
      raises a phone's native keyboard and assistive technology gets a labelled
      control — with no visible box, radius, caret or focus ring.
- [x] Validation is a text reducer, not a keystroke machine, so swipe
      keyboards, IMEs and pasting the whole name all work.
- [x] Case-insensitive; leading, trailing and interior whitespace never fail
      the gate; an incomplete name never unlocks.
- [x] A wrong letter dims its socket and lands nothing — no red text, no form
      error, input still editable.
- [x] Thirteen letters leave the stone on their own schedules, each from its
      own carving, each leaving a recess.
- [x] Repeated letters (O, N, H) come from separate visible carvings.
- [x] anime.js drives the pan and the extraction; stage progression stays on
      `setTimeout`.
- [x] Reduced motion keeps the whole route and the typing requirement, without
      the travel.
- [x] `SKIP TO INDEX` still bypasses the intro at every beat.

**Architecture.** `applyText(state, raw)` commits the matched prefix and drops
the rest, so what the input shows and what the stone holds can never disagree.
`pressKey` survives as a thin bridge over the same reducer for keystrokes that
miss the input — one code path, two writers. The input is deliberately
uncontrolled: a refused letter has to be taken back out of the DOM even when
React sees no state change.

`drawMonolith` gained a `lifted` float. `selTarget(n, cx - 100, 16)` already
lands on the phase-5 name coordinates, so a letter that finishes its journey
sits exactly where the hero beat draws it — the cut is continuous by
construction rather than by tuning.

**Why `INTRO_SCRIPTED_MS` moved again.** 8000 → 9800. Thirteen separate
journeys need 2600ms to read as a selection rather than a wave, and the hero
beat needs 1800ms to be read rather than glimpsed. The six-second budget from
Phase 8 was superseded by V4; this supersedes that in turn, deliberately.

**Validation result.**

Gates: lint, typecheck, **146 tests (15 files)**, production build — all pass.

Browser, 1440x900 and 390x844. Every edge case in the brief was driven and
observed: twelve Enter presses on the title advanced exactly one stage; twelve
more during the reveal changed nothing; the whole name typed before `TYPING`
left the gate at 0 of 13; the beats ran `PAN → SHRINE → SELECTION → NAME →
ASK → TYPING` in order; a wrong letter held at 4 of 13 with the text unchanged;
backspace stepped back; an incomplete name plus six Enter presses did not
unlock; `soon hyun hwang` with stray leading and trailing spaces did; Escape
from mid-pan left for the world; `SKIP TO INDEX` mid-intro opened the index and
returning to the world left Edward moving 168px and all six buildings intact.
Console clean throughout.

Three defects found by looking:

- **On a phone, the skip button covered the middle of the inscription slab.**
  The enlarged tap target reached the bottom-right corner where the controls
  sat, so a finger aiming at the slab would have left the intro instead. The
  controls move above the slab on coarse pointers. Found by sampling
  `elementFromPoint` across the slab rather than by trusting the layout.
- The mobile tap target was 29px tall, under the 44px guideline. The slab keeps
  its drawn size; only what is tappable grows — 210x46 now.
- Agent worktrees under `.claude/` were being globbed into `vitest` and
  `eslint .`, running a doubled suite against a stale checkout and reporting
  ~4,880 lint problems from code nobody is editing. Both tools now ignore it.

**On the browser's animation clock.** Midway through the pass the page stopped
issuing `requestAnimationFrame` callbacks entirely — zero frames in 500ms while
reporting `visibilityState: "visible"` — which froze CSS transitions and hung
screenshots. It is an environment fault, not the app: a fresh page ran at 60fps.
It did prove the architecture, though. `setTimeout` kept running, so the intro
walked its stages correctly on a page where every animation was dead. That is
exactly why stage progression must never advance from an animation callback.

Because screenshots hang whenever rAF is repainting continuously, the
extraction is verified by `tests/monument-extraction.test.ts`, which records
what the routine draws and asserts one recess per lifted letter, distinct
carvings for repeated letters, and letters landing on the name's own
coordinates. That is a stronger check than a frame grab.

**Commit.** `6dcd50e`

---

## Known gaps carried forward

Both of the gaps recorded earlier were closed in Phase 10: the world is now
reachable by pointer, and reduced motion was verified in a browser.

What remains is content, not code:

- **Case study bodies** are placeholder routes (D4). The four `/case-studies/*`
  pages render the canonical descriptor and a GitHub link, and are ready for
  real write-ups.
- **The resume page** is a placeholder (D2). `data/personal.ts` already holds
  the verified biography a real resume page would be built from, but a resume
  is an identity document and wants Edward's sign-off before it ships as fact.
- **The League of Legends rank** is a typed `null` hook (D3), and the room says
  so rather than inventing a tier.

Everything else in the roadmap is done.
