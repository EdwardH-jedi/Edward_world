import { describe, expect, it } from "vitest";
import {
  advancePlatformer,
  createPlatformerState,
  FLAG,
  getJumpReach,
  getRunSummary,
  hazardAt,
  HAZARDS,
  LEVEL_WIDTH,
  PICKUPS,
  PLATFORMS,
  PLAYER_SIZE,
  STARTING_COFFEES,
  type PlatformerState,
} from "@/lib/game/arcade/platformer";
import { IDLE_INPUT, type MinigameInput } from "@/lib/game/minigames/types";

const TICK = 1 / 60;
const right: MinigameInput = { ...IDLE_INPUT, right: true };
const rightJump: MinigameInput = {
  ...IDLE_INPUT,
  right: true,
  up: true,
  action: true,
};

function run(
  ticks: number,
  inputAt: (tick: number, state: PlatformerState) => MinigameInput,
  initial = createPlatformerState(),
) {
  let state = initial;
  for (let tick = 0; tick < ticks && state.phase !== "FAILED"; tick += 1) {
    state = advancePlatformer(state, inputAt(tick, state), TICK);
  }
  return state;
}

describe("level layout", () => {
  it("keeps everything inside the level", () => {
    for (const box of [...PLATFORMS, ...HAZARDS, ...PICKUPS, FLAG]) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(LEVEL_WIDTH);
    }
  });

  it("leaves gaps between the ground runs, so the jumps are real", () => {
    const ground = PLATFORMS.filter((platform) => platform.y === 300).sort(
      (a, b) => a.x - b.x,
    );
    const gaps = ground
      .slice(1)
      .map((platform, index) => platform.x - (ground[index].x + ground[index].width));
    expect(gaps.every((gap) => gap > 0)).toBe(true);
    // Wide enough to matter, narrow enough to clear.
    expect(Math.max(...gaps)).toBeLessThan(180);
  });

  it("gives a jump real room over the widest gap, not a pixel of it", () => {
    const ground = PLATFORMS.filter((platform) => platform.y === 300).sort(
      (a, b) => a.x - b.x,
    );
    // What the player must actually cross: the gap plus their own body, since
    // they leave from the last ledge pixel their heels are still on.
    const crossings = ground
      .slice(1)
      .map(
        (platform, index) =>
          platform.x - (ground[index].x + ground[index].width) + PLAYER_SIZE.width,
      );
    const { distance } = getJumpReach();
    // The margin is the point. A jump that only just reaches means the gap is
    // cleared from its final pixels or not at all, which is not a jump a
    // first-time player can make.
    expect(distance).toBeGreaterThan(Math.max(...crossings) + 40);
  });

  it("hangs no ledge over the run-up to a gap", () => {
    const { distance } = getJumpReach();
    const ground = PLATFORMS.filter((platform) => platform.y === 300).sort(
      (a, b) => a.x - b.x,
    );
    const ledges = PLATFORMS.filter((platform) => platform.y !== 300);

    ground.slice(0, -1).forEach((run, index) => {
      const edge = run.x + run.width;
      const crossing = ground[index + 1].x - edge + PLAYER_SIZE.width;
      // The earliest a jump may leave and still land: anywhere in here is a
      // place a player might take off from, so a ledge above it is a ceiling
      // on the only jump that clears the pit.
      const earliest = edge - (distance - crossing) - PLAYER_SIZE.width;
      for (const ledge of ledges) {
        const overlaps = ledge.x < edge && ledge.x + ledge.width > earliest;
        expect(`${ledge.x}@${ledge.y} over ${earliest.toFixed(0)}-${edge}`).toBe(
          overlaps ? "" : `${ledge.x}@${ledge.y} over ${earliest.toFixed(0)}-${edge}`,
        );
      }
    });
  });

  it("puts every platform within reach of a jump from the ground below it", () => {
    const { height } = getJumpReach();
    const highest = Math.min(...PLATFORMS.map((platform) => platform.y));
    expect(300 - highest).toBeLessThan(height);
  });

  it("leaves no pickup a player cannot stand or jump up to", () => {
    const { height } = getJumpReach();
    // Feet at the apex of a jump from the lowest ground.
    const apex = 300 - height;
    for (const pickup of PICKUPS) {
      // The player's head is a body-height above their feet, so a pickup is
      // reachable if the apex body overlaps it at all.
      expect(apex - PLAYER_SIZE.height).toBeLessThan(pickup.y + pickup.height);
    }
  });

  it("patrols each hazard between its own bounds, forever", () => {
    for (const hazard of HAZARDS) {
      for (let t = 0; t < 40; t += 0.37) {
        const at = hazardAt(hazard, t);
        expect(at.x).toBeGreaterThanOrEqual(hazard.from - 0.001);
        expect(at.x).toBeLessThanOrEqual(hazard.to + 0.001);
      }
      // It genuinely moves rather than sitting at one end.
      const samples = new Set(
        Array.from({ length: 20 }, (_, i) => Math.round(hazardAt(hazard, i * 0.3).x)),
      );
      expect(samples.size).toBeGreaterThan(3);
    }
  });
});

