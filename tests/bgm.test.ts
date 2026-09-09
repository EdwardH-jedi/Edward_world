import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bakeLoopCrossfade,
  BGM_LOOP,
  BGM_MUTE_KEY,
  BGM_TIMING,
  rampMsFor,
  readMutePreference,
  resolveBgmState,
  SURFACE_VOLUME,
  targetVolume,
  writeMutePreference,
  type BgmConditions,
} from "@/lib/audio/bgm";

const base: BgmConditions = {
  unlocked: true,
  started: true,
  muted: false,
  failed: false,
  surface: "world",
};

describe("bgm state", () => {
  it("plays in the world and ducks everywhere else", () => {
    expect(resolveBgmState(base)).toBe("PLAYING");
    expect(resolveBgmState({ ...base, surface: "house" })).toBe("DUCKED");
    expect(resolveBgmState({ ...base, surface: "project" })).toBe("DUCKED");
    expect(resolveBgmState({ ...base, surface: "case-study" })).toBe("DUCKED");
    expect(resolveBgmState({ ...base, surface: "resume" })).toBe("DUCKED");
  });

  it("is locked before a gesture and ready after one", () => {
    expect(resolveBgmState({ ...base, unlocked: false, started: false })).toBe("LOCKED");
    expect(resolveBgmState({ ...base, started: false })).toBe("READY");
  });

  it("lets the visitor's mute outrank playback, and a failure outrank mute", () => {
    expect(resolveBgmState({ ...base, muted: true })).toBe("MUTED");
    expect(resolveBgmState({ ...base, muted: true, failed: true })).toBe("ERROR");
    // A failure before any gesture still reports as a failure, not as locked.
    expect(resolveBgmState({ ...base, unlocked: false, failed: true })).toBe("ERROR");
  });
});

describe("surface volume", () => {
  it("is loudest in the world and quietest on the documents", () => {
    expect(SURFACE_VOLUME.world).toBeGreaterThan(SURFACE_VOLUME.house);
    expect(SURFACE_VOLUME.house).toBeGreaterThan(SURFACE_VOLUME["case-study"]);
    expect(SURFACE_VOLUME["case-study"]).toBeGreaterThan(SURFACE_VOLUME.resume);
  });

  it("stays inside the bands the pass was briefed with", () => {
    expect(SURFACE_VOLUME.world).toBeGreaterThanOrEqual(0.2);
    expect(SURFACE_VOLUME.world).toBeLessThanOrEqual(0.25);
    expect(SURFACE_VOLUME.house).toBeGreaterThanOrEqual(0.08);
    expect(SURFACE_VOLUME.project).toBeLessThanOrEqual(0.13);
    expect(SURFACE_VOLUME["case-study"]).toBeGreaterThanOrEqual(0.04);
    expect(SURFACE_VOLUME.resume).toBeLessThanOrEqual(0.07);
  });

  it("silences everything when muted, whatever the surface", () => {
    expect(targetVolume("world", true)).toBe(0);
    expect(targetVolume("resume", true)).toBe(0);
    expect(targetVolume("world", false)).toBe(SURFACE_VOLUME.world);
  });

  it("returns to the world's own volume after a duck", () => {
    // The restore is the same lookup as the duck, which is why leaving a
    // project cannot land on a different volume than entering it left.
    expect(targetVolume("world", false)).toBe(SURFACE_VOLUME.world);
    expect(rampMsFor("world", "project", false)).toBe(BGM_TIMING.DUCK_MS);
    expect(rampMsFor("project", "world", false)).toBe(BGM_TIMING.DUCK_MS);
    expect(rampMsFor("world", "world", false)).toBe(BGM_TIMING.MUTE_MS);
    expect(rampMsFor("world", "project", true)).toBe(BGM_TIMING.MUTE_MS);
  });
});

describe("mute preference", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
      },
      dispatchEvent: () => true,
      Event: class {
        constructor(readonly type: string) {}
      },
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("round-trips the visitor's choice", () => {
    expect(readMutePreference()).toBe(false);
    expect(writeMutePreference(true)).toBe(true);
    expect(store.get(BGM_MUTE_KEY)).toBe("true");
    expect(readMutePreference()).toBe(true);
    writeMutePreference(false);
    expect(readMutePreference()).toBe(false);
  });

  it("treats unreadable storage as un-muted rather than guessing silence", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
      },
    });
    expect(readMutePreference()).toBe(false);
    expect(writeMutePreference(true)).toBe(false);
  });

  it("ignores a stored value it did not write", () => {
    store.set(BGM_MUTE_KEY, "yes please");
    expect(readMutePreference()).toBe(false);
  });
});

describe("loop crossfade", () => {
  const RATE = 1_000;
  const loop = { start: 0.2, end: 0.8, crossfade: 0.05 };

  /** A signal whose value is its own index, so joins are trivially visible. */
  const ramp = (length: number) =>
    Float32Array.from({ length }, (_, i) => Math.sin(i / 7));

  it("trims the track to the loop end", () => {
    const [out] = bakeLoopCrossfade([ramp(1_000)], RATE, loop);
    expect(out.length).toBe(800);
  });

  it("makes the wrap continuous, which a plain splice is not", () => {
    const source = ramp(1_000);
    const [baked] = bakeLoopCrossfade([source], RATE, loop);
    const startIndex = Math.round(loop.start * RATE);

    const spliced = Math.abs(source[startIndex] - source[baked.length - 1]);
    const crossfaded = Math.abs(baked[startIndex] - baked[baked.length - 1]);
    expect(crossfaded).toBeLessThan(spliced);

    // And the step across the join is no larger than the music's own
    // sample-to-sample movement, which is the definition of "not a click".
    const neighbourly =
      Math.abs(baked[startIndex + 1] - baked[startIndex]) * 2 + 1e-6;
    expect(crossfaded).toBeLessThanOrEqual(neighbourly);
  });

  it("leaves the material before the crossfade untouched", () => {
    const source = ramp(1_000);
    const [baked] = bakeLoopCrossfade([source], RATE, loop);
    const fade = Math.round(loop.crossfade * RATE);
    for (let i = 0; i < baked.length - fade; i += 37) {
      expect(baked[i]).toBe(source[i]);
    }
  });

  it("bakes every channel, so stereo does not come back mono", () => {
    const out = bakeLoopCrossfade([ramp(1_000), ramp(1_000)], RATE, loop);
    expect(out).toHaveLength(2);
    expect(out[1].length).toBe(800);
  });

  it("hands back audio it cannot safely fade instead of reading off the end", () => {
    const [out] = bakeLoopCrossfade([ramp(40)], RATE, loop);
    expect(out.length).toBe(40);
  });

  it("uses loop points that sit inside the supplied track", () => {
    expect(BGM_LOOP.START).toBeGreaterThan(0);
    expect(BGM_LOOP.END).toBeGreaterThan(BGM_LOOP.START);
    // The supplied master is 97.17s and fades from 94.0s; the loop must close
    // before the fade or every pass would duck on its way round.
    expect(BGM_LOOP.END).toBeLessThan(94);
  });
});
