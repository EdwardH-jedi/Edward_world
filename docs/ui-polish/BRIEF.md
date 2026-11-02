# UI Polish Pass — execution brief

Written 2026-09-11. Base: `main` @ `b341964`, clean tree, live in production.
Baseline gates: lint 0 · typecheck 0 · **714 tests** · build 0.

The goal is that the UI reads as part of a pixel game — framed, dark, embedded,
Core Keeper in *discipline* rather than in imitation — while staying Edward's
World: a personal portfolio you walk through.

---

## Scope

Five surfaces only.

1. **Intro / title screen** — `.intro-*`, `.title-*`
2. **World HUD** — the five chrome elements over the world
3. **Interaction prompt** — proximity chip, label chip, bottom status button
4. **Project panels** — `.loc-summary`, `.loc-button`, `.world-dialog`
5. **Menu chrome** — `.world-index-control`, `.music-control`

Plus one shared **UI foundation**: hoist the world colour tokens to `:root`,
add spacing/type/frame primitives, and add a CSS gate test so the rules hold
after tonight.

## Non-goals

- No product direction change. No new worlds, systems, rooms or gameplay.
- No new colours. `lib/pixel/palette.ts` is the approved palette and says so.
- No canvas/art changes (`lib/pixel/*.ts`), no movement, camera, collision or
  interaction *logic*, no stage machines, no timings in `intro-machine.ts`.
- No location interiors: `.sg-*`, `.wd-*`, `.arc-*`, `.afl-*` are out of scope.
  `.loc-summary` / `.loc-button` are in scope because they are the project panel.
- **No repaint of the editorial layer.** `/resume`, `/case-studies/*`, the Index
  dialog and `not-found` are deliberately a different, paper-white design
  system (prior pass §1). They must come out of tonight pixel-identical.
- No rounded cards. Nothing to do here — see Part 1; the repo is already clean.
- No push, no deploy, no merge to `main` by a track session.

## Design rules

Values, not adjectives. Everything below already exists somewhere in the sheet
or in `palette.ts`; this pass makes one version of it and uses it everywhere.

**Frame recipe** — one panel look, used by every in-world panel:

```css
background: rgb(34 31 26 / 94%);        /* existing .world-dialog surface */
border: 2px solid var(--ui-frame-dark); /* #14110d, already in the sheet */
box-shadow:
  inset 0 0 0 1px var(--ui-frame-light),   /* #57534a — the bevel highlight */
  4px 4px 0 rgb(20 17 13 / 55%);           /* 1 PIXEL_UNIT, zero blur */
border-radius: 0;
```

**Spacing** — `PIXEL_UNIT` is 4 px, so UI spacing is a multiple of 4 px:
`--ui-space-1: 4px` … `-2: 8px`, `-3: 12px`, `-4: 16px`, `-6: 24px`. No `rem`
padding that lands off the grid.

**Type** — three systems, already used with discipline; pinned as tokens:
- in-world headings → `var(--font-bitmap)`, 0.85rem, tracking 0.14em, uppercase
- HUD / chips / prompts → `var(--font-mono)`, 0.625–0.7rem, tracking 0.10–0.16em, uppercase
- prose → Archivo, **editorial pages only**, never inside a game panel

**Colour** — `--world-char #2b2823` · `--world-cream #efe7d3` ·
`--world-orange #c98a52` (the one accent) · `--world-muted #9c9482` ·
`--world-sky #e9e0c8`. Frame tones `#57534a` / `#14110d`. Nothing else.

**Motion** — reuse `motionPresets` and the existing 220–520 ms ease-out band.
New keyframes are `step-end` (a game does not tween its UI). Respect
`prefers-reduced-motion`, which the intro already honours.

**Radius** — `0` or `50%`. Nothing between.

## File targets

See `OWNERSHIP.md` for the enforceable line ranges. Summary:

| Track | TSX | CSS |
|---|---|---|
| A | — | `:root` 1–29, new `.ui-*` section appended at EOF, `tests/ui-tokens.test.ts` |
| B | `title-screen.tsx`, `intro-sequence.tsx` (JSX only) | 151–290, 291–509 |
| C | `main-world.tsx` (JSX/className only), `interaction-prompt.tsx`, `interaction-dialog.tsx`, `world-index-control.tsx`, `music-control.tsx`, `project-summary.tsx` | 120–141, 511–724, 3769–3800, 3940–4010, 4110–4180, 4828–4900 |

## Acceptance criteria

Every track, before it hands over:

1. `npm run lint` 0 · `npm run typecheck` 0 · `npm test` ≥ 714 · `npm run build` 0.
2. `npx vitest run tests/ui-tokens.test.ts` passes (A1 writes it; B and C run it).
3. `git diff -U0 app/globals.css | grep '^@@'` — every hunk falls inside the
   track's own line ranges. This is the merge contract.
