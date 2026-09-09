# REQUESTS — shared-file changes B cannot make

Per OWNERSHIP.md: a session that needs a frozen or another session's file
changed writes the need here and D makes the change once. Nothing below was
edited by B.

---

## B-1 · The venue draws a second flag and two spectators over the golf hole

**Files** `components/sportsgang/sport-venue.tsx` (frozen) and
`components/sportsgang/sportsgang-experience.tsx` (D).

**What happens now.** While the golf hole is being played, `SportVenue` still
renders its own static scenery for `sport === "GOLF"` — `.sg-court__tee`,
`.sg-court__green` and `.sg-court__flag` — and `sportsgang-experience.tsx`
still renders the two static court figures, because `playingMatch` is
`stage === "PLAY" && activeSport === "TENNIS"`.

The result on screen: a **second, motionless flag** a little right of the real
one, and **Edward and PLAYER 02 standing on the fairway** while Edward also
plays the hole. Verified in the browser at 1440x900 on `polish/sg-b-golf`;
`docs/sportsgang-polish/evidence/golf/03-flight.png` shows all three.

**Why B cannot fix it.** `sport-venue.tsx` is on the frozen list.
`sportsgang-experience.tsx` is D's. `.sg-court-*` is not B's CSS prefix, so
even a display rule for them would be editing someone else's surface.

**The exact change asked for.**

1. In `sportsgang-experience.tsx`, widen the existing rule so golf is treated
   the way tennis already is — the mini-game owns the playing surface while it
   is running:

   ```ts
   const OWNS_THE_SURFACE: ReadonlySet<SportsgangSport> = new Set(["TENNIS", "GOLF"]);
   const playingMatch = stage === "PLAY" && OWNS_THE_SURFACE.has(activeSport);
   ```

   That alone removes the two static figures.

2. In `sport-venue.tsx`, stop drawing the golf scenery while the hole is being
   played. The cheapest version that does not change any existing behaviour is
   a new optional prop, defaulted so every current call site is unchanged:

   ```tsx
   <SportVenue ... surfaceOwnedByGame={playingMatch} />
   {sport === "GOLF" && !surfaceOwnedByGame ? (
     <div className="sg-court__flag">…</div>
   ) : null}
   ```

   The venue's flag is right for `ENTER`/`MEET`/`RESULT`, when there is no hole
   drawn. It is only wrong during `PLAY`.

**If D would rather not touch the venue**, option 1 alone is worth taking: two
people standing on the fairway is the more confusing of the two, and the second
flag can be lived with until then.

---

## B-2 · Retarget the frozen golf tests at the hole

**Files** `tests/minigames.test.ts`, `tests/sportsgang-playthrough.test.ts`.

**Background.** `lib/game/minigames/golf.ts` — the old single-drive game — is
**untouched** and still passes both files unedited, which is the compatibility
proof QUALITY_GATES.md asks for. The shipped component now runs the hole in
`lib/game/minigames/golf-hole.ts`, so those two files now cover a simulation
the product no longer mounts.

B deliberately did **not** edit them: QUALITY_GATES.md says to escalate rather
than change a contract test. The hole has its own equivalents —
`tests/golf-hole.test.ts` covers the generic playthrough harness's four claims
(reaches a finished state, three runs identical, a finished state refuses to
advance and returns the same reference, a fresh state is genuinely fresh).

**The change asked for, once D has integrated:**

1. Point `GAMES.GOLF` in `tests/sportsgang-playthrough.test.ts` at
   `createGolfHoleState` / `advanceGolfHole` / `getGolfHoleResult`. The tap
   pattern `tapPattern(tick, 37, 1)` reaches the shot cap and finishes inside
   `MAX_TICKS`, so the harness needs no other change.
2. Replace the two drive-specific cases in `tests/minigames.test.ts`
   ("produces an identical drive from identical presses" and "moves through
   every phase and finishes with a reportable result") with their hole
   equivalents, and delete `lib/game/minigames/golf.ts` with them.

Until that happens the old drive stays as it is. It costs one file and it keeps
the frozen suite honest.

---

## B-3 · Nickname, and where the run goes

Not a blocker and **not** a change request — recorded here so D has the
boundary in one place. `MinigameProps.onGolfRun` and
`MinigameProps.playerDisplayName` are both wired in `golf-game.tsx` already;
the call site at `sportsgang-experience.tsx:364` is
`<Minigame active onFinish={finishPlay} />`, so neither is supplied yet and
every run is correctly stamped `GUEST`. See HANDOFF-B.md for the two lines D
needs.
