# Edward's World — Project Status

Updated after every completed phase. For the task list, acceptance criteria and
verified source facts, see [`IMPLEMENTATION_ROADMAP.md`](./IMPLEMENTATION_ROADMAP.md).

**Last updated:** 2026-08-27 · after Phase 3

---

## Where the project is

| Phase | Area | Status |
|---|---|---|
| 0 | Baseline commits + roadmap | **DONE** |
| 1 | SportsGang complete experience | **DONE** |
| 2 | Wardrobe | **DONE** |
| 3 | AFL Lab | **DONE** |
| 4 | Soonpermario arcade | TODO |
| 5 | Edward's House | TODO |
| 6 | Index mode final pass | TODO |
| 7 | Title screen | TODO |
| 8 | Six-second intro | TODO |
| 9 | World polish / TOMODACHI | TODO |
| 10 | Release pass | TODO |

## What works today

- **Main world** — side-view pixel town, six buildings, terraced terrain,
  stone path, stream and footbridge, town cluster, AFL oval, TOMODACHI. Smooth
  A/D + arrow movement, terrain-following, camera follow, proximity prompts,
  ambient animation on a shared frame counter.
- **SportsGang location** — the only project location with a full experience.
  Enter with `E` → pixel phone → choose one of four sports → matchmaking →
  accept → the phone screen expands into the venue for that sport → play →
  result → project context with real links and stack.
  - **Golf** — stop the power bar, then the contact bar; carry distance and
    fairway/rough are computed from those two stops.
  - **Tennis** — three timed returns graded PERFECT / GOOD / MISS.
  - **Basketball** — three hold-and-release shots; make or miss from the
    release point alone.
  - **Running** — 200 m of pace against stamina; exhaustion latches, so going
    out too hard is slower than pacing it.
- **Wardrobe location** — an interactive archive, not a mini-game. Capture
  garments off the rail, see their structural metadata, organise by layer,
  dress the mannequin, save the look. The look is genuinely written to this
  browser and greets you on your next visit — the product's local-first
  philosophy enacted rather than described.
- **AFL Lab location** — a research lab, not a tipping service. Pick a winner,
  run the model, and a rack of CRTs lights up stage by stage showing what each
  step actually computed from a seeded demonstration round — including
  calibration visibly pulling an overconfident number back towards even.
- **Index mode** — editorial overlay listing the four projects, resume and
  GitHub. Reachable at any time.
- **Routes** — `/`, `/resume`, `/case-studies/[slug]` ×4, `/manifest.webmanifest`,
  `/robots.txt`, 404.

## What is still placeholder

- Intro sequence (`components/intro/intro-sequence.tsx`) — placeholder DOM.
- Title screen — plain text, not the approved composition.
- Arcade, Edward's House — summary dialogs only.
- `/resume` and `/case-studies/*` — placeholder bodies (D2, D4).
- Contact in Index — "details coming soon" (D1).

## Quality gates

All green as of Phase 3:

```
npm run lint        eslint . --max-warnings 0
npm run typecheck   tsc --noEmit
npm test            11 files, 84 tests
npm run build       production build
```

## How to run

```bash
npm install
npm run dev     # http://localhost:3000
```

Entering a location is keyboard-only today: walk with `A`/`D` and press `E`.

## Resuming work

1. Read `IMPLEMENTATION_ROADMAP.md` — it is the source of truth, not chat history.
2. Take the first phase that is not `DONE`; mark it `IN PROGRESS`.
3. Follow the per-phase execution loop in the roadmap.
4. Never fabricate project facts; the roadmap's *Verified facts* table is the
   only sanctioned source for biography, stacks and links.
