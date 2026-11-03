# Districts: the world becomes Edward's timeline, Incheon to Sydney

## Why

The world reads small because it is one flat strip with one sky and one ground. The fix is not length, it is change: the walk from left to right becomes Edward's life in order, split into **districts** that each look different, with a title banner when you cross into one. The existing buildings move into the district they belong to, and last night's timeline street dissolves into the districts (its plaques become each district's entrance monument).

This task builds the **district system and geometry** with simple placeholder scenery for the Korean districts; task 06 draws them properly. Do not spend the night on Korean art here.

## The facts (verbatim source for every piece of copy)

These were given by Edward. Put them in `data/personal.ts` (`chapters`, extended as needed) and derive everything else from there. The file's rule stands: **nothing inferred, rounded up, or written to sound better than it is.** In particular, do **not** compute calendar years for middle school from his birth year — he gave school years, not dates, and the copy says exactly that.

1. **Incheon, Korea — born 2002.**
2. **Three elementary schools**: 유현초등학교 (Yuhyeon Elementary), 신곡초등학교 (Singok Elementary), 목동초등학교 (Mokdong Elementary). Every move was for his older sister's studies.
3. **목동중학교 (Mokdong Middle School)** from the first year of middle school; **TLBU (international school)** from the second year of middle school.
4. **St Johnsbury Academy Jeju, 2017 – 2022** (keep the existing Jeju detail lines: the Arduino contactless coffee machine capstone, the Samsung Enterprise Competition grand prize).
5. **University of Sydney, entered 2022** — Bachelor of Advanced Computing (Computer Science), final year in 2026 (existing lines).
6. Existing chapters that stay: Seoul National University research internship (2021) and the Sensorway/Ecopro Hungary internship (2025 – 2026). Place Seoul inside the Jeju era (it happened during high school, 2021) and Hungary inside the Sydney era.

Korean school names: show the Korean name with the romanisation in parentheses the first time, e.g. "유현초등학교 (Yuhyeon Elementary)". The label chips stay short ASCII (≤18 chars), e.g. "YUHYEON", "SINGOK", "MOKDONG".

## Districts, left to right

| id | title banner | years line | contains |
| --- | --- | --- | --- |
| `incheon` | INCHEON | 2002 | the birthplace monument; a small placeholder apartment block and harbour crane in the backdrop |
| `schools` | THREE SCHOOLS | — (no years given) | three small school buildings in a row (signs, READ), a moving truck prop between them |
| `mokdong` | MOKDONG · TLBU | — | middle school gate, then an international-school gate (two signs) |
| `jeju` | JEJU | 2017 – 2022 | SJA monument, the Seoul research-internship station, and **the Samsung grand-prize startup** as a small stall/booth (sign, READ — copy from the existing Jeju detail line only) |
| `flight` | — | — | a short transition stretch: runway stripes on the ground, a plane shadow crossing on the ambient frame; no objects |
| `sydney` | SYDNEY | 2022 – | **Edward's House**, SportsGang, AFL Lab, Arcade, the Hungary internship station, and the exit gate |

Edward's House keeps its interior and moves to Sydney (it is his current room). The old hill under the house: keep a hill in Sydney for it, or flatten — your call, but the terrace logic in `lib/game/terrain.ts` must stay a stepped function on the grid.

## What to build

1. **`data/districts.ts`** — ordered list `{ id, title, years, startX, endX, sky: { top, band, bottom }, ground: "grass" | "concrete" | "sand" | "runway" | "sandstone" }` in authored CSS px on the 4-px grid; contiguous, covering `0..WORLD_CONFIG.width`. Export `districtAt(x)`. Tests: contiguity, order, every world object inside exactly one district, every building in the district listed above.

2. **World width.** Grow `WORLD_CONFIG.width` / `BACKDROP_ART_SIZE.width` to what the districts need (expect roughly 2000–2400 art px). Hard constraints:
   - **Canvas size.** A single 960-art-px backdrop canvas at unit 8 is already 7680×1104. At 2200 art px it would exceed Safari's per-canvas limit (16.7 M px). Split the **near** backdrop into per-district canvases (`world-backdrop--<id>`, each ≤ 960 art px wide, positioned at the district's x), and give the **mid** layer the same treatment if `backdropLayerWidth` would exceed 960 at any viewport (it will: cap each layer canvas at 960 and tile, or draw per district with the parallax factor applied to the district's origin). The far layer stays one canvas — show that `backdropLayerWidth(far, …) ≤ 960` for the new width in a test, or chunk it too.
   - Walking speed stays 480; the world should take ~18–20 s to cross. If it is longer, tighten the districts rather than speeding up.
   - `getCameraX`, `movePlayerX`, the look-ahead and the chip layout are width-agnostic; confirm with the existing tests.

3. **Sky and ground per district.** The far layer draws each district's sky bands from `districts.ts`, blending across a 32-art-px seam at each boundary (dithered steps, not a gradient). The near terrain switches surface by district (`ground` variant) with the same 1-px grass/stone/sand edge logic as today. Palette: add at most three tokens if the sand/runway/concrete surfaces need them, desaturated like the rest, documented.

4. **District banner.** `components/world/district-banner.tsx`: when `districtAt(player.x)` changes, show the title (bitmap face) and years centred in the upper third for ~2 s, stepped in/out on the unit grid (no eased transforms); `aria-live="polite"`; under reduced motion it appears and disappears without steps. Not shown for `flight`. Also shown once on arrival in the world for the starting district. Pure selector in `lib/game/` with tests for the transition edge (no re-fire while standing on a boundary — use hysteresis of 8 px like the look-ahead does).

5. **Start position.** The player starts in Incheon. Keep `VIEW PROJECTS` / the index as the fast path for recruiters; the world is the slow path and now has a story.

6. **Timeline street → monuments.** Reuse `lib/pixel/timeline.ts` plaques as each district's entrance monument (a sign with READ). The dedicated street between the Arcade and the exit goes away; `e2e/timeline.spec.ts` becomes a walk through the districts asserting each banner appears once and each monument reads its chapter. Update `data/timeline.ts` to derive stations from districts.

7. **Index.** The Timeline section lists the chapters in the new order with the new copy.

## Constraints

- Every object position, district boundary and banner box on the 4-px authored grid; `e2e/world-grid.spec.ts` extended with the banner.
- Korean text in the bitmap font will not render (Silkscreen is Latin-only): banner titles are ASCII; Korean names appear only in READ dialogs and the index (Archivo/Plex Mono), where they render fine.
- Don't redraw the existing building art; only move it. Don't touch the interiors.
- Keep `initialPlayer.size`, the index's project contract, and the farewell/exit flow.

## Verify

All quality gates. Record a 1280x800 walk from Incheon to the exit as PNG frames at each banner and each monument into `docs/review/districts/`, plus one 390x844 frame in Jeju and one in Sydney. List them in the report with the final world width and the crossing time.
