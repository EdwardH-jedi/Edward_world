# OWNERSHIP — UI polish pass

Line numbers are against `app/globals.css` at `b341964` (6113 lines). Verify a
range before editing: `grep -n '^\.world-dialog' app/globals.css`.

The enforceable check, run by every track before handover:

```bash
git diff -U0 app/globals.css | grep '^@@'
```

Every hunk header must fall inside that track's ranges. A hunk outside them is a
merge conflict with another session, not a style opinion.

---

## Track A — foundation

**CSS**
```
1–29      :root                      (hoist --world-*, add --ui-* tokens)
6114+     new .ui-* section, appended at EOF
```
Two surgical deletions outside those ranges, and **only** these two:
```
519–525   .world-screen   — remove the five --world-* declarations
4111–4114 .world-dialog   — remove the four --world-* redeclarations
739–743   .loc-experience — rewrite the five as var(--world-*) aliases
```

**Files**
```
app/globals.css
tests/ui-tokens.test.ts        (new)
docs/ui-polish/HANDOFF-A.md    (new)
```

**Frozen for A:** every `.title-*`, `.intro-*`, `.world-*`, `.loc-*`, `.sg-*`,
`.wd-*`, `.arc-*`, `.afl-*` rule body. A moves tokens; it does not restyle.
**The global `button {}` / `a {}` base at 46–63 is frozen for everyone.**

---

## Track B — intro and title

**CSS**
```
151–290   .intro-*   (incl. the two @media blocks inside)
291–509   .title-*
```

**Files**
```
components/title/title-screen.tsx
components/intro/intro-sequence.tsx     JSX + className only
app/globals.css                          ranges above
docs/ui-polish/HANDOFF-B.md              (new)
```

**Frozen for B**
```
lib/game/intro-machine.ts       INTRO_STAGE_TIMINGS, stage order
lib/game/name-gate.ts           the reducer, applyText/pressKey/consumesKey
lib/pixel/monolith.ts           APPROACH/SHRINE art, drawApproach, drawClearing
lib/pixel/opening.ts
lib/motion/*                    driveValue, motionPresets, use-ambient-frame
```
**Gate:** `tests/intro-machine.test.ts`, `tests/name-gate.test.ts`,
`tests/motion.test.ts` pass unedited.

---

## Track C — HUD, interaction, project panels

**CSS**
```
120–141   .world-index-control
511–724   .world-screen, .world-join, .world-instructions, .world-viewport,
          .world-object__label/__prompt, .world-controls, .world-touch*,
          .interaction-status      (minus the token lines A0 removes at 519–525)
3769–3800 .loc-button, --primary, --quiet
3940–4010 .loc-summary*
4110–4180 .world-dialog
4828–4900 .music-control           (see the caveat below)
```

**Files**
```
components/world/main-world.tsx          JSX + className only
components/world/interaction-prompt.tsx
components/world/interaction-dialog.tsx
components/world/world-index-control.tsx
components/audio/music-control.tsx       markup/className only, not the engine
components/locations/project-summary.tsx
app/globals.css                          ranges above
docs/ui-polish/HANDOFF-C.md              (new)
```

**Frozen for C**
```
main-world.tsx        every useEffect, pressedKeys, the rAF loop, getDirection,
                      pose selection, getCameraX, SETTLE_MS
lib/game/interactions.ts, lib/game/movement.ts, lib/game/terrain.ts
data/world.ts
components/ui/accessible-dialog.tsx      focus trap behaviour (styling is C's,
                                         via .world-dialog only)
.index-dialog (4180–4240), .eyebrow (143–149)
every .sg-* / .wd-* / .arc-* / .afl-* rule
lib/audio/*, the BGM engine and its store
```
**Gate:** `tests/movement.test.ts`, `tests/interactions.test.ts`,
`tests/content.test.ts` pass unedited.

### Two caveats C must not miss

**`.music-control` renders on every route.** `<MusicControl />` sits in
`app/layout.tsx`, so it is also on `/resume`, `/case-studies/*` and `not-found`.
And `<MusicToggle inline />` is the Index dialog's header action
(`portfolio-index.tsx:36`), using `.music-control--inline` from the same block.
Restyling `.music-control` wholesale repaints the editorial layer. Scope the
game skin: `.experience-shell .music-control:not(.music-control--inline)`.

**`.world-index-control` is `position: fixed`** and lives outside
`.world-screen`, which is exactly why it cannot see `--world-*` today. After A0
it can. Until A0 lands, C's CSS does not compile to the intended colours — work
the TSX first.

---

## Shared-file protocol

`app/globals.css` is the one contested file (three tracks, one sheet).

1. A0 lands first and is the base commit for B and C.
2. B and C never reformat, reorder or re-indent outside their ranges — a
   whitespace-only hunk in someone else's range is still a conflict.
3. Additions-only where possible. Prove it:
   `git diff app/globals.css | grep '^-' | grep -v '^---'`
   (non-empty is fine for C, which rewrites rule bodies — but read every line).
4. If a track needs a change in another's range, it goes in the handoff as a
   request. No unilateral edits.
