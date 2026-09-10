import { describe, expect, it } from "vitest";
import { palette } from "@/lib/pixel/palette";
import type { Raster } from "@/lib/pixel/raster";
import {
  CLUB_HEAD_AT_IMPACT,
  drawFlag,
  FLAG_ART_SIZE,
  FLAG_BASE_ANCHOR,
  GOLF_SWING_ART_STAGES,
  GOLFER_ANCHOR_PERCENT,
  GOLFER_ART_SIZE,
  golferRoutines,
} from "@/lib/pixel/sg-golf";

interface Call {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

/** A recording `Raster`, rounded exactly as `createRaster` rounds. */
function record(routine: (draw: Raster, frame: number) => void, frame = 0) {
  const calls: Call[] = [];
  routine(
    (x, y, width, height, color) => {
      calls.push({
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
        color,
      });
    },
    frame,
  );
  return calls;
}

/** Every art pixel a routine actually covers, as "x,y" keys. */
function pixels(calls: readonly Call[]) {
  const covered = new Set<string>();
  for (const call of calls) {
    for (let x = call.x; x < call.x + call.width; x += 1) {
      for (let y = call.y; y < call.y + call.height; y += 1) {
        covered.add(`${x},${y}`);
      }
    }
  }
  return covered;
}

const PALETTE_COLORS = new Set<string>(Object.values(palette));
const DRIVER = GOLF_SWING_ART_STAGES.map((stage) => ({
  stage,
  calls: record(golferRoutines.DRIVER[stage]),
}));

describe("the golfer stays on the board and on the grid", () => {
  it("draws only in the approved palette", () => {
    for (const { stage, calls } of DRIVER) {
      for (const call of calls) {
        expect(PALETTE_COLORS.has(call.color), `${stage} used ${call.color}`).toBe(true);
      }
    }
  });

  it("draws inside its own art box", () => {
    for (const { stage, calls } of DRIVER) {
      for (const call of calls) {
        expect(call.x, stage).toBeGreaterThanOrEqual(0);
        expect(call.y, stage).toBeGreaterThanOrEqual(0);
        expect(call.x + call.width, stage).toBeLessThanOrEqual(GOLFER_ART_SIZE.width);
        expect(call.y + call.height, stage).toBeLessThanOrEqual(GOLFER_ART_SIZE.height);
      }
    }
  });
});

describe("the six poses are six poses", () => {
  it("gives every stage a visibly different figure", () => {
    const shapes = DRIVER.map(({ stage, calls }) => ({
      stage,
      key: [...pixels(calls)].sort().join("|"),
    }));
    for (let a = 0; a < shapes.length; a += 1) {
      for (let b = a + 1; b < shapes.length; b += 1) {
        expect(
          shapes[a].key === shapes[b].key,
          `${shapes[a].stage} and ${shapes[b].stage} draw the same figure`,
        ).toBe(false);
      }
    }
  });

  it("moves the whole body, not one arm", () => {
    // Isolated by colour, not by row: the club shaft crosses the legs, so a
    // "below the hips" filter would call a swinging club a moving body.
    const shapeOf = (calls: readonly Call[], color: string) =>
      [...pixels(calls.filter((call) => call.color === color))].sort().join("|");

    // Trousers are drawn in denim and nothing else is, so this is the legs.
    const legs = DRIVER.map(({ calls }) => shapeOf(calls, palette.denim));
    expect(new Set(legs).size, "the legs never move").toBeGreaterThan(1);

    // The jacket is the torso. It has to turn, not just travel.
    const torso = DRIVER.map(({ calls }) => shapeOf(calls, palette.navy));
    expect(new Set(torso).size, "the torso never moves").toBeGreaterThan(1);

    const torsoWidths = DRIVER.map(({ calls }) => {
      const xs = [...pixels(calls.filter((call) => call.color === palette.navy))].map(
        (key) => Number(key.split(",")[0]),
      );
      return Math.max(...xs) - Math.min(...xs);
    });
    expect(new Set(torsoWidths).size, "the shoulders never turn").toBeGreaterThan(1);

    // And the weight goes through. The leading foot never leaves the ground,
    // so the tell is how much shoe is still on the ground line: both feet
    // early in the swing, one once the trailing heel has come up.
    const onTheGround = DRIVER.map(
      ({ calls }) =>
        [...pixels(calls.filter((call) => call.color === palette.hair))].filter(
          (key) => Number(key.split(",")[1]) === 23,
        ).length,
    );
    expect(new Set(onTheGround).size, "the weight never shifts").toBeGreaterThan(1);
  });

  it("swings a club with length, and takes it somewhere different each pose", () => {
    const heads = DRIVER.map(({ stage, calls }) => {
      // The club head is the darkest block furthest from the hands; its own
      // colour is the only thing drawn in `char` besides the shoes.
      const club = calls.filter((call) => call.color === palette.char);
      expect(club.length, `${stage} drew no club head`).toBeGreaterThan(0);
      return `${club[club.length - 1].x},${club[club.length - 1].y}`;
    });
    // The club returns to the ball, so address and impact share a position;
    // every other pose is somewhere else on the arc.
    expect(heads[0]).toBe(heads[3]);
    expect(new Set(heads).size).toBe(GOLF_SWING_ART_STAGES.length - 1);
  });

  it("keeps Edward recognisable in every pose", () => {
    for (const { stage, calls } of DRIVER) {
      const colors = new Set(calls.map((call) => call.color));
      // The curtain part, the slate-navy jacket and the denim trousers are
      // what make this the same person as the one in the world.
      expect(colors.has(palette.hairLift), `${stage} lost the curtain part`).toBe(true);
      expect(colors.has(palette.navy), `${stage} lost the jacket`).toBe(true);
      expect(colors.has(palette.denim), `${stage} lost the trousers`).toBe(true);
      expect(colors.has(palette.skin), `${stage} lost the arms`).toBe(true);
    }
  });
});

describe("the club head and the ball are the same place", () => {
  it("puts the impact pose's club head exactly on the stated anchor", () => {
    const covered = pixels(record(golferRoutines.DRIVER.IMPACT));
    expect(covered.has(`${CLUB_HEAD_AT_IMPACT.x},${CLUB_HEAD_AT_IMPACT.y}`)).toBe(true);
  });

  it("states that anchor as a share of its own box, so it holds at any size", () => {
    expect(GOLFER_ANCHOR_PERCENT.x).toBeCloseTo(
      (CLUB_HEAD_AT_IMPACT.x / GOLFER_ART_SIZE.width) * 100,
      9,
    );
    expect(GOLFER_ANCHOR_PERCENT.y).toBeCloseTo(
      ((GOLFER_ART_SIZE.height - CLUB_HEAD_AT_IMPACT.y) / GOLFER_ART_SIZE.height) * 100,
      9,
    );
  });

  it("addresses the ball and strikes it from the same spot, with a different body", () => {
    const address = pixels(record(golferRoutines.DRIVER.ADDRESS));
    const impact = pixels(record(golferRoutines.DRIVER.IMPACT));
    const anchor = `${CLUB_HEAD_AT_IMPACT.x},${CLUB_HEAD_AT_IMPACT.y}`;
    expect(address.has(anchor)).toBe(true);
    expect(impact.has(anchor)).toBe(true);
    // Same club position, different swing: the body is what moved.
    expect([...address].sort().join("|")).not.toBe([...impact].sort().join("|"));
  });
});

describe("a putt is a stroke, not a swing", () => {
  it("never lifts the club above the hands", () => {
    for (const stage of GOLF_SWING_ART_STAGES) {
      const calls = record(golferRoutines.PUTTER[stage]);
      const hands = calls.filter((call) => call.color === palette.brown3);
      expect(hands.length, `${stage} drew no hands`).toBeGreaterThan(0);
      const handY = hands[0].y;
      const clubHead = calls.filter((call) => call.color === palette.char).at(-1);
      expect(clubHead, `${stage} drew no putter head`).toBeDefined();
      // Down the screen is a larger y: the putter head stays at or below the
      // hands through the whole stroke.
      expect(clubHead!.y, stage).toBeGreaterThanOrEqual(handY);
    }
  });

  it("is a smaller motion than the driver swing", () => {
    const spread = (routines: typeof golferRoutines.DRIVER) => {
      const heads = GOLF_SWING_ART_STAGES.map((stage) => {
        const club = record(routines[stage]).filter((c) => c.color === palette.char);
        return club[club.length - 1];
      });
      const xs = heads.map((head) => head.x);
      const ys = heads.map((head) => head.y);
      return Math.max(...xs) - Math.min(...xs) + (Math.max(...ys) - Math.min(...ys));
    };
    expect(spread(golferRoutines.PUTTER)).toBeLessThan(spread(golferRoutines.DRIVER));
  });
});

describe("the flag marks the hole without covering it", () => {
  it("flies its cloth clear of the pin's base", () => {
    for (const frame of [0, 1, 2, 41]) {
      const calls = record(drawFlag, frame);
      const cloth = calls.filter(
        (call) => call.color === palette.orange || call.color === palette.orange2,
      );
      expect(cloth.length).toBeGreaterThan(0);
      for (const call of cloth) {
        // Every scrap of cloth is right of the pin and well above the cup, so
        // nothing the player has to aim into is ever drawn over.
        expect(call.x).toBeGreaterThan(FLAG_BASE_ANCHOR.x);
        expect(call.y + call.height).toBeLessThan(FLAG_BASE_ANCHOR.y);
      }
    }
  });

  it("stands the pin on its own anchor, inside its box", () => {
    const covered = pixels(record(drawFlag));
    expect(covered.has(`${FLAG_BASE_ANCHOR.x},${FLAG_BASE_ANCHOR.y}`)).toBe(true);
    for (const call of record(drawFlag)) {
      expect(call.x + call.width).toBeLessThanOrEqual(FLAG_ART_SIZE.width);
      expect(call.y + call.height).toBeLessThanOrEqual(FLAG_ART_SIZE.height);
    }
  });
});
