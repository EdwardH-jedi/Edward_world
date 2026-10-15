import { describe, expect, it } from "vitest";
import { sfxAudible } from "@/lib/audio/bgm";
import { sfxPlan, type SfxName } from "@/lib/audio/sfx";
import { getCameraX } from "@/lib/game/movement";
import {
  DISSOLVE_STEPS,
  DISSOLVE_STEP_MS,
  dissolveRank,
  isCovered,
} from "@/lib/motion/dissolve";
import { buildingArt } from "@/lib/pixel/buildings";

describe("sfx policy", () => {
  const ok = { unlocked: true, muted: false, failed: false };

  it("sounds only when unlocked, unmuted and not failed", () => {
    expect(sfxAudible(ok)).toBe(true);
    expect(sfxAudible({ ...ok, muted: true })).toBe(false);
    expect(sfxAudible({ ...ok, unlocked: false })).toBe(false);
    expect(sfxAudible({ ...ok, failed: true })).toBe(false);
  });
});

describe("sfx plans", () => {
  it("alternates the footstep pitch", () => {
    const [a] = sfxPlan("footstep", 0);
    const [b] = sfxPlan("footstep", 1);
    expect(a.kind).toBe("noise");
    expect(a.freq).not.toBe(b.freq);
    expect(sfxPlan("footstep", 2)[0].freq).toBe(a.freq);
  });

  it("is a 60 ms square wave for the ui blip", () => {
    expect(sfxPlan("ui-blip")).toEqual([
      expect.objectContaining({ kind: "square", duration: 0.06 }),
    ]);
  });

  it("rises across the three notes of enter and the two tones of door", () => {
    const enter = sfxPlan("enter");
    expect(enter).toHaveLength(3);
    expect(enter[1].freq).toBeGreaterThan(enter[0].freq);
    expect(enter[2].freq).toBeGreaterThan(enter[1].freq);
    expect(enter.map((voice) => voice.at)).toEqual([...enter.map((v) => v.at)].sort());
    expect(sfxPlan("door")).toHaveLength(2);
  });

  it("never schedules a voice with a non-positive duration", () => {
    const names: SfxName[] = ["footstep", "door", "ui-blip", "enter"];
    for (const name of names) {
      for (const voice of sfxPlan(name)) expect(voice.duration).toBeGreaterThan(0);
    }
  });
});

describe("pixel dissolve", () => {
  it("is six stepped moves of about 350 ms", () => {
    expect(DISSOLVE_STEPS).toBe(6);
    expect(DISSOLVE_STEPS * DISSOLVE_STEP_MS).toBeGreaterThanOrEqual(342);
    expect(DISSOLVE_STEPS * DISSOLVE_STEP_MS).toBeLessThanOrEqual(358);
  });

  it("is deterministic and uses every step, evenly", () => {
    const counts = new Array(DISSOLVE_STEPS).fill(0);
    for (let row = 0; row < 60; row += 1) {
      for (let col = 0; col < 60; col += 1) {
        expect(dissolveRank(col, row)).toBe(dissolveRank(col, row));
        counts[dissolveRank(col, row)] += 1;
      }
    }
    for (const count of counts) expect(count).toBe(3_600 / DISSOLVE_STEPS);
  });

  it("starts fully closed, ends fully open, and only ever opens", () => {
    expect(isCovered(7, 3, 0)).toBe(true);
    expect(isCovered(7, 3, DISSOLVE_STEPS)).toBe(false);
    for (let step = 0; step < DISSOLVE_STEPS; step += 1) {
      for (let c = 0; c < 12; c += 1) {
        if (!isCovered(c, 5, step)) expect(isCovered(c, 5, step + 1)).toBe(false);
      }
    }
  });

  it("opens a checkerboard half before the other half", () => {
    // After three steps, every block of one parity is open and none of the other.
    for (let c = 0; c < 6; c += 1) {
      for (let r = 0; r < 6; r += 1) {
        expect(isCovered(c, r, 3)).toBe((c + r) % 2 === 1);
      }
    }
  });
});

describe("open doors", () => {
  it("draws two different open frames inside each building's art", () => {
    for (const art of Object.values(buildingArt)) {
      if (!art.openDoor) continue;
      const frames = [0, 1].map((step) => {
        const rects: number[][] = [];
        art.openDoor!((x, y, w, h) => rects.push([x, y, w, h]), step);
        return rects;
      });
      expect(frames[0]).not.toEqual(frames[1]);
      for (const [x, y, w, h] of frames.flat()) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(x + w).toBeLessThanOrEqual(art.size.width);
        expect(y + h).toBeLessThanOrEqual(art.size.height);
      }
    }
  });

  it("gives every enterable building a door", () => {
    for (const id of ["edwards-house", "wardrobe", "sportsgang", "afl-lab", "arcade"] as const) {
      expect(buildingArt[id].openDoor).toBeDefined();
    }
  });
});

describe("camera look-ahead", () => {
  const view = { playerX: 500, playerWidth: 40, viewportWidth: 400, worldWidth: 1_000 };

  it("leads the player in the given direction", () => {
    expect(getCameraX({ ...view, lookAhead: 4 })).toBe(getCameraX(view) + 4);
    expect(getCameraX({ ...view, lookAhead: -4 })).toBe(getCameraX(view) - 4);
  });

  it("still never shows space beyond the world", () => {
    expect(getCameraX({ ...view, playerX: 980, lookAhead: 4 })).toBe(600);
    expect(getCameraX({ ...view, playerX: 0, lookAhead: -4 })).toBe(0);
  });
});
