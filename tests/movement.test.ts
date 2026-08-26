import { describe, expect, it } from "vitest";
import { getCameraX, movePlayerX } from "@/lib/game/movement";

describe("movePlayerX", () => {
  it("moves the same distance regardless of frame division", () => {
    const oneFrame = movePlayerX({
      currentX: 100,
      direction: 1,
      deltaSeconds: 1,
      speed: 280,
      worldWidth: 2_800,
      playerWidth: 42,
    });

    let manyFrames = 100;
    for (let frame = 0; frame < 10; frame += 1) {
      manyFrames = movePlayerX({
        currentX: manyFrames,
        direction: 1,
        deltaSeconds: 0.1,
        speed: 280,
        worldWidth: 2_800,
        playerWidth: 42,
      });
    }

    expect(manyFrames).toBeCloseTo(oneFrame);
  });

  it("keeps the player inside both world boundaries", () => {
    expect(
      movePlayerX({
        currentX: 5,
        direction: -1,
        deltaSeconds: 1,
        speed: 280,
        worldWidth: 500,
        playerWidth: 42,
      }),
    ).toBe(0);

    expect(
      movePlayerX({
        currentX: 490,
        direction: 1,
        deltaSeconds: 1,
        speed: 280,
        worldWidth: 500,
        playerWidth: 42,
      }),
    ).toBe(458);
  });
});

describe("getCameraX", () => {
  it("centres on the player without exposing space beyond the world", () => {
    expect(
      getCameraX({ playerX: 500, playerWidth: 40, viewportWidth: 400, worldWidth: 1_000 }),
    ).toBe(320);
    expect(
      getCameraX({ playerX: 980, playerWidth: 40, viewportWidth: 400, worldWidth: 1_000 }),
    ).toBe(600);
  });
});
