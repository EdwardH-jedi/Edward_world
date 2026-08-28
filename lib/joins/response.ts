import type { JoinStore } from "@/lib/joins/store";

/** Successful response body: the current total, and nothing else. */
export interface JoinsSuccessBody {
  total: number;
}

/** Error response body: a human-readable message, and nothing else. */
export interface JoinsErrorBody {
  error: string;
}

/**
 * Guards against ever serializing a broken total (NaN, a negative number,
 * a fraction, `undefined`) into the response — a defensive check, since a
 * future non-in-memory `JoinStore` (a network-backed one) could resolve
 * with something malformed instead of throwing.
 */
export function isValidTotal(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function totalResponse(total: number): Response {
  if (!isValidTotal(total)) {
    return errorResponse("join count is unavailable");
  }
  const body: JoinsSuccessBody = { total };
  return Response.json(body);
}

function errorResponse(message: string): Response {
  const body: JoinsErrorBody = { error: message };
  return Response.json(body, { status: 500 });
}

/** Read the current total without incrementing it. Never throws. */
export async function readJoinTotal(store: JoinStore): Promise<Response> {
  try {
    const total = await store.read();
    return totalResponse(total);
  } catch {
    return errorResponse("failed to read join count");
  }
}

/** Record one anonymous join and return the new total. Never throws. */
export async function recordJoin(store: JoinStore): Promise<Response> {
  try {
    const total = await store.increment();
    return totalResponse(total);
  } catch {
    return errorResponse("failed to record join");
  }
}
