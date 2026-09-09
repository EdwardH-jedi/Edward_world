/**
 * Everything about the world's music that is a decision rather than a device.
 *
 * The Web Audio plumbing lives in `bgm-engine`; this module holds the numbers,
 * the surface volume policy and the state machine, so all three can be tested
 * without an AudioContext and read without one either.
 */

export const BGM_SRC = "/audio/moss-gate-town.mp3";

/** The supplied track, written for this world. */
export const BGM_TITLE = "Moss Gate Town";

/**
 * Where the piano intro ends and the clarinet body begins, and where that body
 * closes before the breakdown.
 *
 * Both are measured, not guessed. The track runs at 93.75 BPM with a 2.56s bar
 * whose downbeat grid starts at t=0.060s; the structural boundaries detected in
 * the audio land on bars 5, 21, 29 and 36 of that grid. `START` is bar 5 — the
 * end of the piano-and-percussion intro — and `END` is bar 29, where the body
 * gives way to the quiet breakdown. The span between them is 24 bars, six
 * four-bar phrases, so the loop returns on a phrase boundary rather than mid-
 * thought. Of the candidate pairs measured, this one had the best harmonic
 * continuity across the join (0.71 against a 0.51 median for the track's own
 * section changes) at a level step of under 1 dB.
 */
export const BGM_LOOP = {
  /** Seconds. Bar 5: the intro has finished, the melody has not yet begun. */
  START: 12.86,
  /** Seconds. Bar 29: the body closes and the breakdown would begin. */
  END: 74.3,
  /**
   * Seconds of equal-power crossfade baked into the tail of the loop at decode
   * time, so the wrap is not a splice. Without it the join steps 26% of full
   * scale and clicks; with it the step is smaller than the average distance
   * between two adjacent samples of the music itself.
   */
  CROSSFADE: 0.04,
} as const;

/** Fade and duck timings, in milliseconds. */
export const BGM_TIMING = {
  /** The world reveal gets a beat of its own before the music arrives. */
  ENTRY_DELAY_MS: 500,
  /** Soft enough that the piano seems to have been there all along. */
  FADE_IN_MS: 2_000,
  /** Responsive, but not a switch. */
  DUCK_MS: 700,
  /** Muting should feel immediate without clicking. */
  MUTE_MS: 220,
} as const;

/**
 * Which surface the visitor is on. The world is the only one the music is
 * written for; everything else is something being read or played *inside* it,
 * and the music steps back by a documented amount rather than an arbitrary one.
 */
export type BgmSurface = "world" | "house" | "project" | "case-study" | "resume";

export const SURFACE_VOLUME: Readonly<Record<BgmSurface, number>> = {
  world: 0.22,
  house: 0.11,
  project: 0.1,
  "case-study": 0.06,
  resume: 0.05,
};

export type BgmState =
  | "LOCKED"
  | "READY"
  | "PLAYING"
  | "DUCKED"
  | "MUTED"
  | "ERROR";

export interface BgmConditions {
  /** A real user gesture has happened, so audio is allowed to make sound. */
  readonly unlocked: boolean;
  /** A source node is running. */
  readonly started: boolean;
  /** The visitor's own choice, which outranks everything but a failure. */
  readonly muted: boolean;
  /** Loading or playback failed. The world does not care; the badge does. */
  readonly failed: boolean;
  readonly surface: BgmSurface;
}

/**
 * The one place the six states are decided.
 *
 * Order matters and encodes the priorities: a failure is reported even when
 * muted, because the control should not claim to be holding music it does not
 * have; the visitor's mute outranks playback; and nothing is PLAYING before a
 * gesture has unlocked it.
 */
export function resolveBgmState(conditions: BgmConditions): BgmState {
  if (conditions.failed) return "ERROR";
  if (conditions.muted) return "MUTED";
  if (!conditions.unlocked) return "LOCKED";
  if (!conditions.started) return "READY";
  return conditions.surface === "world" ? "PLAYING" : "DUCKED";
}

/** The gain the master node should be ramping toward, right now. */
export function targetVolume(surface: BgmSurface, muted: boolean) {
  return muted ? 0 : SURFACE_VOLUME[surface];
}

/** How long the ramp to `targetVolume` should take, in milliseconds. */
export function rampMsFor(from: BgmSurface, to: BgmSurface, muted: boolean) {
  if (muted) return BGM_TIMING.MUTE_MS;
  return from === to ? BGM_TIMING.MUTE_MS : BGM_TIMING.DUCK_MS;
}

export const BGM_MUTE_KEY = "edwards-world:bgm:muted";

/** Fired after this tab changes the stored preference, so subscribers re-read. */
export const BGM_MUTE_EVENT = "edwards-world:bgm:mute-changed";

/**
 * The stored mute preference.
 *
 * Kept where the Wardrobe keeps its look: on this device, tolerant of storage
 * being missing, blocked, or holding something it did not write. An unreadable
 * preference is not muted — silence is never the safer guess to make on the
 * visitor's behalf when they have not asked for it.
 */
export function readMutePreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(BGM_MUTE_KEY) === "true";
  } catch {
    return false;
  }
}

/** Returns whether the write landed, so the UI can tell the truth about it. */
export function writeMutePreference(muted: boolean): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(BGM_MUTE_KEY, muted ? "true" : "false");
    window.dispatchEvent(new Event(BGM_MUTE_EVENT));
    return true;
  } catch {
    return false;
  }
}

/**
 * Bakes the loop's crossfade into a copy of the decoded audio.
 *
 * Pure array work so it can be tested without an AudioContext: the caller
 * supplies the channels, this returns new ones, trimmed to `end` and with the
 * final `crossfade` seconds faded into the material that precedes `start`.
 * Looping the result from `start` to `end` therefore rejoins the music the way
 * the music already joins itself, instead of cutting to it.
 */
export function bakeLoopCrossfade(
  channels: readonly Float32Array[],
  sampleRate: number,
  loop: { start: number; end: number; crossfade: number } = {
    start: BGM_LOOP.START,
    end: BGM_LOOP.END,
    crossfade: BGM_LOOP.CROSSFADE,
  },
): Float32Array<ArrayBuffer>[] {
  const startIndex = Math.round(loop.start * sampleRate);
  const endIndex = Math.round(loop.end * sampleRate);
  const fade = Math.round(loop.crossfade * sampleRate);

  return channels.map((channel) => {
    // A track shorter than the loop we measured is not this track; hand back
    // what we were given rather than reading off the end of it.
    const usable = Math.min(endIndex, channel.length);
    const out = new Float32Array(usable);
    out.set(channel.subarray(0, usable));
    if (fade <= 0 || startIndex - fade < 0 || usable < fade) return out;

    for (let i = 0; i < fade; i += 1) {
      const t = (i / fade) * (Math.PI / 2);
      out[usable - fade + i] =
        channel[usable - fade + i] * Math.cos(t) +
        channel[startIndex - fade + i] * Math.sin(t);
    }
    return out;
  });
}
