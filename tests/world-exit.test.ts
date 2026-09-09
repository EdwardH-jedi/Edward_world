import { describe, expect, it } from "vitest";
import { initialPlayer, signs, WORLD_CONFIG, worldObjects } from "@/data/world";
import { findNearestInteractable, getInteractionPrompt } from "@/lib/game/interactions";
import { movePlayerX } from "@/lib/game/movement";
import { PIXEL_UNIT } from "@/lib/game/terrain";
import {
  createFireworks,
  createStillFireworks,
  FIREWORK_COLORS,
  FIREWORKS_BURSTS,
  FIREWORKS_SECONDS,
  sparkAlpha,
  stepFireworks,
} from "@/lib/pixel/fireworks";
import { worldExitArt } from "@/lib/pixel/world-exit";
import { projects } from "@/data/projects";

/**
 * The way out of Edward's World.
 *
 * It is the end of a visit, so the tests are mostly about it being reachable,
 * unlocked, and not a project.
 */

const exitGate = signs.find((sign) => sign.id === "world-exit")!;

describe("the exit gate", () => {
  it("stands at the right-hand end of the world, inside it", () => {
    expect(exitGate).toBeDefined();
    const right = exitGate.position.x + exitGate.size.width;
    expect(right).toBeLessThanOrEqual(WORLD_CONFIG.width);
    // Past everything else: nothing in the world starts further right.
    for (const object of worldObjects) {
      if (object.id === exitGate.id) continue;
      expect(object.position.x).toBeLessThan(exitGate.position.x);
    }
  });

  it("can actually be walked to", () => {
    // The player clamps before the world's edge, so a gate placed past the
    // clamp would be visible and unreachable.
    let x = initialPlayer.position.x;
    for (let step = 0; step < 4_000; step += 1) {
      x = movePlayerX({
        currentX: x,
        direction: 1,
        deltaSeconds: 1 / 60,
        speed: initialPlayer.speed,
        worldWidth: WORLD_CONFIG.width,
        playerWidth: initialPlayer.size.width,
      });
    }
    expect(x).toBe(WORLD_CONFIG.width - initialPlayer.size.width);
    const walker = { ...initialPlayer, position: { ...initialPlayer.position, x } };
    expect(findNearestInteractable(walker, worldObjects)?.id).toBe("world-exit");
  });

  it("is not locked behind finishing anything", () => {
    // No sport, project or visit state appears in the gate at all: it is a
    // position and an action, and there is nothing to satisfy first.
    expect(Object.keys(exitGate)).toEqual([
      "kind",
      "id",
      "label",
      "position",
      "size",
      "interactionRange",
      "interaction",
    ]);
    expect(exitGate.interaction).toEqual({ type: "LEAVE_WORLD" });
  });

  it("is not a project, and does not become one", () => {
    // The index lists work; leaving is not work. That the gate cannot *be* a
    // project is settled by the type system — `PortfolioProjectId` has no
    // member for it, and adding one would not compile — so what is worth
    // asserting here is that the list of projects did not quietly grow.
    expect(projects.map((project) => project.id).sort()).toEqual([
      "afl-predict",
      "soonpermario",
      "sportsgang",
      "wardrobe",
    ]);
    const actions = worldObjects.flatMap((object) =>
      object.interaction ? [object.interaction] : [],
    );
    expect(actions.filter((action) => action.type === "LEAVE_WORLD")).toHaveLength(1);
    expect(
      actions
        .filter((action) => action.type === "OPEN_PROJECT")
        .map((action) => action.projectId)
        .sort(),
    ).toEqual(["afl-predict", "soonpermario", "sportsgang", "wardrobe"]);
  });

  it("says what pressing E will do", () => {
    // Not "ENTER": nothing is being entered.
    expect(getInteractionPrompt(exitGate.interaction)).toBe("E TO LEAVE");
  });

  it("is drawn exactly to its world footprint", () => {
    expect(worldExitArt.size.width * PIXEL_UNIT).toBe(exitGate.size.width);
    expect(worldExitArt.size.height * PIXEL_UNIT).toBe(exitGate.size.height);
  });

  it("draws a gateway you can see through, on the pixel grid", () => {
    const drawn: { x: number; y: number; w: number; h: number; color: string }[] = [];
    worldExitArt.draw((x, y, w, h, color) => drawn.push({ x, y, w, h, color }), 0);

    expect(drawn.length).toBeGreaterThan(20);
    for (const box of drawn) {
      expect(Number.isInteger(box.x)).toBe(true);
      expect(Number.isInteger(box.y)).toBe(true);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.w).toBeLessThanOrEqual(worldExitArt.size.width);
      expect(box.y + box.h).toBeLessThanOrEqual(worldExitArt.size.height);
    }

    // The middle of the opening, below the sign board, is left empty — a gate
    // that reads as closed would read as something to be unlocked.
    const opening = drawn.filter(
      (box) => box.y >= 20 && box.x > 4 && box.x + box.w < 16,
    );
    expect(opening).toHaveLength(0);
  });

  it("only animates its lantern", () => {
    const render = (frame: number) => {
      const boxes: string[] = [];
      worldExitArt.draw(
        (x, y, w, h, color) => boxes.push(`${x},${y},${w},${h},${color}`),
        frame,
      );
      return boxes;
    };
    const a = render(0);
    const b = render(1);
    expect(a).toHaveLength(b.length);
    // Exactly one box differs between frames.
    const differing = a.filter((box, index) => box !== b[index]);
    expect(differing).toHaveLength(1);
  });
});

