# Timeline street: replace the scaffolding with Edward's story

## Why

The world shows four projects but not the person. The strongest signals for a graduate recruiter — the SensorWay/Ecopro internship with the Hungary deployment, the Samsung Enterprise Competition grand prize, the University of Sydney degree — exist only as text on `/resume`. The `construction-area` ("Scaffolding") building at the right-hand end of the world (x 3360–3696) is a placeholder. Turn that stretch into a short **timeline street**: walking right past the Arcade, the visitor passes Edward's chapters in order, each a station he can stop at and read.

## Source of truth for the content

`data/personal.ts` → `chapters` (Jeju → Seoul → Sydney → Hungary). That file's header rule applies: **nothing inferred, rounded up, or written to sound better than it is.** Use the `place`, `years` and `detail` lines as they are. Do not add dates, numbers or claims that are not already in that file or in `docs/IMPLEMENTATION_ROADMAP.md`'s biography table. If you need a one-line heading per station, derive it from `place` + `years`.

## What to build

1. **World geometry** (`data/world.ts`, `lib/game/terrain.ts` if needed)
   - Remove the `construction-area` building and its art (`lib/pixel/buildings.ts`), the dirt band that fades toward it in the backdrop (`DIRT_START_X` / `terrain()` in `lib/pixel/backdrop.ts` — the street should be grass and stone path like the rest of town, or a distinct but on-palette surface if you have a reason), and every test that pins the scaffolding (search `construction-area`, `Scaffolding`, "leaves the scaffolding plain").
   - Add one station per chapter as a `sign`-kind `WorldObject` with a `READ` interaction (`{ type: "READ", heading, text }` — see `movement-sign` for the shape). Space them across the former scaffolding stretch, in chapter order left to right, with enough gap that only one is "nearby" at a time (`interactionRange` ~68). Keep the `world-exit` where it is and reachable.
   - Each station gets its own art routine sized exactly to its footprint (the `tests/world-art.test.ts` "sized to its world footprint" contract). Design: a pixel plaque or milestone marker on a post, with a small motif per chapter that reads at 4x — e.g. a mountain/sea mark for Jeju, a flask or book for the Seoul research internship, a sandstone arch for Sydney, a fence-sensor post for Hungary. Keep it in the existing palette; use `signAccent` only on the part that marks "readable", the same way `signpostArt` does.
   - A thin connecting element along the stretch so it reads as one street (a low wall, a row of lamps, a path edge) — in `lib/pixel/backdrop.ts`, near layer.

2. **Reading a station** uses the existing READ dialog (`interaction-dialog.tsx`). Heading = place and years; body = the detail lines joined as short sentences. No new dialog component.

3. **Index view** (`components/index/portfolio-index.tsx`): add a compact "Timeline" section after the four projects that lists the same chapters (place · years · details) so the content is reachable without walking. The index must still list exactly four projects — the timeline is a separate section, not a fifth project.

4. **Data contract** — a small module `data/timeline.ts` (or a function in `data/world.ts`) that derives the station objects from `chapters`, so adding a chapter adds a station. Test it: one station per chapter, in order, non-overlapping, all inside the world, all left of the exit, READ text non-empty and taken verbatim from `chapters`.

5. **Tests**: extend `tests/world-data.test.ts`, `tests/world-art.test.ts`, `tests/interactions.test.ts`, `tests/content.test.ts` as appropriate. `tests/palette-accents.test.ts` has a scaffolding assertion to replace with the equivalent for the stations (accent only on the readable marker).

## Constraints

- Stations are `sign` objects: do not add a `WorldBuildingId`; buildings stay the five project/house entrances.
- The label chips (`WorldLabel`) remain the stations' accessible names — short labels like "Jeju · 2017–2022" are fine; keep them under ~18 characters so the chip fits at phone width.
- Keep the world width `3840`; fit the street into the existing stretch.
- Don't touch the arcade, house or project experiences.

## Verify

All quality gates, plus walk it: `npm run build && npm start -- --port 3100`, then with Playwright (`e2e/` has helpers) or a quick script confirm that walking right from the Arcade reaches each station, each shows its prompt, `E` opens the dialog with the right heading, `Escape` closes it, and the exit still works. Add a Playwright spec `e2e/timeline.spec.ts` that does this at 1280x800.
