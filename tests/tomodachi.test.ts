import { describe, expect, it } from "vitest";
import {
  getTomodachiLines,
  getWanderOffset,
  TOMODACHI_LINES,
  WANDER_RANGE,
} from "@/lib/game/tomodachi";

describe("TOMODACHI", () => {
  it("has something different to say each time, then settles", () => {
    const seen = TOMODACHI_LINES.map((_, visit) => getTomodachiLines(visit));
    expect(new Set(seen.map((lines) => lines.join("|"))).size).toBe(
      TOMODACHI_LINES.length,
    );
    // Past the end it keeps its last word rather than running out.
    expect(getTomodachiLines(99)).toEqual(TOMODACHI_LINES.at(-1));
    expect(getTomodachiLines(-3)).toEqual(TOMODACHI_LINES[0]);
  });

  it("stays a small NPC: short lines, no portfolio pitch", () => {
    for (const lines of TOMODACHI_LINES) {
      expect(lines.length).toBeLessThanOrEqual(3);
      for (const line of lines) {
        expect(line.length).toBeLessThanOrEqual(72);
      }
    }
  });

  it("wanders within its own range and comes back", () => {
    const offsets = Array.from({ length: 120 }, (_, frame) => getWanderOffset(frame));
    expect(Math.min(...offsets)).toBeGreaterThanOrEqual(-WANDER_RANGE);
    expect(Math.max(...offsets)).toBeLessThanOrEqual(WANDER_RANGE);
    // It genuinely moves, and it returns.
    expect(new Set(offsets).size).toBeGreaterThan(4);
    expect(getWanderOffset(0)).toBe(getWanderOffset(24));
  });
});
