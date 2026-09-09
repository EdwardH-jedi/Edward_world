import {
  clamp,
  type MinigameBase,
  type MinigameInput,
  type SportResult,
} from "@/lib/game/minigames/types";

/**
 * Tennis — a real match against ALEX, first to five.
 *
 * The court is the side-on one the venue already draws: Edward on the left,
 * ALEX on the right, the net between them. Everything below works in that
 * court's own coordinates — `x` is a percentage across the court box and `y` is
 * height above the playing surface in the same units — so the component can
 * position a ball by writing the numbers straight into CSS percentages and the
 * simulation never needs to know how wide the screen is.
 *
 * Two rules shape the whole module. It is pure: `advance(state, input, dt)`
 * returns the next state and touches nothing else. And it is *deterministic* —
 * every wobble in ALEX's game comes from a seed carried in the state, never
 * from `Math.random`, because the playthrough suite plays each sport three
 * times and demands identical results.
 */

/* ── Tuning ──────────────────────────────────────────────────────────────────
   Every number that decides how the match feels lives here, so the person
   deciding whether ALEX is fun to play does it in one block. */

const COURT = {
  /** Matches `.sg-court__net` in the stylesheet. */
  NET_X: 49.6,
  /** Net height in the same units as `y`; the ball must clear this. */
  NET_TOP: 20,
  /** Clearance a shot must have over the tape before it counts as over. */
  NET_MARGIN: 1.5,
  /** A ball whose first bounce lands outside these is out. */
  BASELINE_LEFT: 4,
  BASELINE_RIGHT: 96,
  /** How far along the court each side may walk. */
  PLAYER_MIN: 6,
  PLAYER_MAX: 44,
  ALEX_MIN: 55,
  ALEX_MAX: 94,
  /** Height a racket meets the ball at. */
  CONTACT_Y: 10.5,
} as const;

const PHYSICS = {
  GRAVITY: 270,
  /**
   * How much speed a bounce keeps.
   *
   * Low on purpose. A lively ball skips back up through the strike zone and
   * hands the receiver a second, third and fourth chance at the same shot,
   * which is how a rally stops ending. Skidding away flat means the ball has to
   * be met on its way down — once.
   */
  RESTITUTION: 0.4,
  /** Ground friction applied to horizontal speed at each bounce. */
  BOUNCE_DRAG: 0.86,
} as const;

const MOVE = {
  PLAYER_SPEED: 46,
  PLAYER_ACCEL_SECONDS: 0.12,
  ALEX_SPEED: 34,
  ALEX_ACCEL_SECONDS: 0.16,
} as const;

const SWING = {
  /** How long the racket is actually capable of touching the ball. */
  ACTIVE_SECONDS: 0.18,
  /** Total animation length, so the arm keeps moving after the live window. */
  DURATION_SECONDS: 0.28,
  /** Enforced gap between swings. This is the anti-mash rule. */
  COOLDOWN_SECONDS: 0.34,
  /** Horizontal half-width of the racket's reach. */
  REACH_X: 8,
  /**
   * Vertical reach: the strike zone's half-height.
   *
   * This is the number that makes A and D matter. The ball is only hittable
   * while it is descending through this band, so being in the right place is a
   * real requirement rather than a formality — and the court draws the ball's
   * shadow underneath it so that requirement is something you can see rather
   * than something you have to intuit.
   */
  REACH_Y: 7.5,
  /** |offset| inside this is a clean strike. */
  PERFECT_X: 2.2,
  /** |offset| inside this is a good one; beyond it the contact is mistimed. */
  GOOD_X: 5,
} as const;

/**
 * How much a rally speeds up per shot, and the floor it cannot go below.
 *
 * Pace carries. Every exchange comes back a little quicker than it went, so a
 * long rally tightens instead of settling — which is both what a real rally
 * does and the reason this one ends. Without it two competent players simply
 * trade the ball forever, and every point runs to the safety cap.
 */
const RALLY_PACE = { PER_SHOT: 0.09, FLOOR: 0.5 } as const;

function paceFactor(rallyShots: number) {
  return Math.max(RALLY_PACE.FLOOR, 1 - rallyShots * RALLY_PACE.PER_SHOT);
}

