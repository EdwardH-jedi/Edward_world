# HANDOFF-D — integration, the visitor's name, the public golf board, the way out

Branch `polish/sg-d-integration`, worktree `../Edward_world-sg-d`, port **3014**.
Cut from `FOUNDATION_SHA = cdd593d6018fefbc0e3cbb6038bba9eda302a677`.
**Not pushed, not merged to `main`, not deployed. No paid resource created.**

---

## 1 · Integration

### What was actually there

Each branch was checked rather than assumed complete from its HEAD name: the
gates were run in each worktree first, and all three matched their own
handoffs exactly.

| Session | Branch | Commits | Own tests | Handoff |
|---|---|---|---|---|
| A tennis | `polish/sg-a-tennis` | 1 (`a53f950`) | 498 / 33 PASS | HANDOFF-A.md |
| B golf | `polish/sg-b-golf` | 6 (`1488c08`) | 525 / 34 PASS | HANDOFF-B.md |
| C ball + running | `polish/sg-c-ball-running` | 4 (`9a0a4c8`) | 493 / 32 PASS | HANDOFF-C.md |

All three worktrees were clean — no uncommitted work — so nothing had to be
left behind and nothing was copied out of a running worktree. **No handoff was
missing.** E is the only session that never started; nothing here claims its
QA pass was done.

### Merge order and the conflicts

`A → B → C`, each as a real merge commit onto the foundation.

| Merge | Conflict | Resolution |
|---|---|---|
| A (`17d5f40`) | none | — |
| B (`447f2e3`) | `app/globals.css` | append vs append. Both blocks kept in order; only the three markers were removed. |
| C (`e349b35`) | `app/globals.css`, `docs/…/REQUESTS.md` | see below |

`app/globals.css` was **rebuilt deterministically** rather than hand-resolved,
because git's interleaving of A+B against C was an artefact of three appends
landing on the same line. Each branch was first proved append-only against the
foundation — `diff` reports zero removed lines and the foundation is an exact
line-for-line prefix of all three — then the file was assembled as the
foundation's 5211 lines plus each branch's own tail in merge order. Result:
5802 lines, exactly `5211 + 68 + 403 + 120`, carrying all four owner blocks
(A tennis, B golf, C basketball, C running) and removing nothing.

`REQUESTS.md` was created by both B and C. Both were kept whole and
concatenated, neither edited. A raised its requests in HANDOFF-A.md rather than
in a file, so they were restated as A-1…A-3 so D's list is in one place.

**No shared contract was dropped in any resolution.** The foundation's 59
contract tests pass unedited.

### Gates immediately after the merge

| Gate | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS — **616 tests / 39 files** |
| `npm run build` | PASS — 10 routes |

616 is exactly `450 + 48 + 75 + 43`: the foundation's baseline plus each
session's own additions, so nothing was lost in a resolution.

### The eleven requests, and what D did with each

| # | Ask | Disposition |
|---|---|---|
| **B-1** | venue draws a second flag and two spectators over the golf hole | **Done.** `playingMatch` covers GOLF as well as TENNIS, and `SportVenue` takes an optional `surfaceOwnedByGame` that stands its tee, green and flag down during PLAY only. Verified live: golf now renders 0 static players and 0 venue flags while playing. |
| **B-4** | `rulesVersion` is stale; `carryM` means carry plus roll | **Done, before anything was stored.** Bumped to `golf-1h-2026-09-2`; the board keys on it, so the old drive and the hole can never share a board. `carryM`'s comment corrected; the name is kept so the wire format does not move. |
| **C-3** | `setPointerCapture` can strand a control | **Done.** Wrapped. It threw before the press was recorded, so a throw dropped the press and the button looked dead. |
| **C-1, C-2** | already-made edits to running's blocks in `minigames.test.ts` and the playthrough harness | **Ratified.** Reviewed: inputs only, every assertion unchanged, confined to running. They are correct — the old inputs assert behaviour the brief removed. |
| **C-4** | re-check the nickname rule against the real box | **Done** — see §5. |
| **B-2** | retarget the frozen golf suites at the hole and delete `golf.ts` | **Deferred.** Not conflict resolution and not needed for anything here; the old drive still passes both suites unedited, which is the compatibility proof QUALITY_GATES asks for. One file of dead code, recorded for whoever does the next pass. |
| **A-1** | pass `debug` so the tennis overlay can be seen | **Deferred.** It is a dev-only diagnostic and E never started; wiring it would put a debug path into the integration branch for no one to use. One line when E wants it. |
| **A-2** | export five bindings so `sg-tennis.ts`'s verbatim copy can go | **Deferred.** A real duplication risk and worth doing, but it touches the frozen shared art file for a cleanup rather than a defect. Left as the first thing to do next. |
| **A-3** | `judgeContact` / `SWING.REACH_X` are dead but pinned by a test | **Deferred**, with B-2 — the same test file, the same pass. |