describe("the fireworks", () => {
  it("are finite, and stop on their own", () => {
    const state = createFireworks();
    let alive = true;
    let seconds = 0;
    // Well past the show's own length: it must end without being told to.
    while (seconds < FIREWORKS_SECONDS * 3) {
      alive = stepFireworks(state, 1 / 60, 240, 135);
      seconds += 1 / 60;
      if (!alive) break;
    }
    expect(alive).toBe(false);
    expect(seconds).toBeLessThan(FIREWORKS_SECONDS + 0.5);
    // And nothing is left drawing.
    const remaining = state.bursts.reduce((n, burst) => n + burst.sparks.length, 0);
    expect(remaining).toBe(0);
  });

  it("opens every burst exactly once", () => {
    const state = createFireworks();
    for (let step = 0; step < 60 * 10; step += 1) {
      stepFireworks(state, 1 / 60, 240, 135);
    }
    expect(state.bursts).toHaveLength(FIREWORKS_BURSTS);
    expect(state.bursts.every((burst) => burst.launched)).toBe(true);
  });

  it("is the same show every time — no clock and no randomness", () => {
    const signature = () => {
      const state = createFireworks();
      for (let step = 0; step < 120; step += 1) stepFireworks(state, 1 / 60, 240, 135);
      return state.bursts.map((burst) =>
        burst.sparks.map((s) => `${s.x.toFixed(4)}:${s.y.toFixed(4)}`).join("|"),
      );
    };
    expect(signature()).toEqual(signature());
  });

  it("fades every spark out rather than cutting it", () => {
    const state = createFireworks();
    stepFireworks(state, 0.2, 240, 135);
    const spark = state.bursts[0].sparks[0];
    const early = sparkAlpha(spark);
    stepFireworks(state, 0.6, 240, 135);
    expect(sparkAlpha(spark)).toBeLessThan(early);
    expect(sparkAlpha(spark)).toBeGreaterThanOrEqual(0);
  });

  it("gives reduced motion the same bursts, held still", () => {
    const still = createStillFireworks(240, 135);
    expect(still.bursts).toHaveLength(FIREWORKS_BURSTS);
    expect(still.bursts.every((burst) => burst.launched)).toBe(true);
    expect(still.bursts.every((burst) => burst.sparks.length > 0)).toBe(true);
    // Visible rather than already faded out: a still frame has to be a frame.
    for (const burst of still.bursts) {
      for (const spark of burst.sparks) expect(sparkAlpha(spark)).toBeGreaterThan(0.3);
    }
  });

  it("stays on the approved palette", () => {
    // The world's colours, not a saturated firework display.
    for (const color of FIREWORK_COLORS) {
      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
    }
    const state = createFireworks();
    stepFireworks(state, 0.3, 240, 135);
    for (const burst of state.bursts) {
      for (const spark of burst.sparks) {
        expect(FIREWORK_COLORS[spark.colorIndex]).toBeDefined();
      }
    }
  });
});
