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

let sharedStore: JoinStore | undefined;

/**
 * The process-wide store used by the route handler. Lazily created so
 * every request within one server instance shares the same counter.
 */
export function getJoinStore(): JoinStore {
  if (!sharedStore) {
    sharedStore = createInMemoryJoinStore();
  }
  return sharedStore;
}