---

## 2 · The visitor's nickname

**There was no existing path, and the two things that look like one are not.**
`lib/game/name-gate.ts` is the intro monolith where the visitor types
**Edward's** name; the join counter's "1ST PLAYER" is a visitor *number*.
Neither is the visitor's own name and neither was reused as one.

- **Nothing is asked for to play.** Entering SPORTSGANG asks nothing; a whole
  hole plays as `GUEST`. The name is asked for at the moment of publishing and
  nowhere else.
- **Nothing is uploaded without consent.** The submit button appears only after
  a *completed* hole. It opens a box that shows the exact string that will
  appear, says who will see it, and states that scores are browser-reported.
  The upload happens on the second press.
- **No real name, email or account.** Not asked for, not stored.
- **The name is a label, not an identity.** Rows are keyed by an anonymous id
  minted on the device at the press that publishes. Two visitors may pick the
  same nickname and remain two players; renaming changes only that device's own
  row and cannot merge it into anyone else's.
- **Three scopes, three keys**: `…:anon-id` (who), `…:nickname` (label),
  `…:consent` (versioned agreement), plus `…:submitted-runs`. All under
  `edwards-world:sg-golf:` and distinct from the counter's key.
- **Normalisation is one pure function**, imported by both sides, and the
  server normalises again rather than trusting the client: NFC → separators to
  spaces → strip `\p{C}` → collapse → trim → 1–20 **code points**. Korean and
  IME input compose first, so a decomposed syllable counts as one character.
- **Never rendered as HTML.** The name reaches the DOM as a React text node;
  nothing escapes it, because escaping would put `&amp;` into a name someone
  typed `&` into.
- **Typing never reaches the game.** Verified with `S`, `E`, `A`, `D`, `Enter`
  and an IME composition in the box: nothing moved, the dialog stayed open, the
  text survived. Escape closes the box and does not exit SportsGang — the
  dialog's handler is on `document` and stops propagation before the
  experience's `window` listener sees it. Focus is trapped and returns to the
  button that opened it.
- **Ids and client labels are separate, and the ids are not all the server's.**
  Worth being exact, because the brief asks for exactly this line:
  `runId` is minted **on the client** — `crypto.randomUUID()` in
  `golf-game.tsx`, one per attempt — and the server reuses it as the
  idempotency key rather than issuing a record id of its own. The only
  server-issued field is `receivedAt`, which is what orders a tie. The display
  name is the client's, is never an identifier, and never reaches a key. No
  separate server record id was added; `runId` + the board hash field
  (`anonId`) already address a row.

---

## 3 · Records and ranking

- **Only the new golf hole is publicly ranked**, and only `completed` runs.
  Tennis, basketball and running keep exactly the personal, this-visit
  standings they had. **No cross-sport combined score was invented.**
- **One board per `courseId` + `rulesVersion`.** A run from the old drive's
  rules is refused — verified live, `UNKNOWN_RULES`.
- **Fewer strokes is better.** `totalStrokes` is the *only* ranking key.
- **Ties are real ties**: equal scores share a rank and the next distinct score
  takes the position it occupies (1, 2, 2, 4 — seen on screen). Display order
  inside a tie is the server's `receivedAt` then `runId`, which is stable and
  changes nobody's rank.
- **`elapsedSimulationMs` and `longestDriveM` are shown and never consulted.**
  A player can see every number that decided their position.
