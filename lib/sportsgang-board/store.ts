/**
 * Where the public golf board is kept.
 *
 * Deliberately shaped like `lib/joins/store.ts`, which already solved this
 * problem for the visitor counter: an interface, an in-process binding for
 * development, a Redis-compatible REST binding for production, a binding that
 * refuses rather than inventing numbers, and a three-way `get…Store()` that
 * picks between them. Same environment variables, because provisioning one
 * Redis serves both.
 *
 * **It shares nothing else with the counter.** The counter owns exactly one
 * key, `edwards-world:joins`, and this module never reads, writes, expires or
 * even names it. Every key here lives under `edwards-world:sg-golf:`. The
 * counter's key, its TTL (it has none) and its increment logic are untouched.
 *
 * One privacy difference from the counter, stated because it is a real one:
 * `/api/joins` takes no request object at all, so there is nothing per-visitor
 * to read. This store does hold a per-device anonymous id, because a board of
 * personal bests needs to know which rows belong to the same player. That id
 * is generated on the device, is never shown to anyone, and arrives only when
 * a visitor has explicitly asked to publish a run.
 */

import {
  beatsStoredBest,
  boardKeyFor,
  type BoardEntry,
} from "@/lib/sportsgang-board/rank";

/** Outcome of trying to store one run. */
export type SubmitOutcome =
  /** Stored, and it is this player's new best. */
  | { readonly kind: "RECORDED" }
  /** Accepted, but the player already had a better one. Nothing changed. */
  | { readonly kind: "NOT_BETTER" }
  /** This exact runId was already submitted. Nothing changed. */
  | { readonly kind: "DUPLICATE" }
  /** The player has submitted too often, too fast. */
  | { readonly kind: "RATE_LIMITED" };

export interface BoardStore {
  /** Every current best for one board, unranked and unordered. */
  read(boardKey: string): Promise<readonly BoardEntry[]>;
  /**
   * Records a run if it is this player's new best.
   *
   * Must be atomic against a concurrent submission from the same player: two
   * runs landing together must not both read "no best yet" and both write.
   */
  submit(boardKey: string, entry: BoardEntry): Promise<SubmitOutcome>;
}

/** How many submissions one anonymous id may make in a window. */
export const RATE_LIMIT_MAX = 10;
export const RATE_LIMIT_WINDOW_SECONDS = 60;

/** How long a stored best and a seen runId live. */
export const ENTRY_TTL_SECONDS = 60 * 60 * 24 * 90;

/** The prefix every key in this module lives under. Never the counter's. */
export const BOARD_NAMESPACE = "edwards-world:sg-golf";

/**
 * A board held in this process.
 *
 * Correct within one server, and nothing more: it is empty after a restart,
 * and on a platform that runs several instances each has its own. That is why
 * anything built on it must say `LOCAL-ONLY` on screen, and why `getBoardStore`
 * refuses to bind it in production.
 *
 * Writes are serialised through a promise chain so the read-compare-write in
 * `submit` cannot interleave with another submission. Today's body has no
 * `await` inside the critical section, so run-to-completion already protects
 * it; the chain keeps that true if one is ever added.
 */
