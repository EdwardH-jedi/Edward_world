# Chart Overworld — handoff brief

Replace the side-view town as the way into Edward's World with a nautical chart you sail across. Each island is a chapter of Edward's life or a project. Pressing `E` at an island's anchorage goes ashore into a walkable plan of that island, where buildings open the existing interiors or new content.

**This brief sets up the skeleton only.** Edward will supply the ideas and content for each island afterwards. Build the empty slots so adding a place is a data change, not an engine change.

Read `AGENTS.md` first: this repo's Next.js has breaking changes, so check `node_modules/next/dist/docs/` before writing route or font code. Read `docs/ARCHITECTURE.md` for the layering rules this brief relies on.

## Reference

`docs/chart-overworld/prototype.html` is a working single-file prototype. Open it in a browser. It is the visual and interaction reference for the chart layer.

Keep from it: the look (ink, sea blue and one vermilion on aged paper), the distance-field terrain, marching-squares coastlines and waterlines, the sailing feel, the dashed course line, bottles that become handwritten notes, the "CHARTED" stamp, the Landings panel, the captain's log opening, and the zoom from the whole sheet down to the boat.

Do not copy its structure. It is one closure with no tests. Port it into the repo's layers.

## Decisions already made

- The overworld is a sea chart, not pixel art. Existing pixel interiors stay as they are; the style change between chart and interior is intended.
- Eight landings: Incheon Port, Jeju Island, Field Station (Hungary), The Shipyard, Sydney Harbour, SportsGang Courts, AFL Oval, Arcade Pier.
- Nothing is locked. Every landing is reachable from the Landings panel at any time, and `SKIP TO INDEX` is always visible.
- No combat, inventory or gating.
- Wardrobe is removed from the portfolio, code included.
- `data/projects.ts` and `data/personal.ts` stay canonical. Chart copy resolves from them; it does not restate them.

## Two changes from the prototype

1. **Bigger landmarks.** On the chart, each island's main landmark should span at least 45% of the island's width (they are roughly 25% now). Scale the landmark drawings 1.6–2×, thin the trees to make room, and grow an island's radii by up to 20% if needed. Anchorage positions and the island count stay. Name plates must not overlap landmarks.
2. **`E` goes ashore.** In the prototype `E` opens a card. In the build it enters the island scene described below.

## Three layers

```
LOG -> CHART -> ISLAND(id) -> PLACE(id)
        ^          |              |
        +---Esc----+------Esc-----+
INDEX is reachable from every state.
```

- **Chart**: sail the boat between anchorages. As in the prototype.
- **Island**: the island redrawn as a large-scale harbour plan (charts call this an inset), same ink style, about 4× the chart's scale. Top-down. Edward steps off at the jetty and walks with WASD or arrows, or by holding the pointer. Walking back to the jetty and pressing `E`, or pressing `Esc`, returns to the chart at that anchorage.
- **Place**: a building or spot on an island. Its action is one of: open an existing project experience, open an existing location, open a card, or nothing yet.

Model the transitions as a pure state machine (`voyage-machine.ts`) in the style of `lib/game/intro-machine.ts`. Timers and input drive it; animation never does.

## Data model

```ts
// types/chart.ts
type LandingId = "incheon" | "jeju" | "field" | "shipyard" | "sydney" | "sportsgang" | "afl" | "arcade";

interface Landing {            // one island on the chart
  id: LandingId;
  name: string;
  tag: string;                 // "2017 – 2022", "Data science"
  coord?: string;              // real latitude/longitude where one exists
  centre: Vec; radii: Vec; seed: number; dockAngle: number;
  carve?: Ellipse[];           // bays cut out of the coast
  source: { chapterId?: string; projectId?: PortfolioProjectId };
}

type PlaceKind = "project" | "chapter" | "idea" | "placeholder";
type PlaceAction =
  | { type: "OPEN_PROJECT"; projectId: PortfolioProjectId }
  | { type: "OPEN_LOCATION"; locationId: WorldLocationId }
  | { type: "OPEN_CARD"; heading: string; body: readonly string[] }
  | { type: "NONE" };

interface Place {
  id: string; name: string; kind: PlaceKind;
  rect: Rect;                  // footprint on the island plan; solid
  door: Vec;                   // where Edward stands to interact
  action: PlaceAction;
  art?: string;                // key of a drawing routine; falls back to a labelled plot
}

interface IslandPlan {
  landing: LandingId;
  size: Vec;                   // plan size in plan units
  jetty: Vec;                  // spawn and exit
  places: readonly Place[];
  paths: readonly Vec[][];     // drawn as dashed footpaths
}
```

A `placeholder` place draws as a surveyed plot: a dashed rectangle with a name plate such as "Plot B, reserved". Adding Edward's ideas later means editing `data/islands/<id>.ts` and, optionally, adding one drawing routine.

## Starting contents per island

Wire the known places. Leave the rest as placeholder plots.

