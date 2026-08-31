import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getJoinTotal,
  recordJoinOnce,
  resetJoinClientForTests,
  subscribeToJoinTotal,
} from "@/lib/joins/client";
import { formatJoinLine, formatOrdinal } from "@/lib/joins/ordinal";
import {
  createRestJoinStore,
  getJoinStore,
  isDurableJoinStoreConfigured,
  JOIN_KEY,
  resetJoinStoreForTests,
} from "@/lib/joins/store";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

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

  it("falls back to the in-memory counter when nothing is provisioned", async () => {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    expect(isDurableJoinStoreConfigured()).toBe(false);
    const store = getJoinStore();
    expect(await store.increment()).toBe(1);
    expect(await store.increment()).toBe(2);
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
