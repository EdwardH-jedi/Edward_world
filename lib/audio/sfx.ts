import { getSfxContext } from "@/lib/audio/bgm-engine";

/**
 * The world's sound effects, synthesized so there is nothing to download.
 *
 * Like `bgm`, the decisions are plain data and functions that need no
 * AudioContext (`sfxPlan`); `play` at the bottom is the only part that touches
 * the platform, and it never throws.
 */

export type SfxName = "footstep" | "door" | "ui-blip" | "enter";

export interface SfxVoice {
  /** Seconds after the effect starts. */
  readonly at: number;
  readonly duration: number;
  readonly kind: "square" | "triangle" | "noise";
  /** Pitch for a tone; the low-pass cutoff for noise. */
  readonly freq: number;
  readonly gain: number;
}

/** Effects sit well under the music's 0.22 world level. */
export const SFX_MASTER_GAIN = 0.5;

const ARPEGGIO = [523.25, 659.25, 783.99] as const; // C5 E5 G5

/** What to sound, as data. `variant` alternates footsteps; others ignore it. */
export function sfxPlan(name: SfxName, variant = 0): readonly SfxVoice[] {
  switch (name) {
    case "footstep":
      return [
        {
          at: 0,
          duration: 0.05,
          kind: "noise",
          freq: variant % 2 === 0 ? 900 : 600,
          gain: 0.22,
        },
      ];
    case "door":
      return [
        { at: 0, duration: 0.09, kind: "triangle", freq: 196, gain: 0.3 },
        { at: 0.09, duration: 0.16, kind: "triangle", freq: 130.81, gain: 0.3 },
      ];
    case "ui-blip":
      return [{ at: 0, duration: 0.06, kind: "square", freq: 880, gain: 0.12 }];
    case "enter":
      return ARPEGGIO.map((freq, index) => ({
        at: index * 0.07,
        duration: 0.07,
        kind: "square" as const,
        freq,
        gain: 0.12,
      }));
  }
}

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();
let footstepCount = 0;

function noiseBuffer(ctx: AudioContext) {
  let buffer = noiseBuffers.get(ctx);
  if (!buffer) {
    buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.1), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    noiseBuffers.set(ctx, buffer);
  }
  return buffer;
}

export function play(name: SfxName) {
  try {
    const ctx = getSfxContext();
    if (!ctx) return;
    const variant = name === "footstep" ? footstepCount++ : 0;
    const start = ctx.currentTime;

    for (const voice of sfxPlan(name, variant)) {
      const t = start + voice.at;
      const end = t + voice.duration;
      const amp = ctx.createGain();
      amp.gain.setValueAtTime(0.0001, t);
      amp.gain.linearRampToValueAtTime(voice.gain * SFX_MASTER_GAIN, t + 0.004);
      amp.gain.exponentialRampToValueAtTime(0.0001, end);
      amp.connect(ctx.destination);

      if (voice.kind === "noise") {
        const source = ctx.createBufferSource();
        source.buffer = noiseBuffer(ctx);
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = voice.freq;
        source.connect(filter).connect(amp);
        source.start(t);
        source.stop(end);
      } else {
        const osc = ctx.createOscillator();
        osc.type = voice.kind;
        osc.frequency.value = voice.freq;
        osc.connect(amp);
        osc.start(t);
        osc.stop(end);
      }
    }
  } catch {
    /* A refused sound effect is never worth a broken world. */
  }
}
