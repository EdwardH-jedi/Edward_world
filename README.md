# Edward's World

**An interactive developer portfolio you walk through instead of scroll.**

Projects are places. You arrive in a pixel town, walk east, and step inside the
things Edward has built — a sports app that hands you its phone, a research lab
that runs a model in front of you, a wardrobe that remembers what you put on it,
an arcade cabinet with a playable platformer inside. There is also a house,
which is not a project at all.

For anyone who would rather read than walk, `INDEX` is one click away from every
screen and holds the same work as a plain, accessible page.

<!-- HERO: replace this comment with the hero screenshot or GIF once captured.
     Suggested: docs/media/hero.gif — the walk from the house to the arcade. -->

> ### ▶ Live portfolio — **https://edwards-world.vercel.app**
>
> Open it in a browser and press Enter. No sign-in, nothing to install.

---

## About

A conventional developer portfolio is a scroll and a grid of cards. It works,
and there is nothing wrong with it — but every card looks like every other card,
and none of them show what it is like to actually use the thing.

Edward's World takes the same content and gives it somewhere to be. Each project
becomes a place you can walk to and enter, rendered in the same pixel language as
the town outside it. Entering a project isn't a link to a description; it is a
scoped, playable representation of what that project does. The point is that
"I built a sports matchmaking app" and *being handed the phone and matched
against someone* are not the same sentence.

The exploration is the personality. The `INDEX` is the escape hatch. Both are
first-class, because a recruiter with four minutes and a visitor with fifteen
want opposite things.

---

## Explore the world

Five experiences stand along one continuous side-scrolling town.

### Edward's House

The personal room — who Edward is when he is not writing code. You walk up to
six objects and press `E` to look at each: the map from Jeju to Sydney, the desk,
the computer, the drawer, the clothes rail, the gaming PC.

Every line in the room is verified biography read from Edward's own public
repositories. Where something isn't known, the room says so rather than
inventing it — the League of Legends shelf is a typed hook waiting for a real
value, not a made-up rank.

### AFL Predict

A research lab, not a tipping service — because the underlying repository is
explicit that it is paper-trading research with no live betting.

You answer *who do you think wins*, run the model, and watch one round travel a
bench of six instruments: a data packet crosses from panel to panel and each CRT
comes up out of its scan line showing what that stage actually computed, right
through to calibration visibly pulling an overconfident number back toward even.
It ends by setting your pick beside the model's and reporting only whether the
two agree.

The fixture is seeded demonstration data — no real clubs, no real results — but
every number downstream of it is genuinely computed, not scripted.