export function createInMemoryBoardStore(): BoardStore {
  const boards = new Map<string, Map<string, BoardEntry>>();
  const seenRuns = new Set<string>();
  const rates = new Map<string, { count: number; resetAt: number }>();
  let queue: Promise<unknown> = Promise.resolve();

  function serialise<T>(work: () => T): Promise<T> {
    const next = queue.then(work);
    // Keep the chain alive even if one link rejects.
    queue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  return {
    async read(boardKey) {
      return [...(boards.get(boardKey)?.values() ?? [])];
    },
    submit(boardKey, entry) {
      return serialise(() => {
        const now = Date.now();
        const rate = rates.get(entry.anonId);
        if (rate && rate.resetAt > now) {
          if (rate.count >= RATE_LIMIT_MAX) return { kind: "RATE_LIMITED" } as const;
          rate.count += 1;
        } else {
          rates.set(entry.anonId, {
            count: 1,
            resetAt: now + RATE_LIMIT_WINDOW_SECONDS * 1_000,
          });
        }

        // The runId guard comes first and is unconditional, so a resubmitted
        // run is idempotent whether or not it would have been an improvement.
        if (seenRuns.has(entry.runId)) return { kind: "DUPLICATE" } as const;
        seenRuns.add(entry.runId);

        const board = boards.get(boardKey) ?? new Map<string, BoardEntry>();
        boards.set(boardKey, board);
        const stored = board.get(entry.anonId) ?? null;
        if (!beatsStoredBest(entry, stored)) return { kind: "NOT_BETTER" } as const;
        board.set(entry.anonId, entry);
        return { kind: "RECORDED" } as const;
      });
    },
  };
}

/**
 * Reads the same two environment-variable pairs the visitor counter reads.
 *
 * `KV_REST_API_*` is what Vercel's marketplace integrations set; `UPSTASH_*`
 * is what a directly-provisioned Upstash database sets. Accepting both means
 * either provisioning route works with no code change. Nothing here creates,
 * requests or logs a credential.
 */
function readRestConfig(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

const REQUEST_TIMEOUT_MS = 3_000;

/**
 * The whole of `submit`, as one server-side script.
 *
 * It has to be one script because it is a read-compare-write across three
 * keys, and two devices submitting at the same moment must not both decide
 * they are the new best. Redis runs `EVAL` atomically, so the rate check, the
 * duplicate check and the comparison all happen with nothing interleaved —
 * which is the property the in-memory store gets from its promise chain and
 * the reason a plain sequence of REST calls would not do.
 *
 * KEYS: 1 the rate counter · 2 the seen-run marker · 3 the board hash
 * ARGV: 1 anonId · 2 runId · 3 totalStrokes · 4 the row as JSON
 *       5 rate limit · 6 rate window · 7 entry ttl
 */
const SUBMIT_SCRIPT = `
local rate = redis.call('INCR', KEYS[1])
if rate == 1 then redis.call('EXPIRE', KEYS[1], tonumber(ARGV[6])) end
if rate > tonumber(ARGV[5]) then return 'RATE_LIMITED' end

if redis.call('SET', KEYS[2], '1', 'NX', 'EX', tonumber(ARGV[7])) == false then
  return 'DUPLICATE'
end

local existing = redis.call('HGET', KEYS[3], ARGV[1])
if existing then
  local decoded = cjson.decode(existing)
  if tonumber(decoded['totalStrokes']) <= tonumber(ARGV[3]) then
    return 'NOT_BETTER'
  end
end

redis.call('HSET', KEYS[3], ARGV[1], ARGV[4])
redis.call('EXPIRE', KEYS[3], tonumber(ARGV[7]))
return 'RECORDED'
`.trim();

/**
 * A board over a Redis-compatible REST API.
 *
 * Note the request shape: the counter's store puts its command in the URL
 * path, which cannot carry a Lua script, so this one posts a JSON command
 * array to the root instead. Both are the same Upstash REST protocol.
 *
 * Every failure throws rather than resolving with a guess, exactly as the
 * counter does — a board that quietly showed a stale or invented ranking would
 * be worse than one that says it is unavailable.
 */
export function createRestBoardStore(config: {
  url: string;
  token: string;
  fetchImpl?: typeof fetch;
  namespace?: string;
}): BoardStore {
  const call = config.fetchImpl ?? fetch;
  const namespace = config.namespace ?? BOARD_NAMESPACE;

  async function command(payload: readonly unknown[]): Promise<unknown> {
    const response = await call(config.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`golf board store responded ${response.status}`);
    }
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null && "error" in body) {
      throw new Error("golf board store returned an error");
    }
    return typeof body === "object" && body !== null && "result" in body
      ? (body as { result: unknown }).result
      : undefined;
  }

  return {
    async read(boardKey) {
      const result = await command(["HGETALL", `${namespace}:board:${boardKey}`]);
      if (!Array.isArray(result)) return [];
      const entries: BoardEntry[] = [];
      // HGETALL comes back as a flat [field, value, field, value…] array.
      for (let index = 1; index < result.length; index += 2) {
        const raw = result[index];
        if (typeof raw !== "string") continue;
        try {
          entries.push(JSON.parse(raw) as BoardEntry);
        } catch {
          // One unreadable row must not take the whole board down with it.
        }
      }
      return entries;
    },

    async submit(boardKey, entry) {
      const result = await command([
        "EVAL",
        SUBMIT_SCRIPT,
        "3",
        `${namespace}:rate:${entry.anonId}`,
        `${namespace}:run:${entry.runId}`,
        `${namespace}:board:${boardKey}`,
        entry.anonId,
        entry.runId,
        String(entry.totalStrokes),
        JSON.stringify(entry),
        String(RATE_LIMIT_MAX),
        String(RATE_LIMIT_WINDOW_SECONDS),
        String(ENTRY_TTL_SECONDS),
      ]);

      if (result === "RECORDED") return { kind: "RECORDED" };
      if (result === "NOT_BETTER") return { kind: "NOT_BETTER" };
      if (result === "DUPLICATE") return { kind: "DUPLICATE" };
      if (result === "RATE_LIMITED") return { kind: "RATE_LIMITED" };
      throw new Error(`golf board store returned an unknown outcome`);
    },
  };
}

/**
 * The binding used when production has no durable store. Every call throws.
 *
 * The route turns a throw into a 503 and the board says it is unavailable.
 * That is deliberate, and the same choice the visitor counter makes: falling
 * back to the in-process board would show each visitor their own submissions
 * back as though they were a world ranking, on every cold instance, forever.
 */
export function createUnavailableBoardStore(): BoardStore {
  const fail = async (): Promise<never> => {
    throw new Error(
      "no durable board store is configured; set KV_REST_API_URL and KV_REST_API_TOKEN",
    );
  };
  return { read: fail, submit: fail };
}

/** How this process is backed, for the banner the board shows. */
export type BoardMode = "DURABLE" | "LOCAL_ONLY" | "UNAVAILABLE";

export function getBoardMode(): BoardMode {
  if (readRestConfig() !== null) return "DURABLE";
  return process.env.NODE_ENV === "production" ? "UNAVAILABLE" : "LOCAL_ONLY";
}

let sharedStore: BoardStore | undefined;

/**
 * The process-wide store, bound on first use.
 *
 * Three outcomes, the same three the counter has:
 *
 * 1. The environment names a Redis-compatible REST endpoint — use it. This is
 *    the only branch that is a *global* board.
 * 2. Nothing provisioned, production — refuse, so the world says the board is
 *    unavailable rather than showing one visitor's own submissions back to
 *    them as though they were a world ranking.
 * 3. Nothing provisioned, development or test — keep it in this process, and
 *    label it `LOCAL-ONLY` wherever it is shown.
 *
 * Nothing here provisions anything.
 */
export function getBoardStore(): BoardStore {
  if (!sharedStore) {
    const config = readRestConfig();
    sharedStore = config
      ? createRestBoardStore(config)
      : process.env.NODE_ENV === "production"
        ? createUnavailableBoardStore()
        : createInMemoryBoardStore();
  }
  return sharedStore;
}

/** Test seam: forget the process-wide store so the next call rebinds it. */
export function resetBoardStoreForTests(): void {
  sharedStore = undefined;
}

export { boardKeyFor };