/** Flight time of a return, by how well it was struck. Lower is faster. */
const SHOT_SECONDS: Readonly<Record<Exclude<TennisQuality, "MISS">, number>> = {
  PERFECT: 0.62,
  GOOD: 0.8,
  EARLY: 1.15,
  LATE: 1.15,
};

const ALEX = {
  /** Seconds before ALEX starts chasing a ball that has just been struck. */
  REACTION_MIN: 0.32,
  REACTION_MAX: 0.6,
  /** How wrong his read of the bounce can be, in court units. */
  PREDICTION_ERROR: 4.5,
  /** Chance a reachable ball is shanked anyway. */
  SHANK_CHANCE: 0.13,
  /**
   * His racket's half-width, deliberately narrower than Edward's.
   *
   * This is the single number that decides whether a well-placed ball can beat
   * him. Matching Edward's reach made him unbeatable by placement — every point
   * had to wait for an unforced error, and rallies ran to the safety cap.
   */
  REACH_X: 5.5,
  /** Flight time of his own returns. */
  SHOT_SECONDS: 0.95,
  /**
   * How far from Edward he tries to land the ball, in court units.
   *
   * Comfortably outside a standing racket's 9.5 and comfortably inside one
   * second of running, so every rally asks the visitor to move and none of them
   * punishes them for being human about it.
   */
  PLACEMENT_REACH: 16,
} as const;

const PACE = {
  SERVE_SECONDS: 0.9,
  POINT_SECONDS: 1.2,
  /** How long the win banner holds before the sport reports itself. */
  BANNER_SECONDS: 1.3,
  /** How long a verdict word stays on screen. */
  VERDICT_SECONDS: 0.7,
  /** Court shake fades over this. */
  SHAKE_SECONDS: 0.28,
} as const;

export const TENNIS_TARGET_POINTS = 5;
/** Kept for the standings, which rank tennis by points won. */
export const TENNIS_POINTS = TENNIS_TARGET_POINTS;

/**
 * A rally this long is not a rally, it is a stalemate. Never reached in normal
 * play; it exists so a pathological exchange cannot hang the game loop.
 */
const RALLY_SHOT_CAP = 20;

/* ── State ───────────────────────────────────────────────────────────────── */

export type TennisPhase = "SERVE" | "RALLY" | "POINT" | "DONE";
export type TennisQuality = "PERFECT" | "GOOD" | "EARLY" | "LATE" | "MISS";
export type TennisSide = "PLAYER" | "ALEX";

export interface TennisBall {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  /** Bounces since the last racket touched it. Two is a lost point. */
  readonly bounces: number;
  readonly lastHitBy: TennisSide | null;
}

interface Racket {
  /** Seconds left of the live hit window; zero means the racket is cold. */
  readonly active: number;
  /** Seconds left of the swing animation. */
  readonly animating: number;
  readonly cooldown: number;
}

export interface TennisState extends MinigameBase {
  readonly phase: TennisPhase;
  readonly phaseTime: number;
  readonly playerX: number;
  readonly playerVx: number;
  readonly alexX: number;
  readonly alexVx: number;
  readonly ball: TennisBall;
  readonly playerRacket: Racket;
  readonly alexRacket: Racket;
  readonly playerPoints: number;
  readonly alexPoints: number;
  readonly server: TennisSide;
  readonly rallyShots: number;
  readonly longestRally: number;
  readonly perfects: number;
  /** The last contact Edward made, and how long ago, for the banner. */
  readonly quality: TennisQuality | null;
  readonly qualityAge: number;
  readonly pointWinner: TennisSide | null;
  readonly pointReason: string;
  readonly matchWinner: TennisSide | null;
  /** Where the last contact happened, so the component can spark it. */
  readonly impactX: number;
  readonly impactY: number;
  readonly impactAge: number;
  /** Decays to zero; the court shakes by this much on a clean strike. */
  readonly shake: number;
  /** ALEX's private timers, kept in state so the whole match stays pure. */
  readonly alexReaction: number;
  readonly alexTargetX: number;
  /**
   * The rally shot ALEX has already read. Comparing it against `rallyShots` is
   * what makes him re-read exactly once per ball — a countdown alone could not
   * tell "not started" from "finished", and he answered serves instantly.
   */
  readonly alexReadShot: number;
  readonly seed: number;
}

