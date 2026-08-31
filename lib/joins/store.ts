/**
 * Backing store contract for the anonymous "World join" counter.
 *
 * The store holds nothing but a single monotonic, non-negative integer: how
 * many times `POST /api/joins` has succeeded. No identifiers, IPs, cookies,
 * user agents, or timestamps are ever stored alongside it, and nothing here
 * accepts a `Request` — see `app/api/joins/route.ts`, whose handlers take no
 * request parameter at all, so there is nothing per-visitor to even read.
 */
export interface JoinStore {
  /** Return the current total without mutating it. */
  read(): Promise<number>;
  /** Atomically add one join and return the new total. */
  increment(): Promise<number>;
}

/**
 * Default, non-durable binding: an in-process counter.
 *
 * This is intentionally the *only* store shipped here. It resets to 0 on
 * every process restart, and on Vercel each Function instance (and each
 * cold start) gets its own independent counter, so totals will diverge
 * across concurrent instances in production. It exists as a working
 * default for local development and as a reference implementation of the
 * `JoinStore` contract that a durable store can drop in to replace,
 * without any change to the route handler. See the project report for a
 * production-storage recommendation — provisioning that store is a
 * decision for a human, not this module.
 *
 * Increments are serialized through a promise chain rather than a bare
 * `total += 1`. Today's `total += 1` has no `await` in it, so it is in
 * fact already atomic under JS's run-to-completion semantics — but the
 * chain keeps `increment()` correct if this implementation ever grows a
 * real `await` (e.g. wrapping a network call) without silently
 * reintroducing a lost-update race.
 */
export function createInMemoryJoinStore(): JoinStore {
  let total = 0;
  let queue: Promise<number> = Promise.resolve(total);

  return {
    async read() {
      return total;
    },
    async increment() {
      queue = queue.then(() => {
        total += 1;
        return total;
      });
      return queue;
    },
  };
}

/**
 * Environment that binds a durable store, in the order it is looked for.
 *
 * Both names describe the same thing — a Redis-compatible REST endpoint and a
 * bearer token. Vercel's marketplace integrations set the `KV_REST_API_*`
 * pair; a directly-provisioned Upstash database sets the `UPSTASH_*` pair.
 * Accepting both means provisioning through either route needs no code change.
 */
function readRestConfig(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

/** The single key the counter lives under. */
export const JOIN_KEY = "edwards-world:joins";

/** How long a counter request may take before it is treated as unavailable. */
const REQUEST_TIMEOUT_MS = 2_000;

/**
 * A durable store over a Redis-compatible REST API.
 *
 * `INCR` is atomic on the server, which is the whole reason to reach for one:
 * it is the one operation that stays correct when several Function instances
 * increment at once, which is exactly where the in-memory store gives up.
 *
 * Every failure throws rather than resolving with a guess. `lib/joins/
 * response.ts` turns a throw into a 500, and the client omits the line
 * entirely — a counter that quietly invents a number would be worse than one
 * that says nothing.
 */
export function createRestJoinStore(config: {
  url: string;
  token: string;
  key?: string;
  fetchImpl?: typeof fetch;
}): JoinStore {
  const key = config.key ?? JOIN_KEY;
  const call = config.fetchImpl ?? fetch;

  async function command(path: string): Promise<number> {
    const response = await call(`${config.url}/${path}/${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.token}` },
      // A hung counter must not hold a request open; the caller degrades.
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`join store responded ${response.status}`);
    }

    const body: unknown = await response.json();
    const result =
      typeof body === "object" && body !== null && "result" in body
        ? (body as { result: unknown }).result
        : undefined;

    // A key that has never been written reads back as null, which is zero
    // joins rather than a broken store.
    if (result === null || result === undefined) return 0;

    const total = typeof result === "string" ? Number(result) : result;
    if (typeof total !== "number" || !Number.isInteger(total) || total < 0) {
      throw new Error("join store returned a total that is not a count");
    }
    return total;
  }

  return {
    read: () => command("get"),
    increment: () => command("incr"),
  };
}

let sharedStore: JoinStore | undefined;

/**
 * The process-wide store used by the route handler. Lazily created so
 * every request within one server instance shares the same counter.
 */
export function getJoinStore(): JoinStore {
  if (!sharedStore) {
    const config = readRestConfig();
    // Durable when the environment provides somewhere durable to write, and
    // an honest local counter otherwise. Nothing here provisions anything.
    sharedStore = config ? createRestJoinStore(config) : createInMemoryJoinStore();
  }
  return sharedStore;
}

/** Test seam: forget the process-wide store so the next call rebinds it. */
export function resetJoinStoreForTests(): void {
  sharedStore = undefined;
}

/** Whether this process is backed by a durable store. For diagnostics only. */
export function isDurableJoinStoreConfigured(): boolean {
  return readRestConfig() !== null;
}
