import { describe, expect, it } from "vitest";
import { getMotionDuration } from "@/lib/motion/animate-element";

describe("reduced motion", () => {
  it("preserves configured durations by default", () => {
    expect(getMotionDuration(650, false)).toBe(650);
  });

  it("collapses animation time when reduced motion is requested", () => {
    expect(getMotionDuration(650, true)).toBe(1);
  });
});