/* ── Seeded randomness ───────────────────────────────────────────────────── */

/** mulberry32. A plain number in, a plain number out, so state stays comparable. */
function nextRandom(seed: number): { value: number; seed: number } {
  const next = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(next ^ (next >>> 15), 1 | next);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, seed: next };
}

function randomBetween(seed: number, low: number, high: number) {
  const roll = nextRandom(seed);
  return { value: low + roll.value * (high - low), seed: roll.seed };
}

const INITIAL_SEED = 0x5eed7e11;

/* ── Construction ────────────────────────────────────────────────────────── */

const RESTING_BALL: TennisBall = {
  x: COURT.NET_X,
  y: 0,
  vx: 0,
  vy: 0,
  bounces: 0,
  lastHitBy: null,
};

const COLD: Racket = { active: 0, animating: 0, cooldown: 0 };

export function createTennisState(): TennisState {
  return {
    phase: "SERVE",
    phaseTime: 0,
    playerX: 20,
    playerVx: 0,
    alexX: 80,
    alexVx: 0,
    ball: RESTING_BALL,
    playerRacket: COLD,
    alexRacket: COLD,
    playerPoints: 0,
    alexPoints: 0,
    server: "PLAYER",
    rallyShots: 0,
    longestRally: 0,
    perfects: 0,
    quality: null,
    qualityAge: 0,
    pointWinner: null,
    pointReason: "",
    matchWinner: null,
    impactX: 0,
    impactY: 0,
    impactAge: 99,
    shake: 0,
    alexReaction: 0,
    alexTargetX: 80,
    alexReadShot: -1,
    seed: INITIAL_SEED,
    done: false,
    prompt: "FIRST TO 5",
  };
}

/* ── Shot construction ───────────────────────────────────────────────────── */

/**
 * Builds the velocity for a shot from `x0,y0` that lands on `targetX` after
 * `seconds`, lifting the arc until it genuinely clears the net.
 *
 * The lift is the one deliberate kindness in the physics. A shot that clipped
 * the tape would punish a mistimed swing twice — once with a weak ball and
 * again with the point — and the brief is explicit that the point is fun rather
 * than difficulty. ALEX gets no such help, which is what keeps the net honest:
 * when you see a ball die in the tape, it is his.
 */
export function buildShot(
  x0: number,
  y0: number,
  targetX: number,
  seconds: number,
  { lift = true }: { lift?: boolean } = {},
): { vx: number; vy: number; clearsNet: boolean } {
  // A shot with nowhere to go cannot be lifted anywhere either.
  if (targetX === x0) return { vx: 0, vy: 0, clearsNet: false };
  let flight = Math.max(0.05, seconds);

  for (let attempt = 0; attempt < 32; attempt += 1) {
    const vx = (targetX - x0) / flight;
    const vy = (0.5 * PHYSICS.GRAVITY * flight * flight - y0) / flight;
    const clears = clearsNet(x0, y0, vx, vy);
    if (clears || !lift) return { vx, vy, clearsNet: clears };
    // A longer flight for the same target is a higher arc.
    flight *= 1.12;
  }

  const vx = (targetX - x0) / flight;
  const vy = (0.5 * PHYSICS.GRAVITY * flight * flight - y0) / flight;
  return { vx, vy, clearsNet: clearsNet(x0, y0, vx, vy) };
}

/** Whether a ball launched like this is above the tape when it gets there. */
export function clearsNet(x0: number, y0: number, vx: number, vy: number) {
  if (vx === 0) return false;
  const t = (COURT.NET_X - x0) / vx;
  if (t <= 0) return true; // Never crosses; not a net problem.
  const y = y0 + vy * t - 0.5 * PHYSICS.GRAVITY * t * t;
  return y > COURT.NET_TOP + COURT.NET_MARGIN;
}

