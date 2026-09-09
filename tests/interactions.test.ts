import { describe, expect, it } from "vitest";
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
