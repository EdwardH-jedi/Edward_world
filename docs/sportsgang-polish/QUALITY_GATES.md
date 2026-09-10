# QUALITY GATES

## Automated — must pass before any session hands work over

Run from your own worktree with Node 24:

```bash
npm run lint        # eslint . --max-warnings 0
npm run typecheck   # tsc --noEmit
npm test            # vitest run
npm run build       # production build
```

At FOUNDATION_SHA these are: lint PASS · typecheck PASS · **450 tests / 30
files** PASS · build PASS. A session that lowers the test count has deleted
someone's coverage.

### Contract tests that must never be edited to make them pass

`tests/sportsgang-foundation.test.ts` (59 tests) is the shared agreement. If it
fails, the contract broke — fix the code, not the test. It covers:

- fixed clock: whole steps, no float drift over 600 frames, remainder carried,
  long stall dropped to 5 substeps, one edge per press, held state on every
  substep, zero-substep latch, no double replay, `reset()` semantics, elapsed
  time surviving reset, backwards clock ignored, bad config rejected
- golf run: `totalStrokes` derived, next-shot number distinct, GUEST default,
  version + rules version stamped, abandoned run valid, shot log optional,
  validator rejects each missing field / wrong version / disagreeing total /
  malformed log, panel projection ranks lower-is-better
- purity: no storage, network, `crypto`, `Math.random` or wall clock anywhere
  in `lib/game/minigames/`
- run clock: `markRunStart()` restarts a run's elapsed time while the lifetime
  total keeps counting
- key maps: default keeps `KeyS` on `down`; running puts `KeyS` on `sprint`
  with `ArrowDown` still on `down`, and steering while spurting works
- held per source: a lifted finger cannot cancel a key still down; one
  `pressed` however many sources join; a stray release is ignored; every
  channel has edges; `clear()` drops holds *and* pending edges
- keystrokes: yields to a text field, claims an on-screen control, ignores an
  IME composition (`isComposing` and legacy `keyCode 229`)
- suspend/resume end to end: clock reset + input clear together means nothing
  fires on return, while a tap that survives to a stepping frame still lands
- input shape: `IDLE_INPUT` unchanged, absent `sprint` is falsy, steer + spurt
  co-exist

`tests/minigames.test.ts`, `tests/sportsgang-playthrough.test.ts` and
`tests/platformer.test.ts` drive the simulations directly. They compiled and
passed **unedited** across the foundation change; that is the compatibility
proof. If your change needs one of them edited, escalate to D.

## Human checks — automation cannot judge these

Per sport, on your own port, at 1440×900 and again at 390×844:

**Tennis (A)** — the ball and the player read as one motion, not two objects on
different clocks. Each of the five swings is visually distinguishable and the
contact moment lands where the sound of a hit would be. A held key does not
stutter.

**Golf (B)** — the hole reads as one continuous hole, not a sequence of driving
ranges. The shot number on screen matches the ball you are about to hit, and
after a penalty the score and the shot number visibly differ. Abandoning the
hole says so rather than reporting a score.

**Basketball / running (C)** — the ball's arc looks thrown, not tweened. In
running, arrows steer *while* `S` is held for the spurt: hold `S` and press
left at the same time and both must respond. Releasing one must not cancel the
other.

The **DOM wiring itself** — real `keydown` listeners, pointer capture, the
`closest()` selector — is not unit-tested, because there is no DOM in the test
environment. Its decisions are; the listeners are a human check below.

**Everyone** — tab away mid-play and come back: nothing teleports, no queued
input fires, and the game is where you left it. Click into any text field and
type `wasd`: the letters appear and the game does not move.

**D** — the right-hand world Exit is reachable and does not trap the player.
The nickname box accepts an IME composition without the game eating keystrokes.
A submitted golf run shows the same total the RESULT panel showed.

## Regression watch

Preserved surfaces get one pass each before merge: AFL Predict, Wardrobe,
Soonpermario, Edward's House, the intro, BGM start/mute across a route change,
and the visitor counter's silence when unconfigured.
