# QA Report — 2026-08-28

> **Historical record of one QA pass.** Findings and statuses are as of
> 2026-08-28 and have not been re-checked since. Several items listed under
> *Remaining Issues* have been addressed in the meantime — the resume and
> case-study routes have since been built from verified repository facts — and
> the world it was run against still contained a wandering NPC that was later
> removed. For current status see [`PROJECT_STATUS.md`](./PROJECT_STATUS.md).

### Fixed

- **Arcade scheduled many completion timers.** The platformer RAF callback called
  `setTimeout` on every terminal frame until the outer phase changed, creating
  multiple stale callbacks. Terminal-state dwell now lives in one effect keyed
  by `game.phase`, with its single timeout cleared on replay, exit, or unmount.
- **Mini-game input interception cancelled native controls.** The shared
  listener captured `Enter` and `Space` from unrelated focused buttons and
  links, including House objects and location/global navigation; Arcade also
  left that capture active on its floor and after the result. Bound game
  controls are now explicitly marked, native interactive targets are ignored,
  Arcade action capture is limited to `PLAYING`, the hook is disabled at
  `DONE`, and held/edge state is cleared whenever its listener is removed.
- **Four anime.js animations survived their owning state.** The interaction
  prompt, Wardrobe panel, AFL console, and House card discarded the animation
  handle returned by `animateElement`, so rapid state changes or unmounts could
  leave a tween running against a stale element. Each effect now reverts its own
  animation during cleanup.
- **Inactive world controls remained keyboard-focusable behind overlays.** The
  world stayed mounted to preserve position, but disabling its game loop did not
  remove its buttons from sequential focus. The disabled world is now `inert`;
  the global WORLD / INDEX controls and the active surface remain available.
- **Three refs were dead code.** The intro stage ref, intro timeline ref, and
  arcade projection ref were only assigned and never read. They and the now
  unused type imports were removed.

### Remaining Issues

- **Low — Resume content is a placeholder.** Reproduction: open `/resume` from
  INDEX. It renders successfully but does not contain a signed-off resume.
  Reason not safely fixed: roadmap decision D2 requires Edward's approval of an
  identity document; the QA pass cannot invent or approve that content.
- **Low — Case-study bodies are placeholders.** Reproduction: open any of the
  four INDEX case-study links. Each route resolves and shows canonical project
  data, but the long-form body is intentionally pending. Reason not safely
  fixed: roadmap decision D4 reserves those write-ups for Edward and no source
  copy was supplied.
- **Low — League of Legends rank is unpublished.** Reproduction: enter Edward's
  House and open GAMING PC. The room explicitly says no rank is published.
  Reason not safely fixed: roadmap decision D3 requires a real supplied value;
  inventing one would violate canonical-data rules.

### Verification

- **Lint:** `npm run lint` passed with `--max-warnings 0`.
- **Typecheck:** `npm run typecheck` passed under strict TypeScript.
- **Tests:** `npm test` passed — 13 files, 103 tests. This includes deterministic
  bounds and completion coverage for all four sports, the arcade bot completion
  path, movement, interactions, state machines, storage rules, and reduced-motion
  timing.
- **Production build:** `npm run build` passed. `/`, `/resume`, all four static
  case-study routes, manifest, robots, and the not-found route were generated.
- **Browser QA:** a fresh production server was tested with a clean console.
  The full title and six-second intro reached WORLD; Skip Intro also reached
  WORLD under repeated input. World pointer movement, camera travel, both bounds
  (`0px` and `3792px`), proximity prompts, signs, all buildings, five sequential
  TOMODACHI conversations, INDEX switching, Escape, focus trapping/restoration,
  repeated exit/re-entry, and post-return controls were exercised.
- **Project flows:** Wardrobe completed all five steps, saved four layers, reset,
  exited, and recalled the saved look on re-entry. AFL Lab completed all six
  stages and reported TEAM A at 59.0%, then reset. Edward's House object cards
  were opened/closed rapidly with no console output. Arcade entered `PLAYING`,
  accepted live movement input, and returned mid-run without corrupting the
  world; its end-to-end completion remains additionally covered by the passing
  deterministic platformer bot test.
- **SportsGang:** Golf completed from two live meter stops; Tennis produced three
  `PERFECT` returns and a 3–0 result; Basketball produced three consistent
  `SHORT` outcomes and a 0/3 result; Running reached the finish at cruise pace
  with 100% stamina. Replay/sport switching, matchmaking, accept, venue
  transition, result dwell, summary, and return to world were exercised.
- **Desktop/mobile checks:** measured 1440×900, 1280×800, 768×1024, and 390×844.
  Each viewport matched the document width and height with no unintended
  horizontal overflow. At 390×844 the world controls remained on-screen and the
  INDEX dialog stayed within a 16px inset with internal vertical scrolling.
- **Links:** all local routes and all canonical GitHub, project-repository, and
  LinkedIn URLs returned HTTP 200. Contact remains a valid `mailto:` link.
- **Reduced motion:** duration/state-machine regression tests passed, including
  1ms decorative tween collapse and bounded SportsGang reading dwell. The
  current in-app browser surface did not expose a media-preference override, so
  this audit did not independently repeat the live emulation recorded in Phase
  10.
