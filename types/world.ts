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
  | { type: "READ"; heading: string; text: string };

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
