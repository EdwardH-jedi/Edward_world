import { describe, expect, it } from "vitest";
import {
  createLookAhead,
  getCameraX,
  LOOK_AHEAD,
  LOOK_FLIP_DISTANCE,
  movePlayerX,
  stepLookAhead,
  type HorizontalDirection,
} from "@/lib/game/movement";
import { PIXEL_UNIT } from "@/lib/game/terrain";
import { initialPlayer, WORLD_CONFIG } from "@/data/world";

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

describe("camera look-ahead hysteresis", () => {
  // Plays held keys through movement and the look-ahead the way the world's
  // frame loop does, and records the camera at every tick.
  function simulate(holds: readonly [HorizontalDirection, number][], tickMs: number) {
    const viewportWidth = 320 * PIXEL_UNIT;
    let x = 1_200;
    let look = createLookAhead(1);
    const ticks: { camera: number; lead: number }[] = [];
    for (const [direction, ms] of holds) {
      for (let t = 0; t < ms; t += tickMs) {
        const before = x;
        x = movePlayerX({
          currentX: x,
          direction,
          deltaSeconds: tickMs / 1_000,
          speed: initialPlayer.speed,
          worldWidth: WORLD_CONFIG.width,
          playerWidth: initialPlayer.size.width,
        });
        look = stepLookAhead(look, direction, Math.abs(x - before), tickMs);
        const camera = getCameraX({
          playerX: x,
          playerWidth: initialPlayer.size.width,
          viewportWidth,
          worldWidth: WORLD_CONFIG.width,
          lookAhead: look.offset,
        });
        // The lead is the camera minus the part that merely follows the player,
        // i.e. what moves Edward on screen; following him is a whole-world pan.
        ticks.push({ camera, lead: camera - getCameraX({
          playerX: x,
          playerWidth: initialPlayer.size.width,
          viewportWidth,
          worldWidth: WORLD_CONFIG.width,
        }) });
      }
    }
    return ticks;
  }

  const flips: [HorizontalDirection, number][] = [
    [-1, 200],
    [1, 200],
    [-1, 200],
    [1, 200],
  ];

  it("never moves the camera's lead more than one unit per tick through A,D,A,D", () => {
    for (const tickMs of [1_000 / 60, 1_000 / 144, 1]) {
      const ticks = simulate(flips, tickMs);
      let previous = LOOK_AHEAD;
      for (const { lead } of ticks) {
        expect(Math.abs(lead - previous)).toBeLessThanOrEqual(PIXEL_UNIT);
        previous = lead;
      }
      // It does still settle on each new direction.
      expect(ticks.at(-1)!.lead).toBe(LOOK_AHEAD);
    }
  });

  it("keeps the old lead until the player has walked far enough the new way", () => {
    const tickMs = 1;
    const ticks = simulate([[-1, 200]], tickMs);
    const perTick = (initialPlayer.speed * tickMs) / 1_000;
    const committedAt = ticks.findIndex(({ lead }) => lead < LOOK_AHEAD);
    expect(committedAt).toBeGreaterThan(0);
    expect((committedAt + 1) * perTick).toBeGreaterThanOrEqual(LOOK_FLIP_DISTANCE);
    expect(committedAt * perTick).toBeLessThan(LOOK_FLIP_DISTANCE);
    expect(ticks.slice(0, committedAt).every(({ lead }) => lead === LOOK_AHEAD)).toBe(true);
  });

  it("also turns after the player stands facing the new way for two ambient frames", () => {
    let look = stepLookAhead(createLookAhead(1), -1, 1, 16);
    expect(look.lead).toBe(1);
    for (let t = 0; t < 900; t += 16) look = stepLookAhead(look, 0, 0, 16);
    expect(look.lead).toBe(-1);
  });

  it("returns the same state on an idle frame with nothing pending", () => {
    const settled = createLookAhead(-1);
    expect(stepLookAhead(settled, 0, 0, 16)).toBe(settled);
  });
});
