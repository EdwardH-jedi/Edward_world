import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  createFixedStepper,
  SPORTSGANG_MAX_SUBSTEPS,
  SPORTSGANG_STEP_MS,
} from "@/lib/game/minigames/fixed-step";
import {
  createGolfRunResult,
  GOLF_RESULT_VERSION,
  GUEST_DISPLAY_NAME,
  isGolfRunResultV1,
  nextShotNumber,
  toSportResult,
  totalStrokesOf,
  type GolfRunResultV1,
} from "@/lib/game/minigames/golf-result";
import {
  createHeldTracker,
  DEFAULT_KEY_MAP,
  invertKeyMap,
  isComposingKeyEvent,
  RUNNING_KEY_MAP,
  shouldYieldToTarget,
} from "@/lib/game/minigames/input-core";
import { IDLE_INPUT, type MinigameInput } from "@/lib/game/minigames/types";

/**
 * The contracts the parallel SportsGang sessions are built on.
 *
 * These exist so A, B and C can rely on shared behaviour without reading each
 * other's code: if one of them changes the clock or the result shape, this
 * file is what fails.
 */

const held = (over: Partial<MinigameInput> = {}): MinigameInput => ({
  ...IDLE_INPUT,
  ...over,
});
const pressFrame = held({ pressed: true, action: true });