| Landing | Known places | Placeholder plots |
| --- | --- | --- |
| Incheon Port | Apartment towers (`OPEN_CARD`, chapter text), quay and cranes (decor) | 3 |
| Jeju Island | St Johnsbury Academy Jeju (`OPEN_CARD` from `data/personal.ts`), Hallasan (decor), dol hareubang (decor) | 3 |
| Field Station | Station hut (`OPEN_CARD`, Sensorway chapter), sensor fence (decor) | 2 |
| The Shipyard | Slipway (`OPEN_CARD`, "reserved for the next project") | 2 |
| Sydney Harbour | University quadrangle (`OPEN_CARD`), Edward's House (`OPEN_LOCATION edwards-house`), résumé and index signposts, bridge and opera shells (decor) | 3 |
| SportsGang Courts | Clubhouse (`OPEN_PROJECT sportsgang`) | 1 |
| AFL Oval | Lab (`OPEN_PROJECT afl-predict`) | 1 |
| Arcade Pier | Arcade (`OPEN_PROJECT soonpermario`) | 1 |

Existing interiors open through the same path `components/portfolio-experience.tsx` uses today (`EXPERIENCE_PROJECTS`, the lazy scenes, `SceneDissolve`). Do not change the interiors.

## Where the code goes

| Path | Contents |
| --- | --- |
| `types/chart.ts` | The types above |
| `data/chart.ts` | Landings, bottles, sea names. Copy resolves from `data/projects.ts` and `data/personal.ts` |
| `data/islands/<id>.ts` | One `IslandPlan` per landing |
| `lib/game/chart/` | Pure. `terrain.ts` (distance field, contours), `sailing.ts` (movement, collision), `camera.ts`, `docking.ts`, `voyage-machine.ts`, `island-walk.ts` (2D movement, AABB collision against `Place.rect` and the coast) |
| `lib/chart-art/` | Drawing only. `ink.ts` (primitives), `sheet.ts` (paper, graticule, rose, cartouche, neatline), `coast.ts`, `boat.ts`, `landmarks/<id>.ts`, `island-plan.ts`, `figure.ts` (Edward, top-down) |
| `components/chart/` | `chart-world.tsx`, `island-scene.tsx`, `captains-log.tsx`, `landings-panel.tsx`, `chart.css` |
| `app/chart/page.tsx` | The new world, at `/chart` until the final phase |

Rules that carry over from `docs/ARCHITECTURE.md`: simulations are pure (no React, DOM or `requestAnimationFrame`); timers drive stage state; text and controls are DOM, the canvas is art.

## Constraints

- **Performance**: vector drawing every frame, culled to the view. Build `Path2D` objects once. Cap device pixel ratio at 2. Target 60 fps on a laptop and 30 fps on a mid-range phone.
- **Input**: keyboard, pointer-hold steering, and touch. No on-screen joystick.
- **Accessibility**: honour `prefers-reduced-motion` (no zoom animation, bobbing or ripples); every action reachable by keyboard; dialogs manage focus the way the existing ones do.
- **Fonts**: IM Fell English, IM Fell English SC and Nanum Pen Script, loaded through `next/font`.
- **Do not touch**: `/resume`, `/case-studies/*`, `?view=index`, the API routes, the interiors.

## Phases

One pull request each. All four checks (`lint`, `typecheck`, `test`, `test:e2e`) pass before the next starts.

| # | Work | Model / effort |
| --- | --- | --- |
| 0 | Remove Wardrobe: components, data, game logic, tests, the project entry, the building | Sonnet 5.5 / medium |
| 1 | Port the chart to `/chart`: terrain, sailing, renderer, log, Landings panel. Parity with the prototype. `E` still opens a card | Opus 5.5 / medium |
| 2 | Bigger landmarks, per the rule above | Sonnet 5.5 / medium |
| 3 | Island scene skeleton: voyage machine, eight island plans with placeholder plots, walking, going ashore and leaving, known places wired to existing interiors | Opus 5.5 / medium |
| 4 | Touch, reduced motion, focus handling, Playwright coverage, performance pass | Sonnet 5.5 / high |
| 5 | Make the chart the default at `/`. Keep the side-view town's code until Edward confirms it can go | Sonnet 5.5 / medium |

### Tests to write

- Vitest: terrain is deterministic for a seed; a boat cannot enter land; docking range; every voyage-machine transition, including `Esc` from each state; island walking cannot enter a `Place.rect` or leave the coast; every landing has a plan and every plan has a reachable jetty.
- Playwright: log → set sail → Landings → Sydney Harbour → `E` → walk to Edward's House → enter → `Esc`, `Esc` → back on the chart at Sydney's anchorage.

## Placeholder copy in the prototype

These lines were written as stand-ins and need Edward's sign-off or replacement: the captain's log text; "Born here in 2002" on Incheon Port; the Shipyard's "Placeholder for the Agent Office pipeline"; the sea names "Sea of Side Projects" and "the Danube, allegedly"; "here be bugs"; the short handwritten bottle notes. The soundings are decorative numbers derived from the distance field.

The landmark drawings are code-drawn line art. Edward may replace any of them with his own drawings or photographs; keep each behind one routine in `lib/chart-art/landmarks/` so that is a one-file swap.

## Open questions for Edward

1. What goes in each placeholder plot.
2. Whether the side-view pixel town survives as something you can enter from Sydney Harbour, or retires in phase 5.
3. Edward's top-down figure: code-drawn placeholder for now, or supplied art.
4. Photographs or handwriting to place on the chart.
5. Music on the chart: reuse the current track or none.

## Out of scope

Multiplayer, saved progress across visits, new mini-games, changes to the case studies or résumé.
