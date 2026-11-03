# Automation Lab: the fourth project is the pipeline that builds this world

## Why

Wardrobe is gone (task 04). Its slot goes to **Agent Office / the dispatcher** — Edward's system for running Claude Code and Codex unattended: task files in, a `claude -p` loop, quality gates, independent review, a PR out. It is the most current thing he builds and the most relevant to a graduate SWE application. It also has a story no other building has: **this very world was extended overnight by that kind of pipeline** (`scripts/overnight/` in this repo, with its reports). The building shows the pipeline as a machine and shows the real runs that happened, and nothing else.

## Facts you may use (nothing beyond these and the repository)

- Repository: https://github.com/EdwardH-jedi/agent-office — read its README and `docs/` for the project's own description; take wording from there, not from imagination.
- Edward's own description: Agent Office began as an observer that shows Claude Code / Codex agents working on his projects as a pixel town (projects as buildings, agents as NPC sprites); it is being extended with a **dispatcher**: a loop that reads task files and runs `claude -p` per task, with checks and Codex review, so work proceeds without him pasting prompts.
- Edward's workflow: Claude for implementation, Codex for independent review.
- This repository's `scripts/overnight/run.sh` and `scripts/overnight/reports/*.md` are a concrete, committed instance of that loop: the 2026-11-03 run built the timeline street, the signage and the phone title (three tasks, all passed, PR #18).

If the agent-office README contradicts any of this, the README wins and the report says so.

## What to build

1. **Project entry** `data/projects.ts`: `id: "agent-office"`, display name "Agent Office", category "Developer tooling", `githubUrl` above, `caseStudyUrl: "/case-studies/agent-office"`, `worldBuildingId: "automation-lab"`, `techStack` from the repository (languages/tools actually present), `repositorySummary` = the repository description verbatim, `details` in the same five fields as the other projects (problem / implementation / decision / currentState / worldRepresentation) written from the README. `worldRepresentation` must say the lab's machine is an illustration and that the run log shown is the committed record from this repository's own overnight runs.

2. **Building** in Sydney (`data/world.ts`, `lib/pixel/buildings.ts`): "Automation Lab" — a small workshop/office: big front window, two desks visible inside with two NPC sprites (one with a Claude-ish warm tint, one Codex-ish cool tint — both from palette tokens, no logos), a conveyor glimpse, a roof vent with ambient smoke. `signAccent` on the door frame like the others. `openDoor` frames like the other buildings.

3. **Experience** `components/automation-lab/automation-lab-experience.tsx` (+ CSS), wired in `components/portfolio-experience.tsx` like the AFL lab:
   - **The machine**: a pixel conveyor with five stations left→right — TASK FILE → DISPATCH (`claude -p`) → BUILD (the agent at a desk) → GATES (lint · typecheck · test · build · e2e, five lamps) → REVIEW (Codex desk) → PR. A task card rides the belt on the ambient frame; at GATES the five lamps light in order; at REVIEW a stamp drops; at the end the card slides into a "PR" tray. Pure scripted state in `lib/game/automation-lab.ts` (a state machine advanced by the ambient tick, like `afl-pipeline.ts`), presentation in the component. Tests for the machine: sequence, loop, deterministic by frame, reduced motion holds frame 0.
   - **The record panel** (right side or below): the real runs. Generate `data/overnight-runs.ts` from `scripts/overnight/reports/SUMMARY-*.md` with a small script `scripts/overnight/export-runs.mjs` (run it now and wire it as the last step of `run.sh` before the summary commit). Each run: date, branch, PR url, and per task: name, result, commit. Render as a pixel ledger: "2026-11-03 · 3 tasks · 3 passed · PR #18" with the task titles under it. Label the panel RECORD and date it; never show a run that is not in the committed data. If the file is empty, the panel says NO RUNS RECORDED YET.
   - A one-line caption under the machine: what the pipeline is, in the project's own words; and a link row: Project details · GitHub, like the other experiences.
   - Keyboard: Escape leaves; no mini-game.

4. **Case study** `/case-studies/agent-office` through the existing `[slug]` route and `generateStaticParams`.

5. **Index**: four projects again; `tests/projects.test.ts` pins four with `agent-office` as the fourth and restores any literal you relaxed in task 04.

## Constraints

- Everything on the unit grid; the experience uses `usePixelUnit` and fits like the AFL lab (`useFitPixelUnit` if the machine is wider than tall).
- Palette only; at most two new tokens for the NPC tints, documented.
- The record panel is the only place with real data and it is build-time data from the repo — no fetches.
- Don't claim the dispatcher ran this specific task; the ledger shows what it shows.

## Verify

All quality gates, plus `e2e/interior-grid.spec.ts` gets an "Automation Lab" case. Screenshots of the lab at 1280x800 and 390x844 and of the building from outside into `docs/review/automation-lab/`.