describe("fixed simulation clock", () => {
  it("runs every whole step a frame paid for", () => {
    const stepper = createFixedStepper();
    const seen: number[] = [];

    // 50 ms at 60 Hz is exactly three steps. Getting two here is the float
    // drift this stepper exists to not have.
    const report = stepper.advance(50, IDLE_INPUT, (dt) => seen.push(dt));

    expect(report.steps).toBe(3);
    expect(seen).toHaveLength(3);
    expect(new Set(seen).size).toBe(1);
    expect(seen[0]).toBeCloseTo(SPORTSGANG_STEP_MS / 1000, 10);
    expect(stepper.pendingMs).toBe(0);
  });

  it("carries the remainder of a frame that does not divide evenly", () => {
    const stepper = createFixedStepper();
    let steps = 0;

    // 58 ms is three steps and a bit under half of a fourth.
    stepper.advance(58, IDLE_INPUT, () => {
      steps += 1;
    });

    expect(steps).toBe(3);
    expect(stepper.pendingMs).toBeGreaterThan(0);
    expect(stepper.pendingMs).toBeLessThan(SPORTSGANG_STEP_MS);

    // The remainder is not lost: it shortens the next frame's road to a step.
    let more = 0;
    stepper.advance(10, IDLE_INPUT, () => {
      more += 1;
    });
    expect(more).toBe(1);
  });

  it("does not accumulate drift over a long run", () => {
    const stepper = createFixedStepper();
    let steps = 0;
    // 600 frames of a 16 ms browser frame: 9600 ms is 576 whole steps.
    for (let frame = 0; frame < 600; frame += 1) {
      stepper.advance(16, IDLE_INPUT, () => {
        steps += 1;
      });
    }
    expect(steps).toBe(Math.floor((600 * 16) / SPORTSGANG_STEP_MS));
    expect(stepper.elapsedMs).toBeCloseTo(steps * SPORTSGANG_STEP_MS, 6);
  });

  it("advances the character and the ball on the same dt", () => {
    // One step callback drives whatever the sport put in its state, so there
    // is no second timer a ball could drift onto.
    const stepper = createFixedStepper();
    const dts: number[] = [];
    stepper.advance(100, IDLE_INPUT, (dt) => dts.push(dt));
    expect(dts.every((dt) => dt === dts[0])).toBe(true);
  });

  it("drops a long stall instead of simulating it all at once", () => {
    const stepper = createFixedStepper();
    let steps = 0;

    // Five seconds hidden. Catching that up would be 300 steps.
    const report = stepper.advance(5_000, IDLE_INPUT, () => {
      steps += 1;
    });

    expect(steps).toBe(SPORTSGANG_MAX_SUBSTEPS);
    expect(report.steps).toBe(SPORTSGANG_MAX_SUBSTEPS);
    expect(report.droppedMs).toBeGreaterThan(0);
    expect(stepper.pendingMs).toBeLessThan(SPORTSGANG_STEP_MS);
  });

  it("applies one press on exactly one substep", () => {
    const stepper = createFixedStepper();
    const presses: boolean[] = [];

    // A frame long enough for three steps, carrying a single press edge.
    stepper.advance(50, pressFrame, (_dt, input) => presses.push(input.pressed));

    expect(presses).toHaveLength(3);
    expect(presses.filter(Boolean)).toHaveLength(1);
    expect(presses[0]).toBe(true);
  });

  it("keeps held state on every substep while clearing the edge", () => {
    const stepper = createFixedStepper();
    const seen: MinigameInput[] = [];
    stepper.advance(50, pressFrame, (_dt, input) => seen.push(input));
    expect(seen.every((input) => input.action)).toBe(true);
  });

  it("latches an edge from a frame too short to step", () => {
    const stepper = createFixedStepper();
    const presses: boolean[] = [];

    // 3 ms cannot produce a step at 60 Hz. The tap must not be lost.
    const short = stepper.advance(3, pressFrame, (_dt, input) =>
      presses.push(input.pressed),
    );
    expect(short.steps).toBe(0);
    expect(presses).toHaveLength(0);

    stepper.advance(20, held({ action: true }), (_dt, input) =>
      presses.push(input.pressed),
    );
    expect(presses.filter(Boolean)).toHaveLength(1);
  });

  it("does not replay a latched edge twice", () => {
    const stepper = createFixedStepper();
    const presses: boolean[] = [];
    stepper.advance(3, pressFrame, (_dt, input) => presses.push(input.pressed));
    stepper.advance(50, held({ action: true }), (_dt, input) =>
      presses.push(input.pressed),
    );
    stepper.advance(50, held({ action: true }), (_dt, input) =>
      presses.push(input.pressed),
    );
    expect(presses.filter(Boolean)).toHaveLength(1);
  });

  it("forgets a latched edge and pending time on reset", () => {
    const stepper = createFixedStepper();
    stepper.advance(3, pressFrame, () => {});
    stepper.advance(10, IDLE_INPUT, () => {});
    expect(stepper.pendingMs).toBeGreaterThan(0);

    // Tabbing away, then back.
    stepper.reset();
    expect(stepper.pendingMs).toBe(0);

    const presses: boolean[] = [];
    stepper.advance(50, held({ action: true }), (_dt, input) =>
      presses.push(input.pressed),
    );
    expect(presses.filter(Boolean)).toHaveLength(0);
  });

  it("keeps elapsed simulated time across a reset", () => {
    const stepper = createFixedStepper();
    stepper.advance(50, IDLE_INPUT, () => {});
    const before = stepper.elapsedMs;
    expect(before).toBeCloseTo(3 * SPORTSGANG_STEP_MS, 10);
    stepper.reset();
    expect(stepper.elapsedMs).toBe(before);
  });

  it("ignores a clock that goes backwards", () => {
    const stepper = createFixedStepper();
    let steps = 0;
    stepper.advance(-1_000, IDLE_INPUT, () => {
      steps += 1;
    });
    stepper.advance(Number.NaN, IDLE_INPUT, () => {
      steps += 1;
    });
    expect(steps).toBe(0);
    expect(stepper.pendingMs).toBe(0);
  });

  it("rejects a nonsensical configuration", () => {
    expect(() => createFixedStepper({ stepMs: 0 })).toThrow(RangeError);
    expect(() => createFixedStepper({ maxSubsteps: 0 })).toThrow(RangeError);
  });
});