/** Where a ball in flight will first touch the ground. */
export function predictLandingX(ball: TennisBall) {
  const { y, vy, vx, x } = ball;
  const disc = vy * vy + 2 * PHYSICS.GRAVITY * y;
  if (disc < 0) return x;
  const t = (vy + Math.sqrt(disc)) / PHYSICS.GRAVITY;
  return x + vx * t;
}

/* ── Judgement ───────────────────────────────────────────────────────────── */

/**
 * How well a swing met the ball, from horizontal offset alone.
 *
 * Edward stands to the left of the net, so a ball with a greater `x` than his
 * has not arrived yet — swinging at it is EARLY. One with a smaller `x` has
 * already gone past, which is LATE.
 */
export function judgeContact(offsetX: number): TennisQuality {
  const distance = Math.abs(offsetX);
  if (distance > SWING.REACH_X) return "MISS";
  if (distance <= SWING.PERFECT_X) return "PERFECT";
  if (distance <= SWING.GOOD_X) return "GOOD";
  return offsetX > 0 ? "EARLY" : "LATE";
}

/** A return that commits to nothing lands here, in the middle of ALEX's half. */
const NEUTRAL_TARGET = 75;

/** How much of the intended placement each quality of contact actually gets. */
const ACCURACY: Readonly<Record<Exclude<TennisQuality, "MISS">, number>> = {
  PERFECT: 1,
  GOOD: 0.72,
  EARLY: 0.35,
  LATE: 0.35,
};

/**
 * Where a return goes.
 *
 * Two separate things decide it, which is the whole design of the game in one
 * function. *Where Edward is standing* decides what he is trying to do: deep in
 * his own half he can only push the ball long, up near the net he can drop it
 * short. *How well he met it* decides how much of that intention survives — a
 * clean strike goes where he meant it, a mistimed one drifts back to the middle
 * of the court, which is exactly where ALEX is waiting.
 *
 * So the two skills stay honest and separate: position chooses the shot, timing
 * earns it. Nothing on screen explains this. It is consistent, so it is
 * learnable, which is the only tutorial a game this size should need.
 */
export function aimReturn(
  playerX: number,
  offsetX: number,
  quality: Exclude<TennisQuality, "MISS">,
  opponentX: number,
): number {
  const depth = (playerX - COURT.PLAYER_MIN) / (COURT.PLAYER_MAX - COURT.PLAYER_MIN);
  // Standing back sends it long; standing up sends it short.
  const intended = clamp(92 - depth * 34 + offsetX * 1.8, 58, 92);
  const landed = NEUTRAL_TARGET + (intended - NEUTRAL_TARGET) * ACCURACY[quality];
  // Finally, lean away from ALEX rather than through him.
  const away = landed + (landed >= opponentX ? 1 : -1) * 2.5;
  return clamp(away, 58, 92);
}

/* ── Simulation ──────────────────────────────────────────────────────────── */

function stepAxis(
  position: number,
  velocity: number,
  direction: number,
  dt: number,
  topSpeed: number,
  accelSeconds: number,
  min: number,
  max: number,
) {
  const target = direction * topSpeed;
  const rate = (topSpeed / accelSeconds) * dt;
  let nextV: number;
  if (Math.abs(target - velocity) <= rate) nextV = target;
  else nextV = velocity + Math.sign(target - velocity) * rate;

  const proposed = position + nextV * dt;
  const clamped = clamp(proposed, min, max);
  // Walking into the tramline stops, rather than storing speed against it.
  return { position: clamped, velocity: clamped === proposed ? nextV : 0 };
}

function coolRacket(racket: Racket, dt: number): Racket {
  return {
    active: Math.max(0, racket.active - dt),
    animating: Math.max(0, racket.animating - dt),
    cooldown: Math.max(0, racket.cooldown - dt),
  };
}

function swung(): Racket {
  return {
    active: SWING.ACTIVE_SECONDS,
    animating: SWING.DURATION_SECONDS,
    cooldown: SWING.COOLDOWN_SECONDS,
  };
}

/** Can this racket touch this ball at all? */
function withinReach(ball: TennisBall, x: number, reachX: number = SWING.REACH_X) {
  return (
    Math.abs(ball.x - x) <= reachX &&
    Math.abs(ball.y - COURT.CONTACT_Y) <= SWING.REACH_Y
  );
}

