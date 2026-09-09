import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GOLF_COURSE } from "@/lib/game/minigames/golf-course";

/**
 * The golf component's boundary, read from its source.
 *
 * Vitest runs in `environment: "node"`, so there is no DOM to mount this in —
 * the listeners and the layout are human checks. What can be checked without a
 * browser is the boundary: which clock it runs on, that it does the metre-to-
 * screen conversion in one shared place rather than a second time by hand, and
 * that it produces the run record without ever transmitting it.
 */

const SOURCE = readFileSync(
  new URL("../components/sportsgang/minigames/golf-game.tsx", import.meta.url),
  "utf8",
);

/** The rule is about what the code does, not what the prose mentions. */
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("the hole runs on the SportsGang clock", () => {
  it("uses the fixed-step loop, not the variable-delta one", () => {
    expect(CODE).toContain("useFixedStepGameLoop");
    // `lib/motion/use-game-loop` still drives the house, the intro and the
    // platformer. A sport on it would drift its ball against its player.
    expect(CODE).not.toContain("useGameLoop");
  });

  it("suspends the clock and the input source together", () => {
    // Without this a tap made just before tabbing away fires on return.
    expect(CODE).toContain("onSuspend: clear");
  });

  it("starts the run clock, rather than reporting the lifetime total", () => {
    expect(CODE).toContain("markRunStart");
    expect(CODE).toContain("elapsedSinceRunStartMs");
    expect(CODE).not.toContain("stepper.elapsedMs");
  });
});

describe("metres become screen space in one place", () => {
  it("projects through the shared course projection", () => {
    for (const projection of ["xPercent", "heightPercent", "depthPercent", "mapPercent"]) {
      expect(CODE, `${projection} is not used`).toContain(projection);
    }
  });

  it("never writes the hole's own numbers down a second time", () => {
    // A `300` here would be a second definition of how long the hole is, and
    // the two would drift the first time the course changed.
    expect(CODE).not.toMatch(new RegExp(`\\b${GOLF_COURSE.holeM}\\b`));
    expect(CODE).toContain("GOLF_COURSE.holeM");
    expect(CODE).toContain("GOLF_VIEW.groundPercent");
  });

  it("has no viewport in it, so metres mean the same on every screen", () => {
    for (const pixels of ["innerWidth", "innerHeight", "getBoundingClientRect", "devicePixelRatio"]) {
      expect(CODE, `${pixels} would make a metre depend on the screen`).not.toContain(pixels);
    }
  });
});

describe("the run leaves the component, and goes nowhere else", () => {
  it("reports the panel result and the versioned record from one constructor", () => {
    expect(CODE).toContain("createGolfRunResult");
    expect(CODE).toContain("onFinish(toSportResult(run))");
    expect(CODE).toContain("onGolfRun?.(run)");
  });

  it("guards the report so a finished hole cannot be banked twice", () => {
    expect(CODE).toContain("finished.current");
  });

  it("makes the run id here, because the simulation is not allowed to", () => {
    expect(CODE).toContain("randomUUID");
  });

  it("falls back to GUEST until a name boundary exists", () => {
    // D owns the nickname. Until it is wired, every run is a guest run.
    expect(CODE).toContain("GUEST_DISPLAY_NAME");
    expect(CODE).toContain("playerDisplayName");
  });

  it("writes nothing and sends nothing", () => {
    for (const forbidden of ["localStorage", "sessionStorage", "fetch(", "recordRun"]) {
      expect(CODE, `${forbidden} belongs to D`).not.toContain(forbidden);
    }
  });
});

describe("the shot number and the score are different numbers", () => {
  it("takes the shot number from its own function", () => {
    expect(CODE).toContain("nextShotNumber");
    // Deriving it from the score would make a penalty hand out a free ball.
    expect(CODE).not.toMatch(/totalStrokes\s*\+\s*1/);
  });
});

describe("reduced motion changes the shake and not the game", () => {
  it("zeroes the shake without touching power, contact or the strike", () => {
    expect(CODE).toContain("reducedMotion ? 0 : state.shake");
    // The simulation must never be handed the preference: a player who wants
    // less motion would then be playing a different hole.
    expect(CODE).not.toMatch(/advanceGolfHole\([^)]*reducedMotion/);
  });
});
