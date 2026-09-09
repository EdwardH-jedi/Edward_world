# Storage setup — the public golf board

**No secret appears in this file, and nothing here provisions anything.** It
names the environment variables the board reads and the steps a person with
access would take. No account, database or paid resource was created by this
session, and none should be created automatically.

---

## Current status

```
GLOBAL_LEADERBOARD = BLOCKED_CONFIG
```

No durable store is configured in this environment: none of the four variables
below is set, there is no `.env` file, and the repository is not linked to a
Vercel project. The board therefore runs in its **local-only** mode, and says
so on screen.

This is **not** the full requirement met. The API, the storage adapter, the
schema, the ranking, the tests and the local-only mode are all built and
verified; what is missing is a real shared database, which needs a credential
this session must not create or ask for.

---

## What the board reads

The same two pairs the visitor counter already reads, so **one Redis serves
both** and provisioning either way needs no code change:

| Variable | Set by |
|---|---|
| `KV_REST_API_URL` | a Vercel Marketplace Redis integration |
| `KV_REST_API_TOKEN` | the same |
| `UPSTASH_REDIS_REST_URL` | a directly-provisioned Upstash database |
| `UPSTASH_REDIS_REST_TOKEN` | the same |

Either pair is enough. `KV_REST_API_*` is preferred when both are present.

## The three modes, and what decides them

`getBoardMode()` in `lib/sportsgang-board/store.ts`:

| Mode | When | What the visitor sees |
|---|---|---|
| `DURABLE` | a pair above is set | the board, shared by everyone |
| `LOCAL_ONLY` | nothing set, not production | the board, labelled `LOCAL-ONLY, THIS SERVER PROCESS` |
| `UNAVAILABLE` | nothing set, production | "the public board is not available right now" — never an empty board, which would read as "nobody has played yet" |

Production refuses rather than falling back, for the same reason the visitor
counter does: a per-instance board would show each visitor their own
submissions back as though they were a world ranking.

## Keys

Everything lives under one prefix, and the counter's key is never touched:

```
edwards-world:sg-golf:board:<courseId>:<rulesVersion>   hash, anonId -> row JSON
edwards-world:sg-golf:run:<runId>                       duplicate marker
edwards-world:sg-golf:rate:<anonId>                     submissions in the window
```

TTL is 90 days on rows and run markers, 60 seconds on the rate counter. The
visitor counter's `edwards-world:joins` has no TTL and is not read, written or
expired by any of this.

## To provision it (for whoever has the account)

1. Create a Redis-compatible store — Vercel Marketplace → Redis (Upstash), or
   an Upstash database directly. Nothing in this repo will do this for you.
2. Put the URL and token into the project's environment as the names above.
   With Vercel: `vercel env add KV_REST_API_URL` and `vercel env add
   KV_REST_API_TOKEN`, or let the Marketplace integration set them.
3. Locally, the same two names in `.env.local` (already git-ignored).
4. Restart the server. `GET /api/sportsgang/golf-board` will report
   `"mode":"DURABLE"`, and the board's `LOCAL-ONLY` label disappears.

## Verifying a connection without touching the real board

Use a **separate namespace** so no test row can ever reach the board a visitor
sees:

```ts
import { createRestBoardStore } from "@/lib/sportsgang-board/store";

const probe = createRestBoardStore({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
  namespace: "edwards-world:sg-golf-selftest",   // never the real prefix
});
```

Write, read back, then delete the `…-selftest:*` keys. The `namespace` option
exists for exactly this. **Do not** add sample players or scores to the real
board to see whether it works.

Not done in this session: there is no credential here, so no connection was
attempted. Recorded as `NOT_RUN: no credentials in this environment`.

## What is stored about a visitor

Only what they pressed a button to publish:

- an anonymous id generated on their own device (`crypto.randomUUID()`),
- the display name they confirmed, or `GUEST`,
- the run's own numbers, and the server's received time.

No IP, cookie, user agent, email or real name. Nothing is written until a
visitor submits, and the anonymous id is not even created before then.