function serveState(state: TennisState, server: TennisSide): TennisState {
  return {
    ...state,
    phase: "SERVE",
    phaseTime: 0,
    playerX: 20,
    playerVx: 0,
    alexX: 80,
    alexVx: 0,
    ball: { ...RESTING_BALL, x: server === "PLAYER" ? 20 : 80, y: COURT.CONTACT_Y },
    playerRacket: COLD,
    alexRacket: COLD,
    server,
    rallyShots: 0,
    quality: null,
    qualityAge: 0,
    pointWinner: null,
    pointReason: "",
    alexReaction: 0,
    alexTargetX: 80,
    alexReadShot: -1,
    shake: 0,
    prompt: promptForScore(state.playerPoints, state.alexPoints),
  };
}

function promptForScore(playerPoints: number, alexPoints: number) {
  if (playerPoints === TENNIS_TARGET_POINTS - 1 && alexPoints === TENNIS_TARGET_POINTS - 1) {
    return "MATCH POINT — BOTH";
  }
  if (playerPoints === TENNIS_TARGET_POINTS - 1) return "MATCH POINT";
  if (alexPoints === TENNIS_TARGET_POINTS - 1) return "MATCH POINT — ALEX";
  return "FIRST TO 5";
}

function awardPoint(
  state: TennisState,
  winner: TennisSide,
  reason: string,
): TennisState {
  const playerPoints = state.playerPoints + (winner === "PLAYER" ? 1 : 0);
  const alexPoints = state.alexPoints + (winner === "ALEX" ? 1 : 0);
  const matchWinner =
    playerPoints >= TENNIS_TARGET_POINTS
      ? "PLAYER"
      : alexPoints >= TENNIS_TARGET_POINTS
        ? "ALEX"
        : null;

  return {
    ...state,
    phase: matchWinner ? "DONE" : "POINT",
    phaseTime: 0,
    playerPoints,
    alexPoints,
    pointWinner: winner,
    pointReason: reason,
    matchWinner,
    longestRally: Math.max(state.longestRally, state.rallyShots),
    prompt: matchWinner
      ? matchWinner === "PLAYER"
        ? "YOU WIN!"
        : "GOOD GAME!"
      : reason,
  };
}