describe("golf run contract", () => {
  const draft = {
    runId: "run-1",
    courseId: "moss-gate-1",
    status: "completed" as const,
    shotCount: 4,
    penaltyStrokes: 2,
    elapsedSimulationMs: 42_000,
    remainingDistanceM: 0,
    longestDriveM: 241.5,
  };

  it("derives totalStrokes rather than accepting one", () => {
    const run = createGolfRunResult(draft);
    expect(run.totalStrokes).toBe(6);
    expect(run.totalStrokes).toBe(totalStrokesOf(run.shotCount, run.penaltyStrokes));
  });

  it("separates the score from the next shot number", () => {
    const run = createGolfRunResult(draft);
    // Six strokes on the card, but only a fifth ball to hit.
    expect(run.totalStrokes).toBe(6);
    expect(nextShotNumber(run)).toBe(5);
  });

  it("defaults an unnamed player to GUEST", () => {
    expect(createGolfRunResult(draft).playerDisplayName).toBe(GUEST_DISPLAY_NAME);
    expect(
      createGolfRunResult({ ...draft, playerDisplayName: "EDWARD" }).playerDisplayName,
    ).toBe("EDWARD");
  });

  it("stamps a version and a rules version", () => {
    const run = createGolfRunResult(draft);
    expect(run.version).toBe(GOLF_RESULT_VERSION);
    expect(run.rulesVersion.length).toBeGreaterThan(0);
  });

  it("records an abandoned run as a fact", () => {
    const run = createGolfRunResult({
      ...draft,
      status: "abandoned",
      remainingDistanceM: 96,
    });
    expect(run.status).toBe("abandoned");
    expect(isGolfRunResultV1(run)).toBe(true);
  });

  it("omits the shot log unless one is supplied", () => {
    expect(createGolfRunResult(draft).shotLog).toBeUndefined();
    const logged = createGolfRunResult({
      ...draft,
      shotLog: [{ index: 1, atSimulationMs: 0, carryM: 241.5, penalty: 0 }],
    });
    expect(logged.shotLog).toHaveLength(1);
    expect(isGolfRunResultV1(logged)).toBe(true);
  });

  describe("validation, for anything arriving from outside", () => {
    const valid = createGolfRunResult(draft);

    it("accepts a well-formed run", () => {
      expect(isGolfRunResultV1(valid)).toBe(true);
    });

    it("rejects a run whose total disagrees with its parts", () => {
      expect(isGolfRunResultV1({ ...valid, totalStrokes: 99 })).toBe(false);
    });

    it.each([
      "runId",
      "courseId",
      "rulesVersion",
      "status",
      "shotCount",
      "penaltyStrokes",
      "totalStrokes",
      "elapsedSimulationMs",
      "remainingDistanceM",
      "longestDriveM",
      "playerDisplayName",
    ])("rejects a run missing %s", (field) => {
      const partial: Record<string, unknown> = { ...valid };
      delete partial[field];
      expect(isGolfRunResultV1(partial)).toBe(false);
    });

    it("rejects a different version", () => {
      expect(isGolfRunResultV1({ ...valid, version: 2 })).toBe(false);
    });

    it("rejects non-objects and negatives", () => {
      expect(isGolfRunResultV1(null)).toBe(false);
      expect(isGolfRunResultV1("run")).toBe(false);
      expect(isGolfRunResultV1({ ...valid, shotCount: -1, totalStrokes: 1 })).toBe(false);
    });

    it("rejects a malformed shot log", () => {
      expect(isGolfRunResultV1({ ...valid, shotLog: [{ index: 0 }] })).toBe(false);
      expect(isGolfRunResultV1({ ...valid, shotLog: "nope" })).toBe(false);
    });
  });

  it("projects onto the panel shape the RESULT stage already renders", () => {
    const run = createGolfRunResult(draft);
    const result = toSportResult(run);

    // Fewer strokes is better, which is the opposite direction from the old
    // carry-distance drive — the reason golf needed its own contract.
    expect(result.rank.better).toBe("lower");
    expect(result.rank.value).toBe(6);
    expect(result.heading).toBe("HOLED OUT");
    expect(result.playerScore).toBe("6");
    expect(typeof result.note).toBe("string");
  });

  it("says so when the hole was abandoned", () => {
    const result = toSportResult(
      createGolfRunResult({ ...draft, status: "abandoned", remainingDistanceM: 96 }),
    );
    expect(result.heading).toBe("RUN ABANDONED");
    expect(result.note).toContain("96 M SHORT");
  });
});

