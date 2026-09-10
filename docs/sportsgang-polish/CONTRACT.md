# CONTRACT — what A, B and C may rely on

Every API below **exists and is tested** at FOUNDATION_SHA. Nothing here is a
promise to be built later.

## Advisor

A configured `advisor` tool is available in the primary executor's environment
and was used twice: once on the initial design, once on the final contract
before commit. It takes no model parameter and reports no model identity, so
**the backing model could not be verified from this environment.** The task
brief names Fable 5.1; that is recorded as intent, not as a verified fact. Both
reviews are summarised in the session report. File edits, git operations and
gate runs were performed only by the primary executor.

## Input — pure core + hook

The decisions live in **`lib/game/minigames/input-core.ts`** (pure, no DOM) and
the hook in `components/sportsgang/minigames/use-minigame-input.ts` is the
listener shell over it. That split exists so the rules are unit-tested: Vitest
runs in `environment: "node"`, so anything that only exists inside an event
handler is a rule nothing checks.

```ts
// lib/game/minigames/input-core.ts
invertKeyMap(keyMap): ReadonlyMap<string, Channel>
shouldYieldToTarget(matchesInteractiveTarget, insideMinigameControl): boolean
isComposingKeyEvent({ isComposing?, keyCode? }): boolean
createHeldTracker(): HeldTracker   // press/release/isHeld/edgesOf/consumeEdges/clear
DEFAULT_KEY_MAP · RUNNING_KEY_MAP · CHANNELS
```


```ts
useMinigameInput(active: boolean, options?: {
  captureActionKeys?: boolean;   // default true
  keyMap?: KeyMap;               // default DEFAULT_KEY_MAP
}): {
  consume(): MinigameInput;            // snapshot for one tick; clears edges
  bind(channel: Channel): {...};       // props for an on-screen control
  edgeOf(channel: Channel): { pressed, released };  // read BEFORE consume()
  clear(): void;
}

type Channel = "action" | "up" | "down" | "left" | "right" | "sprint";
type KeyMap  = Readonly<Partial<Record<Channel, readonly string[]>>>;
```

**Keys are `KeyboardEvent.code`, not `event.key`** — physical keys, so layout
and IME cannot change what "S" means.

| Map | action | up | down | left | right | sprint |
|---|---|---|---|---|---|---|
| `DEFAULT_KEY_MAP` | Space, Enter, NumpadEnter | ArrowUp, KeyW | ArrowDown, **KeyS** | ArrowLeft, KeyA | ArrowRight, KeyD | — |
| `RUNNING_KEY_MAP` | Space, Enter, NumpadEnter | ArrowUp | ArrowDown | ArrowLeft | ArrowRight | **KeyS** |

`DEFAULT_KEY_MAP` reproduces the shipped bindings exactly, so tennis,
basketball and golf behave as before without touching anything. **C** passes
`RUNNING_KEY_MAP` so the runner can steer with the arrows *while* holding `S`
for the spurt — the two are separate channels and are pressable together.

Rules enforced, **all of them covered by tests in
`tests/sportsgang-foundation.test.ts`** against the pure core:

- **held vs edges.** `action`/`up`/`down`/`left`/`right`/`sprint` are held
  states. `pressed`/`released` on `MinigameInput` remain the **action**
  channel's edges, because that is what every shipped simulation reads. Other
  channels' edges are available via `edgeOf(channel)`.
- **Auto-repeat** holds a channel but never produces a second `pressed`.
- **Keyboard + touch are independent sources.** A channel is held while *any*
  source holds it, so lifting a finger cannot cancel a key still down.
- **Pointer release** comes from `pointerup`, `pointercancel` and
  `lostpointercapture`. `pointerleave` was removed: with pointer capture set it
  fires where it should not and stranded the channel.
- **Typing is never stolen.** The interactive-target guard runs *before* any
  branch, so a caret in an `input`, `textarea` or `contenteditable` keeps every
  key — including `A`/`S`/`W`/`D`. On-screen game controls opt back in via the
  `data-minigame-control` attribute that `bind` stamps on them.
- **IME composition is ignored** (`event.isComposing`, `keyCode === 229`).
- **Suspend clears everything**: window `blur` and `visibilitychange → hidden`
  drop all holds and edges, as does `active` going false.
- Shortcuts apply only while the hook is `active`, i.e. only to the running
  game.

## Time — `lib/game/minigames/fixed-step.ts`

```ts
createFixedStepper({ stepMs?, maxSubsteps? }): FixedStepper
FixedStepper.advance(frameDeltaMs, input, step: (dtSeconds, input) => void): FixedStepReport
FixedStepper.reset(): void
FixedStepper.markRunStart(): void        // call when a new attempt begins
FixedStepper.elapsedSinceRunStartMs      // this IS elapsedSimulationMs for one run
FixedStepper.elapsedMs                   // lifetime total; survives reset
FixedStepper.pendingMs

SPORTSGANG_STEP_MS = 1000 / 60     SPORTSGANG_MAX_SUBSTEPS = 5
```

A **pure function, not a hook**, so it is testable without React or a clock.
`lib/motion/use-game-loop.ts` is **unchanged**: the house, intro and arcade
platformer keep their variable-delta loop. The SportsGang-only React wrapper is
`components/sportsgang/minigames/use-fixed-step-loop.ts`.

