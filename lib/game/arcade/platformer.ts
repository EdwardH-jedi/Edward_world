import { clamp, type MinigameInput } from "@/lib/game/minigames/types";

/**
 * One segment of Edward's Career Quest, rebuilt small.
 *
 * The original is an HTML5 Canvas platformer where the collectibles are
 * commits, the lives are cups of coffee and the flag is a graduate offer. This
 * is a portfolio-sized slice of it: move, jump, get past two bugs and a couple
 * of gaps, reach the offer. Roughly twenty seconds if you know the way.
 *
 * Pure and deterministic — no rAF, no DOM, no canvas. Original geometry and
 * original wording throughout; nothing here is borrowed from anyone's assets.
 */

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface Hazard extends Box {
  readonly id: string;
  /** Patrol bounds. */
  readonly from: number;
  readonly to: number;
  readonly speed: number;
  readonly label: string;
  /** What the ticket says once it is closed. */
  readonly closed: string;
}

export interface Pickup extends Box {
  readonly id: string;
  readonly kind: "COMMIT" | "SKILL";
  readonly label: string;
}

export const LEVEL_WIDTH = 2_040;
export const LEVEL_HEIGHT = 360;
/** Below this the player has fallen out of the level. */
const FALL_LIMIT = LEVEL_HEIGHT + 40;

export const PLAYER_SIZE = { width: 26, height: 34 } as const;

const GRAVITY = 1_750;
const RUN_SPEED = 225;
const JUMP_VELOCITY = -575;
/**
 * Fastest the player may still be rising once the button is released.
 *
 * A clamp rather than a multiplier: multiplying every frame compounds, so a
 * jump that is not held for its whole rise collapses to nothing instead of
 * merely being shorter. A tap clears a bug; a hold clears the gaps.
 */
const RELEASED_RISE = -315;
/** The little hop back up after landing on a bug. */
const STOMP_BOUNCE = -330;
const MAX_FALL = 900;

export const STARTING_COFFEES = 3;

/** Solid ground. The gaps between these are the pits. */
export const PLATFORMS: readonly Box[] = [
  { x: 0, y: 300, width: 480, height: 60 },
  { x: 400, y: 218, width: 96, height: 16 },
  { x: 584, y: 300, width: 420, height: 60 },
  { x: 760, y: 196, width: 104, height: 16 },
  { x: 1_108, y: 300, width: 420, height: 60 },
  { x: 1_250, y: 214, width: 96, height: 16 },
  { x: 1_600, y: 236, width: 88, height: 16 },
  { x: 1_632, y: 300, width: 408, height: 60 },
];

export const HAZARDS: readonly Hazard[] = [
  {
    id: "api-bug",
    x: 250,
    y: 274,
    width: 24,
    height: 26,
    from: 190,
    to: 390,
    speed: 62,
    label: "API BUG",
    closed: "BUG-014 CLOSED · CANNOT REPRODUCE",
  },
  {
    id: "null-ghost",
    x: 700,
    y: 274,
    width: 24,
    height: 26,
    from: 640,
    to: 950,
    speed: 78,
    label: "NULL",
    closed: "NULL HANDLED · GUARD ADDED",
  },
  {
    id: "rogue-container",
    x: 1_300,
    y: 274,
    width: 26,
    height: 26,
    from: 1_180,
    to: 1_480,
    speed: 92,
    label: "CONTAINER",
    closed: "CONTAINER STOPPED · EXIT 0",
  },
];

export const PICKUPS: readonly Pickup[] = [
  { id: "c1", kind: "COMMIT", x: 300, y: 250, width: 14, height: 14, label: "COMMIT" },
  { id: "c2", kind: "COMMIT", x: 432, y: 180, width: 14, height: 14, label: "COMMIT" },
  { id: "s1", kind: "SKILL", x: 792, y: 158, width: 20, height: 20, label: "PYTHON" },
  { id: "c3", kind: "COMMIT", x: 880, y: 250, width: 14, height: 14, label: "COMMIT" },
  { id: "c4", kind: "COMMIT", x: 1_282, y: 176, width: 14, height: 14, label: "COMMIT" },
  { id: "s2", kind: "SKILL", x: 1_630, y: 198, width: 20, height: 20, label: "DOCKER" },
  { id: "c5", kind: "COMMIT", x: 1_800, y: 250, width: 14, height: 14, label: "COMMIT" },
];

export const FLAG: Box = { x: 1_940, y: 200, width: 10, height: 100 };

/** Where the player returns to after losing a coffee. */
const CHECKPOINTS: readonly number[] = [40, 614, 1_138, 1_662];

export type PlatformerPhase = "READY" | "RUNNING" | "FINISHED" | "FAILED";

export interface PlatformerState {
  readonly phase: PlatformerPhase;
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly grounded: boolean;
  readonly facing: "left" | "right";
  readonly coffees: number;
  readonly commits: number;
  readonly skills: readonly string[];
  readonly collected: readonly string[];
  /** Bugs closed this run. They stay closed. */
  readonly defeated: readonly string[];
  readonly elapsed: number;
  /** Set for a moment after a hit, so the view can react. */
  readonly justHit: boolean;
  readonly banner: string | null;
}

export function createPlatformerState(): PlatformerState {
  return {
    phase: "READY",
    x: CHECKPOINTS[0],
    y: 300 - PLAYER_SIZE.height,
    vx: 0,
    vy: 0,
    grounded: true,
    facing: "right",
    coffees: STARTING_COFFEES,
    commits: 0,
    skills: [],
    collected: [],
    defeated: [],
    elapsed: 0,
    justHit: false,
    banner: null,
  };
}

