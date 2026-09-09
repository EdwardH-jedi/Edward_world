import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SURFACE_VOLUME } from "@/lib/audio/bgm";
import {
  __resetBgmForTests,
  getBgmSnapshot,
  resumeBgmIfInterrupted,
  setBgmMuted,
  setBgmSurface,
  startBgm,
  unlockBgm,
} from "@/lib/audio/bgm-engine";

/**
 * A Web Audio stand-in.
 *
 * Deliberately not a mock of the real thing's behaviour — only of its shape.
 * Everything asserted below is about what the engine *does* (how many sources
 * it creates, what gain it asks for, whether it survives a refusal), none of
 * which depends on audio actually being rendered. Nothing here waits on a
 * clock, so it cannot be the flaky test in someone's CI run.
 */
const started: FakeSource[] = [];
let gains: FakeGain[] = [];
let contexts: FakeContext[] = [];

class FakeGain {
  gain = {
    value: 0,
    cancelScheduledValues: () => {},
    setValueAtTime: (value: number) => {
      this.gain.value = value;
    },
    linearRampToValueAtTime: (value: number) => {
      // The engine's ramps are the only thing that sets volume, so recording
      // the destination is enough to assert duck and restore.
      this.gain.value = value;
    },
  };
  connect() {}
}

class FakeSource {
  buffer: unknown = null;
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  connect() {}
  start() {
    started.push(this);
  }
  stop() {}
}

class FakeContext {
  currentTime = 0;
  state = "running";
  destination = {};
  constructor() {
    contexts.push(this);
  }
  createGain() {
    const gain = new FakeGain();
    gains.push(gain);
    return gain;
  }
  createBufferSource() {
    return new FakeSource();
  }
  createBuffer(channels: number, length: number) {
    return {
      numberOfChannels: channels,
      length,
      sampleRate: 48_000,
      copyToChannel: () => {},
    };
  }
  decodeAudioData() {
    return Promise.resolve({
      numberOfChannels: 2,
      sampleRate: 48_000,
      length: 48_000 * 97,
      getChannelData: () => new Float32Array(48_000 * 97),
    });
  }
  resume = vi.fn(() => {
    this.state = "running";
    return Promise.resolve();
  });
}

const flush = async () => {
  for (let i = 0; i < 6; i += 1) await Promise.resolve();
};

function install(fetchImpl: typeof fetch) {
  started.length = 0;
  gains = [];
  contexts = [];
  const store = new Map<string, string>();
  vi.stubGlobal("window", {
    AudioContext: FakeContext,
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    },
    dispatchEvent: () => true,
    setTimeout: (fn: () => void) => {
      // The entry delay is a presentation beat, not behaviour under test:
      // running it immediately keeps the assertions about gain, not timing.
      fn();
      return 1;
    },
    clearTimeout: () => {},
  });
  vi.stubGlobal("fetch", fetchImpl);
}

let fetches = 0;
const okFetch = (() => {
  fetches += 1;
  return Promise.resolve({
    ok: true,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  });
}) as unknown as typeof fetch;