- **Abandoned runs are refused outright**, never admitted at zero strokes. On
  screen: `RUN ABANDONED · NOT RANKED` and "Only a hole you finish can go on
  the board."
- **Best per anonymous player, not per attempt**, so repeated play cannot fill
  the board. Personal attempt history stays local and separate.
- **Five numbers stay five**: `SHOT` and `TOTAL STROKES` on the golf HUD,
  `ATTEMPT` and `RANK` on the board, `VISITOR NUMBER` on the world counter.
- **`runId` prevents double submission** through re-render, stage change, Exit
  or refresh. Verified: replaying a banked `runId` while claiming a better
  score returned `DUPLICATE` and the stored row was unchanged.
- **Not claimed:** this does not resist someone clearing site data to get a new
  anonymous id. It is stated here rather than implied away.

---

## 4 · Storage and the trust boundary

**`GLOBAL_LEADERBOARD = BLOCKED_CONFIG.`** No credential exists in this
environment — no `KV_REST_API_*`, no `UPSTASH_*`, no `.env`, no Vercel link —
so the board runs in its labelled local-only mode. The adapter, schema, route,
ranking, tests and that mode are built and verified; **this is not the full
requirement met**, and `docs/sportsgang-polish/STORAGE.md` documents the
variable names and the steps without asking for or exposing a secret. Nothing
was provisioned.

- **The existing store was reused, not replaced.** `lib/sportsgang-board/store.ts`
  is shaped after `lib/joins/store.ts` and reads the same two variable pairs,
  so one Redis serves both.
- **The counter is untouched.** Its key, its absent TTL and its increment logic
  are not read, written or expired here. Every key of this module lives under
  `edwards-world:sg-golf:`. Verified live: after a full submission the only
  session key present is the counter's own, and `/api/joins` still reads 1.
- **The server validates** body size, JSON, `isGolfRunResultV1`, uuid shapes
  for both ids, the name, course, rules version, completion, stroke ranges and
  their sum, time and distance plausibility, duplicate `runId` and submission
  rate. Each refusal has its own code; all were exercised live.
- **The one real cross-check**: when a shot log is present it must explain the
  totals it arrived with — length equal to `shotCount`, penalties summing to
  `penaltyStrokes`, no shot after the run ended.
- **The server ranks.** A body carrying its own `rank` is accepted and the field
  is simply never read — `AcceptedSubmission` has no rank at all.
- **Concurrency is atomic.** Rate check, duplicate check and compare-and-set are
  one Lua `EVAL`; the in-memory store gets the same from a promise chain, and a
  test submits three runs at once and asserts one surviving best.
- **It is called what it is.** `CASUAL · CLIENT-REPORTED SCORES` on screen and
  `"verification":"client-reported"` in every response. A full re-simulation is
  impossible — the shot log records outcomes, not the power, contact and aim
  that produced them — so **nothing is called a verified score**.
- **Failure never looks like success.** Loading, empty, unreachable + retry,
  submitting, recorded with a rank, duplicate, not-your-best. Production with
  nothing provisioned answers 503 and the UI says unavailable rather than
  showing an empty board.
- **No fake data anywhere.** The connection check that would use an isolated
  `…-selftest` namespace is `NOT_RUN: no credentials in this environment`.

---

## 5 · Verification

Server on **3014**; Chrome via the devtools MCP at **1440×900** and a true
**390×844** (CDP device emulation). Evidence in
`docs/sportsgang-polish/evidence-d/`.

### Automated

| Gate | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS — **665 tests / 41 files** |
| `npm run build` | PASS — 11 routes (the new API route is the 11th) |

New: `tests/golf-board.test.ts` (35) and `tests/world-exit.test.ts` (14).

### Against the real store — distinguished from mock

Everything in this section ran against the **live route on 3014**, not a mock.
The store behind it is the in-process one, because nothing is provisioned; that
is exactly what `BLOCKED_CONFIG` means, and it is why the board is labelled
local-only rather than global.