export function advanceTennis(
  state: TennisState,
  input: MinigameInput,
  dt: number,
): TennisState {
  if (state.done) return state;

  const step = clamp(dt, 0, 0.05);
  const phaseTime = state.phaseTime + step;

  if (state.phase === "DONE") {
    if (phaseTime >= PACE.BANNER_SECONDS) {
      return { ...state, phaseTime, done: true };
    }
    return { ...state, phaseTime, shake: Math.max(0, state.shake - step * 4) };
  }

  if (state.phase === "POINT") {
    if (phaseTime >= PACE.POINT_SECONDS) {
      // The loser of the point serves the next one, so a run of lost points
      // always hands the initiative back.
      return serveState({ ...state, phaseTime }, state.pointWinner === "PLAYER" ? "ALEX" : "PLAYER");
    }
    return {
      ...state,
      phaseTime,
      shake: Math.max(0, state.shake - step * 4),
      qualityAge: state.qualityAge + step,
      impactAge: state.impactAge + step,
    };
  }

  if (state.phase === "SERVE") {
    if (phaseTime < PACE.SERVE_SECONDS) {
      return { ...state, phaseTime, qualityAge: state.qualityAge + step };
    }
    // Serve launches itself. The brief asks for no extra control just to start
    // a rally, and a rally that begins on its own is a rally you are already in.
    const server = state.server;
    const from = server === "PLAYER" ? state.playerX : state.alexX;
    const placement = randomBetween(state.seed, 0.3, 0.7);
    const targetX =
      server === "PLAYER"
        ? 58 + placement.value * 34
        : COURT.PLAYER_MIN + 4 + placement.value * 30;
    const shot = buildShot(from, COURT.CONTACT_Y, targetX, 1.02);

    return {
      ...state,
      phase: "RALLY",
      phaseTime: 0,
      seed: placement.seed,
      rallyShots: 1,
      ball: {
        x: from,
        y: COURT.CONTACT_Y,
        vx: shot.vx,
        vy: shot.vy,
        bounces: 0,
        lastHitBy: server,
      },
      prompt: promptForScore(state.playerPoints, state.alexPoints),
    };
  }

  /* ── RALLY ─────────────────────────────────────────────────────────────── */

  let next: TennisState = {
    ...state,
    phaseTime,
    qualityAge: state.qualityAge + step,
    impactAge: state.impactAge + step,
    shake: Math.max(0, state.shake - step * 4),
    playerRacket: coolRacket(state.playerRacket, step),
    alexRacket: coolRacket(state.alexRacket, step),
  };

  /* Movement. Left and right only — the brief is firm that there is nothing
     else to learn. */
  const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const player = stepAxis(
    next.playerX,
    next.playerVx,
    direction,
    step,
    MOVE.PLAYER_SPEED,
    MOVE.PLAYER_ACCEL_SECONDS,
    COURT.PLAYER_MIN,
    COURT.PLAYER_MAX,
  );
  next = { ...next, playerX: player.position, playerVx: player.velocity };

  /* ALEX. Reaction first, then chase, then swing. */
  next = updateAlex(next, step);

  /* The swing. A press starts one if the racket is cool; the racket then hits
     whatever comes into range while it is live. */
  if (input.pressed && next.playerRacket.cooldown <= 0) {
    next = { ...next, playerRacket: swung() };
  }

  /* Ball integration. */
  const ball = next.ball;
  const bx = ball.x + ball.vx * step;
  let by = ball.y + ball.vy * step - 0.5 * PHYSICS.GRAVITY * step * step;
  let bvy = ball.vy - PHYSICS.GRAVITY * step;
  let bvx = ball.vx;
  let bounces = ball.bounces;

  /* Did it cross the net below the tape? */
  const crossedNet =
    (ball.x < COURT.NET_X && bx >= COURT.NET_X) ||
    (ball.x > COURT.NET_X && bx <= COURT.NET_X);
  if (crossedNet) {
    const t = (COURT.NET_X - ball.x) / (ball.vx || 1);
    const heightAtNet = ball.y + ball.vy * t - 0.5 * PHYSICS.GRAVITY * t * t;
    if (heightAtNet <= COURT.NET_TOP) {
      const hitter = ball.lastHitBy ?? "ALEX";
      return awardPoint(
        { ...next, ball: { ...ball, x: COURT.NET_X, y: heightAtNet, vx: 0, vy: 0 } },
        hitter === "PLAYER" ? "ALEX" : "PLAYER",
        hitter === "PLAYER" ? "INTO THE NET" : "ALEX FINDS THE NET",
      );
    }
  }

  /* Ground contact. */
  if (by <= 0) {
    by = 0;
    bounces += 1;

    if (bounces === 1 && ball.lastHitBy) {
      const inPlay =
        ball.lastHitBy === "PLAYER"
          ? bx >= COURT.NET_X && bx <= COURT.BASELINE_RIGHT
          : bx <= COURT.NET_X && bx >= COURT.BASELINE_LEFT;
      if (!inPlay) {
        return awardPoint(
          { ...next, ball: { ...ball, x: bx, y: 0, vx: 0, vy: 0, bounces } },
          ball.lastHitBy === "PLAYER" ? "ALEX" : "PLAYER",
          ball.lastHitBy === "PLAYER" ? "LONG" : "ALEX GOES LONG",
        );
      }
    }

    if (bounces >= 2) {
      // Two bounces on a side means that side did not get there.
      const loser: TennisSide = bx < COURT.NET_X ? "PLAYER" : "ALEX";
      return awardPoint(
        { ...next, ball: { ...ball, x: bx, y: 0, vx: 0, vy: 0, bounces } },
        loser === "PLAYER" ? "ALEX" : "PLAYER",
        loser === "PLAYER" ? "ALEX TAKES IT" : "POINT TO EDWARD",
      );
    }

    bvy = -bvy * PHYSICS.RESTITUTION;
    bvx *= PHYSICS.BOUNCE_DRAG;
  }

  let moved: TennisBall = { ...ball, x: bx, y: by, vx: bvx, vy: bvy, bounces };
  next = { ...next, ball: moved };

  /* Contact. Edward first — his racket is the one the visitor is holding. */
  const playerLive = next.playerRacket.active > 0;
  const ballIsEdwards = moved.x < COURT.NET_X && moved.lastHitBy !== "PLAYER";
  if (playerLive && ballIsEdwards && withinReach(moved, next.playerX)) {
    const offset = moved.x - next.playerX;
    const quality = judgeContact(offset);
    if (quality !== "MISS") {
      const targetX = aimReturn(next.playerX, offset, quality, next.alexX);
      const shot = buildShot(
        moved.x,
        moved.y,
        targetX,
        SHOT_SECONDS[quality] * paceFactor(next.rallyShots),
      );
      moved = {
        x: moved.x,
        y: moved.y,
        vx: shot.vx,
        vy: shot.vy,
        bounces: 0,
        lastHitBy: "PLAYER",
      };
      next = {
        ...next,
        ball: moved,
        // The racket goes cold on contact, so one swing is one ball.
        playerRacket: { ...next.playerRacket, active: 0 },
        quality,
        qualityAge: 0,
        perfects: next.perfects + (quality === "PERFECT" ? 1 : 0),
        rallyShots: next.rallyShots + 1,
        impactX: moved.x,
        impactY: moved.y,
        impactAge: 0,
        shake: quality === "PERFECT" ? 1 : next.shake,
      };
    }
  }

  /* ALEX's racket. */
  const alexBall = next.ball;
  if (
    next.alexRacket.active > 0 &&
    alexBall.x > COURT.NET_X &&
    alexBall.lastHitBy !== "ALEX" &&
    withinReach(alexBall, next.alexX, ALEX.REACH_X)
  ) {
    next = returnFromAlex(next);
  }

  /* Safety valve. A rally this long is not something the physics produces; it
     is something a bug would produce, and it must not hang the loop. */
  if (next.rallyShots > RALLY_SHOT_CAP) {
    const winner: TennisSide = next.ball.lastHitBy === "ALEX" ? "ALEX" : "PLAYER";
    return awardPoint(next, winner, "RALLY GOES THE DISTANCE");
  }

  return next;
}