describe("bgm engine", () => {
  beforeEach(() => {
    fetches = 0;
    install(okFetch);
  });

  afterEach(() => {
    __resetBgmForTests();
    vi.unstubAllGlobals();
  });

  it("does not make a sound before a gesture", async () => {
    startBgm("world");
    await flush();
    expect(started).toHaveLength(0);
    expect(getBgmSnapshot().state).toBe("LOCKED");
  });

  it("plays exactly one copy of the song, however often it is asked", async () => {
    unlockBgm();
    startBgm("world");
    startBgm("world");
    await flush();
    startBgm("world");
    await flush();

    // This is the duplicate-playback guarantee: React re-renders the world on
    // every frame of movement, and StrictMode mounts the effect twice.
    expect(started).toHaveLength(1);
    expect(getBgmSnapshot().state).toBe("PLAYING");
  });

  it("loops the body rather than the whole track", async () => {
    unlockBgm();
    startBgm("world");
    await flush();
    const [source] = started;
    expect(source.loop).toBe(true);
    expect(source.loopStart).toBeGreaterThan(0);
    expect(source.loopEnd).toBeGreaterThan(source.loopStart);
  });

  it("retries an interrupted context on the next gesture without restarting music", async () => {
    unlockBgm();
    startBgm("world");
    await flush();
    const [context] = contexts;
    const [source] = started;
    context.state = "suspended";
    context.resume.mockRejectedValueOnce(new Error("gesture required"));

    resumeBgmIfInterrupted();
    await flush();
    expect(context.state).toBe("suspended");

    unlockBgm();
    await flush();
    expect(context.state).toBe("running");
    expect(context.resume).toHaveBeenCalledTimes(3);
    expect(started).toEqual([source]);
    expect(contexts).toHaveLength(1);
    expect(fetches).toBe(1);
  });

  it("preserves mute when a gesture resumes interrupted playback", async () => {
    unlockBgm();
    startBgm("world");
    await flush();
    setBgmMuted(true);
    contexts[0].state = "suspended";

    unlockBgm();
    await flush();
    expect(contexts[0].state).toBe("running");
    expect(getBgmSnapshot().muted).toBe(true);
    expect(gains[0].gain.value).toBe(0);
    expect(started).toHaveLength(1);
  });

  it("does not resume an already running context for subsequent gestures", async () => {
    unlockBgm();
    await flush();
    unlockBgm();
    unlockBgm();
    expect(contexts[0].resume).toHaveBeenCalledTimes(1);
  });

  it("ducks and restores by gain, without restarting the track", async () => {
    unlockBgm();
    startBgm("world");
    await flush();
    const master = gains[0];
    expect(master.gain.value).toBeCloseTo(SURFACE_VOLUME.world);

    setBgmSurface("project");
    expect(master.gain.value).toBeCloseTo(SURFACE_VOLUME.project);
    expect(getBgmSnapshot().state).toBe("DUCKED");

    setBgmSurface("world");
    expect(master.gain.value).toBeCloseTo(SURFACE_VOLUME.world);
    expect(getBgmSnapshot().state).toBe("PLAYING");
    // One source, start to finish — the duck never tore anything down.
    expect(started).toHaveLength(1);
  });

  it("honours a mute, and starts nothing while muted", async () => {
    setBgmMuted(true);
    unlockBgm();
    startBgm("world");
    await flush();
    expect(started).toHaveLength(0);
    expect(getBgmSnapshot().state).toBe("MUTED");

    setBgmMuted(false);
    await flush();
    expect(started).toHaveLength(1);
    expect(getBgmSnapshot().state).toBe("PLAYING");
  });

  it("survives a track that will not load, and says so", async () => {
    install((() => Promise.reject(new Error("offline"))) as unknown as typeof fetch);
    unlockBgm();
    startBgm("world");
    await flush();
    expect(started).toHaveLength(0);
    expect(getBgmSnapshot().state).toBe("ERROR");
  });

  it("downloads nothing for a visitor who has already said no", async () => {
    setBgmMuted(true);
    unlockBgm();
    await flush();
    // 2.3MB is not a rounding error on a phone, and a mute is a standing
    // answer. The track is fetched when they change their mind, not before.
    expect(fetches).toBe(0);

    setBgmMuted(false);
    startBgm("world");
    await flush();
    expect(fetches).toBe(1);
    expect(started).toHaveLength(1);
  });

  it("keeps one engine even when the module is instantiated twice", async () => {
    // The root layout and the page are separate client entry points, so this
    // module can genuinely be evaluated twice. The state lives on globalThis
    // precisely so the copy that unlocks and the copy that starts are the same
    // engine; without this the control unlocks one and the world starts the
    // other, and nothing ever plays.
    unlockBgm();
    const shared = (globalThis as Record<symbol, unknown>)[
      Symbol.for("edwards-world.bgm-engine")
    ];
    expect(shared).toBeDefined();
    startBgm("world");
    await flush();
    expect(started).toHaveLength(1);
  });

  it("survives a browser with no Web Audio at all", async () => {
    vi.stubGlobal("window", { localStorage: undefined });
    unlockBgm();
    startBgm("world");
    await flush();
    expect(getBgmSnapshot().state).toBe("ERROR");
  });
});
