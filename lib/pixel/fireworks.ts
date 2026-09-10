/**
 * A finite pixel firework, as pure state and one step function.
 *
 * Pure so the choreography is testable without a canvas: how many bursts there
 * are, that it ends, that it never runs past its own length. The component
 * owns the canvas and the animation frame; everything about *what happens* is
 * here.
 *
 * Deliberately small and deliberately over in a few seconds. This is a wave
 * goodbye at the end of a visit, not a display: no full-screen flashing, no
 * screen shake, no sound, and a fixed number of bursts rather than a loop that
 * keeps going until someone closes it.
 */

/** Sparks in one burst. Enough to read as a shell, few enough to stay pixels. */
const SPARKS_PER_BURST = 22;
/** Seconds a single burst takes to fade out. */
const BURST_LIFE = 1.5;
/** Art-space gravity, in units per second squared. */
const GRAVITY = 26;
/** Drag, as the fraction of velocity kept each second. */
const DRAG = 0.42;

export interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Seconds lived. A spark is gone at `BURST_LIFE`. */
  age: number;
  colorIndex: number;
}

export interface Burst {
  readonly at: number;
  readonly x: number;
  readonly y: number;
  readonly colorIndex: number;
  launched: boolean;
  sparks: Spark[];
}

export interface FireworksState {
  /** Seconds since the show began. */
  elapsed: number;
  readonly bursts: Burst[];
}

/**
 * When and where each shell opens, as fractions of the art box.
 *
 * Written down rather than random: the simulation stays deterministic, the
 * show is the same every time, and there is no clock or RNG in this module.
 */
const SCHEDULE: readonly { at: number; x: number; y: number }[] = [
  { at: 0.15, x: 0.3, y: 0.34 },
  { at: 0.75, x: 0.66, y: 0.24 },
  { at: 1.35, x: 0.48, y: 0.42 },
  { at: 2.0, x: 0.2, y: 0.28 },
  { at: 2.5, x: 0.78, y: 0.38 },
  { at: 3.1, x: 0.5, y: 0.2 },
];

/** How long the whole show lasts, including the last burst fading out. */
export const FIREWORKS_SECONDS =
  SCHEDULE[SCHEDULE.length - 1].at + BURST_LIFE + 0.2;

export const FIREWORKS_BURSTS = SCHEDULE.length;

/** The palette's warm end. Kept to the approved board, like everything else. */
export const FIREWORK_COLORS = [
  "#C98A52",
  "#F3E3B2",
  "#A9C0B4",
  "#93A8B0",
  "#EFE7D3",
] as const;

export function createFireworks(): FireworksState {
  return {
    elapsed: 0,
    bursts: SCHEDULE.map((entry, index) => ({
      at: entry.at,
      x: entry.x,
      y: entry.y,
      colorIndex: index % FIREWORK_COLORS.length,
      launched: false,
      sparks: [],
    })),
  };
}

/** Opens one shell into a ring of sparks. Even spacing, no randomness. */
function launch(burst: Burst, width: number, height: number) {
  burst.launched = true;
  const speed = Math.min(width, height) * 0.22;
  for (let index = 0; index < SPARKS_PER_BURST; index += 1) {
    const angle = (index / SPARKS_PER_BURST) * Math.PI * 2;
    // Two interleaved rings, so a burst reads as a shell rather than a circle.
    const reach = index % 2 === 0 ? 1 : 0.62;
    burst.sparks.push({
      x: burst.x * width,
      y: burst.y * height,
      vx: Math.cos(angle) * speed * reach,
      vy: Math.sin(angle) * speed * reach,
      age: 0,
      colorIndex: burst.colorIndex,
    });
  }
}

/**
 * Advances the show by `dt` seconds.
 *
 * Returns whether anything is still on screen, so the caller can stop its
 * animation frame rather than run an empty loop for ever.
 */
export function stepFireworks(
  state: FireworksState,
  dt: number,
  width: number,
  height: number,
): boolean {
  state.elapsed += dt;

  for (const burst of state.bursts) {
    if (!burst.launched && state.elapsed >= burst.at) launch(burst, width, height);

    for (const spark of burst.sparks) {
      spark.age += dt;
      spark.vy += GRAVITY * dt;
      const kept = Math.pow(DRAG, dt);
      spark.vx *= kept;
      spark.vy *= kept;
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
    }
    burst.sparks = burst.sparks.filter((spark) => spark.age < BURST_LIFE);
  }

  return state.elapsed < FIREWORKS_SECONDS;
}

/** How bright a spark is now, 0..1. Used as its alpha. */
export function sparkAlpha(spark: Spark) {
  return Math.max(0, 1 - spark.age / BURST_LIFE);
}

/**
 * The still image shown instead of the animation under reduced motion.
 *
 * Every burst, opened at once and held: the same shapes and the same colours,
 * with nothing moving. A visitor who asked for less motion still gets the
 * send-off rather than a blank rectangle.
 */
export function createStillFireworks(width: number, height: number): FireworksState {
  const state = createFireworks();
  for (const burst of state.bursts) {
    launch(burst, width, height);
    for (const spark of burst.sparks) {
      // Frozen part-way out, where a shell looks most like one.
      spark.x += spark.vx * 0.35;
      spark.y += spark.vy * 0.35;
      spark.age = BURST_LIFE * 0.35;
    }
  }
  return state;
}
