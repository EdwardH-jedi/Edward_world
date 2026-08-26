import type { Building, NPC, Player, Sign, WorldObject } from "@/types/world";

export const WORLD_CONFIG = {
  width: 2_800,
  height: 520,
  groundY: 390,
  playerStartX: 120,
} as const;

export const initialPlayer: Player = {
  id: "edward",
  position: { x: WORLD_CONFIG.playerStartX, y: WORLD_CONFIG.groundY - 72 },
  size: { width: 42, height: 72 },
  speed: 280,
  facing: "right",
};

export const buildings: readonly Building[] = [
  {
    kind: "building",
    id: "edwards-house",
    label: "Edward's House",
    position: { x: 220, y: 220 },
    size: { width: 250, height: 170 },
    interactionRange: 72,
    interaction: {
      type: "OPEN_INFO",
      heading: "Edward's House",
      body: "A placeholder for Edward's story, working principles, and background.",
    },
  },
  {
    kind: "building",
    id: "wardrobe",
    label: "Wardrobe",
    position: { x: 590, y: 180 },
    size: { width: 280, height: 210 },
    interactionRange: 72,
    interaction: { type: "OPEN_PROJECT", projectId: "wardrobe" },
  },
  {
    kind: "building",
    id: "sportsgang",
    label: "SportsGang",
    position: { x: 980, y: 145 },
    size: { width: 310, height: 245 },
    interactionRange: 72,
    interaction: { type: "OPEN_PROJECT", projectId: "sportsgang" },
  },
  {
    kind: "building",
    id: "afl-lab",
    label: "AFL Lab",
    position: { x: 1_410, y: 195 },
    size: { width: 280, height: 195 },
    interactionRange: 72,
    interaction: { type: "OPEN_PROJECT", projectId: "afl-predict" },
  },
  {
    kind: "building",
    id: "arcade",
    label: "Arcade",
    position: { x: 1_810, y: 165 },
    size: { width: 270, height: 225 },
    interactionRange: 72,
    interaction: { type: "OPEN_PROJECT", projectId: "soonpermario" },
  },
  {
    kind: "building",
    id: "construction-area",
    label: "Construction Area",
    position: { x: 2_230, y: 250 },
    size: { width: 330, height: 140 },
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
    position: { x: 1_730, y: 330 },
    size: { width: 34, height: 60 },
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
    position: { x: 80, y: 340 },
    size: { width: 44, height: 50 },
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
