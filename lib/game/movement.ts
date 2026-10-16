import { PIXEL_UNIT } from "@/lib/game/terrain";

export type HorizontalDirection = -1 | 0 | 1;

export function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function movePlayerX({
  currentX,
  direction,
  deltaSeconds,
  speed,
  worldWidth,
  playerWidth,
}: {
  currentX: number;
  direction: HorizontalDirection;
  deltaSeconds: number;
  speed: number;
  worldWidth: number;
  playerWidth: number;
}) {
  const nextX = currentX + direction * speed * Math.max(0, deltaSeconds);
  return clamp(nextX, 0, worldWidth - playerWidth);
}

export function getCameraX({
  playerX,
  playerWidth,
  viewportWidth,
  worldWidth,
  lookAhead = 0,
}: {
  playerX: number;
  playerWidth: number;
  viewportWidth: number;
  worldWidth: number;
  /** Signed authored pixels the view leads the player by; still clamped to the world. */
  lookAhead?: number;
}) {
  const desiredOffset = playerX + playerWidth / 2 - viewportWidth / 2 + lookAhead;
  return clamp(desiredOffset, 0, Math.max(0, worldWidth - viewportWidth));
}

/** The camera leads the player by one art pixel in the way he faces. */
export const LOOK_AHEAD = PIXEL_UNIT;
/** Authored pixels walked in a new direction before the lead follows. */
export const LOOK_FLIP_DISTANCE = 6;
/** Or this long facing the new way: two 450ms ambient frames. */
export const LOOK_FLIP_MS = 900;

export interface LookAhead {
  /** The way the player last moved. */
  facing: -1 | 1;
  /** The way the camera currently leads, which trails `facing` on a flip. */
  lead: -1 | 1;
  /** Signed authored pixels of lead, eased toward `lead` one unit a frame. */
  offset: number;
  pendingDistance: number;
  pendingMs: number;
}

export function createLookAhead(facing: -1 | 1): LookAhead {
  return { facing, lead: facing, offset: facing * LOOK_AHEAD, pendingDistance: 0, pendingMs: 0 };
}

/**
 * One frame of camera lead with hysteresis, so a quick A/D flip does not snap
 * the view two units. Returns the same object when nothing changed, so a
 * caller can skip work on idle frames.
 */
export function stepLookAhead(
  state: LookAhead,
  input: HorizontalDirection,
  distance: number,
  deltaMs: number,
): LookAhead {
  const facing = input === 0 ? state.facing : input;
  let { lead, pendingDistance, pendingMs } = state;

  if (facing === lead) {
    pendingDistance = 0;
    pendingMs = 0;
  } else {
    pendingDistance += distance;
    pendingMs += deltaMs;
    if (pendingDistance >= LOOK_FLIP_DISTANCE || pendingMs >= LOOK_FLIP_MS) {
      lead = facing;
      pendingDistance = 0;
      pendingMs = 0;
    }
  }

  const offset = state.offset + clamp(lead * LOOK_AHEAD - state.offset, -PIXEL_UNIT, PIXEL_UNIT);
  if (
    facing === state.facing &&
    lead === state.lead &&
    offset === state.offset &&
    pendingDistance === state.pendingDistance &&
    pendingMs === state.pendingMs
  ) {
    return state;
  }
  return { facing, lead, offset, pendingDistance, pendingMs };
}
