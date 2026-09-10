import type { PortfolioProjectId, WorldBuildingId } from "@/types/portfolio";

export interface WorldPosition {
  x: number;
  y: number;
}

export interface WorldSize {
  width: number;
  height: number;
}

export interface Player {
  id: "edward";
  position: WorldPosition;
  size: WorldSize;
  speed: number;
  facing: "left" | "right";
}

/** Locations that are not a project: places rather than work. */
export type WorldLocationId = "edwards-house";

export type InteractionAction =
  | { type: "OPEN_PROJECT"; projectId: PortfolioProjectId }
  | { type: "OPEN_LOCATION"; locationId: WorldLocationId }
  | { type: "OPEN_INFO"; heading: string; body: string }
  | { type: "READ"; heading: string; text: string }
  /**
   * Finish the visit.
   *
   * Its own action rather than an `OPEN_*`: nothing is being opened, no
   * project is involved, and the tests that pin the world's four project
   * entrances and its one location would have to be loosened to admit a fake
   * fifth. It closes nothing and locks nothing — see `data/world.ts`.
   */
  | { type: "LEAVE_WORLD" };

export interface Interactable {
  interactionRange: number;
  interaction: InteractionAction;
}

interface WorldObjectBase {
  id: string;
  label: string;
  position: WorldPosition;
  size: WorldSize;
}

export type Building = WorldObjectBase & {
  kind: "building";
  id: WorldBuildingId;
} & (Interactable | { interactionRange: 0; interaction?: never });

export interface Sign extends WorldObjectBase, Interactable {
  kind: "sign";
}

export type WorldObject = Building | Sign;
