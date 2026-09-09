# RUNBOOK — how to run each session

`FOUNDATION_SHA` is the tip of `polish/sg-00-foundation`. A document cannot
contain its own commit hash, so resolve it:

```bash
cd /Users/edwardhwang/Desktop/Edward_world
git rev-parse polish/sg-00-foundation
```

All three parallel worktrees are created from that exact commit.

## Fixed facts

| | |
|---|---|
| Canonical checkout | `/Users/edwardhwang/Desktop/Edward_world` — stays on `main` |
| Foundation worktree | `/Users/edwardhwang/Desktop/Edward_world-sg-00` |
| Node | `export PATH=/opt/homebrew/opt/node@24/bin:$PATH` → v24.19.0 |
| Package manager | `npm ci` (never `npm install`, never a version bump) |

### Do not disturb

- A live `next dev` is serving the canonical checkout on **port 3004** (pid was
  56169 at baseline). Leave it running and do not check `main` out onto another
  branch.
- Port **3003** is another `next-server`; **5173** and **4899** belong to
  unrelated projects. None of them are ours.
- `Edward_world-tennis`, `-bgm`, `-character`, `-feel`, `-visitor` are older
  worktrees on their own branches. Do not check them out, edit them, or delete
  them.

## Ports

| Session | Branch | Worktree | Port |
|---|---|---|---|
| A tennis | `polish/sg-a-tennis` | `../Edward_world-sg-a` | 3011 |
| B golf | `polish/sg-b-golf` | `../Edward_world-sg-b` | 3012 |
| C ball + running | `polish/sg-c-ball-running` | `../Edward_world-sg-c` | 3013 |
| D integration | `polish/sg-d-integration` | create when D starts | 3014 |
| E QA | `polish/sg-e-qa` | create when E starts | 3015 |

Each worktree has its own `.next/`, because Next.js writes it into the
directory it is run from. Never point two dev servers at one directory.

## First run in a worktree

```bash
export PATH=/opt/homebrew/opt/node@24/bin:$PATH
cd /Users/edwardhwang/Desktop/Edward_world-sg-a     # or -sg-b / -sg-c
npm ci                                              # real node_modules
npm run dev -- --port 3011                          # 3012 / 3013
```

`npm ci` per worktree is required. **Do not symlink `node_modules` between
worktrees** — a symlinked `node_modules` breaks `next build` under Turbopack.

## Gates before handing work over

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

Expected at FOUNDATION_SHA: lint clean, typecheck clean, **433 tests / 30
files**, build succeeds with 10 routes.

## Rules for every session

- Commit only on your own branch. **Do not push. Do not merge to `main`. Do not
  deploy.**
- Edit only the files OWNERSHIP.md assigns you. Shared file needed? Write it in
  `docs/sportsgang-polish/REQUESTS.md` and let D make the change.
- Do not stash, reset, clean or amend anyone else's work, and leave the four
  untracked local items in the canonical checkout alone.
- If a session needs a fresh base later, rebase onto `polish/sg-d-integration`
  rather than re-cutting from `main`.
