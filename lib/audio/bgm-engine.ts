"use client";

import {
  bakeLoopCrossfade,
  BGM_LOOP,
  BGM_MUTE_EVENT,
  BGM_SRC,
  BGM_TIMING,
  readMutePreference,
  rampMsFor,
  resolveBgmState,
  targetVolume,
  writeMutePreference,
  type BgmState,
  type BgmSurface,
} from "@/lib/audio/bgm";

/**
 * The world's one audio owner.
 *
 * Deliberately not React state. `/resume` and `/case-studies/*` are real
 * routes, so the component tree under them is torn down and rebuilt on every
 * visit — anything that owned the music from inside that tree would restart it.
 *
 * It is not module state either, which is the part that is easy to get wrong.
 * The root layout and the page are separate client entry points, so a module
 * scoped `let` can be *instantiated twice*: the control unlocks one copy while
 * the world starts the other, and the music never plays. The mutable state
 * therefore lives on a `Symbol.for` key on `globalThis`, which is the one
 * namespace every copy of this module genuinely shares.
 *
 * Nothing here throws. Audio is the first thing a browser refuses and the last
 * thing that should be able to take the world down with it, so every call into
 * the platform is wrapped and failure resolves to the ERROR state, which the
 * control renders as unavailable and the world ignores entirely.
 */

interface Snapshot {
  readonly state: BgmState;
  readonly muted: boolean;
}

interface Engine {
  context: AudioContext | null;
  master: GainNode | null;
  source: AudioBufferSourceNode | null;
  buffer: AudioBuffer | null;
  decoding: Promise<AudioBuffer | null> | null;
  unlocked: boolean;
  started: boolean;
  failed: boolean;
  muted: boolean;
  hydrated: boolean;
  /** The world has been entered, so music is wanted as soon as it is allowed. */
  armed: boolean;
  surface: BgmSurface;
  entryTimer: number;
  listeners: Set<() => void>;
  snapshot: Snapshot;
}

const ENGINE_KEY = Symbol.for("edwards-world.bgm-engine");
const SERVER_SNAPSHOT: Snapshot = { state: "LOCKED", muted: false };

function fresh(): Engine {
  return {
    context: null,
    master: null,
    source: null,
    buffer: null,
    decoding: null,
    unlocked: false,
    started: false,
    failed: false,
    muted: false,
    hydrated: false,
    armed: false,
    surface: "world",
    entryTimer: 0,
    listeners: new Set(),
    snapshot: SERVER_SNAPSHOT,
  };
}

function engine(): Engine {
  const host = globalThis as unknown as Record<symbol, Engine | undefined>;
  return (host[ENGINE_KEY] ??= fresh());
}

function publish() {
  const e = engine();
  const state = resolveBgmState({
    unlocked: e.unlocked,
    started: e.started,
    muted: e.muted,
    failed: e.failed,
    surface: e.surface,
  });
  // useSyncExternalStore compares by identity, so a new object only when the
  // answer actually changed.
  if (state === e.snapshot.state && e.muted === e.snapshot.muted) return;
  e.snapshot = { state, muted: e.muted };
  for (const listener of e.listeners) listener();
}

export function subscribeBgm(listener: () => void) {
  const e = engine();
  e.listeners.add(listener);
  return () => {
    e.listeners.delete(listener);
  };
}

export function getBgmSnapshot(): Snapshot {
  return engine().snapshot;
}

export function getBgmServerSnapshot(): Snapshot {
  return SERVER_SNAPSHOT;
}

/** Reads the stored preference once, the first time anything asks. */
function hydrate() {
  const e = engine();
  if (e.hydrated) return;
  e.hydrated = true;
  e.muted = readMutePreference();
  publish();
}

function ramp(to: number, ms: number) {
  const e = engine();
  if (!e.master || !e.context) return;
  const now = e.context.currentTime;
  const gain = e.master.gain;
  try {
    // Cancelling to the value it holds right now is what stops a rapid series
    // of ducks from stacking ramps and audibly stepping on each other.
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(to, now + ms / 1_000);
  } catch {
    /* A refused ramp is not worth a broken world. */
  }
}

async function load(ctx: AudioContext) {
  const e = engine();
  if (e.buffer) return e.buffer;
  if (e.decoding) return e.decoding;

  e.decoding = (async () => {
    try {
      const response = await fetch(BGM_SRC);
      if (!response.ok) throw new Error(`BGM ${response.status}`);
      const decoded = await ctx.decodeAudioData(await response.arrayBuffer());

      // The crossfade is baked once, here, against the rate the context
      // actually decoded to — `decodeAudioData` resamples to the hardware rate,
      // so the file's own 48kHz is not something to compute indices from.
      const channels: Float32Array[] = [];
      for (let i = 0; i < decoded.numberOfChannels; i += 1) {
        channels.push(decoded.getChannelData(i));
      }
      const baked = bakeLoopCrossfade(channels, decoded.sampleRate);
      const out = ctx.createBuffer(
        decoded.numberOfChannels,
        baked[0].length,
        decoded.sampleRate,
      );
      for (let i = 0; i < baked.length; i += 1) out.copyToChannel(baked[i], i);

      e.buffer = out;
      return out;
    } catch {
      e.failed = true;
      publish();
      return null;
    }
  })();

  return e.decoding;
}