/**
 * ALEX.
 *
 * Not a tracker: he waits before he reacts, reads the bounce slightly wrong,
 * runs a little slower than Edward, and shanks roughly one reachable ball in
 * eight. Those four numbers together are what make him beatable by someone who
 * has been playing for thirty seconds, which is the only difficulty this is
 * supposed to have.
 */
function updateAlex(state: TennisState, dt: number): TennisState {
  let next = state;
  const ball = state.ball;
  const incoming = ball.lastHitBy === "PLAYER";

  // A ball has just been struck at him: start the clock and pick a read. Once
  // per shot, which is what `alexReadShot` is for.
  if (incoming && state.alexReadShot !== state.rallyShots) {
    const delay = randomBetween(state.seed, ALEX.REACTION_MIN, ALEX.REACTION_MAX);
    const error = randomBetween(delay.seed, -ALEX.PREDICTION_ERROR, ALEX.PREDICTION_ERROR);
    const predicted = predictLandingX(ball) + error.value;
    next = {
      ...next,
      seed: error.seed,
      alexReaction: delay.value,
      alexReadShot: state.rallyShots,
      alexTargetX: clamp(predicted, COURT.ALEX_MIN, COURT.ALEX_MAX),
    };
  }

  if (!incoming) {
    // Nothing to chase: drift back toward the middle of his half.
    next = { ...next, alexTargetX: 78, alexReaction: 0 };
  }

  const reaction = Math.max(0, next.alexReaction - dt);
  // He only moves once his reaction has run out.
  const direction =
    reaction > 0 || Math.abs(next.alexTargetX - next.alexX) < 1
      ? 0
      : Math.sign(next.alexTargetX - next.alexX);

  const moved = stepAxis(
    next.alexX,
    next.alexVx,
    direction,
    dt,
    MOVE.ALEX_SPEED,
    MOVE.ALEX_ACCEL_SECONDS,
    COURT.ALEX_MIN,
    COURT.ALEX_MAX,
  );

  next = {
    ...next,
    alexX: moved.position,
    alexVx: moved.velocity,
    alexReaction: reaction,
  };

  // Swings when the ball is genuinely his to hit, and his racket is cool.
  if (
    incoming &&
    next.alexRacket.cooldown <= 0 &&
    ball.x > COURT.NET_X &&
    withinReach(ball, next.alexX, ALEX.REACH_X)
  ) {
    next = { ...next, alexRacket: swung() };
  }

  return next;
}

