/**
 * Where the cabinet stands, and where Edward starts.
 *
 * The arcade floor fills the viewport, so its geometry cannot be a set of
 * fixed pixel constants: at 1440px a cabinet at x=720 is centre stage, and at
 * 390px it is off the side of the phone entirely. Everything here is derived
 * from the measured width instead, and kept pure so the guarantees the room
 * depends on — the machine is the focal point, and there is always a walk to
 * make before the prompt appears — can be asserted rather than eyeballed.
 */

export interface FloorLayout {
  /** How far Edward may walk, matching the visible floor. */
  readonly floorWidth: number;
  /** Centre of the cabinet. Dead centre of the room: it is the subject. */
  readonly cabinetX: number;
  /** Where Edward is standing when the room opens. */
  readonly startX: number;
  /** How close counts as "at the cabinet". */
  readonly approachRange: number;
  /** Walking pace, in floor pixels per second. */
  readonly walkSpeed: number;
}

/** Narrower than this and the room stops making sense as a room. */
const MIN_FLOOR = 320;
/** Edward never starts flush against the wall. */
const EDGE_MARGIN = 40;
const START_FRACTION = 0.12;
const APPROACH_FRACTION = 0.1;
const MIN_APPROACH = 80;
/**
 * A fixed pace crosses a phone-sized room in well under a second, which reads
 * as twitchy and overshoots the cabinet before the prompt registers. Tie it to
 * the room instead: the walk takes about the same time at any width.
 */
const WALK_FRACTION = 0.2;
const MIN_WALK_SPEED = 130;
const MAX_WALK_SPEED = 270;

export function getFloorLayout(viewportWidth: number): FloorLayout {
  const floorWidth = Math.max(MIN_FLOOR, Math.round(viewportWidth || MIN_FLOOR));
  return {
    floorWidth,
    cabinetX: Math.round(floorWidth / 2),
    startX: Math.max(EDGE_MARGIN, Math.round(floorWidth * START_FRACTION)),
    approachRange: Math.max(MIN_APPROACH, Math.round(floorWidth * APPROACH_FRACTION)),
    walkSpeed: Math.min(
      MAX_WALK_SPEED,
      Math.max(MIN_WALK_SPEED, Math.round(floorWidth * WALK_FRACTION)),
    ),
  };
}

/** True once Edward is close enough for `E` to mean something. */
export function isAtCabinet(x: number, layout: FloorLayout) {
  return Math.abs(x - layout.cabinetX) <= layout.approachRange;
}
