# BASELINE — SportsGang polish

Recorded 2026-09-09 from `/Users/edwardhwang/Desktop/Edward_world`.

## Starting point

| | |
|---|---|
| Repo root | `/Users/edwardhwang/Desktop/Edward_world` |
| Branch at start | `main` |
| HEAD at start | `4c7564458951b18dda70dd3e2c549dcd7f939a08` |
| Foundation branched from | `4c75644` |
| Remote | `origin` → `https://github.com/EdwardH-jedi/Edward_world.git` |
| Uncommitted at start | 4 untracked local-only items (below). No tracked modifications. |

The four untracked items were left exactly as they were, and are **not** part
of the foundation commit: `docs/VISUAL_POLISH_PASS_2026-09-03.md`,
`docs/WORK_SAMPLE_READINESS_AUDIT.md`, `docs/visual-polish/`, `scripts/`.
Nothing was stashed, reset or committed on the user's behalf.

## Deployment

README advertises `https://edwards-world.vercel.app`.

**Verified in this session:** `git diff --stat fc37520 4c75644` is `README.md`
only (9 insertions, 8 deletions). The deployed commit is `fc37520`; `main` is
one docs-only commit ahead of it.

**Not verified in this session:** the live site was not re-fetched, and no
deployment was inspected on Vercel. Nothing was deployed.

## Environment

| | |
|---|---|
| Node | v24.19.0 (Homebrew `node@24`, PATH-scoped) |
| npm | 11.17.0 |
| Package manager | npm, `package-lock.json` lockfileVersion 3 |
| `engines.node` | `24.x` · `.nvmrc` = `24` |
| Framework | Next.js 16.3.3 (Turbopack), React 19.2.8 |
| Test runner | Vitest 4.1.11, `environment: "node"`, `@` alias → repo root |

`npm ci` was used in the foundation worktree. No dependency was added, removed
or upgraded; `package.json` and `package-lock.json` are untouched.

## Gates before any change

Run in the foundation worktree at `4c75644`, Node 24.19.0:

| Gate | Command | Result |
|---|---|---|
| lint | `npm run lint` | PASS |
| typecheck | `npm run typecheck` | PASS |
| unit tests | `npm test` | PASS — 391 tests / 29 files |
| build | `npm run build` | PASS (run after the change; not run on the untouched baseline) |

No pre-existing failure was found, so every later failure in this pass is
attributable to this pass.

## Servers running at start — none were stopped

| PID | What | cwd | Port |
|---|---|---|---|
| 56169 | `next-server` (v16.3.3) | `/Users/edwardhwang/Desktop/Edward_world` | 3004 |
| 41854 | `next-server` (v16.3.3) | a deleted temp dir from an earlier pass | 3003 |
| 82006 / 82023 | `npm run dev` / vite — **unrelated project** | `~/Desktop/wadrobe` | 5173 |
| 96747 | unrelated orchestrator | `~/Desktop/claudewalker/...` | 4899 |

A live `next dev` is serving the canonical checkout on **3004**. That is why
foundation work was done in its own worktree and `main` was never checked out
onto another branch. Ports 3011–3013 were confirmed free and assigned to A/B/C.

## Worktrees at start (all preserved)

```
Edward_world            4c75644  [main]
Edward_world-bgm        4cb8685  [feat/bgm-feel-polish]
Edward_world-character  1a9685d  [feat/character-avatar]
Edward_world-feel       1166939  [feat/feel-calibration]
Edward_world-tennis     57baebe  [feat/sportsgang-tennis]
Edward_world-visitor    39dc741  [feat/visitor-counter]
```

`Edward_world-tennis` is an **older, already-merged** branch. It is not session
A's workspace and must not be checked out or edited by this effort.
