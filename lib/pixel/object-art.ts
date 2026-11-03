import { chapterIdOfStation } from "@/data/timeline";
import { buildingArt, signpostArt, type BuildingArt } from "@/lib/pixel/buildings";
import { topProfile } from "@/lib/pixel/signage";
import { stationArt } from "@/lib/pixel/timeline";
import { worldExitArt } from "@/lib/pixel/world-exit";
import type { WorldObject } from "@/types/world";

/** Resolves the art routine and grid size for any world object. */
export function objectArt(object: WorldObject): BuildingArt {
  if (object.kind === "building") return buildingArt[object.id];
  // The exit is a sign by kind, because it is not a building and not a
  // project, but it is a gateway and has to read as one.
  if (object.id === "world-exit") return worldExitArt;
  // Each chapter's station on the timeline street has its own plaque.
  const chapterId = chapterIdOfStation(object.id);
  if (chapterId !== undefined) return stationArt(chapterId);
  return signpostArt;
}

/** Where each object's art starts, column by column (`topProfile`), keyed by id. */
export function signProfiles(objects: readonly WorldObject[]): ReadonlyMap<string, readonly number[]> {
  return new Map(
    objects.map((object) => {
      const art = objectArt(object);
      return [object.id, topProfile(art.draw, art.size.width)];
    }),
  );
}