4. No pre-existing test file edited.
5. Evidence: before/after PNGs at 1440×900 and 390×844 in
   `docs/ui-polish/evidence/<track>/`, ≤150 KB each. **Visual PASS comes from
   screenshots only.** No browser → record `NOT_RUN`, never PASS.
6. A handoff at `docs/ui-polish/HANDOFF-<track>.md`: what changed, run commands,
   PASS/FAIL/NOT_RUN, shared-change requests, unresolved items.

Track-specific criteria are in Part 3 of the coordinator's report and repeated
in each track's section below.

## The three tracks

### A — UI foundation (blocking)

**A0 — mechanical, zero visual change. This is tonight's FOUNDATION_SHA.**

- Hoist `--world-sky/-char/-cream/-orange/-muted` from `.world-screen` (519–525)
  to `:root`. Delete the redeclaration in `.world-dialog` (4111–4114).
- Alias the parallel family at `.loc-experience` (739–743):
  `--loc-char: var(--world-char)` etc. Keep `--loc-court*` — location-specific.
- Add `--ui-frame-light: #57534a`, `--ui-frame-dark: #14110d`, the `--ui-space-*`
  scale and the `--ui-type-*` scale to `:root`.
- Nothing else. `git diff` must show no computed colour changing value.

**A1 — primitives + the gate.**

- Append one `.ui-*` section at EOF: `.ui-panel` (the frame recipe), `.ui-chip`,
  `.ui-prompt`, `.ui-button` (+`--primary`, `--quiet`).
- **Do not touch the global `button {}` base at lines 51–63.** It is also the
  editorial layer's button. In-world buttons opt in via `.ui-button`.
- Write `tests/ui-tokens.test.ts` — see Part 3.

B and C branch from A0. They may start their TSX work immediately, but their CSS
rebases onto A0.

### B — intro and title screen

Make the entry read like a game booting, not a landing page.

- `.title-enter`, `.title-skip`, `.intro-skip` adopt `.ui-button` / `.ui-chip`;
  the two `var(--surface)`/`var(--foreground)` uses in the title range go.
- Frame the wordmark and the purpose line so they sit *in* the scene.
- Keep: `INTRO_STAGE_TIMINGS`, the name-gate reducer, the uncontrolled input,
  the keyboard bridge, ESC-to-skip, `prefers-reduced-motion`, the `aria-live`
  announcer, the invisible-chrome inscription input.
- Gates: `intro-machine`, `name-gate`, `motion` tests pass **unedited**.

### C — HUD, interaction, project panels

The five chrome elements are `.world-join`, `.world-instructions`,
`.world-index-control`, `.music-control`, `.world-controls`. Consolidate their
*language*, not their existence.

- `.world-index-control` and `.music-control` stop using `--surface` /
  `--foreground` / `--muted` **when over the world**. Scope the game skin under
  `.experience-shell`; `.music-control--inline` lives in the Index dialog header
  and must keep the editorial look.
- `.world-object__label` / `__prompt` → `.ui-chip` / `.ui-prompt`; keep the
  orange prompt as the one accent and keep the wake-up-on-proximity behaviour.
- `.world-dialog`, `.loc-summary`, `.loc-button` → the frame recipe and
  `.ui-button`.
- `main-world.tsx`: **className and JSX only.** Every `useEffect`, the key
  handling, the rAF loop, `pressedKeys`, pose selection and the camera are frozen.
- Keep: `aria-live` on the status button, `role="status"` on the join line,
  `aria-pressed`, `inert`, the two-tone focus ring, and the fact that the bottom
  status button **is** the accessible interact control.
- Two decisions to propose, not to make silently: collapsing
  `.world-instructions` after first movement, and hiding the ← → touch bar on
  `(pointer: fine)`. Both were filed under "Edward decides" in the prior pass.
  Implement behind a one-line switch and show both states in evidence.

---

## Working rules for tonight

- Worktrees off A0, one per track. `cp -Rc node_modules` — a **symlinked**
  `node_modules` breaks Turbopack `next build`.
- Distinct dev ports. Use `http://localhost:<port>`, not `127.0.0.1` (Next 16
  blocks cross-origin dev chunks with a 403).
- Own `--user-data-dir` per Chrome instance; the shared MCP profile locks.
- `next dev` rewrites `AGENTS.md`. Do not commit it.
- Never `git add -A`. Commit the owned paths by name.
- Do not touch the four untracked user paths: `docs/VISUAL_POLISH_PASS_2026-09-03.md`,
  `docs/WORK_SAMPLE_READINESS_AUDIT.md`, `docs/visual-polish/`, `scripts/`.
- `scripts/check-browser-env.sh` is a read-only pre-flight — run it before
  browser work.
- Prior pass: `docs/VISUAL_POLISH_PASS_2026-09-03.md`. Read §1 and §8 first.
  Its focus-ring item is already fixed; its "DO NOT SPEND TIME ON" list stands.