**The project itself:** scheduled ingestion, temporal feature engineering,
calibrated ensemble models, backtesting, and a FastAPI service.
→ [AFL_predict](https://github.com/EdwardH-jedi/AFL_predict)

### SportsGang / Protin

The fullest experience in the world. Enter, and a pixel phone comes up: pick one
of four sports, get matched with an opponent, accept — and the phone's screen
expands into the venue for that sport.

Then you play. Four real simulations, each of which reports numbers computed from
what you actually did:

- **Golf** — stop the power bar, then the contact bar; carry distance and
  fairway-or-rough come from those two stops.
- **Tennis** — a rally to five points. Get into position and swing; how close
  you are to the ball when you do decides whether the return is PERFECT, GOOD,
  early, late or missed, and that grade sets the shot's speed and accuracy.
- **Basketball** — hold and release; the make or miss comes from the release
  point alone.
- **Running** — 200 m of pace against stamina, where exhaustion latches, so going
  out too hard is genuinely slower than pacing it.

**The project itself:** peer sports matchmaking on mobile — find opponents by
sport, issue challenges, book nearby courts, and track results through a ranking
and honour system. React Native / Expo, FastAPI, PostgreSQL, Redis, Docker.
→ [SportsGang](https://github.com/EdwardH-jedi/SportsGang)

### Wardrobe

An archive, not a game. Capture garments off the rail, read their structural
metadata, organise them by layer, dress the mannequin, save the look.

The look is genuinely written to *your* browser and greets you on your next
visit. That is the underlying project's local-first philosophy enacted rather
than described — nothing is sent anywhere, and a stored value the catalogue
doesn't recognise is discarded rather than trusted.

**The project itself:** a local-first digital wardrobe — browser-persisted
garment archive, outfit composition, and a scoped proxy-3D experiment. React,
TypeScript, Vite, Three.js, with a FastAPI image service.
→ [wadrobe](https://github.com/EdwardH-jedi/wadrobe)

### Soonpermario

A dark arcade room with four unlit machines and one that is running. Walk to it,
press `E`, and its display expands into a playable segment of Edward's Career
Quest: move, jump, close three bugs, take the skills off the ledges, clear three
pits, reach the offer. Coffees are lives, commits are the collectibles. About
twenty seconds if you know the way.

It is deliberately one segment. The original is a whole platformer; rebuilding
all of it inside a portfolio would have been a second product rather than a
representation of the first.

**The project itself:** an HTML5 Canvas and vanilla JavaScript platformer with no
build step. → [soonpermario](https://github.com/EdwardH-jedi/soonpermario)

---

## Controls

| | |
| --- | --- |
| **Move** | `A` / `D` or `←` / `→` |
| **Interact** | `E` when the status bar names something, or tap the status bar |
| **Leave anything** | `Escape` |
| **Switch views** | The `WORLD / INDEX` control, on screen at all times |
| **Start** | `Enter`, click, or tap on the title screen |

Inside the experiences:

| | |
| --- | --- |
| **Golf** | `Space` / `Enter`, or tap, to stop each bar |
| **Basketball** | Hold `Space` / `Enter`, or tap and hold, and let go |
| **Tennis** | `A` / `D` or `←` / `→` to move, `Enter` / `Space` to swing |
| **Running** | `W` / `↑` to push, `S` / `↓` to ease |
| **Arcade platformer** | `←` `→` or `A` `D`, `Space` to jump |
| **The opening name gate** | Just type — it is a real text input under the carved sockets, so a phone's native keyboard opens on tap |

**Touch and mobile are supported.** The world has on-screen walk buttons and a
tappable interaction bar; the arcade and the mini-games have their own touch
controls; the arcade floor and cabinet are positioned from the measured viewport,
so the machine is centre stage on a phone as well as a desktop.

Everything is reachable without a keyboard, and everything professional is also
one click away in `INDEX`. Overlays share one modal primitive with initial
focus, a focus trap, `Escape`, and focus restoration, and a reduced-motion
preference collapses animation while preserving every state transition.

---

## Built with

Edward's World itself:

| | |
| --- | --- |
| **Next.js 16** | App Router, Turbopack |
| **React 19** | |
| **TypeScript 6** | strict |
| **anime.js 4** | scripted choreography only — it never advances state |
| **Canvas 2D** | all art is procedural: art-pixel drawing routines in `lib/pixel/`, rasterised at run time. No sprite sheets, no image files |
| **Vitest** | |
| **Web Audio API** | the background-music engine |
| **`localStorage` / `sessionStorage`** | the saved wardrobe look, the mute preference, and the join latch — all per-device, none of it sent anywhere |

That is the whole runtime dependency list: `next`, `react`, `react-dom`,
`animejs`. There is no state library, no CSS framework, no component library,
and no image pipeline.

**Optional:** a Redis-compatible REST endpoint backs the visitor join counter.
Without one, the counter simply shows no line — see
[Configuration](#configuration).

> **A note on stacks.** Three.js, FastAPI, PostgreSQL, Docker, React Native and
> Python appear in this repository only as *facts about Edward's other
> projects*, listed in `data/projects.ts` and shown on their case-study pages.
> None of them are part of Edward's World. Nothing here talks to a backend
> service except the one optional counter above.

---

## Architecture

```text
Edward's World
├─ Title screen                     pixel Sydney at dusk
├─ Opening ritual                   the monument, the name, the typing gate
└─ Main world                       one side-scrolling town
   ├─ movement · terrain · camera   pure modules, no React
   ├─ proximity → typed interaction
   ├─ project locations             SportsGang · Wardrobe · AFL Lab · Arcade
   ├─ Edward's House                a place, not a project
   └─ INDEX                         the recruiter's fast path, always available
```

The layering rule that holds the whole thing together: **simulations are pure,
timers drive state, and animation never does.** Every game rule lives in a
React-free, DOM-free module under `lib/game/`; every timeline lives under
`lib/motion/` and is fired and forgotten.

Full detail — data boundaries, the pixel-art layer, each location, input, audio,
the join counter, testing and deployment — is in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

The product thinking behind it is in [`docs/CASE_STUDY.md`](docs/CASE_STUDY.md).

---

## Running locally

Use Node.js 24.x (`.nvmrc` and `package.json` agree). The submission pass was
verified on Node 24.19.0 with a clean `npm ci` install. Match Node 24.x in the
hosting project's runtime settings when preparing a preview.

```bash
npm ci
npm run dev          # http://localhost:3000
```

```bash
npm run build        # production build
npm start            # serve the production build
```

Nothing needs configuring. The live site at
[edwards-world.vercel.app](https://edwards-world.vercel.app) is this repository
deployed to Vercel with no build overrides — it is a standard Next.js
application and needs no special hosting arrangement.

### Configuration

One feature degrades without configuration: the join counter
(*"You are the 42nd player to join the world."*) needs a Redis-compatible REST
endpoint to be durable, and shows no number at all in production without one.

| Variable | Notes |
| --- | --- |
| `KV_REST_API_URL` + `KV_REST_API_TOKEN` | Injected by a Vercel Marketplace Redis (Upstash) integration |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | The same thing, for a directly-provisioned Upstash database |

Either pair works. Both are server-only — never `NEXT_PUBLIC_`, never sent to the
browser. Locally, `npm run dev` counts in memory if neither is set. The counter
stores one global integer and nothing else: no identifiers, IPs, cookies, user
agents or timestamps. See the join-counter section of
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full contract.

---

## Development and validation

Four gates, all of which must pass:

```bash
npm run lint         # eslint . --max-warnings 0
npm run typecheck    # tsc --noEmit
npm test             # vitest run
npm run build        # production build
```

Last full run — **2026-09-09** on Node 24.19.0, all four green:

| Gate | Result |
| --- | --- |
| `lint` | clean, zero warnings |
| `typecheck` | clean |
| `test` | **391 tests across 29 files**, passing |
| `build` | succeeds; 10 routes generated |

The tests cover the parts where being wrong is invisible: the pure simulations
(determinism, bounds, and that every number a sport reports is derived from what
the player did), the state machines, the terrain and art geometry, the join
counter's store bindings, and the audio engine's state resolution. The arcade
platformer is proved finishable by a bot that plays it rather than by assertion.

They do not replace playing it. Every location in this repository was also
walked through in a browser before it was called done.

---

## AI-assisted development

Edward's World was built with an AI-assisted workflow spanning planning,
implementation, testing and review. Product direction, architecture decisions,
scope, acceptance criteria and final judgement remained human-directed
throughout.

In practice that meant using different models for different jobs — implementation
assistance, independent review and QA passes, and planning and research
discussion — and treating all of their output as a proposal to be verified rather
than a result to be accepted. The verification is the part that matters: an
automated test suite, a passing production build, and manual browser playtesting
of every location before it was marked done. Several of the bugs recorded in this
repository's history were found by playing the thing, not by reading it.

The workflow is described in more detail in
[`docs/CASE_STUDY.md`](docs/CASE_STUDY.md).

---

## License and assets

**This repository does not currently carry a license file.** Until one is added,
default copyright applies and no permissions are granted. Adding one is a
deliberate open decision, not an oversight — see below for why the answer isn't
uniform.

The repository contains four distinguishable kinds of material:

| | |
| --- | --- |
| **Source code** | Everything under `app/`, `components/`, `lib/`, `data/`, `types/`, `tests/`. Edward's own work; a permissive license (MIT) would be the natural choice. |
| **Artwork** | All world art is procedural — authored as code in `lib/pixel/`, not as image files. It is therefore source code and artwork at once, and whatever license covers the code covers the pixels. |
| **Portfolio content** | Biography, timeline, contact details and project write-ups in `data/personal.ts` and `data/projects.ts`. This is personal identity material rather than reusable software, and is reasonably excluded from any code license. |
| **Music** | `public/audio/moss-gate-town.mp3` — "Moss Gate Town". The file's own embedded metadata records it as made with [Suno](https://suno.com), and names Edward as the artist. Redistribution and commercial-use rights depend on the Suno plan it was generated under, and are **not yet documented in this repository**. |

No third-party artwork, stock photography or personal photographs are committed.
Fonts (Archivo, IBM Plex Mono, Silkscreen) are served through Google Fonts via
`next/font/google` and are not vendored into this repository; each carries its
own author's license, which this repository does not restate.

Nothing here bundles a third-party asset whose provenance is unknown.

---

## Status

Edward's World is complete and playable end to end, and is in a polish phase
rather than an expansion one. The scope is the five experiences above.
