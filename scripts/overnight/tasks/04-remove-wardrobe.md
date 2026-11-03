# Remove the Wardrobe project entirely

## Why

Wardrobe is leaving the portfolio. It is being replaced (in a later task) by the Automation Lab, so the "exactly four projects" contract of the index will hold again once that lands; for this task the index temporarily lists three, and the tests that pin four are updated to pin the live list length instead of a literal.

## What to remove

Delete, don't stub:

- `components/wardrobe/` (experience + CSS), `data/wardrobe.ts`, `types/wardrobe.ts`
- `lib/game/wardrobe-archive.ts`, `lib/game/wardrobe-persistence.ts`, `lib/motion/wardrobe-choreography.ts`, `lib/pixel/wardrobe.ts`
- `lib/storage/saved-look.ts`, `lib/storage/use-saved-look.ts` (they only exist for the Wardrobe look; check `lib/audio/bgm.ts` and anything else that imports them and give those a local replacement or drop the dependency)
- `tests/wardrobe.test.ts`, `tests/wardrobe-persistence.test.ts`
- `docs/review/interior-grid/wardrobe-800.png`, `docs/review/s7/wardrobe-*.png`
- The `wardrobe` entry in `data/projects.ts`, the `wardrobe` building in `data/world.ts` and its art in `lib/pixel/buildings.ts`, the `WorldBuildingId` member in `types/portfolio.ts`, the `/case-studies/wardrobe` static param, the Wardrobe branch in `components/portfolio-experience.tsx`, the Wardrobe-specific CSS in `app/globals.css`, and the `e2e/interior-grid.spec.ts` case.
- In Edward's House (`components/house/house-experience.tsx`), the closet object links to the Wardrobe case study. Keep the closet as a plain object about clothes/fashion as an interest (the copy can stay about the clothes rail); drop the project link and `getProjectById("wardrobe")`.

## What to adjust

- `data/world.ts`: close the gap where the Wardrobe stood (x 1000–1304) so the town does not have a hole — slide SportsGang, AFL Lab and the Arcade left by the Wardrobe's width plus one gap, keeping every gap, the stream, the town cluster and the oval positions in `lib/pixel/backdrop.ts` consistent (they are authored in art pixels; move them by the same amount). Keep the timeline street and the exit where they are relative to the Arcade. Shrinking `WORLD_CONFIG.width` is allowed if everything still fits with the same right-hand margin; `BACKDROP_ART_SIZE.width` must match it (`tests/world-art.test.ts`).
- The far-layer skyline positions in `backdrop.ts` are relative to the far layer's visible span, which depends on the world width — recompute if the width changes (see the comment above `CITY_BLOCKS` and `backdropLayerWidth`).
- `tests/projects.test.ts`, `tests/world-data.test.ts`, `tests/interactions.test.ts`, `tests/content.test.ts`, `tests/palette-accents.test.ts`, `tests/game-feel.test.ts`, `tests/world-exit.test.ts`, `tests/ambient-art.test.ts`: remove Wardrobe cases; where a test pins the project count as a literal `4`, change it to assert the index lists `projects.length` and that the list is non-empty and has no `wardrobe` — the next task restores four.
- README "What you can explore" table, `docs/ARCHITECTURE.md`: remove the Wardrobe row/lines. Leave dated docs (`docs/sportsgang-polish/*`, `docs/QA_REPORT.md`, `docs/PROJECT_STATUS.md`, `docs/IMPLEMENTATION_ROADMAP.md`) untouched — they are historical records.

## Verify

`rg -i wardrobe` across `app components lib data types tests e2e README.md docs/ARCHITECTURE.md` returns nothing except the house closet's plain-language copy if you kept the word there. All quality gates. Walk the world at 1280x800 and confirm the town has no empty plot and every remaining building is still enterable (extend `e2e/timeline.spec.ts`'s walk, or add a short spec).