| Check | Result |
|---|---|
| Submit, whitespace-messy name | PASS — stored as `ed ward`, server-normalised |
| Duplicate `runId` | PASS — `DUPLICATE`, board unchanged |
| Duplicate replayed with a *better* claimed score | PASS — `DUPLICATE`, stored row still 7 strokes |
| A worse run from the same player | PASS — `NOT_BETTER`, `rank: null`, one row kept |
| Tie on 4 strokes | PASS — both rank 1; after a 2 arrived, 1 / 2 / 2 / 4 |
| Abandoned run | PASS — `NOT_COMPLETED` |
| Old `rulesVersion` | PASS — `UNKNOWN_RULES` |
| Impossible strokes | PASS — `IMPLAUSIBLE_STROKES` |
| Client-asserted `rank` | PASS — ignored |
| **Independent browser session** | PASS — a second isolated context with **empty localStorage** saw the same four rows, no row marked as its own, and no `anonId` in the payload. This is what proves the board is server-held rather than local. |
| Refresh | PASS — rows survive a reload (fetched fresh from the server each mount, and seen in the isolated context). The resend guard is checked at the unit level and by reading back `submitted-runs` in localStorage after a submit; **the reload → same-run → "already submitted" path was not walked in the browser**, because a reload starts a new `runId` by construction. |
| Counter untouched | PASS — only `edwards-world:sg-golf:*` in localStorage, counter's session key intact, `/api/joins` unchanged |

### On screen

| Check | Result |
|---|---|
| Nickname box: preview, scope, GUEST default | PASS — `board-desktop-detail-consent.png` |
| Typing `S`/`E`/`A`/`D`/`Enter` + IME in the box | PASS — game never moved, dialog stayed, text survived |
| Board panel: rank, tie, Korean name, own row marked | PASS — `board-desktop-1440x900-01-panel.png` |
| Public board and per-visit RANK are distinct | PASS at 1440×900 — **they overlapped at first; fixed** (below) — and re-measured at 390×844, where the fix matters most: board `top 17 / bottom 336`, RANK `top 516 / bottom 810`, no intersection, neither clipped by the viewport. |
| Exit gate reachable, readable, labelled | PASS — `exit-desktop-1440x900-01-gate.png` |
| Walking past does not fire it | PASS |
| Held `E` fires once | PASS — **it re-fired before; fixed** (below) |
| Farewell copy, exact | PASS — `Bye bye!` / `Hope to see you again, and have a great day!` |
| Fireworks finite | PASS — sparks rise then reach 0 at 4.9s and stay there |
| Reduced motion | PASS — identical pixel count at 2s and 4.5s; a held still frame, no frame scheduled — `exit-…-03-reduced-motion.png` |
| Escape / return / re-open | PASS — no auto-re-fire |
| World inert during the goodbye | PASS — `inert` on the world |
| Mobile exit | PASS — opens by tap, dialog and buttons in view — `exit-mobile-390x844-04-farewell.png` |
| No tab close, no navigation away, no BGM touch, no re-count | PASS |
| Sports regression: tennis / basketball / running / golf | PASS — all mount with their own hints; **golf now shows 0 venue flags and 0 static players during play (B-1)** |
| Preserved: intro, House, Wardrobe, AFL Lab, Arcade | PASS — each opens and renders its own content |

### Three defects found by looking, and fixed

1. **The two panels overlapped.** The public board and the per-visit RANK panel
   are both absolutely positioned near the top and read as one smudged panel.
   A rule anchored on this session's own class moves RANK below the board only
   when the board is present; the frozen `.sg-rank` rule is untouched and every
   other sport's RANK beat is where it was.
2. **A held `E` re-fired on auto-repeat**, which would have re-opened the
   farewell the instant it closed. `event.repeat` is now ignored, which also
   fixes the same thing at every other object in the world.
3. **The exit's prompt overflowed the viewport by 6px** at the camera's
   right-hand clamp — the gate is the first interactable to stand there.
   That one prompt anchors to the gate's right post instead of its centre.

### NOT_RUN

- **A real durable store.** No credential; `GLOBAL_LEADERBOARD = BLOCKED_CONFIG`.
  No connection was attempted and no test namespace was written.
- **E's QA pass.** E never started. Nothing here reports its checks as done.
- **Audio**, and any browser other than Chrome.
- **A real touchscreen.** Mobile was CDP device emulation.
- **Tap-target size of the farewell buttons** is 32px, from the existing
  `.loc-button`, below the 44px guideline. Not introduced here and not changed;
  worth a pass.