describe("simulations stay pure", () => {
  const dir = fileURLToPath(new URL("../lib/game/minigames/", import.meta.url));

  /**
   * The honesty rule the feature rests on, enforced rather than described:
   * a simulation may not reach for storage, the network, a clock or a random
   * number. Identity is injected from the component layer instead.
   */
  it("never call storage, network, randomness or a wall clock", () => {
    const banned = [
      /\blocalStorage\b/,
      /\bsessionStorage\b/,
      /\bfetch\s*\(/,
      /\bcrypto\b/,
      /Math\.random\s*\(/,
      /\bDate\.now\s*\(/,
      /new Date\s*\(/,
      /performance\.now\s*\(/,
    ];

    for (const file of readdirSync(dir).filter((name) => name.endsWith(".ts"))) {
      const raw = readFileSync(new URL(file, `file://${dir}`), "utf8");
      // The rule is about what the code does, not what the prose mentions.
      const source = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      for (const pattern of banned) {
        expect(
          pattern.test(source),
          `${file} must not use ${pattern}`,
        ).toBe(false);
      }
    }
  });
});

describe("input shape stays backwards compatible", () => {
  it("keeps IDLE_INPUT's original fields", () => {
    expect(IDLE_INPUT).toMatchObject({
      action: false,
      pressed: false,
      released: false,
      up: false,
      down: false,
      left: false,
      right: false,
    });
  });

  it("treats an absent sprint as not held", () => {
    // Every simulation written before this pass omits the field entirely.
    const legacy: MinigameInput = { ...IDLE_INPUT };
    expect(Boolean(legacy.sprint)).toBe(false);
  });

  it("lets a sport steer and spurt at the same time", () => {
    const input: MinigameInput = held({ left: true, sprint: true });
    expect(input.left).toBe(true);
    expect(input.sprint).toBe(true);
    // The spurt is not the pace-down channel.
    expect(input.down).toBe(false);
  });
});

describe("golf run type is structurally what B must produce", () => {
  it("compiles against the declared field set", () => {
    const run: GolfRunResultV1 = createGolfRunResult({
      runId: "abc",
      courseId: "moss-gate-1",
      status: "completed",
      shotCount: 3,
      penaltyStrokes: 0,
      elapsedSimulationMs: 1,
      remainingDistanceM: 0,
      longestDriveM: 10,
    });
    expect(Object.keys(run).sort()).toEqual(
      [
        "courseId",
        "elapsedSimulationMs",
        "longestDriveM",
        "penaltyStrokes",
        "playerDisplayName",
        "remainingDistanceM",
        "rulesVersion",
        "runId",
        "shotCount",
        "status",
        "totalStrokes",
        "version",
      ].sort(),
    );
  });
});

describe("run-scoped simulated time", () => {
  it("starts a second run's clock at zero", () => {
    const stepper = createFixedStepper();
    stepper.advance(500, IDLE_INPUT, () => {});
    const firstRun = stepper.elapsedSinceRunStartMs;
    expect(firstRun).toBeGreaterThan(0);

    // PLAY AGAIN, without remounting the component.
    stepper.markRunStart();
    expect(stepper.elapsedSinceRunStartMs).toBe(0);

    stepper.advance(50, IDLE_INPUT, () => {});
    expect(stepper.elapsedSinceRunStartMs).toBeCloseTo(3 * SPORTSGANG_STEP_MS, 6);
    // The lifetime total keeps counting; only the run clock restarted.
    expect(stepper.elapsedMs).toBeGreaterThan(stepper.elapsedSinceRunStartMs);
  });

  it("reports run time without a markRunStart", () => {
    const stepper = createFixedStepper();
    stepper.advance(50, IDLE_INPUT, () => {});
    expect(stepper.elapsedSinceRunStartMs).toBe(stepper.elapsedMs);
  });
});

describe("key mapping", () => {
  it("keeps the shipped bindings on the default map", () => {
    const byCode = invertKeyMap(DEFAULT_KEY_MAP);
    expect(byCode.get("ArrowDown")).toBe("down");
    expect(byCode.get("KeyS")).toBe("down");
    expect(byCode.get("Space")).toBe("action");
    expect(byCode.get("KeyA")).toBe("left");
    expect(byCode.get("KeyS")).not.toBe("sprint");
  });

  it("gives running a spurt that is not the pace-down channel", () => {
    const byCode = invertKeyMap(RUNNING_KEY_MAP);
    // The requirement: S and ArrowDown must not share a channel.
    expect(byCode.get("KeyS")).toBe("sprint");
    expect(byCode.get("ArrowDown")).toBe("down");
    expect(byCode.get("KeyS")).not.toBe(byCode.get("ArrowDown"));
  });

  it("lets a runner steer while spurting", () => {
    const byCode = invertKeyMap(RUNNING_KEY_MAP);
    const tracker = createHeldTracker();
    tracker.press(byCode.get("KeyS")!, "keyboard");
    tracker.press(byCode.get("ArrowLeft")!, "keyboard");

    expect(tracker.isHeld("sprint")).toBe(true);
    expect(tracker.isHeld("left")).toBe(true);
    expect(tracker.isHeld("down")).toBe(false);
  });

  it("binds no key it was not given", () => {
    const byCode = invertKeyMap({ action: ["Space"] });
    expect(byCode.get("KeyW")).toBeUndefined();
    expect(byCode.size).toBe(1);
  });
});

describe("held state per source", () => {
  it("does not let a lifted finger cancel a key still down", () => {
    const tracker = createHeldTracker();
    tracker.press("action", "keyboard");
    tracker.press("action", "pointer");
    tracker.release("action", "pointer");

    expect(tracker.isHeld("action")).toBe(true);
    expect(tracker.edgesOf("action").released).toBe(false);

    tracker.release("action", "keyboard");
    expect(tracker.isHeld("action")).toBe(false);
    expect(tracker.edgesOf("action").released).toBe(true);
  });

  it("raises one pressed edge however many sources join", () => {
    const tracker = createHeldTracker();
    tracker.press("action", "keyboard");
    tracker.press("action", "pointer");
    const edges = tracker.consumeEdges();
    expect(edges.action.pressed).toBe(true);

    // Consuming clears; a still-held channel does not re-fire.
    tracker.press("action", "pointer");
    expect(tracker.consumeEdges().action.pressed).toBe(false);
  });

  it("ignores a release from a source that never pressed", () => {
    const tracker = createHeldTracker();
    tracker.press("left", "keyboard");
    tracker.release("left", "pointer");
    expect(tracker.isHeld("left")).toBe(true);
    expect(tracker.edgesOf("left").released).toBe(false);
  });

  it("tracks edges on every channel, not just action", () => {
    const tracker = createHeldTracker();
    tracker.press("sprint", "keyboard");
    expect(tracker.edgesOf("sprint").pressed).toBe(true);
    tracker.release("sprint", "keyboard");
    expect(tracker.edgesOf("sprint").released).toBe(true);
  });

  it("drops every hold and edge when play suspends", () => {
    const tracker = createHeldTracker();
    tracker.press("action", "keyboard");
    tracker.press("right", "pointer");

    // Window blurred, or the tab hidden.
    tracker.clear();

    expect(tracker.isHeld("action")).toBe(false);
    expect(tracker.isHeld("right")).toBe(false);
    const edges = tracker.consumeEdges();
    // Crucially the pending press is gone too: it must not fire on return.
    expect(edges.action.pressed).toBe(false);
    expect(edges.action.released).toBe(false);
  });
});

describe("keystrokes the game must not steal", () => {
  it("yields to a text field the visitor is typing in", () => {
    // matches an interactive target, not inside a game control
    expect(shouldYieldToTarget(true, false)).toBe(true);
  });

  it("claims an on-screen game control even though it is a button", () => {
    expect(shouldYieldToTarget(true, true)).toBe(false);
  });

  it("claims the play surface", () => {
    expect(shouldYieldToTarget(false, false)).toBe(false);
  });

  it("ignores a keystroke that belongs to an IME composition", () => {
    expect(isComposingKeyEvent({ isComposing: true })).toBe(true);
    expect(isComposingKeyEvent({ keyCode: 229 })).toBe(true);
    expect(isComposingKeyEvent({ isComposing: false, keyCode: 65 })).toBe(false);
    expect(isComposingKeyEvent({})).toBe(false);
  });
});

describe("suspend and resume, end to end", () => {
  /**
   * The clock and the input source have to forget together. This drives the
   * pair the way `useFixedStepGameLoop` does, with the hook's `clear` as
   * `onSuspend`.
   */
  it("fires nothing on return from a blurred window", () => {
    const stepper = createFixedStepper();
    const tracker = createHeldTracker();

    // A tap in a frame too short to step: latched in both halves.
    tracker.press("action", "keyboard");
    tracker.release("action", "keyboard");
    const frame = { ...IDLE_INPUT, ...tracker.consumeEdges().action };
    stepper.advance(3, frame, () => {});

    // Blur: the loop's single suspend path resets both.
    stepper.reset();
    tracker.clear();

    const presses: boolean[] = [];
    const resumed = { ...IDLE_INPUT, ...tracker.consumeEdges().action };
    stepper.advance(50, resumed, (_dt, input) => presses.push(input.pressed));

    expect(presses).toHaveLength(3);
    expect(presses.filter(Boolean)).toHaveLength(0);
  });

  it("still delivers a tap that survives to a stepping frame", () => {
    const stepper = createFixedStepper();
    const tracker = createHeldTracker();
    tracker.press("action", "keyboard");

    const frame = { ...IDLE_INPUT, action: true, ...tracker.consumeEdges().action };
    stepper.advance(3, frame, () => {});

    const presses: boolean[] = [];
    stepper.advance(50, { ...IDLE_INPUT, action: true }, (_dt, input) =>
      presses.push(input.pressed),
    );
    expect(presses.filter(Boolean)).toHaveLength(1);
  });
});
