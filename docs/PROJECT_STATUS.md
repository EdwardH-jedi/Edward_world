# Edward's World — Project Status

Updated after every completed phase. For the task list, acceptance criteria and
verified source facts, see [`IMPLEMENTATION_ROADMAP.md`](./IMPLEMENTATION_ROADMAP.md).

**Last updated:** 2026-08-27 · after Phase 0

---

## Where the project is

| Phase | Area | Status |
|---|---|---|
| 0 | Baseline commits + roadmap | **DONE** |
| 1 | SportsGang complete experience | TODO |
| 2 | Wardrobe | TODO |
| 3 | AFL Lab | TODO |
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
  Enter with `E` → pixel phone → choose a sport → matchmaking → accept → the
  phone screen expands into a real tennis court → scripted rally → result →
  project context with real links and stack.
- **Index mode** — editorial overlay listing the four projects, resume and
  GitHub. Reachable at any time.
- **Routes** — `/`, `/resume`, `/case-studies/[slug]` ×4, `/manifest.webmanifest`,
  `/robots.txt`, 404.

## What is still placeholder

- Intro sequence (`components/intro/intro-sequence.tsx`) — placeholder DOM.
- Title screen — plain text, not the approved composition.
- Wardrobe, AFL Lab, Arcade, Edward's House — summary dialogs only.
- `/resume` and `/case-studies/*` — placeholder bodies (D2, D4).
- Contact in Index — "details coming soon" (D1).

## Quality gates

All green as of Phase 0:

```
npm run lint        eslint . --max-warnings 0
npm run typecheck   tsc --noEmit
npm test            8 files, 35 tests
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
