import { describe, expect, it } from "vitest";
import { clearOf, placeChip, placeTail, type UnitRect } from "@/lib/game/chip-layout";
import { MAX_PIXEL_UNIT, MIN_PIXEL_UNIT } from "@/lib/game/pixel-unit";

const UNITS = Array.from(
  { length: MAX_PIXEL_UNIT - MIN_PIXEL_UNIT + 1 },
  (_, index) => MIN_PIXEL_UNIT + index,
);

/** A deterministic spread of values, so the property checks are repeatable. */
function* spread(count: number, max: number) {
  for (let index = 0; index < count; index += 1) yield (index * 7919) % max;
}

describe("placeChip", () => {
  it("rounds the text up to whole units of the anchor's parity, so centring is whole units", () => {
    for (const unit of UNITS) {
      for (const anchorUnits of [10, 11, 16, 20, 68, 76, 92]) {
        for (let naturalWidth = 1; naturalWidth < 400; naturalWidth += 3.3) {
          const { width, left } = placeChip({ naturalWidth, unit, anchorUnits });
          expect(width * unit).toBeGreaterThanOrEqual(naturalWidth);
          expect(width * unit - naturalWidth).toBeLessThan(unit * 2);
          expect(Math.abs(width - anchorUnits) % 2).toBe(0);
          expect(Number.isInteger(left)).toBe(true);
          // Centred: the same number of units either side of the anchor.
          expect(left).toBe(anchorUnits - (left + width));
        }
      }
    }
  });

  it("is not clamped without a screen position", () => {
    const chip = placeChip({ naturalWidth: 300, unit: 6, anchorUnits: 16, viewportWidth: 390 });
    expect(chip.left).toBe((16 - chip.width) / 2);
  });

  it("keeps a chip that fits a unit in from each edge of the viewport, in whole units", () => {
    for (const unit of UNITS) {
      for (const viewportWidth of [390, 1280]) {
        for (const column of spread(80, 1200)) {
          const screenLeft = (column - 400) * unit;
          const naturalWidth = 20 + (column % 160);
          const chip = placeChip({ naturalWidth, unit, anchorUnits: 16, screenLeft, viewportWidth });
          expect(Number.isInteger(chip.left)).toBe(true);
          // The chip, its one-unit shadow and a unit of margin fit across.
          if ((chip.width + 3) * unit > viewportWidth) continue;
          const left = screenLeft + chip.left * unit;
          expect(left).toBeGreaterThanOrEqual(unit);
          expect(left + chip.width * unit).toBeLessThanOrEqual(viewportWidth - unit * 2);
        }
      }
    }
  });

  it("leaves a chip that is already on screen centred", () => {
    const centred = placeChip({ naturalWidth: 120, unit: 7, anchorUnits: 16 });
    const onScreen = placeChip({
      naturalWidth: 120,
      unit: 7,
      anchorUnits: 16,
      screenLeft: 70 * 7,
      viewportWidth: 1280,
    });
    expect(onScreen).toEqual(centred);
  });

  it("keeps the left edge on screen when the chip is wider than the viewport", () => {
    const chip = placeChip({ naturalWidth: 500, unit: 6, anchorUnits: 16, screenLeft: 0, viewportWidth: 390 });
    expect(chip.left).toBe(1);
  });
});

describe("placeTail", () => {
  const chip = { width: 30, left: -7 };

  it("stands under the target column wherever the chip reaches it", () => {
    expect(placeTail(chip, 8)).toBe(15);
    expect(placeTail(chip, 7)).toBe(14);
  });

  it("never lands on the chip's border, however far the clamp moved the chip", () => {
    expect(placeTail({ width: 30, left: 9 }, 8)).toBe(1);
    expect(placeTail({ width: 30, left: -40 }, 8)).toBe(28);
    for (const left of spread(60, 80)) {
      const column = placeTail({ width: 30, left: left - 40 }, 8);
      expect(column).toBeGreaterThanOrEqual(1);
      expect(column).toBeLessThanOrEqual(28);
    }
  });
});

describe("clearOf", () => {
  const bubble: UnitRect = { left: 10, top: 50, width: 20, height: 8 };
  const intersects = (a: UnitRect, b: UnitRect, gap: number) =>
    a.left < b.left + b.width + gap &&
    b.left < a.left + a.width + gap &&
    a.top < b.top + b.height + gap &&
    b.top < a.top + a.height + gap;

  it("leaves a rect that is already clear exactly where it is", () => {
    expect(clearOf(bubble, [])).toBe(50);
    expect(clearOf(bubble, [{ left: 40, top: 50, width: 10, height: 8 }])).toBe(50);
    // One unit of air below it is enough.
    expect(clearOf(bubble, [{ left: 10, top: 59, width: 10, height: 8 }])).toBe(50);
  });

  it("lifts a rect that would cover a sign until a unit of air shows between them", () => {
    const sign = { left: 15, top: 54, width: 12, height: 7 };
    const top = clearOf(bubble, [sign]);
    expect(top).toBe(54 - 1 - 8);
    expect(intersects({ ...bubble, top }, sign, 1)).toBe(false);
  });

  it("clears a stack of signs, and never moves down or sideways", () => {
    const signs = [
      { left: 15, top: 54, width: 12, height: 7 },
      { left: 25, top: 40, width: 12, height: 7 },
      { left: 0, top: 30, width: 50, height: 2 },
    ];
    const top = clearOf(bubble, signs);
    expect(top).toBe(30 - 1 - 8);
    for (const sign of signs) expect(intersects({ ...bubble, top }, sign, 1)).toBe(false);
  });

  it("always settles clear of every obstacle, above where it started", () => {
    for (const seed of spread(200, 10_000)) {
      const obstacles = Array.from({ length: 1 + (seed % 5) }, (_, index) => ({
        left: (seed * (index + 3)) % 60,
        top: 20 + ((seed * (index + 7)) % 50),
        width: 4 + ((seed + index) % 30),
        height: 4 + (index % 4),
      }));
      const top = clearOf(bubble, obstacles);
      expect(top).toBeLessThanOrEqual(bubble.top);
      for (const obstacle of obstacles) {
        expect(intersects({ ...bubble, top }, obstacle, 1), `seed ${seed}`).toBe(false);
      }
    }
  });
});
