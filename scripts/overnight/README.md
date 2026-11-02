# Overnight runner

Sequential, unattended Claude Code sessions, one per task file, on one branch.

```bash
cd ~/Desktop/developer/edward_world
git fetch origin && git checkout feat/world-feel-pass && git pull
scripts/overnight/run.sh
```

What it does, per task in `tasks/NN-*.md` (in order):

1. Builds a prompt from `COMMON.md` + the task file and runs `claude -p` (model `opus`, `acceptEdits` plus an allow-list for `npm`/`npx`/`node`/read-only `git`).
2. Runs `npm run lint`, `typecheck`, `test`, `build` and `npx playwright test`.
3. If anything fails, runs one repair session with the failure log, then checks again.
4. Green → one commit `overnight(NN-name): …`, push, PR opened on the first success (needs `gh`; without it the branch is still pushed).
   Red → `git reset --hard`, the task is marked FAILED in the summary, the next task starts.
5. Writes `logs/<run>/SUMMARY.md` and the per-task reports Claude wrote to `reports/`.

Knobs (env vars): `OVERNIGHT_BASE` (default `feat/world-feel-pass`), `OVERNIGHT_BRANCH` (default `overnight/<date>`), `OVERNIGHT_MODEL` (`opus`), `OVERNIGHT_TASKS` (subset of task files), `OVERNIGHT_E2E=0` to skip Playwright, `OVERNIGHT_YOLO=1` to use `--dangerously-skip-permissions` if the allow-list turns out to block something the task needs.

Re-running the same day continues the same branch and skips tasks already committed on it.

Before sleeping, check once that `claude -p "say ok"` answers in this terminal (logged in) and that `gh auth status` is green if you want the PR opened automatically. Keep the laptop awake: `caffeinate -i scripts/overnight/run.sh`.