/** ALEX meets the ball — or does not, roughly one time in eight. */
function returnFromAlex(state: TennisState): TennisState {
  const ball = state.ball;
  const shank = nextRandom(state.seed);

  if (shank.value < ALEX.SHANK_CHANCE) {
    /* A genuine error, and visibly one.
       Half of them die in the tape, half sail past Edward's baseline. This is
       the only place the net is allowed to end a point, and it is always ALEX
       who finds it — Edward's shots are lifted over it on purpose, because
       punishing a mistimed swing with a weak ball *and* the point would make
       the match about difficulty rather than about playing. */
    const mode = randomBetween(shank.seed, 0, 1);
    const intoNet = mode.value < 0.5;
    const wild = randomBetween(mode.seed, 0, 1);
    const shot = intoNet
      ? // Flat and low: it cannot get over.
        buildShot(ball.x, Math.min(ball.y, 6), COURT.NET_X - 4, 0.42, { lift: false })
      : // Long: past the baseline and out.
        buildShot(ball.x, ball.y, COURT.BASELINE_LEFT - 4 - wild.value * 6, 1.05, {
          lift: false,
        });
    return {
      ...state,
      seed: wild.seed,
      ball: {
        x: ball.x,
        y: intoNet ? Math.min(ball.y, 6) : ball.y,
        vx: shot.vx,
        vy: shot.vy,
        bounces: 0,
        lastHitBy: "ALEX",
      },
      alexRacket: { ...state.alexRacket, active: 0 },
      rallyShots: state.rallyShots + 1,
      impactX: ball.x,
      impactY: ball.y,
      impactAge: 0,
    };
  }

  // A real return, placed away from wherever Edward is standing — far enough
  // that standing still is not a strategy, close enough that one honest run
  // gets there. This single number is what makes A and D matter.
  const spread = randomBetween(shank.seed, -1, 1);
  const middle = (COURT.PLAYER_MIN + COURT.PLAYER_MAX) / 2;
  const away = state.playerX + (state.playerX <= middle ? 1 : -1) * ALEX.PLACEMENT_REACH;
  const targetX = clamp(away + spread.value * 6, COURT.PLAYER_MIN + 2, COURT.PLAYER_MAX - 1);
  const shot = buildShot(
    ball.x,
    ball.y,
    targetX,
    ALEX.SHOT_SECONDS * paceFactor(state.rallyShots),
  );

  return {
    ...state,
    seed: spread.seed,
    ball: { x: ball.x, y: ball.y, vx: shot.vx, vy: shot.vy, bounces: 0, lastHitBy: "ALEX" },
    alexRacket: { ...state.alexRacket, active: 0 },
    rallyShots: state.rallyShots + 1,
    impactX: ball.x,
    impactY: ball.y,
    impactAge: 0,
  };
}

/* ── Reporting ───────────────────────────────────────────────────────────── */

export function getTennisResult(state: TennisState): SportResult {
  const won = state.matchWinner === "PLAYER";
  return {
    rank: {
      value: state.playerPoints,
      display: `${state.playerPoints} PT`,
      better: "higher",
    },
    heading: won ? "YOU WIN!" : "GOOD GAME!",
    playerLabel: "EDWARD",
    playerScore: `${state.playerPoints}`,
    opponentLabel: "ALEX",
    opponentScore: `${state.alexPoints}`,
    note: `${state.perfects} PERFECT ${state.perfects === 1 ? "STRIKE" : "STRIKES"} · LONGEST RALLY ${state.longestRally}`,
  };
}

/** Exposed for the component's HUD and for tests. */
export const TENNIS_COURT = COURT;
export const TENNIS_SWING = SWING;
export const TENNIS_PACE = PACE;
