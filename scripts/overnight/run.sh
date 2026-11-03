#!/usr/bin/env bash
#
# Overnight runner: works through scripts/overnight/tasks/*.md in order, one
# headless Claude Code session per task, on one branch, committing and pushing
# after every task that passes the repository's quality checks.
#
#   cd ~/Desktop/developer/edward_world
#   scripts/overnight/run.sh
#
# Environment (all optional):
#   OVERNIGHT_BASE    branch to start from        (default: main)
#   OVERNIGHT_BRANCH  branch to work on           (default: overnight/<date>)
#   OVERNIGHT_MODEL   Claude model alias          (default: opus)
#   OVERNIGHT_TASKS   space-separated task files  (default: every tasks/*.md)
#   OVERNIGHT_CHECKS  npm scripts to gate on      (default: lint typecheck test build)
#   OVERNIGHT_E2E     1 to also run Playwright    (default: 1)
#   OVERNIGHT_YOLO    1 to bypass all permission prompts instead of the
#                     allow-list below            (default: 0)
#
# A task that still fails the checks after one repair pass is rolled back
# (git reset --hard) and the runner moves on, so one bad task never blocks the
# next. Everything is logged under scripts/overnight/logs/<run>/ and a
# SUMMARY.md is written at the end.

set -u

cd "$(dirname "$0")/../.." || exit 1
ROOT=$(pwd)

BASE="${OVERNIGHT_BASE:-main}"
BRANCH="${OVERNIGHT_BRANCH:-overnight/$(date +%Y-%m-%d)}"
MODEL="${OVERNIGHT_MODEL:-opus}"
E2E="${OVERNIGHT_E2E:-1}"
CHECKS="${OVERNIGHT_CHECKS:-lint typecheck test build}"
YOLO="${OVERNIGHT_YOLO:-0}"
RUN_ID=$(date +%Y%m%d-%H%M%S)
LOG_DIR="$ROOT/scripts/overnight/logs/$RUN_ID"
REPORT_DIR="$ROOT/scripts/overnight/reports"
SUMMARY="$LOG_DIR/SUMMARY.md"
mkdir -p "$LOG_DIR" "$REPORT_DIR"

log() { printf '[%s] %s\n' "$(date +%H:%M:%S)" "$*" | tee -a "$LOG_DIR/runner.log"; }

for tool in claude git npm; do
  command -v "$tool" >/dev/null 2>&1 || { echo "missing: $tool"; exit 1; }
done

# ---------------------------------------------------------------- branch ----
log "fetching origin"
git fetch origin >>"$LOG_DIR/runner.log" 2>&1 || { log "fetch failed"; exit 1; }
if git show-ref --verify --quiet "refs/remotes/origin/$BRANCH"; then
  log "continuing existing branch $BRANCH"
  git checkout -q "$BRANCH" 2>/dev/null || git checkout -q -b "$BRANCH" "origin/$BRANCH"
  git reset -q --hard "origin/$BRANCH"
else
  log "creating $BRANCH from origin/$BASE"
  git checkout -q -B "$BRANCH" "origin/$BASE" || exit 1
fi

log "npm ci"
npm ci --no-audit --no-fund >>"$LOG_DIR/npm-ci.log" 2>&1 || { log "npm ci failed, see npm-ci.log"; exit 1; }
if [ "$E2E" = "1" ]; then
  npx playwright install chromium >>"$LOG_DIR/npm-ci.log" 2>&1 || log "playwright install failed; e2e will be skipped"
fi

# ---------------------------------------------------------------- checks ----
# Returns 0 when every quality gate passes; writes the failing output to $1.
run_checks() {
  local out="$1"
  : >"$out"
  local step
  for step in $CHECKS; do
    log "  check: $step"
    if ! npm run "$step" >>"$out" 2>&1; then
      log "  FAILED: $step"
      return 1
    fi
  done
  if [ "$E2E" = "1" ]; then
    log "  check: e2e"
    if ! npx playwright test >>"$out" 2>&1; then
      log "  FAILED: e2e"
      return 1
    fi
  fi
  return 0
}

# ------------------------------------------------------------ claude call ----
PERMISSION_ARGS=(--permission-mode acceptEdits
  --allowedTools "Read" "Edit" "Write" "Glob" "Grep" "MultiEdit"
  "Bash(npm *)" "Bash(npx *)" "Bash(node *)" "Bash(git diff *)" "Bash(git status *)"
  "Bash(git log *)" "Bash(git show *)" "Bash(ls *)" "Bash(cat *)" "Bash(mkdir *)"
  "Bash(rm -rf test-results*)" "Bash(python3 *)")
if [ "$YOLO" = "1" ]; then
  PERMISSION_ARGS=(--dangerously-skip-permissions)
fi

ask_claude() {
  local prompt_file="$1" out="$2"
  claude -p "$(cat "$prompt_file")" \
    --model "$MODEL" \
    --max-turns 250 \
    "${PERMISSION_ARGS[@]}" \
    >"$out" 2>&1
}

# ----------------------------------------------------------------- tasks ----
if [ -n "${OVERNIGHT_TASKS:-}" ]; then
  # shellcheck disable=SC2206
  TASKS=($OVERNIGHT_TASKS)
else
  # Only the top-level task files; finished ones live in tasks/done/.
  TASKS=("$ROOT"/scripts/overnight/tasks/[0-9]*.md)
fi

printf '# Overnight run %s\n\nBranch: `%s` (from `%s`), model: %s\n\n| task | result | commit |\n| --- | --- | --- |\n' \
  "$RUN_ID" "$BRANCH" "$BASE" "$MODEL" >"$SUMMARY"

