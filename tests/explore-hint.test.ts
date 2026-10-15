import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The claim is latched per page load, so each test loads a fresh module.
async function freshHint(storage: Partial<Storage>) {
  vi.resetModules();
  vi.stubGlobal("window", { localStorage: storage });
  return import("@/lib/storage/explore-hint");
}

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => vi.unstubAllGlobals());

describe("the first-visit EXPLORE hint", () => {
  it("shows once, then remembers so a returning visitor does not see it", async () => {
    const store = new Map<string, string>();
    const storage: Partial<Storage> = {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => void store.set(key, value),
    };

    const first = await freshHint(storage);
    expect(first.claimExploreHint()).toBe(true);
    // Latched: every render in this page load agrees, even after the write.
    expect(first.claimExploreHint()).toBe(true);
    expect(store.has(first.EXPLORE_HINT_KEY)).toBe(true);

    const returning = await freshHint(storage);
    expect(returning.claimExploreHint()).toBe(false);
  });

  it("still shows, and does not throw, when storage is blocked", async () => {
    const blocked = await freshHint({
      getItem: () => {
        throw new Error("blocked");
      },
    });
    expect(blocked.claimExploreHint()).toBe(true);
  });
});
