import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/joins/route";
import { readJoinTotal, recordJoin } from "@/lib/joins/response";
import { createInMemoryJoinStore, type JoinStore } from "@/lib/joins/store";

async function totalOf(response: Response): Promise<number> {
  const body = (await response.json()) as { total: number };
  return body.total;
}

describe("in-memory join store", () => {
  it("starts at zero", async () => {
    const store = createInMemoryJoinStore();
    expect(await store.read()).toBe(0);
  });

  it("increments monotonically, one at a time", async () => {
    const store = createInMemoryJoinStore();
    expect(await store.increment()).toBe(1);
    expect(await store.increment()).toBe(2);
    expect(await store.increment()).toBe(3);
    expect(await store.read()).toBe(3);
  });

  it("never decreases and never repeats a total across sequential joins", async () => {
    const store = createInMemoryJoinStore();
    const seen: number[] = [];
    for (let i = 0; i < 20; i += 1) {
      seen.push(await store.increment());
    }
    expect(seen).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it("does not lose counts when increments race concurrently", async () => {
    const store = createInMemoryJoinStore();
    const concurrentJoins = 200;
    const results = await Promise.all(
      Array.from({ length: concurrentJoins }, () => store.increment()),
    );
    // Every increment must have produced a distinct total: no two callers
    // may observe the same post-increment value, and none may be skipped.
    expect(new Set(results).size).toBe(concurrentJoins);
    expect(Math.max(...results)).toBe(concurrentJoins);
    expect(Math.min(...results)).toBe(1);
    expect(await store.read()).toBe(concurrentJoins);
  });
});

describe("readJoinTotal / recordJoin (route logic)", () => {
  it("GET does not increment: repeated reads return the same total", async () => {
    const store = createInMemoryJoinStore();
    await store.increment();
    await store.increment();

    const first = await totalOf(await readJoinTotal(store));
    const second = await totalOf(await readJoinTotal(store));
    const third = await totalOf(await readJoinTotal(store));

    expect(first).toBe(2);
    expect(second).toBe(2);
    expect(third).toBe(2);
  });

  it("POST increments and echoes the new total", async () => {
    const store = createInMemoryJoinStore();

    const response = await recordJoin(store);
    expect(response.status).toBe(200);
    expect(await totalOf(response)).toBe(1);

    const next = await recordJoin(store);
    expect(await totalOf(next)).toBe(2);
  });

  it("never returns NaN or a missing total on success", async () => {
    const store = createInMemoryJoinStore();
    const response = await recordJoin(store);
    const body = (await response.json()) as { total: unknown };
    expect(typeof body.total).toBe("number");
    expect(Number.isNaN(body.total)).toBe(false);
    expect(body.total).not.toBeUndefined();
  });

  it("returns a well-formed error body, and never a NaN total, when the store fails", async () => {
    const brokenStore: JoinStore = {
      read: async () => {
        throw new Error("simulated read failure");
      },
      increment: async () => {
        throw new Error("simulated increment failure");
      },
    };

    const getResponse = await readJoinTotal(brokenStore);
    expect(getResponse.status).toBe(500);
    const getBody = (await getResponse.json()) as { error?: unknown; total?: unknown };
    expect(typeof getBody.error).toBe("string");
    expect((getBody.error as string).length).toBeGreaterThan(0);
    expect(getBody.total).toBeUndefined();

    const postResponse = await recordJoin(brokenStore);
    expect(postResponse.status).toBe(500);
    const postBody = (await postResponse.json()) as { error?: unknown; total?: unknown };
    expect(typeof postBody.error).toBe("string");
    expect(postBody.total).toBeUndefined();
  });

  it("treats a malformed resolved total (not thrown, just invalid) as an error, never as NaN in the body", async () => {
    const malformedStore: JoinStore = {
      read: async () => Number.NaN,
      increment: async () => -1,
    };

    const getResponse = await readJoinTotal(malformedStore);
    expect(getResponse.status).toBe(500);
    const getBody = (await getResponse.json()) as { total?: unknown };
    expect(getBody.total).toBeUndefined();

    const postResponse = await recordJoin(malformedStore);
    expect(postResponse.status).toBe(500);
    const postBody = (await postResponse.json()) as { total?: unknown };
    expect(postBody.total).toBeUndefined();
  });
});

describe("response shape", () => {
  it("serves JSON whose success body is exactly { total }", async () => {
    const store = createInMemoryJoinStore();
    const response = await recordJoin(store);

    expect(response.headers.get("content-type")).toContain("application/json");
    const body = (await response.json()) as Record<string, unknown>;
    expect(Object.keys(body)).toEqual(["total"]);
  });

  it("serves an error body that is exactly { error }, with no internals in it", async () => {
    const store: JoinStore = {
      read: async () => {
        throw new Error("redis://user:hunter2@internal-host:6379 refused");
      },
      increment: async () => {
        throw new Error("redis://user:hunter2@internal-host:6379 refused");
      },
    };

    for (const response of [await readJoinTotal(store), await recordJoin(store)]) {
      expect(response.headers.get("content-type")).toContain("application/json");
      const body = (await response.json()) as Record<string, unknown>;
      expect(Object.keys(body)).toEqual(["error"]);
      // The visitor is told the counter is unavailable, never why.
      expect(JSON.stringify(body)).not.toContain("hunter2");
      expect(JSON.stringify(body)).not.toContain("internal-host");
    }
  });
});

describe("route wiring (GET/POST handlers)", () => {
  it("POST /api/joins increments the shared counter and GET reflects it without incrementing further", async () => {
    const before = await totalOf(await GET());

    const postResponse = await POST();
    expect(postResponse.status).toBe(200);
    const afterPost = await totalOf(postResponse);
    expect(afterPost).toBe(before + 1);

    const afterGetOne = await totalOf(await GET());
    const afterGetTwo = await totalOf(await GET());
    expect(afterGetOne).toBe(afterPost);
    expect(afterGetTwo).toBe(afterPost);
  });

  it("exposes only the documented dynamic-rendering config, not a stale static export", async () => {
    const routeModule = await import("@/app/api/joins/route");
    expect(routeModule.dynamic).toBe("force-dynamic");
  });
});
