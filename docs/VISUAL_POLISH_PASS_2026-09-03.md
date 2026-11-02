# Edward's World — Visual Director & Game Feel Polish Pass (2026-09-03)

Reviewer role: Art Director + Game Feel Reviewer + Visual QA + Conservative Implementer.
Primary viewport 1440×900, secondary 1280×720, spot check 390×844.
Screenshots: `docs/visual-polish/` (before/after pairs `cmp-*.png`, walkthrough `F-contact-sheet.png`).

## 0. Source-of-truth verification (read this first)

| Item | Finding |
|---|---|
| localhost:3000 | served from `/Users/edwardhwang/Desktop/Edward_world` (main worktree, uncommitted). Confirmed via the dev bundle's `[project]` paths. |
| Branches / worktrees | `main` + `feat/bgm-feel-polish`, `feat/character-avatar`, `feat/feel-calibration`, `feat/sportsgang-tennis`, `feat/visitor-counter` (each in its own `Edward_world-*` worktree). |
| State before this pass | Working tree = tennis branch + Enter-key tweak + BGM files, **without** the feel calibration (`speed: 280`, `WALK_FRAME_DISTANCE = 5`, `SEARCHING: 2200` …). So localhost was running the *old* feel. |
| `feat/feel-calibration` (1166939) | = working tree + exactly 3 files: `data/world.ts`, `lib/game/sportsgang-machine.ts`, `lib/pixel/characters.ts` → 480 / 8 / 700·800·1500·1100·2200, hard-locked camera. Matches Edward's description of "current". |
| `feat/bgm-feel-polish` | separate lineage: `lib/game/feel.ts` (acceleration/deceleration, 160 ms camera smoothing). Contradicts the "zero-lag hard-lock" description → **not** canonical. |
| Decision (confirmed by Edward) | `git checkout feat/feel-calibration -- <3 files>` onto main working tree. Working tree is now byte-identical to `feat/feel-calibration`. Note: those 3 files are now **staged** in the index (side effect of checkout-from-tree); nothing was reset/stashed/merged. |
| Housekeeping | A stale `.git/index.lock` created by read-only git commands from the sandbox was removed. No other files touched outside the two edited below. |

All screenshots and judgements below are against the calibrated state (480 px/s, stride 8, fast SportsGang beats).

## 1. Existing visual language (inferred)

**Pixel language** — world authored on a 4 CSS px unit (`PIXEL_UNIT = 4`), locations at 2× that (8 px) via `object-fit: cover` on 240×135 art. Edward is 12×16 art px (48×64 CSS), buildings ~70–90 art px tall → protagonist ≈ ⅓ of a building, classic RPG proportion. Flat fills, no outlines except on props; no AA anywhere in canvas art; hard 1 px hairline borders on UI panels; shadows are 0-blur offset blocks.
**Palette** — the approved `palette.ts`: cream/paper surfaces, dusty greens, browns, charcoal `#2b2823`, one accent orange `#c98a52`. Nothing saturated. Location panels are `rgb(34 31 26 / 92%)` + `1px #57534a`.
**UI language** — three type systems used with discipline: Silkscreen (bitmap) for in-world headings/wordmarks, IBM Plex Mono for labels/prompts/HUD (0.58–0.7 rem, wide tracking, uppercase), Archivo for portfolio prose (case studies, Index, Resume). Square corners everywhere; label chips (`.world-object__label`) are the approved callouts; prompts are orange chips.
**Environmental language** — side-view band 3840×552 letterboxed inside a dark "cartridge" frame; 72/28 sky-to-land split; terraced hill → town; each project is a distinct building with a distinct silhouette (shopfront, court+scoreboard, lab with antennas, arcade awning); construction fence ends the world. Empty sky is deliberate breathing room.
**Motion language** — hard-locked camera, distance-driven walk cycle, 420 ms settle then face-the-visitor; UI enters are 220–520 ms ease-out; SportsGang stages are timed beats with anime.js choreography; locations open with a 320 ms fade+1.008 scale.
**Portfolio language** — technical info lives in dark location panels (wordmark in bitmap + role in orange mono + Archivo sentence + flow + stack chips + buttons), and the "written" path is a separate paper-white editorial layer (Index/Resume/Case study). The two layers are intentionally different and both are consistent internally.

## 2. Initial findings

