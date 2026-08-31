import { describe, expect, it } from "vitest";
import { getFloorLayout, isAtCabinet } from "@/lib/game/arcade/arcade-floor";

/** Phone, small tablet, laptop, desktop, ultrawide. */
const WIDTHS = [320, 360, 390, 430, 768, 1_024, 1_280, 1_440, 1_920, 2_560];

describe("arcade floor layout", () => {
  it("centres the cabinet at every width, so the machine is the subject", () => {
    for (const width of WIDTHS) {
      const layout = getFloorLayout(width);
      expect(layout.cabinetX).toBe(Math.round(layout.floorWidth / 2));
    }
  });

  it("keeps the cabinet and Edward on screen at every width", () => {
    for (const width of WIDTHS) {
      const layout = getFloorLayout(width);
      expect(layout.startX).toBeGreaterThan(0);
      expect(layout.startX).toBeLessThan(layout.floorWidth);
      expect(layout.cabinetX).toBeLessThan(layout.floorWidth);
    }
  });

  it("always leaves a walk to make before the prompt appears", () => {
    for (const width of WIDTHS) {
      const layout = getFloorLayout(width);
      expect(isAtCabinet(layout.startX, layout)).toBe(false);
      // Not merely outside: far enough that walking over is a deliberate act.
      expect(layout.cabinetX - layout.startX - layout.approachRange).toBeGreaterThan(20);
    }
  });

  it("recognises the cabinet from either side, and only from close", () => {
    const layout = getFloorLayout(1_280);
    expect(isAtCabinet(layout.cabinetX, layout)).toBe(true);
    expect(isAtCabinet(layout.cabinetX - layout.approachRange, layout)).toBe(true);
    expect(isAtCabinet(layout.cabinetX + layout.approachRange, layout)).toBe(true);
    expect(isAtCabinet(layout.cabinetX - layout.approachRange - 1, layout)).toBe(false);
    expect(isAtCabinet(layout.cabinetX + layout.approachRange + 1, layout)).toBe(false);
  });

  it("takes about the same time to cross a room of any width", () => {
    const seconds = WIDTHS.map((width) => {
      const layout = getFloorLayout(width);
      return (layout.cabinetX - layout.startX) / layout.walkSpeed;
    });
    // Twitchy on a phone and a trudge on a desktop are the two failures a
    // fixed pace produces. Neither, at any width we support.
    expect(Math.min(...seconds)).toBeGreaterThan(0.7);
    expect(Math.max(...seconds)).toBeLessThan(4);
  });

  it("refuses to collapse on a nonsense measurement", () => {
    for (const width of [0, -100, Number.NaN]) {
      const layout = getFloorLayout(width);
      expect(layout.floorWidth).toBeGreaterThanOrEqual(320);
      expect(isAtCabinet(layout.startX, layout)).toBe(false);
    }
  });
});
