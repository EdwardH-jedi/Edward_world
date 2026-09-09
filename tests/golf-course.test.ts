import { describe, expect, it } from "vitest";
import {
  clubFor,
  distanceToHoleM,
  GOLF_CLUBS,
  GOLF_COURSE,
  GOLF_VIEW,
  cameraSpanFor,
  depthPercent,
  heightPercent,
  mapPercent,
  metresAtPercent,
  surfaceAt,
  xPercent,
  type GolfCamera,
} from "@/lib/game/minigames/golf-course";
import { GOLF_RULES_VERSION } from "@/lib/game/minigames/golf-result";

/**
 * The hole is one configuration object and one projection.
 *
 * These are game design values. Nothing here claims to reproduce a real golf
 * course, a real ball, or the Rules of Golf — it claims only that the numbers
 * the player is shown are the numbers the simulation used.
 */

describe("the course is one configuration", () => {
  it("is a 300 metre par 4 that identifies its own rules", () => {
    expect(GOLF_COURSE.holeM).toBe(300);
    expect(GOLF_COURSE.par).toBe(4);
    expect(GOLF_COURSE.courseId).toBeTruthy();
    // A board that mixes rule sets is not a board.
    expect(GOLF_COURSE.rulesVersion).toBe(GOLF_RULES_VERSION);
  });

  it("states a shot cap and an out-of-bounds rule rather than implying one", () => {
    expect(GOLF_COURSE.maxShots).toBeGreaterThan(GOLF_COURSE.par);
    expect(GOLF_COURSE.outOfBoundsPenalty).toBeGreaterThan(0);
    expect(GOLF_COURSE.outOfBoundsRule).toBe("stroke-and-distance");
  });

  it("gives every surface a friction, so nothing rolls on a default", () => {
    for (const surface of ["TEE", "FAIRWAY", "ROUGH", "GREEN", "OUT"] as const) {
      expect(GOLF_COURSE.surfaceFrictionMps2[surface]).toBeGreaterThan(0);
    }
    // Rough holds a ball up; a green lets it run.
    expect(GOLF_COURSE.surfaceFrictionMps2.ROUGH).toBeGreaterThan(
      GOLF_COURSE.surfaceFrictionMps2.FAIRWAY,
    );
    expect(GOLF_COURSE.surfaceFrictionMps2.GREEN).toBeLessThan(
      GOLF_COURSE.surfaceFrictionMps2.FAIRWAY,
    );
  });

  it("gives every club an explicit range rather than a shared scale factor", () => {
    for (const club of Object.values(GOLF_CLUBS)) {
      expect(club.launchSpeedMps).toBeGreaterThan(0);
      expect(club.faceErrorDeg).toBeGreaterThan(0);
      expect(club.rollRetention).toBeGreaterThan(0);
    }
    expect(GOLF_CLUBS.DRIVER.launchSpeedMps).toBeGreaterThan(
      GOLF_CLUBS.APPROACH.launchSpeedMps,
    );
    // The putter is the most forgiving face on the bag, and never airborne.
    expect(GOLF_CLUBS.PUTTER.faceErrorDeg).toBeLessThan(GOLF_CLUBS.DRIVER.faceErrorDeg);
    expect(GOLF_CLUBS.PUTTER.loftDeg).toBe(0);
  });
});

describe("where the ball is, in metres", () => {
  it("reads the tee, the fairway, the rough and the green apart", () => {
    expect(surfaceAt(GOLF_COURSE, { x: 0, y: 0 })).toBe("TEE");
    expect(surfaceAt(GOLF_COURSE, { x: 150, y: 0 })).toBe("FAIRWAY");
    expect(surfaceAt(GOLF_COURSE, { x: 150, y: 30 })).toBe("ROUGH");
    expect(surfaceAt(GOLF_COURSE, { x: 296, y: 2 })).toBe("GREEN");
  });

  it("calls anything past the boundary out, on either side", () => {
    const beyond = GOLF_COURSE.outOfBoundsHalfWidthM + 1;
    expect(surfaceAt(GOLF_COURSE, { x: 150, y: beyond })).toBe("OUT");
    expect(surfaceAt(GOLF_COURSE, { x: 150, y: -beyond })).toBe("OUT");
    // Behind the tee is off the hole too.
    expect(surfaceAt(GOLF_COURSE, { x: -30, y: 0 })).toBe("OUT");
  });

  it("measures the distance left on the ground, not through the air", () => {
    expect(distanceToHoleM(GOLF_COURSE, { x: 0, y: 0 })).toBe(300);
    expect(distanceToHoleM(GOLF_COURSE, { x: 300, y: 0 })).toBe(0);
    // Off line costs distance, by Pythagoras and nothing else.
    expect(distanceToHoleM(GOLF_COURSE, { x: 300, y: 40 })).toBe(40);
  });

  it("counts distance back up once the ball is past the hole", () => {
    const short = distanceToHoleM(GOLF_COURSE, { x: 290, y: 0 });
    const past = distanceToHoleM(GOLF_COURSE, { x: 320, y: 0 });
    expect(short).toBe(10);
    // This is the whole point of measuring rather than subtracting a carry.
    expect(past).toBe(20);
  });
});

