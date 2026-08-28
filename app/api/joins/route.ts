import { getJoinStore } from "@/lib/joins/store";
import { readJoinTotal, recordJoin } from "@/lib/joins/response";

/**
 * `GET`/`POST /api/joins` — an anonymous, global "World join" counter.
 *
 * Anonymity: neither handler below takes a `request` parameter, so there
 * is no request object here to read a cookie, header, or IP from in the
 * first place. The only state that exists is the single integer held by
 * the `JoinStore` (see `lib/joins/store.ts`).
 *
 * Caching: per the Route Handlers docs (node_modules/next/dist/docs/
 * 01-app/01-getting-started/15-route-handlers.md), a `GET` handler is not
 * cached by default — that only happens if the route opts in with
 * `export const dynamic = 'force-static'`. This route does the opposite
 * and pins `dynamic = 'force-dynamic'` so the total can never be baked
 * into a static response (at build time or by a future change to the
 * default), and so `POST` and `GET` are guaranteed to observe the same
 * live counter. Cache Components (the `cacheComponents` config flag,
 * under which `dynamic` is removed in favor of `use cache`) is not
 * enabled in next.config.ts, so this export is honored as documented in
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/
 * 02-route-segment-config/index.md.
 */
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return readJoinTotal(getJoinStore());
}

export async function POST(): Promise<Response> {
  return recordJoin(getJoinStore());
}
