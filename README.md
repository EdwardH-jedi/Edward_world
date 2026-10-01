# Edward's World

An interactive developer portfolio built as a side-scrolling pixel town. Explore four project demos and a personal room, or choose **VIEW PROJECTS** on the title screen to go straight to the reading view.

**[Explore the world](https://edwards-world.vercel.app)** · **[Read the project index](https://edwards-world.vercel.app/?view=index)** · [Background and contact](https://edwards-world.vercel.app/resume)

## What you can explore

| Location | Portfolio experience | Original project |
| --- | --- | --- |
| **SportsGang / Protin** | A simulated matchmaking flow followed by golf, tennis, basketball, or running. Game results come from player input. | [SportsGang](https://github.com/EdwardH-jedi/Sportsgang), a React Native / Expo sports-partner app with a FastAPI backend |
| **AFL Predict** | An interactive lab that walks a seeded fictional fixture through a computed prediction pipeline. | [AFL Predict](https://github.com/EdwardH-jedi/AFL_predict), an AFL prediction and paper-trading research system |
| **Wardrobe** | Archive garments, compose a look, and save it in your browser. | [Wardrobe](https://github.com/EdwardH-jedi/wardrobe), a local-first fashion archive with an experimental proxy-3D track |
| **Soonpermario arcade** | A short playable segment of Edward's Career Quest. | [Career Quest](https://github.com/EdwardH-jedi/career-quest), a standalone HTML5 Canvas résumé platformer |
| **Edward's House** | An interactive personal room with objects about Edward's interests and background. | Personal content, separate from the four projects |

The experiences are scoped recreations inside this portfolio. The SportsGang flow does not connect to the mobile product's matchmaking service; the AFL lab uses demonstration data, not live fixtures or betting recommendations. Follow the source and case-study links for each original project's implementation and limitations.

## Run locally

Requires **Node.js 24.x** and npm. The Node version is specified in [`.nvmrc`](.nvmrc) and [`package.json`](package.json).

```bash
git clone https://github.com/EdwardH-jedi/Edward_world.git
cd Edward_world
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No external service is required to explore the portfolio locally.

For a production build:

```bash
npm run build
npm start
```

The application is deployed on Vercel. Both server-backed features are optional; see [Configuration and data](#configuration-and-data) before deploying them.

## Stack and architecture

- **Next.js 16**, App Router, **React 19**, and strict **TypeScript 6**
- **Canvas 2D** for procedural pixel art, with DOM controls and text around it
- **anime.js 4** for visual choreography and **Web Audio API** for background music
- **Vitest** for Node-environment tests
- Browser storage for local preferences and saved looks; optional Redis-compatible REST storage for shared features

The runtime npm dependencies are `next`, `react`, `react-dom`, and `animejs`. React Native, FastAPI, Three.js, and the other stacks described on project pages belong to the linked projects, not this application's runtime.

The central design rule is: **pure simulations own game rules, timers advance scripted states, and animation only presents those states.**

| Path | Responsibility |
| --- | --- |
| `app/` | Pages, metadata, styles, and API routes |
| `components/portfolio-experience.tsx` | Top-level world, index, and experience selection |
| `components/` | React views, controls, dialogs, and individual project experiences |
| `data/` and `types/` | Portfolio content, world geometry, garments, and shared domain types |
| `lib/game/` | Movement, interactions, state machines, and pure mini-game simulations |
| `lib/pixel/` | Procedural art routines, raster helpers, and palette |
| `lib/motion/` | Animation, game-loop hooks, and motion preferences |
| `lib/audio/` | Music engine and playback policy |
| `lib/storage/` | Guarded browser persistence for the wardrobe demo |
| `lib/joins/` | Visitor counter and storage bindings |
| `lib/sportsgang-board/` | Golf-board validation, ranking, identity, client, and storage |
| `tests/` | Simulation, state, storage, API, input, and rendering-geometry tests |

The main routes are `/`, `/resume`, and `/case-studies/[slug]`. The `?view=index` query opens the reading view directly. The root `index.html` and `scenes.js` are concept-board references; the production entry point is the Next.js app.

Read the [architecture reference](docs/ARCHITECTURE.md) for the component and domain boundaries, and the [case study](docs/CASE_STUDY.md) for the product decisions.

## Controls

| Action | Control |
| --- | --- |
| Start exploring | `Enter`, click, or tap on the title screen |
| Read projects directly | **VIEW PROJECTS**, or the `WORLD / INDEX` control |
| Walk | `A` / `D` or `←` / `→`; on-screen buttons are also available |
| Interact | `E`, or tap the interaction bar |
| Leave a location or overlay | `Escape` |
| Golf | `Space` / `Enter`, or tap, to stop the swing meters |
| Basketball | Hold `Space` / `Enter`, or the on-screen action button, then release |
| Tennis | `A` / `D` or `←` / `→` to move; `Space` / `Enter` to swing |
| Running | `←` / `→` to run, `↑` / `↓` for lanes, hold `S` to sprint |
| Arcade platformer | `A` / `D` or `←` / `→` to move; `Space` to jump |

The experiences include touch controls. The opening name gate uses a text input for native mobile keyboards. Dialogs share focus-management and Escape handling, and the app includes reduced-motion behaviour. The index and standalone case-study pages provide access to professional content without playing the games.

## Configuration and data

Two optional API features use the same Redis-compatible REST configuration:

| Feature | API | Data and behaviour |
| --- | --- | --- |
| Visitor counter | `/api/joins` | Stores one global integer. The application does not store per-visitor identifiers for this counter. |
| Public golf board | `/api/sportsgang/golf-board` | Accepts explicitly submitted completed runs, with a display name or `GUEST`, an anonymous device ID, score data, and a server timestamp. |

Set either complete pair in `.env.local` for local development or in the deployment environment:

| Provider configuration | Server-only variables |
| --- | --- |
| Vercel Marketplace Redis | `KV_REST_API_URL`, `KV_REST_API_TOKEN` |
| Direct Upstash Redis | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |

Keep tokens out of source control and do not use `NEXT_PUBLIC_` for them. No credentials are needed for the default local experience.

Without a configured store:

- Development uses process-local memory. Counter and board data are lost on restart, and the board is labelled **LOCAL-ONLY**
- Production omits the visitor count and returns an unavailable response for the golf board, rather than presenting process-local data as a shared ranking

The golf board is **casual and client-reported**. The server validates submissions and computes ranks, but does not replay or independently verify gameplay. A completed game is only published after the visitor confirms submission; the display name and score become public. The anonymous ID is not included in public rows, but is sent in board request URLs after submission so the visitor's row can be identified.

Saved wardrobe looks and audio preferences stay in browser storage. The golf board's explicit submission path is a separate data flow. See the [storage reference](docs/sportsgang-polish/STORAGE.md) for modes, retention, and configuration details.

**Recorded deployment limitation:** the [10 September 2026 deployment report](docs/predeploy/FINAL_PRODUCTION_DEPLOY.md#leaderboard) records the production golf board as `BLOCKED_CONFIG`. That is a dated deployment record, not a live service-status check.

## Tests and verification

Run the repository's four quality checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

The tests cover pure simulations and state transitions, input handling, art geometry, storage behaviour, API contracts, and audio policy. They run in a Node environment and do not replace browser interaction, mobile, or accessibility testing.

The [10 September 2026 deployment report](docs/predeploy/FINAL_PRODUCTION_DEPLOY.md#verification) records lint, typecheck, build, and **714 tests across 46 files** passing for commit [`2b34ba9`](https://github.com/EdwardH-jedi/Edward_world/commit/2b34ba9f84ecbe0fb16b196a367b2b6a74ae446b), using Node 24.19.0 and npm 11.17.0. It also documents manual browser checks and their scope. These are historical results, not a fresh run of the current branch.

## Development approach

This project uses AI-assisted planning, implementation, and review. Product direction, architecture, scope, acceptance criteria, and final judgement remain human-directed. Generated changes are checked through automated tests, builds, and browser playtesting; the [case study](docs/CASE_STUDY.md) describes the workflow.

## License and assets

**There is no license file in this repository.** No open-source reuse license is granted. This README does not change the licensing of the code, art, music, or personal portfolio content.

- **Code and artwork:** world art is authored as procedural drawing code in `lib/pixel/`, rather than sprite sheets or stock photography
- **Portfolio content:** biography, contact details, and project write-ups live in `data/personal.ts` and `data/projects.ts`
- **Music:** `public/audio/moss-gate-town.mp3` is "Moss Gate Town." Existing asset notes identify it as Suno-generated and credit Edward as the artist. Generation-plan evidence and redistribution/commercial-use rights are not documented here
- **Fonts:** Archivo, IBM Plex Mono, and Silkscreen are loaded through `next/font/google`; their respective font licenses apply