PR_URL=""
ensure_pr() {
  [ -n "$PR_URL" ] && return
  command -v gh >/dev/null 2>&1 || { log "gh not installed; no PR opened (branch is pushed)"; return; }
  PR_URL=$(gh pr list --head "$BRANCH" --json url --jq '.[0].url' 2>/dev/null || true)
  if [ -z "$PR_URL" ]; then
    PR_URL=$(gh pr create --base "$BASE" --head "$BRANCH" \
      --title "overnight: $(date +%Y-%m-%d) tasks" \
      --body "Sequential overnight tasks from \`scripts/overnight/tasks\`. One commit per task; per-task reports in \`scripts/overnight/reports\`. See the run summary in the final commit." 2>/dev/null || true)
    [ -z "$PR_URL" ] && PR_URL=$(gh pr list --head "$BRANCH" --json url --jq '.[0].url' 2>/dev/null || true)
  fi
  [ -n "$PR_URL" ] && log "PR: $PR_URL"
}

# Files that were already untracked before the run belong to the person, not
# to any task: they are never committed and never cleaned.
PREEXISTING="$LOG_DIR/preexisting-untracked.txt"
git ls-files --others --exclude-standard >"$PREEXISTING"
[ -s "$PREEXISTING" ] && log "leaving $(wc -l <"$PREEXISTING" | tr -d ' ') pre-existing untracked file(s) alone"

# Specs that rewrite tracked screenshots as a side effect (interior-grid).
restore_spec_artifacts() {
  rm -rf test-results
  git checkout -q -- docs/review/interior-grid 2>/dev/null || true
}

# Untracked files created during this run, i.e. not in $PREEXISTING.
new_untracked() {
  git ls-files --others --exclude-standard | grep -vxF -f "$PREEXISTING" || true
}

for task in "${TASKS[@]}"; do
  name=$(basename "$task" .md)
  task_log="$LOG_DIR/$name"
  mkdir -p "$task_log"

  if git log --format=%s "origin/$BASE..HEAD" | grep -q "^overnight($name)"; then
    log "skip $name: already committed on $BRANCH"
    printf '| %s | skipped (done earlier) | |\n' "$name" >>"$SUMMARY"
    continue
  fi

  log "=== $name ==="
  {
    cat "$ROOT/scripts/overnight/COMMON.md"
    printf '\n\n---\n\n# Task: %s\n\n' "$name"
    cat "$task"
    printf '\n\nWrite your report to `scripts/overnight/reports/%s.md`.\n' "$name"
  } >"$task_log/prompt.md"

  ask_claude "$task_log/prompt.md" "$task_log/claude-1.log"
  log "claude pass 1 finished (exit $?)"

  if ! run_checks "$task_log/checks-1.log"; then
    log "repair pass"
    {
      cat "$ROOT/scripts/overnight/COMMON.md"
      printf '\n\n---\n\n# Task: %s (repair pass)\n\n' "$name"
      printf 'You already worked on this task in a previous session; the working tree holds your changes. The quality checks failed. Fix the failures below without discarding the work, then re-run the failing check yourself. The original task follows the log.\n\n```\n'
      tail -c 12000 "$task_log/checks-1.log"
      printf '\n```\n\n## Original task\n\n'
      cat "$task"
      printf '\n\nUpdate `scripts/overnight/reports/%s.md` with what you fixed.\n' "$name"
    } >"$task_log/prompt-repair.md"
    ask_claude "$task_log/prompt-repair.md" "$task_log/claude-2.log"
    log "claude repair pass finished (exit $?)"
    if ! run_checks "$task_log/checks-2.log"; then
      log "$name FAILED after repair; rolling back"
      cp "$task_log/checks-2.log" "$REPORT_DIR/$name.FAILED.log" 2>/dev/null
      git reset -q --hard HEAD
      new_untracked | grep -vE '^scripts/overnight/(logs|reports)/' | while IFS= read -r f; do rm -f -- "$f"; done
      printf '| %s | FAILED (rolled back; see logs/%s/%s) | |\n' "$name" "$RUN_ID" "$name" >>"$SUMMARY"
      continue
    fi
  fi

  restore_spec_artifacts
  git add -u
  new_untracked | grep -vE '^scripts/overnight/logs/' | git add --pathspec-from-file=- 2>/dev/null || true
  if git diff --cached --quiet; then
    log "$name produced no changes"
    printf '| %s | no changes | |\n' "$name" >>"$SUMMARY"
    continue
  fi
  title=$(head -n 1 "$task" | sed 's/^# *//')
  git commit -q -m "overnight($name): $title" -m "Headless Claude Code task from scripts/overnight/tasks/$name.md; checks: lint, typecheck, test, build$( [ "$E2E" = "1" ] && printf ', e2e').

Co-Authored-By: Claude <noreply@anthropic.com>"
  sha=$(git rev-parse --short HEAD)
  log "$name committed as $sha"
  if git push -q -u origin "$BRANCH" >>"$LOG_DIR/runner.log" 2>&1; then
    log "pushed"
    ensure_pr
  else
    log "push failed (will retry after next task)"
  fi
  printf '| %s | done | %s |\n' "$name" "$sha" >>"$SUMMARY"
done

# ---------------------------------------------------------------- finish ----
[ -n "$PR_URL" ] && printf '\nPR: %s\n' "$PR_URL" >>"$SUMMARY"
cp "$SUMMARY" "$REPORT_DIR/SUMMARY-$RUN_ID.md"
git add scripts/overnight/reports >/dev/null 2>&1
if ! git diff --cached --quiet; then
  git commit -q -m "overnight: run summary $RUN_ID" && git push -q origin "$BRANCH" >>"$LOG_DIR/runner.log" 2>&1
fi
log "done"
echo
cat "$SUMMARY"