/**
 * Called from inside a real click or keypress, and only from there.
 *
 * Creating and resuming the context while the gesture is still on the stack is
 * what satisfies Safari, which has historically wanted the resume inside the
 * handler rather than merely after one. Decoding starts here too, so the music
 * is ready by the time the visitor has finished the name gate.
 */
export function unlockBgm() {
  hydrate();
  const e = engine();
  if (e.failed) return;
  if (e.unlocked) {
    resumeBgmIfInterrupted();
    return;
  }

  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) throw new Error("no AudioContext");

    const ctx = (e.context ??= new Ctor());
    if (!e.master) {
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(ctx.destination);
      e.master = gain;
    }

    void ctx.resume().catch(() => {});
    e.unlocked = true;
    publish();
    // Warm the track so it is decoded by the time the name gate is done — but
    // not for a visitor who has already said no. 2.3MB is not a rounding error
    // on a phone, and a mute is a standing answer, not a temporary one.
    if (!e.muted) void load(ctx);

    // A gesture that arrives after the world did — the visitor who skipped
    // straight in and only then touched the page — still gets its music.
    if (e.armed && !e.started && !e.muted) startBgm(e.surface);
  } catch {
    e.failed = true;
    publish();
  }
}

/**
 * Starts the music, once, however many times it is asked.
 *
 * The `started` latch is the whole duplicate-playback defence: React will call
 * this again on every re-render of the world and twice over in StrictMode, and
 * a second source node would be a second copy of the song playing over the
 * first.
 */
export function startBgm(next: BgmSurface = "world") {
  hydrate();
  const e = engine();
  e.surface = next;
  e.armed = true;
  // Muted is a real answer, not a reason to buffer a source node nobody will
  // hear: nothing is created until the visitor asks for sound.
  if (!e.unlocked || e.started || e.failed || e.muted) {
    publish();
    return;
  }
  e.started = true;
  publish();

  void (async () => {
    const ctx = e.context;
    if (!ctx) return;
    const audio = await load(ctx);
    if (!audio || !e.master) {
      e.started = false;
      publish();
      return;
    }

    try {
      const node = ctx.createBufferSource();
      node.buffer = audio;
      node.loop = true;
      node.loopStart = BGM_LOOP.START;
      node.loopEnd = BGM_LOOP.END;
      node.connect(e.master);
      e.source = node;

      // The world reveal gets its opening beat alone; the piano then arrives
      // under it rather than on top of it.
      e.master.gain.setValueAtTime(0, ctx.currentTime);
      node.start();
      e.entryTimer = window.setTimeout(() => {
        ramp(targetVolume(e.surface, e.muted), BGM_TIMING.FADE_IN_MS);
      }, BGM_TIMING.ENTRY_DELAY_MS);
    } catch {
      e.failed = true;
      e.started = false;
      publish();
    }
  })();
}

/**
 * Moves the music to whatever the visitor is now looking at.
 *
 * A duck is a gain ramp and nothing else — the source node is never stopped,
 * restarted or re-created, so entering a project and leaving it again lands
 * back in the same bar of the same loop the world was already playing.
 */
export function setBgmSurface(next: BgmSurface) {
  const e = engine();
  if (next === e.surface) return;
  const previous = e.surface;
  e.surface = next;
  if (e.started) {
    ramp(targetVolume(next, e.muted), rampMsFor(previous, next, e.muted));
  }
  publish();
}

export function setBgmMuted(next: boolean) {
  hydrate();
  const e = engine();
  if (next === e.muted) return;
  e.muted = next;
  writeMutePreference(next);

  // Un-muting is a legitimate way to begin, but only once the world has asked
  // for music — the toggle on the title screen sets a preference, it does not
  // start the song early.
  if (!e.started && !next && e.armed && e.unlocked) startBgm(e.surface);
  else if (e.started) ramp(targetVolume(e.surface, e.muted), BGM_TIMING.MUTE_MS);
  publish();
}

export function toggleBgmMuted() {
  hydrate();
  setBgmMuted(!engine().muted);
}

/**
 * iOS suspends the context when the phone is locked or a call arrives, and
 * hands it back in a state that only a gesture can resume. Returning to the tab
 * is not itself a gesture, so this asks politely and lets the next real one
 * finish the job if it is refused.
 */
export function resumeBgmIfInterrupted() {
  const e = engine();
  if (!e.context || !e.unlocked || e.failed) return;
  if (e.context.state === "running") return;
  void e.context.resume().catch(() => {});
}

/** Test seam. Not called by the app; the world never tears the music down. */
export function __resetBgmForTests() {
  const e = engine();
  try {
    window.clearTimeout?.(e.entryTimer);
    e.source?.stop();
  } catch {
    /* nothing worth cleaning up */
  }
  const host = globalThis as unknown as Record<symbol, Engine | undefined>;
  host[ENGINE_KEY] = fresh();
}

export { BGM_MUTE_EVENT };
