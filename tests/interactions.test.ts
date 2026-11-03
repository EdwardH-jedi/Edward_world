import { describe, expect, it } from "vitest";
import { timelineStations } from "@/data/timeline";
import { initialPlayer, worldObjects } from "@/data/world";
import { findNearestInteractable, getInteractionPrompt } from "@/lib/game/interactions";

describe("interaction discovery", () => {
  it("finds the nearest object within its interaction range", () => {
    const target = findNearestInteractable(initialPlayer, worldObjects);
    expect(target?.id).toBe("movement-sign");
  });

  it("returns no target when the player is outside all ranges", () => {
    const target = findNearestInteractable(
      { ...initialPlayer, position: { ...initialPlayer.position, x: 2_700 } },
      worldObjects,
    );
    expect(target).toBeUndefined();
  });
});

describe("timeline stations", () => {
  it("answer E to a player standing in front of each one, and nothing else does", () => {
    for (const station of timelineStations) {
      const x = station.position.x + station.size.width / 2 - initialPlayer.size.width / 2;
      const target = findNearestInteractable(
        { ...initialPlayer, position: { ...initialPlayer.position, x } },
        worldObjects,
      );
      expect(target?.id, station.id).toBe(station.id);
      expect(getInteractionPrompt(target!.interaction)).toBe("E TO READ");
    }
  });

  it("are far enough apart that the player never stands over two at once", () => {
    for (let index = 1; index < timelineStations.length; index += 1) {
      const left = timelineStations[index - 1];
      const right = timelineStations[index];
      const gap = right.position.x - (left.position.x + left.size.width);
      expect(gap, `${left.id} → ${right.id}`).toBeGreaterThan(initialPlayer.size.width);
    }
  });

  it("each own a stretch of the street wide enough to stop in", () => {
    const owned = new Map<string, number>();
    for (let x = 3_000; x <= 3_792; x += 1) {
      const id = findNearestInteractable(
        { ...initialPlayer, position: { ...initialPlayer.position, x } },
        worldObjects,
      )?.id;
      if (id) owned.set(id, (owned.get(id) ?? 0) + 1);
    }
    for (const station of timelineStations) {
      // Two player widths: at 480 px/s that is a fifth of a second of walking.
      expect(owned.get(station.id) ?? 0, station.id).toBeGreaterThanOrEqual(96);
    }
  });
});

describe("interaction prompts", () => {
  it("maps every action family to a context prompt", () => {
    expect(getInteractionPrompt({ type: "OPEN_PROJECT", projectId: "wardrobe" })).toBe(
      "E TO ENTER",
    );
    expect(
      getInteractionPrompt({ type: "OPEN_LOCATION", locationId: "edwards-house" }),
    ).toBe("E TO ENTER");
    expect(getInteractionPrompt({ type: "READ", heading: "A", text: "B" })).toBe(
      "E TO READ",
    );
  });
});