The four rules, each with a test:

1. **Accumulator.** Frame time accumulates; whole steps run at a constant
   `dtSeconds`. A step lost to float drift is a bug — `50 ms` is exactly three
   steps at 60 Hz, and a `1e-9` tolerance is what keeps it three.
2. **Max substep.** Beyond `maxSubsteps × stepMs` the excess is **dropped**,
   not queued. A 5 s stall runs exactly 5 steps.
3. **Edges once.** A frame's `pressed`/`released` apply to the **first**
   substep only; later substeps see the same held state with edges cleared.
4. **Zero-substep frames latch.** A 3 ms frame produces no step and *keeps* its
   edge until a frame that does step, where it fires exactly once. `reset()`
   drops pending time and latched edges, so a tap made before tabbing away does
   not fire on return.

The character and the ball are both fields of the state passed to `step`, so
there is no second timer they could drift onto.

**`elapsedMs` is not a run clock.** It deliberately survives `reset`, so a
sport offering PLAY AGAIN without remounting must call `markRunStart()` when
the new attempt begins and report `elapsedSinceRunStartMs`. Using `elapsedMs`
for `elapsedSimulationMs` makes every run after the first one wrong.

### Suspension is one path, not two

```ts
useFixedStepGameLoop(active, readInput, step, { onSuspend })
```

Pass `clear` from `useMinigameInput` as `onSuspend`. The loop then resets the
clock **and** the input source at the same moment on `blur`, on
`visibilitychange → hidden`, on `active` going false, and on unmount. Without
it the two halves suspend independently and a tap made just before tabbing away
fires on return.

## Result — `lib/game/minigames/golf-result.ts`

`SportResult` is **unchanged**, so the RESULT panel and
`recordRun(sport, result.rank)` keep working untouched. The hole gets its own
versioned record beside it:

```ts
interface GolfRunResultV1 {
  version: 1; runId; courseId; rulesVersion;
  status: "completed" | "abandoned";
  shotCount; penaltyStrokes; totalStrokes;
  elapsedSimulationMs; remainingDistanceM; longestDriveM;
  playerDisplayName;              // "GUEST" when unset
  shotLog?: readonly GolfShotV1[];  // server-verification extension point
}

createGolfRunResult(draft): GolfRunResultV1   // the only supported constructor
isGolfRunResultV1(value): value is GolfRunResultV1
toSportResult(run): SportResult
nextShotNumber(run): number
totalStrokesOf(shotCount, penaltyStrokes): number
```

- `totalStrokes = shotCount + penaltyStrokes`, **derived** by the constructor
  and re-checked by the validator. It is never passed in.
- `nextShotNumber` is `shotCount + 1` and is deliberately a different function:
  a penalty raises the score without giving the player another ball.
- **Ranked lower-is-better** on `totalStrokes` — the opposite direction from
  the old carry-distance drive. That reversal is the reason golf needed its own
  contract rather than a wider `SportResult`.

Ownership of the boundary: **B produces, D transmits.**
B calls `onFinish(toSportResult(run))` *and* `onGolfRun?.(run)`; D owns
everything network, nickname and ranking. No public save exists yet and none
was built.

`elapsedSimulationMs` comes from `stepper.elapsedSinceRunStartMs`, not from a
wall clock.

`runId` is **injected**, never generated in the simulation: the component layer
creates it (`crypto.randomUUID()` in client code) and passes it down. A restart
takes a new `runId`. `playerDisplayName` is optional and defaults to `GUEST`.

`tests/sportsgang-foundation.test.ts` reads every file in
`lib/game/minigames/` and fails if it references `localStorage`,
`sessionStorage`, `fetch(`, `crypto`, `Math.random`, `Date.now`, `new Date` or
`performance.now` — comments stripped first, so the rule is about code.

## Component props — `components/sportsgang/minigames/types.ts`

```ts
interface MinigameProps {
  active: boolean;
  onFinish: (result: SportResult) => void;
  onGolfRun?: (run: GolfRunResultV1) => void;   // additive, optional
  playerDisplayName?: string;                   // additive, optional
}
```

Both new fields are optional, so the existing `MINIGAMES` registry and
`<Minigame active onFinish={...} />` call site compile unchanged.

## Art and style

- Reuse `PixelCanvas` and the existing raster helpers.
- **`lib/pixel/sportsgang.ts` is a single 338-line shared file with no
  per-sport sections** — `PLAYER_ART_SIZE`, `COURT_SURFACE`, `drawVenue`,
  `drawCourtside` are common. It is therefore **frozen**. New per-sport art
  goes in new files: `lib/pixel/sg-tennis.ts`, `lib/pixel/sg-golf.ts`,
  `lib/pixel/sg-ball.ts`, `lib/pixel/sg-running.ts`.
- **No CSS modules.** The repo has none, and the house style is one
  `app/globals.css` with 162 existing `.sg-` rules. Collisions are avoided by
  **prefix ownership in appended blocks** — see OWNERSHIP.md. Git merges
  non-overlapping appended blocks cleanly; three module files would each need
  an import edit in the same shared place anyway.