function overlaps(a: Box, b: Box) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/** Where a hazard is at a given moment. Deterministic ping-pong patrol. */
export function hazardAt(hazard: Hazard, elapsed: number): Box {
  const span = hazard.to - hazard.from;
  if (span <= 0) return hazard;
  const cycle = (span * 2) / hazard.speed;
  const t = (elapsed % cycle) / cycle;
  const offset = t < 0.5 ? t * 2 * span : (1 - t) * 2 * span;
  return { ...hazard, x: hazard.from + offset };
}

function lastCheckpointBefore(x: number) {
  let checkpoint = CHECKPOINTS[0];
  for (const candidate of CHECKPOINTS) {
    if (candidate <= x) checkpoint = candidate;
  }
  return checkpoint;
}

function respawn(state: PlatformerState): PlatformerState {
  const coffees = state.coffees - 1;
  const checkpoint = lastCheckpointBefore(state.x);
  return {
    ...state,
    phase: coffees <= 0 ? "FAILED" : state.phase,
    coffees: Math.max(0, coffees),
    x: checkpoint,
    y: 300 - PLAYER_SIZE.height,
    vx: 0,
    vy: 0,
    grounded: true,
    justHit: true,
    banner: coffees <= 0 ? "OUT OF COFFEE" : "RESPAWNED",
  };
}

export function advancePlatformer(
  state: PlatformerState,
  input: MinigameInput,
  dt: number,
): PlatformerState {
  if (state.phase === "FINISHED" || state.phase === "FAILED") return state;

  if (state.phase === "READY") {
    const moving = input.left || input.right || input.up || input.action;
    if (!moving) return state;
    return advancePlatformer({ ...state, phase: "RUNNING" }, input, dt);
  }

  const elapsed = state.elapsed + dt;

  // Horizontal intent is immediate; this is a platformer, not a vehicle.
  const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const vx = direction * RUN_SPEED;
  const facing = direction === 0 ? state.facing : direction > 0 ? "right" : "left";

  let vy = state.vy;
  const holdingJump = input.action || input.up;
  if (state.grounded && (input.pressed || input.up)) {
    vy = JUMP_VELOCITY;
  } else if (vy < RELEASED_RISE && !holdingJump) {
    // Let go early and the jump is shorter. Holding gets the full height.
    vy = RELEASED_RISE;
  }
  vy = Math.min(vy + GRAVITY * dt, MAX_FALL);

  let x = clamp(state.x + vx * dt, 0, LEVEL_WIDTH - PLAYER_SIZE.width);
  let y = state.y + vy * dt;
  let grounded = false;

  // Land on any platform the player is crossing downward through.
  for (const platform of PLATFORMS) {
    const body = { x, y, width: PLAYER_SIZE.width, height: PLAYER_SIZE.height };
    if (!overlaps(body, platform)) continue;

    const previousBottom = state.y + PLAYER_SIZE.height;
    if (vy >= 0 && previousBottom <= platform.y + 2) {
      y = platform.y - PLAYER_SIZE.height;
      vy = 0;
      grounded = true;
    } else if (vy < 0 && state.y >= platform.y + platform.height - 2) {
      // Hit it from below: stop dead, the way a head-bump should feel.
      y = platform.y + platform.height;
      vy = 0;
    } else {
      // Side contact: refuse the horizontal move rather than tunnelling.
      x = state.x;
    }
  }

  let next: PlatformerState = {
    ...state,
    phase: "RUNNING",
    x,
    y,
    vx,
    vy,
    grounded,
    facing,
    elapsed,
    justHit: false,
    banner: state.banner,
  };

  const body = { x, y, width: PLAYER_SIZE.width, height: PLAYER_SIZE.height };

  // Pickups.
  for (const pickup of PICKUPS) {
    if (next.collected.includes(pickup.id)) continue;
    if (!overlaps(body, pickup)) continue;
    next = {
      ...next,
      collected: [...next.collected, pickup.id],
      commits: next.commits + (pickup.kind === "COMMIT" ? 1 : 0),
      skills:
        pickup.kind === "SKILL" ? [...next.skills, pickup.label] : next.skills,
      banner: pickup.kind === "SKILL" ? `SKILL UNLOCKED · ${pickup.label}` : next.banner,
    };
  }

  // The flag: the graduate offer.
  if (overlaps(body, FLAG)) {
    return { ...next, phase: "FINISHED", banner: "OFFER EXTENDED", vx: 0, vy: 0 };
  }

  // Fell out of the level.
  if (y > FALL_LIMIT) return respawn(next);

  // Bugs. Landing on one from above closes it, the way the original does;
  // walking into one does not.
  for (const hazard of HAZARDS) {
    if (next.defeated.includes(hazard.id)) continue;
    const at = hazardAt(hazard, elapsed);
    if (!overlaps(body, at)) continue;

    const wasAbove = state.y + PLAYER_SIZE.height <= at.y + 6;
    if (vy > 0 && wasAbove) {
      return {
        ...next,
        y: at.y - PLAYER_SIZE.height,
        vy: STOMP_BOUNCE,
        grounded: false,
        defeated: [...next.defeated, hazard.id],
        banner: hazard.closed,
      };
    }

    return respawn(next);
  }

  return next;
}

export function getRunSummary(state: PlatformerState) {
  return {
    finished: state.phase === "FINISHED",
    bugsClosed: state.defeated.length,
    totalBugs: HAZARDS.length,
    commits: state.commits,
    totalCommits: PICKUPS.filter((pickup) => pickup.kind === "COMMIT").length,
    skills: state.skills,
    coffees: state.coffees,
    seconds: state.elapsed,
  };
}
