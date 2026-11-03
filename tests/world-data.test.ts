import { describe, expect, it } from "vitest";
import { chapters } from "@/data/personal";
import { buildings, initialPlayer, signs, WORLD_CONFIG, worldObjects } from "@/data/world";
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
  /*
   * The scaffolding was a placeholder with no payoff, and it is gone: the
   * stretch it stood on is the timeline street now. Buildings are exactly the
   * four project entrances and Edward's House, and the stations are signs.
   */
  it("has no scaffolding left: buildings are the four projects and the house", () => {
    expect(JSON.stringify(worldObjects)).not.toMatch(/construction|scaffold/i);
    expect(buildings.map(({ id }) => id).sort()).toEqual([
      "afl-lab", "arcade", "edwards-house", "sportsgang", "wardrobe",
    ]);
  });

  /*
   * Walking right from the Arcade's door to the end of the world, exactly one
   * thing answers E at every step, and the stations take over from each other
   * in chapter order: never two at once, never one twice, nothing skipped.
   */
  it("hands the street over station by station, in chapter order, from the Arcade to the exit", () => {
    const arcade = buildings.find(({ id }) => id === "arcade")!;
    const end = WORLD_CONFIG.width - initialPlayer.size.width;
    const sequence: string[] = [];
    for (let x = arcade.position.x; x <= end; x += 4) {
      const walker = { ...initialPlayer, position: { ...initialPlayer.position, x } };
      const found = findNearestInteractable(walker, worldObjects);
      expect(found, `nothing answers at x=${x}`).toBeDefined();
      if (sequence.at(-1) !== found!.id) sequence.push(found!.id);
    }
    expect(sequence).toEqual([
      "arcade",
      ...chapters.map((chapter) => `station-${chapter.id}`),
      "world-exit",
    ]);
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
