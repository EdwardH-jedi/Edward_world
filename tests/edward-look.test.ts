import { describe, expect, it } from "vitest";
import { selectEdwardLook } from "@/lib/pixel/characters";

const base = {
  moving: false,
  settled: true,
  nearBuildingLocked: false,
  nearObject: false,
  walkFrame: 3,
  ambientFrame: 5,
};

describe("selectEdwardLook", () => {
  it("stop near target: holds the walk-settle frame until settled, then inspects", () => {
    // Walking up to a target, then stopping beside it before he has settled.
    const timeline = [
      { ...base, moving: true, settled: false, nearObject: true },
      { ...base, settled: false, nearObject: true },
      { ...base, settled: false, nearObject: true },
      { ...base, settled: true, nearObject: true },
    ].map(selectEdwardLook);
    expect(timeline).toEqual([
      { pose: "walk", frame: 3 },
      { pose: "walk", frame: 0 },
      { pose: "walk", frame: 0 },
      { pose: "inspect", frame: 5 },
    ]);
  });

  it("never animates a standing pose while moving", () => {
    const look = selectEdwardLook({ ...base, moving: true, nearObject: true });
    expect(look).toEqual({ pose: "walk", frame: 3 });
  });

  it("settles into front when nothing is nearby, and turns his back at a locked building", () => {
    expect(selectEdwardLook({ ...base, settled: false }).pose).toBe("walk");
    expect(selectEdwardLook(base)).toEqual({ pose: "front", frame: 5 });
    expect(selectEdwardLook({ ...base, nearBuildingLocked: true, nearObject: true }).pose).toBe("back");
  });
});
