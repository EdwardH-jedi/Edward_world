# Edward's World — Project Status

Updated after every completed phase. For the task list, acceptance criteria and
verified source facts, see [`IMPLEMENTATION_ROADMAP.md`](./IMPLEMENTATION_ROADMAP.md).

**Last updated:** 2026-09-05 · release-presentation pass — public README, case study, architecture refresh

---

## Where the project is

| Phase | Area | Status |
|---|---|---|
| 0 | Baseline commits + roadmap | **DONE** |
| 1 | SportsGang complete experience | **DONE** |
| 2 | Wardrobe | **DONE** |
| 3 | AFL Lab | **DONE** |
| 4 | Soonpermario arcade | **DONE** |
| 5 | Edward's House | **DONE** |
| 6 | Index mode final pass | **DONE** |
| 7 | Title screen | **DONE** — superseded by 11 |
| 8 | Six-second intro | **DONE** — superseded by 11 |
| 9 | World polish + a wandering NPC | **DONE** — the NPC was later removed from the product |
| 10 | Release pass | **DONE** |
| 11 | V4 intro: the approach and the name gate | **DONE** |
| 12 | Monument intro as a real interaction | **DONE** |
| 13 | SportsGang: RANK beat + golf camera follow | **DONE** |
| 14 | Visitor counter, case studies + resume, world atmosphere | **DONE** |

## What works today

- **Title screen** — pixel Sydney at dusk with the monument still off-screen:
  harbour, bridge, terraces, canopy trees, first stars, drifting motes, and one
  faint warm glow past the right treeline. `Enter`, click or tap to start;
  `SKIP TO INDEX →` for anyone who would rather read.
- **Opening ritual** — the design's V4 eight-frame storyboard. `ENTER` pans the
  camera east to the shrine clearing; the name's letters pull free of a
  seventy-letter carved face and assemble into SOON HYUN HWANG; an inscription
  slab surfaces and asks the visitor to type it. Thirteen carved sockets, no
  input box. A wrong key flashes its socket and types nothing, backspace lifts
  a letter out, spaces auto-skip, case is ignored. The monument answers as you
  go — channels every third letter, the apex ring at halfway, the braziers on
  the final word — and completion is a door, not a toast. The assembled name
  stays on screen the whole time: the gate tests presence, not memory. `ESC` or
  `SKIP GATE` leaves for the world and `SKIP TO INDEX` for the index, at any
  moment. The gate is a real text input sitting over the carved sockets, so it
  works on a phone — tap the slab and the native keyboard opens — and reads as
  a labelled control to assistive technology, while showing none of a form
  field's chrome.
- **Main world** — side-view pixel town, six buildings, terraced terrain,
  stone path, stream and footbridge, town cluster, and AFL oval. Smooth
  A/D + arrow movement, terrain-following, camera follow, proximity prompts,
  ambient animation on a shared frame counter.
- **SportsGang location** — the only project location with a full experience.
  Enter with `E` → pixel phone → choose one of four sports → matchmaking →
  accept → the phone screen expands into the venue for that sport → play →
  result → project context with real links and stack.
  - **Golf** — stop the power bar, then the contact bar; carry distance and
    fairway/rough are computed from those two stops.
  - **Tennis** — a rally to five points; each swing is graded on how close
    the player was to the ball, which sets the shot's speed and accuracy.
  - **Basketball** — three hold-and-release shots; make or miss from the
    release point alone.
  - **Running** — 200 m of pace against stamina; exhaustion latches, so going
    out too hard is slower than pacing it.
- **Wardrobe location** — an interactive archive, not a mini-game. Capture
  garments off the rail, see their structural metadata, organise by layer,
  dress the mannequin, save the look. The look is genuinely written to this
  browser and greets you on your next visit — the product's local-first
  philosophy enacted rather than described.
- **AFL Lab location** — a research lab, not a tipping service. Answer *who do
  you think wins*, run the model, and watch one round travel the bench: a
  packet crosses from panel to panel and each CRT comes up out of its scan line
  showing what that stage actually computed from a seeded demonstration round —
  including calibration visibly pulling an overconfident number back towards
  even. It ends by setting your pick beside the model's, and says only whether
  the two agree.
- **Arcade location** — a dark room with four unlit machines and one that is
  running. Walk the floor to it, press `E`, and its display expands into a
  playable segment of Soonpermario: move, jump, get past three bugs (land on
  one to close it, or clear it), take the skills off the ledges, cross three
  pits, reach the offer. Coffees are lives, commits are the collectibles.
  About twenty seconds if you know the way. `Escape` mid-run ends the run and
  shows the summary rather than leaving; `Escape` again returns to the world.
  The floor, the walk pace and the cabinet's position are derived from the
  measured viewport, so the machine is centre stage on a phone as well as a
  desktop, and the walk and the game both have touch controls.
- **Edward's House** — the personal room. Walk up to six objects and look at
  them: the map from Jeju to Sydney, the desk, the computer, the resume, the
  clothes rail, the gaming PC. Every line is verified biography; the one thing
  that is not known says so.
- **Index mode** — the recruiter's fast path, reachable at any time. Warm
  off-white and charcoal, an editorial numbered grid: four projects with their
  role, descriptor, verified stack, case study and GitHub, then Resume, GitHub,
  LinkedIn, Contact and an About section. Everything professional is here
  without entering the world.
- **Routes** — `/`, `/resume`, `/case-studies/[slug]` ×4, `/manifest.webmanifest`,
  `/robots.txt`, 404.

## What is still open

Content, not code:

- **The League of Legends rank in Edward's House** — a typed `null` hook (D3).
  The room says the shelf is empty rather than inventing a tier.
- **`/resume` and `/case-studies/*`** are built and shipped, assembled strictly
  from what Edward's public repositories record. Each closes with an honest note
  that the written account — and a formal resume document — is Edward's to
  supply (D2, D4). They are no longer placeholder bodies.

### Not in the product

- A wandering NPC (Phase 9) was built and shipped, and has since been removed
  from the product. `lib/game/tomodachi.ts`, its sprites, its world entry and
  its types are gone; `tests/world-data.test.ts` guards the removal, including
  that no interactable is stranded in the stretch it used to own. It is not to
  be presented as a current feature or restored.

## Quality gates

All four green as of 2026-09-05:

```
npm run lint        eslint . --max-warnings 0            clean
npm run typecheck   tsc --noEmit                         clean
npm test            27 files, 368 tests                  passing
npm run build       production build, 10 routes          succeeds
```

## How to run

```bash
npm install
npm run dev     # http://localhost:3000
```

Walk with `A`/`D` or `←`/`→` or the on-screen controls, and press `E` or tap
the status bar to enter what you are standing next to. `Escape` leaves anything.
Everything works without a keyboard, and everything professional is also one
click away in INDEX.

Public-facing docs: [`../README.md`](../README.md),
[`CASE_STUDY.md`](./CASE_STUDY.md), [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Resuming work

1. Read `IMPLEMENTATION_ROADMAP.md` — it is the source of truth, not chat history.
2. Take the first phase that is not `DONE`; mark it `IN PROGRESS`.
3. Follow the per-phase execution loop in the roadmap.
4. Never fabricate project facts; the roadmap's *Verified facts* table is the
   only sanctioned source for biography, stacks and links.