describe("which club comes out of the bag", () => {
  it("uses the driver from the tee and the putter on the green", () => {
    expect(clubFor(GOLF_COURSE, "TEE", 300)).toBe("DRIVER");
    expect(clubFor(GOLF_COURSE, "GREEN", 9)).toBe("PUTTER");
  });

  it("switches to an approach once the hole is in range", () => {
    expect(clubFor(GOLF_COURSE, "FAIRWAY", 250)).toBe("DRIVER");
    expect(clubFor(GOLF_COURSE, "FAIRWAY", 80)).toBe("APPROACH");
    expect(clubFor(GOLF_COURSE, "ROUGH", 60)).toBe("APPROACH");
  });

  it("will not putt from off the green, however close", () => {
    expect(clubFor(GOLF_COURSE, "ROUGH", 4)).toBe("APPROACH");
  });
});

describe("metres to the screen, in exactly one place", () => {
  const camera: GolfCamera = { focusM: 150, spanM: 200 };

  it("puts the camera focus in the middle of the frame", () => {
    expect(xPercent(150, camera)).toBeCloseTo(50, 10);
    expect(xPercent(50, camera)).toBeCloseTo(0, 10);
    expect(xPercent(250, camera)).toBeCloseTo(100, 10);
  });

  it("round-trips, so the projection has one definition and not two", () => {
    for (const metres of [0, 37.5, 150, 299.9]) {
      expect(metresAtPercent(xPercent(metres, camera), camera)).toBeCloseTo(metres, 9);
    }
  });

  it("takes no pixels, so the same metres land the same on any screen", () => {
    // The projection's whole contract: metres in, percentages out. A viewport
    // width appearing here is what would make 200 M mean two different things
    // at 1440 and at 390.
    expect(xPercent.length).toBe(2);
    expect(heightPercent.length).toBe(2);
  });

  it("scales height by the same span as distance, so the arc keeps its shape", () => {
    const wide: GolfCamera = { focusM: 150, spanM: 300 };
    const tight: GolfCamera = { focusM: 150, spanM: 100 };
    expect(heightPercent(30, tight)).toBeGreaterThan(heightPercent(30, wide));
    expect(heightPercent(0, camera)).toBe(0);
  });

  it("zooms in as the hole gets close, so the cup reads at playing size", () => {
    expect(cameraSpanFor(300)).toBeGreaterThan(cameraSpanFor(40));
    expect(cameraSpanFor(40)).toBeGreaterThan(cameraSpanFor(4));
    // Never so tight that a putt fills the world, never wider than the hole.
    expect(cameraSpanFor(0)).toBeGreaterThanOrEqual(GOLF_VIEW.minSpanM);
    expect(cameraSpanFor(10_000)).toBeLessThanOrEqual(GOLF_VIEW.maxSpanM);
  });

  it("shows sideways error as depth, bounded so it cannot leave the frame", () => {
    expect(depthPercent(0)).toBe(0);
    expect(depthPercent(20)).toBeGreaterThan(0);
    expect(depthPercent(-20)).toBe(-depthPercent(20));
    expect(Math.abs(depthPercent(10_000))).toBeLessThanOrEqual(GOLF_VIEW.maxDepthPercent);
  });

  it("maps the whole hole onto the little course map", () => {
    expect(mapPercent(GOLF_COURSE, 0)).toBe(0);
    expect(mapPercent(GOLF_COURSE, 300)).toBe(100);
    expect(mapPercent(GOLF_COURSE, 150)).toBe(50);
    // A ball hit past the green still has somewhere to be drawn.
    expect(mapPercent(GOLF_COURSE, 400)).toBe(100);
  });
});
