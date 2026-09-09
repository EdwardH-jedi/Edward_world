import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getJoinTotal,
  JOIN_SESSION_KEY,
  recordJoinOnce,
  resetJoinClientForTests,
  subscribeToJoinTotal,
} from "@/lib/joins/client";
import { formatJoinLine, formatOrdinal } from "@/lib/joins/ordinal";
import { readJoinTotal, recordJoin } from "@/lib/joins/response";
import {
  createRestJoinStore,
  createUnavailableJoinStore,
  getJoinStore,
  isDurableJoinStoreConfigured,
  JOIN_KEY,
  resetJoinStoreForTests,
} from "@/lib/joins/store";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * A `sessionStorage` stand-in. Vitest runs these in the `node` environment
 * (see vitest.config.ts), where there is no such global at all — which is
 * itself worth exercising, so tests opt in to this rather than getting it
 * for free.
 */
function createSessionStorageDouble(seed: Record<string, string> = {}) {
  const entries = new Map(Object.entries(seed));
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
    removeItem: (key: string) => {
      entries.delete(key);
    },
    clear: () => entries.clear(),
    key: (index: number) => [...entries.keys()][index] ?? null,
    get length() {
      return entries.size;
    },
    entries,
  };
}

describe("ordinals", () => {
  it("uses st/nd/rd where English does", () => {
    expect(formatOrdinal(1)).toBe("1st");
    expect(formatOrdinal(2)).toBe("2nd");
    expect(formatOrdinal(3)).toBe("3rd");
    expect(formatOrdinal(4)).toBe("4th");
  });

  it("gets the teens right, which is the only hard part", () => {
    expect(formatOrdinal(11)).toBe("11th");
    expect(formatOrdinal(12)).toBe("12th");
    expect(formatOrdinal(13)).toBe("13th");
    expect(formatOrdinal(111)).toBe("111th");
    expect(formatOrdinal(1013)).toBe("1,013th");
  });

  it("keeps counting correctly past the teens", () => {
    expect(formatOrdinal(21)).toBe("21st");
    expect(formatOrdinal(102)).toBe("102nd");
    expect(formatOrdinal(1024)).toBe("1,024th");
  });

  it("refuses a position that is not a count", () => {
    expect(() => formatOrdinal(-1)).toThrow(RangeError);
    expect(() => formatOrdinal(1.5)).toThrow(RangeError);
  });

  it("writes the line the world shows", () => {
    expect(formatJoinLine(1)).toBe("You are the 1st player to join the world.");
    expect(formatJoinLine(42)).toBe("You are the 42nd player to join the world.");
  });
});

