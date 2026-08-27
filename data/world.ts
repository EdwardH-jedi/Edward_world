import { HILL_GROUND_Y, TOWN_GROUND_Y } from "@/lib/game/terrain";
import type { Building, NPC, Player, Sign, WorldObject } from "@/types/world";

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
  speed: 280,
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
    label: "Construction Area",
    position: { x: 3_360, y: TOWN_GROUND_Y - 152 },
    size: { width: 336, height: 152 },
    interactionRange: 72,
    interaction: {
      type: "OPEN_INFO",
      heading: "Under Construction",
      body: "New experiments will be added here without changing the world engine.",
    },
  },
] as const;

export const npcs: readonly NPC[] = [
  {
    kind: "npc",
    id: "tomodachi",
    label: "TOMODACHI",
    position: { x: 664, y: HILL_GROUND_Y - 44 },
    size: { width: 48, height: 44 },
    interactionRange: 82,
    interaction: {
      type: "TALK",
      speaker: "TOMODACHI",
      lines: [
        "Welcome to Edward's World.",
        "The buildings are projects. The index is the fast route.",
      ],
    },
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
] as const;

export const worldObjects: readonly WorldObject[] = [
  ...buildings,
  ...npcs,
  ...signs,
];