| Area | Finding | Severity | Decision |
|---|---|---|---|
| WORLD | DIRECTIONS sign & TOMODACHI open a plain white Arial modal with a "Close" button, dimming the whole world — the one place the site "opens a website over the game", and it is the RPG's dialogue moment | **A** | FIXED (change 1) |
| SPORTSGANG / Tennis | Ball is a CSS `border-radius: 50%` circle (anti-aliased, the only round object in the game) and its pale felt `#f2e4a8` disappears against the cream sky `#e9e0c8` when lobbed above the fence | **A** | FIXED (change 2) |
| SPORTSGANG | Score HUD sits just above the court; the RESULT panel then appears at `top: 12%` — the score jumps ~180 px up between two panels | B | LEFT (robust fix needs the HUD's court-relative anchor; a numeric coincidence at 1440×900 would break elsewhere) |
| SPORTSGANG | Phone sport list: "HOLD AND RELEASE" wraps, making one row taller | B | LEFT (no clean fix without shortening copy) |
| SPORTSGANG | MEET beat ("ALEX IS READY") sits at 16% — 450 px above the players | C | LEFT |
| Locations (all) | 240×135 backdrops scale to a non-integer unit at 16:10 viewports (900/135 = 6.67 px) → uneven pixel rows; documented trade-off in `pixel-canvas.tsx` (`fill`) | B | REPORTED only — integer scaling + letterbox is an architecture change |
| Focus ring | Global `--focus: #ef7c1c` is the only saturated colour on the site; loud around orange buttons ([ACCEPT], TEAM A) | B | LEFT — a11y token, needs a contrast decision, see §8 |
| WARDROBE | At 1440×900 the studio ends at y≈510; ~180 px of bare wall + picture rail before the skirting/floor reads slightly unfinished | B | LEFT — room composition is intentional (wall/skirting/floor); fix would move floor % and risk overlap at 720 px heights |
| AFL_PREDICT | Wall boards are edge-cropped at both sides (cover-fit), reads like a camera frame — acceptable | C | LEFT |
| Intro gate | "TYPE THE NAME TO ENTER" banner crosses the carved face | C | LEFT — drawn in `monolith.ts`, reads as a ribbon; moving it collides with steps/tablet |
| Arcade | Carpet is an anti-aliased 45° `repeating-linear-gradient` | C | LEFT — location personality |
| WORLD | Bottom control bar (← → touch buttons + status) shows on desktop, bottom-left | C | LEFT — it is also the a11y interact button |
| Camera | Hard-lock at 480 px/s | C | LEFT — cannot be judged from stills; see §10 |
| Character | Walk frames are subtle (feet barely lift) → may read as a slide at 480 px/s | C | LEFT — see §10 |
| WORLD | Cartridge letterbox, label chips, orange prompts, terraced terrain, construction-fence ending, empty sky | D | keep |
| Character | 12×16 at unit 4, consistent grid, settle-to-front pose, coat/bag secondary motion | D | keep |
| Title / Intro | Poster composition, name-gate ritual, bloom on completion | D | keep |
| House | Room scene + cream fact panel with orange rule | D | keep |
| AFL | CRT bench choreography, console, translucent summary panel | D | keep |
| Index / Resume / Case study | Editorial paper layer | D | keep |

## 3. Changes attempted

### Change 1 — World dialogue panel (`.world-dialog`)
- Problem: signpost/NPC dialogue used the generic `.dialog` shell (white, Arial, "Close", 72% dim).
- Reason: it is the single strongest "portfolio website wearing a pixel skin" moment, and it happens on the first interaction a visitor tries.
- Minimal fix: `className="world-dialog"` on the three world call sites in `components/world/interaction-dialog.tsx`; one scoped CSS block reusing the existing location-panel tokens (charcoal 94%, `1px #57534a`, cream mono text, bitmap orange title, uppercase CLOSE). Backdrop dim 72% → 38% and the box anchored low (`align-items: flex-end; padding-bottom: 16vh`) so the speaker stays visible above it. Index dialog untouched.
- Before: `cmp-A1-tomodachi.png` (left), `cmp-A1-directions.png` (left). After: right halves.
- Iterations: v1 centred → covered TOMODACHI himself → v2/v3 bottom-anchored (18vh touched Edward's feet → 16vh).
- Verified at 1440×900, 1280×720, 390×844.
- **Verdict: KEEP (refined).**

### Change 2 — Tennis ball on the pixel grid
- Problem: anti-aliased circle, no rim, near-invisible over the sky.
- Reason: obvious pixel-style inconsistency in the most game-like screen; ball readability was a listed review point.
- Minimal fix (CSS only, `.sg-tennis__ball`): octagon `clip-path`, dark `#2b2823` body with a `::before` felt fill inset 3 px, width 1.4% → 1.8% (≈16 px at the 900 px court). Ground shadow `border-radius` removed (flat block like every other shadow). Simulation untouched.
- Before: `cmp-A2-ball-zoom.png` left / `cmp-A2-ball-full.png` left. After: right.
- Iterations: 14 px + 2 px rim → rim too thin next to the 8 px racket frame → 16 px + 3 px rim.
- **Verdict: KEEP (refined).**

No other edits were made.

## 4. Screenshot comparisons
`docs/visual-polish/cmp-A1-tomodachi.png`, `cmp-A1-directions.png`, `cmp-A2-ball-full.png`, `cmp-A2-ball-zoom.png`. Full second-walkthrough contact sheet: `F-contact-sheet.png`.

## 5. Changes reverted
- Change 1 v1 (centred dialogue box): reverted to bottom anchoring — it hid the character who was speaking, which is worse than the original in one specific way.
- Change 2 v1 (14 px ball, 2 px rim): replaced — rim weight did not match the venue's 8 px art unit.
- Considered and **not** implemented: moving `.sg-result` to the HUD's height; palette-orange focus ring; raising the Wardrobe floor; nudging the intro banner; hiding desktop touch arrows. Each either needs a robust anchor the code does not have, or is a taste call that the existing decision already made deliberately.

## 6. Intentionally left alone
Feel numbers (480 / 8 / 700·800·1500·1100·2200) and the hard-locked camera; the cartridge letterbox and its empty sky; label-chip callouts; the paper-white editorial layer; House fact panel; AFL bench choreography; SportsGang phone → court cross-fade; project-summary panels; Arcade room mood; Wardrobe room structure; title poster; name gate; all pixel art.

## 7. Final visual assessment (1–10)
Visual coherence 8 · Pixel-art consistency 8 (was 7: ball) · Game feel 7 · Character/world integration 8 · UI hierarchy 8 · Project identity 8 · Portfolio clarity 8 · Personality 9 · Overall polish 8.
Lowest: **Game feel 7** — stills cannot confirm whether 480 px/s with a hard-locked camera and a subtle walk cycle reads as walking or sliding; that is the one thing only a hand on the keys can settle (§10). Non-integer location scaling is the other quiet drag on pixel consistency.

## 8. Remaining visual problems
**MUST FIX BEFORE LAUNCH** — none found.
**WORTH POLISHING** — (1) RESULT panel continuity with the in-match HUD; (2) focus-ring colour: `#ef7c1c` on `#c98a52` buttons is ~1.3:1, so it fails a11y *and* looks off-palette — a 2-tone ring (cream outer / charcoal inner) would fix both; (3) integer-scaled location backdrops (letterbox instead of cover) — architecture-level, later pass.
**SUBJECTIVE / EDWARD DECIDES** — Wardrobe empty wall band at 900 px heights; desktop visibility of the ← → touch bar; MEET beat height; walk-cycle leg amplitude at 480 px/s.
**DO NOT SPEND TIME ON** — intro banner crossing the carved face; arcade carpet AA; AFL board edge-cropping; phone hint wrapping.

## 9. Technical verification
Run on a faithful copy of the working tree (only `app/layout.tsx` differed: `next/font/local` instead of `next/font/google`, because the sandbox cannot reach fonts.googleapis.com).

| Check | Result |
|---|---|
| `npm run lint` | PASS (0 warnings) |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 27 files, 347 tests |
| `npm run build` | PASS (with local fonts) — **MANUAL CHECK** on the Mac for the Google-font fetch only |
| Console | PASS — only `/favicon.ico` 404 (browser default request, pre-existing) |
| React warnings | none observed |
| Input conflicts | Escape closes the dialogue without leaving the world; E/Enter/A/D unchanged |
| BGM | toggles, no errors; audible playback **MANUAL CHECK** (Web Audio, headless) |

Files changed: `app/globals.css` (+90 lines world-dialog block, ball/shadow rules), `components/world/interaction-dialog.tsx` (3 × `className`), plus the 3 calibration files checked out from `feat/feel-calibration`.

## 10. Edward — manual review (max 5)
1. Walk from the house to the construction fence once: does 480 px/s feel like *walking quickly* or like the ground *sliding* under a fixed Edward? (Watch his feet, not the buildings.)
2. When the SEARCHING bar fills in 1.5 s, does it read as "looking for someone nearby" or as a loading flicker?
3. Talk to TOMODACHI: does the new bottom text box feel like *he* is talking, or like a HUD notification? Is CLOSE the right word, or should it be a key hint?
4. In a rally, lob the ball high: can you follow the ball across the sky *and* the fence without hunting for it? Is 16 px too big?
5. Open WARDROBE at your usual window size: does the wall below the bays read as a room, or as a page that stopped early?
