# OWNERSHIP — who may edit what

One rule: **if a file is not on your list, you do not edit it.** A, B and C run
at the same time from the same base commit, so a file touched by two sessions
is a merge conflict at best and a silently lost change at worst.

## Session A — tennis sync and five swings

```
lib/game/minigames/tennis.ts
components/sportsgang/minigames/tennis-game.tsx
lib/pixel/sg-tennis.ts                     (new file)
tests/tennis-*.test.ts                     (new files)
app/globals.css  →  .sg-tennis-* block only
```

## Session B — one hole of golf

```
lib/game/minigames/golf.ts
components/sportsgang/minigames/golf-game.tsx
lib/pixel/sg-golf.ts                       (new file)
tests/golf-*.test.ts                       (new files)
app/globals.css  →  .sg-golf-* block only
```

B emits the run through `createGolfRunResult(...)` and calls both
`onFinish(toSportResult(run))` and `onGolfRun?.(run)`. B does **not** write
anything to storage or the network.

## Session C — basketball ball and running

```
lib/game/minigames/basketball.ts
lib/game/minigames/running.ts
components/sportsgang/minigames/basketball-game.tsx
components/sportsgang/minigames/running-game.tsx
lib/pixel/sg-ball.ts, lib/pixel/sg-running.ts   (new files)
tests/basketball-*.test.ts, tests/running-*.test.ts   (new files)
app/globals.css  →  .sg-ball-* and .sg-run-* blocks only
```

C passes `RUNNING_KEY_MAP` to `useMinigameInput` for running, and reads
`input.sprint` in `advanceRunning`. C must not repurpose `down` for the spurt.

## Session D — integration, nickname, public golf board, world right-hand Exit

```
components/sportsgang/sportsgang-experience.tsx
components/sportsgang/rank-board.tsx
lib/game/sportsgang-standings.ts
lib/game/sportsgang-machine.ts
types/sportsgang.ts
components/world/**, data/world.ts, lib/game/movement.ts
app/api/**  and anything network or storage
components/sportsgang/minigames/index.ts
app/globals.css  →  .sg-board-*, .sg-name-*, .sg-exit-* blocks
```

D is the **only** session that may add a network call, read or write storage,
or own a nickname.

## Session E — QA

Reads everything. Writes only `docs/sportsgang-polish/` and new test files.
E does not fix product code; E reports.

## Frozen at FOUNDATION_SHA — change request to D

Touching any of these breaks the other sessions mid-flight:

```
components/sportsgang/minigames/use-minigame-input.ts
components/sportsgang/minigames/use-fixed-step-loop.ts
components/sportsgang/minigames/types.ts
lib/game/minigames/types.ts
lib/game/minigames/fixed-step.ts
lib/game/minigames/golf-result.ts
lib/game/minigames/index-adjacent shared helpers (clamp, sweepMeter)
lib/motion/use-game-loop.ts
lib/pixel/sportsgang.ts        (shared constants; no per-sport sections)
components/sportsgang/minigames/meter.tsx
components/sportsgang/sport-venue.tsx, pixel-phone.tsx
package.json, package-lock.json
```

### Procedure for a shared-file change

1. Do **not** edit it. Write the need in `docs/sportsgang-polish/REQUESTS.md`
   on your own branch: the file, the exact change, and why your sport cannot
   proceed without it.
2. D makes the change once, on `polish/sg-d-integration`.
3. A/B/C rebase onto it before continuing.

An additive, optional field is usually a request. A changed meaning or a
renamed export always is.

## `app/globals.css` — the one shared file everyone appends to

Never edit an existing rule. Append your own block at the end of the file,
marked so a merge is trivially resolvable and an owner is obvious:

```css
/* @owner:B golf — one hole */
.sg-golf-hole { ... }
/* @end B */
```

Prefixes are owned: `.sg-tennis-*` A · `.sg-golf-*` B · `.sg-ball-*`,
`.sg-run-*` C · `.sg-board-*`, `.sg-name-*`, `.sg-exit-*` D. The 162 existing
`.sg-` rules belong to no one and are frozen.

## Preserved, out of scope for every session

AFL Predict, Wardrobe, Soonpermario, Edward's House, the intro, the BGM engine
and the visitor counter. No engine swap, no Three.js, no app rewrite. Do not
resurrect TOMODACHI — `tests/world-data.test.ts` and `tests/projects.test.ts`
will fail if you do.