describe("movement", () => {
  it("waits for the player before the clock starts", () => {
    const idle = run(120, () => IDLE_INPUT);
    expect(idle.phase).toBe("READY");
    expect(idle.elapsed).toBe(0);
  });

  it("starts running on the first input", () => {
    const moved = run(10, () => right);
    expect(moved.phase).toBe("RUNNING");
    expect(moved.x).toBeGreaterThan(createPlatformerState().x);
    expect(moved.facing).toBe("right");
  });

  it("stands on the ground rather than sinking through it", () => {
    const state = run(180, () => IDLE_INPUT, {
      ...createPlatformerState(),
      phase: "RUNNING",
    });
    expect(state.grounded).toBe(true);
    expect(state.y).toBe(300 - PLAYER_SIZE.height);
  });

  it("jumps higher when the button is held than when it is tapped", () => {
    const base = { ...createPlatformerState(), phase: "RUNNING" as const };
    const tapped = run(30, (tick) => (tick === 0 ? rightJump : IDLE_INPUT), base);
    const held = run(30, () => rightJump, base);
    expect(held.y).toBeLessThan(tapped.y);
  });

  it("never leaves the level sideways", () => {
    const state = run(2_000, () => right);
    expect(state.x).toBeLessThanOrEqual(LEVEL_WIDTH - PLAYER_SIZE.width);
    expect(state.x).toBeGreaterThanOrEqual(0);
  });
});

