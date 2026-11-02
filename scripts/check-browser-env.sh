#!/usr/bin/env bash
# Read-only pre-flight for Claude Code browser work on Edward's World.
# Reports only. Never kills a process, never deletes a lock file.
# Compatible with macOS system bash 3.2.
set -uo pipefail

CANON="/Users/edwardhwang/Desktop/Edward_world"
PROFILE="$HOME/.cache/chrome-devtools-mcp/chrome-profile"

echo "── automation chrome ──"
# Top-level browser processes on the MCP scratch profile (renderers excluded).
MCP=$(ps -eo pid,ppid,command | grep -- "--user-data-dir=$PROFILE" | grep -v -- "--type=" | grep -v grep)
if [ -z "$MCP" ]; then
  echo "  none — next browser tool call launches a fresh one"
else
  echo "$MCP" | while read -r pid ppid _; do
    echo "  pid=$pid ppid=$ppid ($(ps -p "$ppid" -o command= 2>/dev/null | cut -c1-30)) up $(ps -p "$pid" -o etime= | tr -d ' ')"
  done
  n=$(echo "$MCP" | wc -l | tr -d ' ')
  [ "$n" -gt 1 ] && echo "  !! $n automation browsers — duplicates"
fi

echo "── scratch profile lock ──"
if [ -L "$PROFILE/SingletonLock" ]; then
  lock=$(readlink "$PROFILE/SingletonLock"); lpid=${lock##*-}
  if ps -p "$lpid" >/dev/null 2>&1; then
    mcp=$(ps -p "$lpid" -o ppid= 2>/dev/null | tr -d ' ')
    npmx=$(ps -p "$mcp" -o ppid= 2>/dev/null | tr -d ' ')
    sess=$(ps -p "$npmx" -o ppid= 2>/dev/null | tr -d ' ')
    echo "  held by live pid $lpid -> claude session pid $sess (tty $(ps -p "$sess" -o tty= 2>/dev/null | tr -d ' '))"
    echo "  -> if that is not THIS session, this session cannot launch a browser"
  else
    echo "  !! STALE: names dead pid $lpid — safe to rm SingletonLock/Cookie/Socket"
  fi
else
  echo "  free"
fi

echo "── competing claude sessions ──"
# pgrep on macOS skips the caller's ancestors, so it would omit the current
# session. Match on the exact process name via ps instead.
ps -axo pid=,tty=,lstart=,comm= | awk '{ n=$NF; sub(/.*\//,"",n); if (n=="claude") { printf "  pid=%s tty=%s since", $1, $2; for(i=3;i<NF;i++) printf " %s", $i; print "" } }' 
echo "  (each runs its own chrome-devtools-mcp; they share one scratch profile)"

echo "── localhost:3000 ──"
owner=$(lsof -nP -tiTCP:3000 -sTCP:LISTEN 2>/dev/null | head -1)
if [ -z "$owner" ]; then
  echo "  nothing listening — start the dev server"
else
  cwd=$(lsof -a -p "$owner" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p')
  echo "  pid=$owner  $(ps -p "$owner" -o command= | cut -c1-50)"
  echo "  cwd=$cwd"
  if [ "$cwd" = "$CANON" ]; then echo "  ✓ canonical checkout"; else echo "  !! WRONG WORKTREE (expected $CANON)"; fi
fi

echo "── git ──"
git -C "$CANON" log -1 --format='  %h %s' 2>/dev/null
echo "  branch: $(git -C "$CANON" branch --show-current 2>/dev/null)"
