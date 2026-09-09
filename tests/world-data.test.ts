import { describe, expect, it } from "vitest";
import { buildings, initialPlayer, signs, worldObjects } from "@/data/world";
import { findNearestInteractable, getInteractionPrompt } from "@/lib/game/interactions";

/**
 * TOMODACHI was removed from the world. These are the guards that keep it
 * removed, and they are written against the world *data* rather than the
 * types: a string match still fails if someone reintroduces the NPC, where a
 * type-level assertion would quietly compile away.
 */
describe("world data has no TOMODACHI", () => {
  it("mentions it nowhere in the world objects", () => {
    expect(JSON.stringify(worldObjects)).not.toMatch(/tomodachi/i);
  });

  it("has no object that opens a TALK dialogue", () => {
    for (const object of worldObjects) {
      expect(object.interaction?.type).not.toBe("TALK");
    }
  });

  it("carries only buildings and signs", () => {
    const kinds = new Set(worldObjects.map((object) => object.kind));
    expect([...kinds].sort()).toEqual(["building", "sign"]);
    expect(worldObjects).toHaveLength(buildings.length + signs.length);
  });
});

/**
 * The house is the neighbour TOMODACHI used to stand beside, so it is the one
 * thing most likely to be disturbed by removing it.
 */
describe("Edward's House survives the removal", () => {
  it("is still an interactable building that opens the location", () => {
    const house = buildings.find((building) => building.id === "edwards-house");
    expect(house).toBeDefined();
    expect(house?.interaction).toEqual({
      type: "OPEN_LOCATION",
      locationId: "edwards-house",
    });
    expect(getInteractionPrompt(house!.interaction!)).toBe("E TO ENTER");
  });

  it("is still reachable by walking to it", () => {
    const house = buildings.find((building) => building.id === "edwards-house")!;
    const atDoor = {
      ...initialPlayer,
      position: { ...initialPlayer.position, x: house.position.x },
    };
    expect(findNearestInteractable(atDoor, worldObjects)?.id).toBe("edwards-house");
  });

  /**
   * The bug this guards against is an interaction zone left behind by a
   * deleted object. TOMODACHI stood at x 664 with a range of 82, so it used to
   * answer E out to x 746.
   *
   * The house itself legitimately reaches x 684 (it spans 340–612 with a range
   * of 72), and standing there now reads EDWARD'S HOUSE, which is correct
   * rather than leftover. The dead stretch is what is past the house: from 700
   * out to the far edge of TOMODACHI's old range, nothing may answer at all.
   */
  it("leaves no interactable in the stretch TOMODACHI used to own", () => {
    for (let x = 700; x <= 760; x += 4) {
      const walker = {
        ...initialPlayer,
        position: { ...initialPlayer.position, x },
      };
      const near = findNearestInteractable(walker, worldObjects);
      expect(near, `something is still interactable at x=${x}`).toBeUndefined();
    }
  });
});

describe("finished public world", () => {
  it("keeps scaffolding as scenery without an action or interaction target", () => {
    const scaffolding = buildings.find(({ id }) => id === "construction-area")!;
    expect(scaffolding).toBeDefined();
    expect(scaffolding.interaction).toBeUndefined();
    for (let x = scaffolding.position.x - 72; x <= scaffolding.position.x + scaffolding.size.width + 72; x += 4) {
      const walker = {
        ...initialPlayer,
        position: { ...initialPlayer.position, x },
      };
      expect(findNearestInteractable(walker, worldObjects), `target at x=${x}`).toBeUndefined();
    }
  });

  it("retains exactly the four current project entrances and Edward's House", () => {
    const actions = worldObjects.flatMap(({ interaction }) => interaction ? [interaction] : []);
    expect(actions.filter((action) => action.type === "OPEN_PROJECT").map((action) => action.projectId).sort()).toEqual([
      "afl-predict", "soonpermario", "sportsgang", "wardrobe",
    ]);
    expect(actions.filter((action) => action.type === "OPEN_LOCATION")).toEqual([
      { type: "OPEN_LOCATION", locationId: "edwards-house" },
    ]);
    expect(actions.some((action) => action.type === "OPEN_INFO")).toBe(false);
  });
});