describe("consequences", () => {
  it("costs a coffee and returns the player to a checkpoint on a fall", () => {
    // Stand over the first pit with nothing under foot.
    const falling: PlatformerState = {
      ...createPlatformerState(),
      phase: "RUNNING",
      x: 520,
      y: 260,
      grounded: false,
    };
    const state = run(200, () => IDLE_INPUT, falling);
    expect(state.coffees).toBeLessThan(STARTING_COFFEES);
    expect(state.y).toBe(300 - PLAYER_SIZE.height);
    expect(state.x).toBeLessThanOrEqual(520);
  });

  it("ends the run once the coffee runs out", () => {
    let state: PlatformerState = {
      ...createPlatformerState(),
      phase: "RUNNING",
      coffees: 1,
      x: 520,
      y: 260,
      grounded: false,
    };
    state = run(200, () => IDLE_INPUT, state);
    expect(state.coffees).toBe(0);
    expect(state.phase).toBe("FAILED");
    expect(state.banner).toBe("OUT OF COFFEE");
  });

  it("collects a commit only once", () => {
    const pickup = PICKUPS.find((entry) => entry.kind === "COMMIT")!;
    const onIt: PlatformerState = {
      ...createPlatformerState(),
      phase: "RUNNING",
      x: pickup.x - 4,
      y: pickup.y - 2,
    };
    const state = run(60, () => IDLE_INPUT, onIt);
    expect(state.commits).toBe(1);
    expect(state.collected).toContain(pickup.id);
  });

  it("banners a skill when one is picked up", () => {
    const skill = PICKUPS.find((entry) => entry.kind === "SKILL")!;
    const onIt: PlatformerState = {
      ...createPlatformerState(),
      phase: "RUNNING",
      x: skill.x - 3,
      y: skill.y - 6,
    };
    const state = run(4, () => IDLE_INPUT, onIt);
    expect(state.skills).toContain(skill.label);
    expect(state.banner).toContain(skill.label);
  });

  it("closes a bug when landed on from above, and only from above", () => {
    const hazard = HAZARDS[0];
    const above: PlatformerState = {
      ...createPlatformerState(),
      phase: "RUNNING",
      x: hazardAt(hazard, 0).x,
      y: hazard.y - PLAYER_SIZE.height - 2,
      vy: 200,
      grounded: false,
    };
    const stomped = advancePlatformer(above, IDLE_INPUT, TICK);
    expect(stomped.defeated).toContain(hazard.id);
    expect(stomped.banner).toBe(hazard.closed);
    expect(stomped.vy).toBeLessThan(0);
    expect(stomped.coffees).toBe(STARTING_COFFEES);

    const alongside: PlatformerState = {
      ...createPlatformerState(),
      phase: "RUNNING",
      x: hazardAt(hazard, 0).x - 6,
      y: hazard.y,
      vy: 0,
      grounded: true,
    };
    const walkedInto = advancePlatformer(alongside, right, TICK);
    expect(walkedInto.coffees).toBeLessThan(STARTING_COFFEES);
    expect(walkedInto.defeated).toHaveLength(0);
  });

  it("finishes at the flag and reports the run", () => {
    const atFlag: PlatformerState = {
      ...createPlatformerState(),
      phase: "RUNNING",
      x: FLAG.x - 8,
      y: 300 - PLAYER_SIZE.height,
    };
    const state = run(60, () => right, atFlag);
    expect(state.phase).toBe("FINISHED");
    expect(state.banner).toBe("OFFER EXTENDED");

    const summary = getRunSummary(state);
    expect(summary.finished).toBe(true);
    expect(summary.totalCommits).toBe(
      PICKUPS.filter((entry) => entry.kind === "COMMIT").length,
    );
    expect(summary.commits).toBeLessThanOrEqual(summary.totalCommits);
    expect(summary.totalBugs).toBe(HAZARDS.length);
  });

  it("is completable at any frame rate, however early the player commits", () => {
    /** Is there ground directly under this point? */
    const groundAt = (x: number) =>
      PLATFORMS.some(
        (platform) =>
          platform.y === 300 && x >= platform.x && x <= platform.x + platform.width,
      );

    // A bot that actually plays: jump the gaps, jump the bugs, otherwise run.
    // `lead` is how far ahead of the edge it decides — 0 is a player who
    // leaves from the last pixel, 60 is one who commits well before it. The
    // level has to hold for both, and at frame rates the loop really sees.
    const play = (fps: number, lead: number) => {
      const tick = 1 / fps;
      let state = createPlatformerState();
      for (
        let frame = 0;
        frame < fps * 120 && state.phase !== "FAILED" && state.phase !== "FINISHED";
        frame += 1
      ) {
        const nose = state.x + PLAYER_SIZE.width + lead;
        const bugAhead = HAZARDS.some((hazard) => {
          const at = hazardAt(hazard, state.elapsed);
          return at.x > state.x && at.x < nose + 70;
        });
        const gapAhead = !groundAt(nose + 8);
        // Hold the button while rising, the way a person does.
        const shouldJump =
          (state.grounded && (gapAhead || bugAhead)) || state.vy < 0;
        state = advancePlatformer(state, shouldJump ? rightJump : right, tick);
      }
      return state;
    };

    for (const fps of [60, 50, 30]) {
      for (const lead of [0, 15, 30, 60]) {
        const state = play(fps, lead);
        expect(`${fps}/${lead}: ${state.phase}`).toBe(`${fps}/${lead}: FINISHED`);
        // The bot never hesitates, so its time is the floor of the human
        // window, not the target: a first-time player who stops, misjudges a
        // gap and spends a coffee lands in the 15-30s this is sized for.
        expect(state.elapsed).toBeGreaterThan(6);
        expect(state.elapsed).toBeLessThan(20);
      }
    }
  });
});