- **The farewell's `PROJECT INDEX` button** was never clicked in the browser.
  Its handler is the same `showIndex` every other route into the index uses,
  and it clears `farewell` on the way, but the click itself is untested.

### Deliberate, in case it reads as a bug

- **The golf HUD says `PLAYER GUEST` even for a returning visitor** who has a
  nickname stored. `playerDisplayName` is not passed down to `<Minigame>`: a
  name is asked for at the moment of publishing, not at the moment of playing,
  so that nothing is ever attached to a record the visitor did not confirm on
  that submission. Wiring `getStoredNickname() ?? undefined` through would be a
  one-line change if the preference goes the other way.

---

## 6 · Advisor

Run via the configured `advisor` tool, twice: once with the branches surveyed
and before any code, once before this handoff. Per CONTRACT.md the tool reports
no model identity, so the backing model **could not be verified from this
environment**; the brief names Fable 5.1, recorded as intent, not fact. Not
ADVISOR_NOT_RUN — the tool ran.

What the first review changed:

- **It caught that `tests/sportsgang-playthrough.test.ts` had to be read before
  the merge**, and predicted the post-merge count of 616 exactly — which is how
  I know nothing was dropped in the CSS resolution.
- Told me to check the world guards *first*, which is why the exit is a
  `LEAVE_WORLD` action on a `sign` rather than a fifth project: the tests
  pinning the four project entrances would have had to be loosened otherwise.
- Insisted the atomicity be one `EVAL` rather than a sequence of REST calls,
  and that the counter's path-style command shape cannot carry a script.
- Pointed out that the shot log records outcomes rather than inputs, so a full
  re-verification is impossible and the board must be labelled client-reported
  rather than verified. That framing is now in the code, the API and the UI.

What the second review changed:

- **Caught the `runId` claim above being backwards** — I had written that the
  server issues it. It does not; the client does. Corrected in §2, and it is
  the one factual error in this document that would have misled a reader about
  the trust boundary.
- Made me measure the board/RANK de-overlap at 390×844 rather than inferring
  it from the desktop fix. It holds, and the numbers are in §6.
- Made me narrow the "Refresh | PASS" row to what was actually walked.
- Told me not to stall on the leaderboard being blocked: the adapter, schema,
  route, tests and labelled local-only mode are the deliverable here.

---

## 7 · For E

```bash
cd /Users/edwardhwang/Desktop/Edward_world-sg-d
export PATH=/opt/homebrew/opt/node@24/bin:$PATH
npm run lint && npm run typecheck && npm test && npm run build
npm run dev -- --port 3014
```

- World: `http://localhost:3014/?view=world` → title → ENTER → SKIP INTRO.
- The exit: walk right to the end. `EXIT · E TO LEAVE`.
- The board: SPORTSGANG → GOLF → finish the hole → RANK.
- The board API: `GET/POST http://localhost:3014/api/sportsgang/golf-board`.
- Ports in use elsewhere and **not** ours: 3004 (canonical checkout), 3011,
  3012, 3013 (A, B, C), 3003, 5173, 4899.

Most worth re-checking: the golf hole's difficulty by hand (nobody has played
it as a person), the farewell's tap targets, and everything in NOT_RUN.

---

## 8 · Commits

On `polish/sg-d-integration`, from `cdd593d`:

| SHA | |
|---|---|
| `17d5f40` | merge: session A — tennis contact sync and five swings |
| `447f2e3` | merge: session B — one hole of golf |
| `e349b35` | merge: session C — the basketball and running's controls |
| `9ac2acd` | fix: settle the shared-file requests the sports could not make |
| `28ae9f8` | feat: a public golf board that says what it is |
| `6301009` | feat: ask before publishing, and show the board that results |
| `25f0b66` | feat: a way out of the world, at the right-hand end of it |
| `ca51fe2` | fix: three things found by looking at it, and the handoff |
| *(last)* | docs: correct the trust boundary; measure the board on mobile |

`main` is untouched at `4c75644`. The canonical checkout was never checked out
onto another branch and still holds exactly its four pre-existing untracked
items. Nothing pushed, nothing merged, nothing deployed.
