import { HILL_GROUND_Y, TOWN_GROUND_Y } from "@/lib/game/terrain";
import type { Building, Player, Sign, WorldObject } from "@/types/world";

/**
 * World geometry for the approved visual pass.
 *
 * Everything is a whole number of art pixels (4 CSS px), and every object's
 * `y` is its ground line minus its height, so nothing floats or sinks. Spacing
 * between buildings is deliberate: the gaps carry the path, the stream, the
 * town cluster and the oval, which is what stops the world reading as a row of
 * project cards.
 */
export const WORLD_CONFIG = {
  width: 3_840,
  height: 552,
  groundY: TOWN_GROUND_Y,
  playerStartX: 190,
} as const;

const PLAYER_SIZE = { width: 48, height: 64 } as const;

export const initialPlayer: Player = {
  id: "edward",
  position: {
    x: WORLD_CONFIG.playerStartX,
    y: HILL_GROUND_Y - PLAYER_SIZE.height,
  },
  size: { ...PLAYER_SIZE },
  /**
   * Walking speed, in CSS pixels per second.
   *
   * Set from the crossing time rather than picked. At 280 a 1280px viewport
   * took 4.56 seconds to cross and the whole world took 13.7 — long enough
   * that a visitor looking for a project spends it holding a key. At 480 the
   * same screen takes 2.67s and the world 8.0. Input latency was already one
   * frame, so this is the only thing that was making the walk feel slow.
   */
  speed: 480,
  facing: "right",
};

export const buildings: readonly Building[] = [
  {
    kind: "building",
    id: "edwards-house",
    label: "Edward's House",
    position: { x: 340, y: HILL_GROUND_Y - 200 },
    size: { width: 272, height: 200 },
    interactionRange: 72,
    interaction: { type: "OPEN_LOCATION", locationId: "edwards-house" },
  },
  {
    kind: "building",
    id: "wardrobe",
    label: "Wardrobe",
    position: { x: 1_000, y: TOWN_GROUND_Y - 176 },
    size: { width: 304, height: 176 },
    interactionRange: 72,
    interaction: { type: "OPEN_PROJECT", projectId: "wardrobe" },
  },
  {
    kind: "building",
    id: "sportsgang",
    label: "SportsGang",
    position: { x: 1_640, y: TOWN_GROUND_Y - 176 },
    size: { width: 368, height: 176 },
    interactionRange: 72,
    interaction: { type: "OPEN_PROJECT", projectId: "sportsgang" },
  },
  {
    kind: "building",
    id: "afl-lab",
    label: "AFL Lab",
    position: { x: 2_208, y: TOWN_GROUND_Y - 192 },
    size: { width: 288, height: 192 },
    interactionRange: 72,
    interaction: { type: "OPEN_PROJECT", projectId: "afl-predict" },
  },
  {
    kind: "building",
    id: "arcade",
    label: "Arcade",
    position: { x: 2_900, y: TOWN_GROUND_Y - 184 },
    size: { width: 304, height: 184 },
    interactionRange: 72,
    interaction: { type: "OPEN_PROJECT", projectId: "soonpermario" },
  },
  {
    kind: "building",
    id: "construction-area",
    label: "Scaffolding",
    position: { x: 3_360, y: TOWN_GROUND_Y - 152 },
    size: { width: 336, height: 152 },
    interactionRange: 0,
  },
] as const;

export const signs: readonly Sign[] = [
  {
    kind: "sign",
    id: "movement-sign",
    label: "Directions",
    position: { x: 104, y: HILL_GROUND_Y - 60 },
    size: { width: 44, height: 60 },
    interactionRange: 68,
    interaction: {
      type: "READ",
      heading: "How to explore",
      text: "Move with A / D or the left / right arrow keys. Press E near an object.",
    },
  },
  {
    /**
     * The way out, at the right-hand end of the world.
     *
     * A `sign` rather than a `building`: buildings are the project entrances
     * and Edward's House, they are keyed by `WorldBuildingId`, and a gate is
     * neither. It is also emphatically **not** a project — the index must keep
     * listing exactly four — so it carries its own `LEAVE_WORLD` action.
     *
     * Placed past the scaffolding, which ends at 3696, and inside the world's
     * 3840. The player clamps at 3792, so the gateway is walkable-to rather
     * than something to be seen and not reached. Nothing gates it: every sport
     * and every project can be skipped and the exit is still here.
     */
    kind: "sign",
    id: "world-exit",
    label: "Exit",
    position: { x: 3_720, y: TOWN_GROUND_Y - 104 },
    size: { width: 80, height: 104 },
    interactionRange: 76,
    interaction: { type: "LEAVE_WORLD" },
  },
] as const;

export const worldObjects: readonly WorldObject[] = [
  ...buildings,
  ...signs,
];