describe("recording one visitor's join", () => {
  beforeEach(() => resetJoinClientForTests());
  afterEach(() => vi.unstubAllGlobals());

  function stubFetch(impl: () => Promise<Response>) {
    const spy = vi.fn(impl);
    vi.stubGlobal("fetch", spy);
    return spy;
  }

  const ok = (total: number) =>
    Promise.resolve(new Response(JSON.stringify({ total }), { status: 200 }));

  it("posts once and publishes the total", async () => {
    const spy = stubFetch(() => ok(7));
    recordJoinOnce();
    await flush();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(getJoinTotal()).toBe(7);
  });

  it("counts one arrival once, however many times it is asked", async () => {
    // Three doors lead into the world, and StrictMode mounts twice.
    const spy = stubFetch(() => ok(7));
    recordJoinOnce();
    recordJoinOnce();
    recordJoinOnce();
    await flush();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("tells subscribers exactly once when the total lands", async () => {
    stubFetch(() => ok(9));
    let calls = 0;
    const stop = subscribeToJoinTotal(() => {
      calls += 1;
    });
    recordJoinOnce();
    await flush();
    expect(calls).toBe(1);
    stop();
  });

  it("stays silent when the counter errors", async () => {
    stubFetch(() =>
      Promise.resolve(new Response(JSON.stringify({ error: "nope" }), { status: 500 })),
    );
    recordJoinOnce();
    await flush();
    expect(getJoinTotal()).toBeNull();
  });

  it("stays silent when the network is gone", async () => {
    stubFetch(() => Promise.reject(new Error("offline")));
    recordJoinOnce();
    await flush();
    expect(getJoinTotal()).toBeNull();
  });

  it("remembers the position it was given, so a refresh does not count twice", async () => {
    const storage = createSessionStorageDouble();
    vi.stubGlobal("sessionStorage", storage);
    const spy = stubFetch(() => ok(7));

    recordJoinOnce();
    await flush();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(storage.getItem(JOIN_SESSION_KEY)).toBe("7");

    // A refresh: the module is evaluated afresh and its latch is gone, but
    // the tab's storage is not. A re-import is the honest simulation — the
    // exported reset seam deliberately clears storage too.
    vi.resetModules();
    const reloaded = await import("@/lib/joins/client");
    reloaded.recordJoinOnce();
    await flush();

    // Same ordinal, and no second join recorded.
    expect(reloaded.getJoinTotal()).toBe(7);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("publishes the remembered position to subscribers without waiting on the network", async () => {
    vi.stubGlobal("sessionStorage", createSessionStorageDouble({ [JOIN_SESSION_KEY]: "31" }));
    const spy = stubFetch(() => ok(999));
    let calls = 0;
    const stop = subscribeToJoinTotal(() => {
      calls += 1;
    });

    recordJoinOnce();
    // Deliberately no flush: a remembered position is available synchronously.
    expect(getJoinTotal()).toBe(31);
    expect(calls).toBe(1);
    expect(spy).not.toHaveBeenCalled();
    stop();
  });

  it("treats junk in session storage as no memory at all and joins normally", async () => {
    for (const junk of ["", "0", "-4", "2.5", "banana", "NaN"]) {
      resetJoinClientForTests();
      vi.unstubAllGlobals();
      const storage = createSessionStorageDouble({ [JOIN_SESSION_KEY]: junk });
      vi.stubGlobal("sessionStorage", storage);
      const spy = stubFetch(() => ok(5));

      recordJoinOnce();
      await flush();

      expect(spy, junk).toHaveBeenCalledTimes(1);
      expect(getJoinTotal(), junk).toBe(5);
      expect(storage.getItem(JOIN_SESSION_KEY), junk).toBe("5");
    }
  });

  it("still counts the join when session storage is missing entirely", async () => {
    // The node test environment has no `sessionStorage`; this is the shape of
    // a browser that has disabled it.
    const spy = stubFetch(() => ok(3));
    recordJoinOnce();
    await flush();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(getJoinTotal()).toBe(3);
  });

  it("still counts the join when session storage throws on every access", async () => {
    // Safari in private browsing throws rather than returning null.
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => {
        throw new Error("SecurityError");
      },
    });
    const spy = stubFetch(() => ok(8));
    recordJoinOnce();
    await flush();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(getJoinTotal()).toBe(8);
  });

  it("does not remember a position the counter refused to give", async () => {
    const storage = createSessionStorageDouble();
    vi.stubGlobal("sessionStorage", storage);
    stubFetch(() =>
      Promise.resolve(new Response(JSON.stringify({ error: "nope" }), { status: 500 })),
    );
    recordJoinOnce();
    await flush();
    expect(getJoinTotal()).toBeNull();
    expect(storage.getItem(JOIN_SESSION_KEY)).toBeNull();
  });

  it("refuses a total that is not a countable position", async () => {
    for (const bad of [0, -3, 2.5, "12", null]) {
      resetJoinClientForTests();
      stubFetch(() =>
        Promise.resolve(new Response(JSON.stringify({ total: bad }), { status: 200 })),
      );
      recordJoinOnce();
      await flush();
      expect(getJoinTotal(), String(bad)).toBeNull();
    }
  });
});

describe("the durable store", () => {
  beforeEach(() => resetJoinStoreForTests());

  it("increments through INCR and reads through GET", async () => {
    const calls: string[] = [];
    const store = createRestJoinStore({
      url: "https://kv.example.com",
      token: "t",
      fetchImpl: async (input) => {
        calls.push(String(input));
        return new Response(JSON.stringify({ result: 12 }), { status: 200 });
      },
    });
    expect(await store.increment()).toBe(12);
    expect(await store.read()).toBe(12);
    expect(calls[0]).toContain(`/incr/${encodeURIComponent(JOIN_KEY)}`);
    expect(calls[1]).toContain(`/get/${encodeURIComponent(JOIN_KEY)}`);
  });

  it("reads a never-written key as zero rather than as broken", async () => {
    const store = createRestJoinStore({
      url: "https://kv.example.com",
      token: "t",
      fetchImpl: async () =>
        new Response(JSON.stringify({ result: null }), { status: 200 }),
    });
    expect(await store.read()).toBe(0);
  });

  it("accepts a numeric string, which is what Redis REST returns", async () => {
    const store = createRestJoinStore({
      url: "https://kv.example.com",
      token: "t",
      fetchImpl: async () =>
        new Response(JSON.stringify({ result: "40" }), { status: 200 }),
    });
    expect(await store.read()).toBe(40);
  });

  it("throws rather than inventing a total when the backend fails", async () => {
    const store = createRestJoinStore({
      url: "https://kv.example.com",
      token: "t",
      fetchImpl: async () => new Response("nope", { status: 503 }),
    });
    await expect(store.read()).rejects.toThrow(/503/);
  });

  it("throws when the backend returns something that is not a count", async () => {
    const store = createRestJoinStore({
      url: "https://kv.example.com",
      token: "t",
      fetchImpl: async () =>
        new Response(JSON.stringify({ result: "banana" }), { status: 200 }),
    });
    await expect(store.read()).rejects.toThrow(/not a count/);
  });

  it("gives up rather than resolving when the request never comes back", async () => {
    const store = createRestJoinStore({
      url: "https://kv.example.com",
      token: "t",
      fetchImpl: (_input, init) =>
        new Promise((_resolve, reject) => {
          // Mirror what `fetch` does with an aborted signal, so the timeout
          // built into the store is what actually ends this call.
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    });
    await expect(store.increment()).rejects.toThrow();
  }, 10_000);

  it("sends the token as a bearer header and never in the URL", async () => {
    let seenUrl = "";
    let seenAuth: string | null = null;
    const store = createRestJoinStore({
      url: "https://kv.example.com",
      token: "super-secret",
      fetchImpl: async (input, init) => {
        seenUrl = String(input);
        seenAuth = new Headers(init?.headers).get("authorization");
        return new Response(JSON.stringify({ result: 1 }), { status: 200 });
      },
    });
    await store.increment();
    expect(seenAuth).toBe("Bearer super-secret");
    expect(seenUrl).not.toContain("super-secret");
  });

  it("counts in memory when nothing is provisioned outside production", async () => {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    expect(isDurableJoinStoreConfigured()).toBe(false);
    const store = getJoinStore();
    expect(await store.increment()).toBe(1);
    expect(await store.increment()).toBe(2);
  });

  it("refuses to count at all when production is missing its configuration", async () => {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    vi.stubEnv("NODE_ENV", "production");
    resetJoinStoreForTests();
    try {
      const store = getJoinStore();
      // Never a fabricated "1st player" on every cold instance.
      await expect(store.increment()).rejects.toThrow(/KV_REST_API_URL/);
      await expect(store.read()).rejects.toThrow(/KV_REST_API_URL/);
    } finally {
      vi.unstubAllEnvs();
      resetJoinStoreForTests();
    }
  });

  it("turns an unavailable store into a 500 and no total, not a crash", async () => {
    const store = createUnavailableJoinStore();

    const read = await readJoinTotal(store);
    expect(read.status).toBe(500);
    const readBody = (await read.json()) as { error?: unknown; total?: unknown };
    expect(typeof readBody.error).toBe("string");
    expect(readBody.total).toBeUndefined();

    const write = await recordJoin(store);
    expect(write.status).toBe(500);
    const writeBody = (await write.json()) as { error?: unknown; total?: unknown };
    expect(typeof writeBody.error).toBe("string");
    expect(writeBody.total).toBeUndefined();
  });

  it("prefers the marketplace pair but accepts a direct Upstash one", () => {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    process.env.UPSTASH_REDIS_REST_URL = "https://direct.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    try {
      expect(isDurableJoinStoreConfigured()).toBe(true);
    } finally {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
    }
  });

  it("treats a half-configured environment as unconfigured", () => {
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    process.env.KV_REST_API_URL = "https://kv.example.com";
    try {
      expect(isDurableJoinStoreConfigured()).toBe(false);
    } finally {
      delete process.env.KV_REST_API_URL;
    }
  });

  it("binds the durable store when the environment provides one", () => {
    process.env.KV_REST_API_URL = "https://kv.example.com";
    process.env.KV_REST_API_TOKEN = "token";
    try {
      expect(isDurableJoinStoreConfigured()).toBe(true);
    } finally {
      delete process.env.KV_REST_API_URL;
      delete process.env.KV_REST_API_TOKEN;
    }
  });
});
