import { describe, expect, it } from "vitest";
import { chapters } from "@/data/personal";
import { chapterIdOfStation, timelineStations } from "@/data/timeline";
import { buildings, initialPlayer, signs, WORLD_CONFIG } from "@/data/world";
import { getGroundY, PIXEL_UNIT, TIMELINE_STREET } from "@/lib/game/terrain";
import { BACKDROP_ART_SIZE, drawBackdrop } from "@/lib/pixel/backdrop";
import { buildingArt, signpostArt } from "@/lib/pixel/buildings";
import { STATION_ART_SIZE, STATION_MOTIFS, stationArt } from "@/lib/pixel/timeline";
import {
  EDWARD_ART_SIZE,
  edwardPoses,
  getAvatarAnchor,
  getWalkFrame,
} from "@/lib/pixel/characters";
import { palette } from "@/lib/pixel/palette";
import type { Raster } from "@/lib/pixel/raster";

/** Collects every rect an art routine draws, in art-pixel space. */
function record(draw: (raster: Raster, frame: number) => void, frame: number) {
  const rects: { x: number; y: number; width: number; height: number; color: string }[] = [];
  draw((x, y, width, height, color) => rects.push({ x, y, width, height, color }), frame);
  return rects;
}

const EDWARD_POSES = ["walk", "front", "back", "inspect"] as const;

describe("art grid alignment", () => {
  it("covers the whole world with the backdrop layer", () => {
    expect(BACKDROP_ART_SIZE.width * PIXEL_UNIT).toBe(WORLD_CONFIG.width);
    expect(BACKDROP_ART_SIZE.height * PIXEL_UNIT).toBe(WORLD_CONFIG.height);
  });

  it("gives every building art sized exactly to its world footprint", () => {
    for (const building of buildings) {
      const art = buildingArt[building.id];
      expect(art, `missing art for ${building.id}`).toBeDefined();
      expect(art.size.width * PIXEL_UNIT).toBe(building.size.width);
      expect(art.size.height * PIXEL_UNIT).toBe(building.size.height);
    }
  });

  it("sizes the sign art to its world footprint", () => {
    expect(signpostArt.size.width * PIXEL_UNIT).toBe(signs[0].size.width);
    expect(signpostArt.size.height * PIXEL_UNIT).toBe(signs[0].size.height);
  });

  it("gives every timeline station art sized exactly to its world footprint", () => {
    expect(timelineStations).toHaveLength(chapters.length);
    for (const station of timelineStations) {
      const art = stationArt(chapterIdOfStation(station.id)!);
      expect(art.size.width * PIXEL_UNIT, station.id).toBe(station.size.width);
      expect(art.size.height * PIXEL_UNIT, station.id).toBe(station.size.height);
    }
  });
});

describe("timeline station art", () => {
  const ids = [...chapters.map(({ id }) => id), "a-chapter-with-no-motif"];

  it("draws on whole pixels, inside its grid, from the approved palette", () => {
    const approved = new Set<string>(Object.values(palette));
    for (const id of ids) {
      for (const frame of [0, 1, 2, 3]) {
        for (const rect of record(stationArt(id).draw, frame)) {
          for (const value of [rect.x, rect.y, rect.width, rect.height]) {
            expect(Number.isInteger(value), `${id} ${frame}`).toBe(true);
          }
          expect(rect.x, id).toBeGreaterThanOrEqual(0);
          expect(rect.y, id).toBeGreaterThanOrEqual(0);
          expect(rect.x + rect.width, id).toBeLessThanOrEqual(STATION_ART_SIZE.width);
          expect(rect.y + rect.height, id).toBeLessThanOrEqual(STATION_ART_SIZE.height);
          expect(approved.has(rect.color), `${id} uses ${rect.color}`).toBe(true);
        }
      }
    }
  });

  /*
   * A label chip hangs three units over its object's top. A station shorter
   * than Edward would put the chip of the station he is reading behind his
   * own head, so the plaque's top is held level with it.
   */
  it("stands as tall as Edward, so the chip of the station he is at clears his head", () => {
    expect(STATION_ART_SIZE.height).toBeGreaterThanOrEqual(EDWARD_ART_SIZE.height);
    for (const station of timelineStations) {
      expect(station.size.height, station.id).toBeGreaterThanOrEqual(EDWARD_ART_SIZE.height * PIXEL_UNIT);
    }
  });

  it("stands every station on its ground line", () => {
    for (const id of ids) {
      const bottom = Math.max(...record(stationArt(id).draw, 0).map((r) => r.y + r.height));
      expect(bottom, id).toBe(STATION_ART_SIZE.height);
    }
  });

  it("gives every chapter its own motif, distinct from the others and the plain plaque", () => {
    for (const chapter of chapters) {
      expect(STATION_MOTIFS[chapter.id], `motif for ${chapter.id}`).toBeDefined();
    }
    const drawings = ids.map((id) => JSON.stringify(record(stationArt(id).draw, 0)));
    expect(new Set(drawings).size).toBe(ids.length);
  });

  it("keeps the shared plaque still: ambient motion stays inside the face", () => {
    for (const id of ids) {
      const still = new Set(record(stationArt(id).draw, 0).map((r) => JSON.stringify(r)));
      for (const frame of [1, 2, 3]) {
        for (const rect of record(stationArt(id).draw, frame)) {
          if (still.has(JSON.stringify(rect))) continue;
          // Anything that moves is inside the paper face (x 1–8, y 1–9).
          expect(rect.x, `${id} ${frame}`).toBeGreaterThanOrEqual(1);
          expect(rect.x + rect.width, `${id} ${frame}`).toBeLessThanOrEqual(9);
          expect(rect.y, `${id} ${frame}`).toBeGreaterThanOrEqual(1);
          expect(rect.y + rect.height, `${id} ${frame}`).toBeLessThanOrEqual(10);
        }
      }
    }
  });
});

describe("timeline street backdrop", () => {
  const rects = record(drawBackdrop, 0);
  const left = TIMELINE_STREET.startX / PIXEL_UNIT;
  const right = TIMELINE_STREET.endX / PIXEL_UNIT;

  it("is grass and stone like the rest of town, with no bare dirt anywhere", () => {
    expect(rects.some((rect) => rect.color === palette.dirt)).toBe(false);
  });

  it("carries the stone path under every station, out to the world's edge", () => {
    for (let x = left; x < BACKDROP_ART_SIZE.width; x += 1) {
      const ground = getGroundY(x * PIXEL_UNIT) / PIXEL_UNIT;
      const paved = rects.some(
        (rect) =>
          rect.x <= x &&
          rect.x + rect.width > x &&
          rect.y === ground &&
          (rect.color === palette.stone || rect.color === palette.stone2),
      );
      expect(paved, `path at art x ${x}`).toBe(true);
    }
  });

  it("runs one low wall behind the whole street, below every plaque", () => {
    const ground = getGroundY(TIMELINE_STREET.startX) / PIXEL_UNIT;
    const plaqueBottom = ground - STATION_ART_SIZE.height + 11;
    const wall = rects.filter(
      (rect) =>
        rect.y < ground &&
        rect.y + rect.height <= ground &&
        rect.x <= left &&
        rect.x + rect.width >= right &&
        rect.width > right - left,
    );
    expect(wall.length).toBeGreaterThan(0);
    for (const rect of wall) {
      expect(rect.y, "wall top").toBeGreaterThanOrEqual(plaqueBottom);
    }
  });
});

describe("player footprint", () => {
  /**
   * The hitbox is the contract, not a consequence of the art. Movement, world
   * bounds, the camera and proximity read `initialPlayer.size` and nothing
   * else, so it is pinned as a literal here: replacing the avatar art must
   * never be able to move it.
   */
  it("pins the gameplay footprint as a literal, independent of the art", () => {
    expect(initialPlayer.size).toEqual({ width: 48, height: 64 });
  });

  it("anchors the art feet-down and centred on that footprint", () => {
    const anchor = getAvatarAnchor(EDWARD_ART_SIZE, initialPlayer.size, PIXEL_UNIT);
    expect(anchor.width).toBe(EDWARD_ART_SIZE.width * PIXEL_UNIT);
    expect(anchor.height).toBe(EDWARD_ART_SIZE.height * PIXEL_UNIT);
    expect(anchor.top + anchor.height).toBe(initialPlayer.size.height);
  });

  it("is a no-op for art that fills the footprint exactly", () => {
    expect(getAvatarAnchor({ width: 12, height: 16 }, initialPlayer.size, PIXEL_UNIT)).toEqual({
      width: initialPlayer.size.width,
      height: initialPlayer.size.height,
      left: 0,
      top: 0,
    });
  });

  it("grows the 16x24 avatar upward and outward from the same standing point", () => {
    // The grid the character asset spec recommends and the art now uses: feet
    // stay on the footprint's bottom edge and the extra width splits evenly,
    // so the player did not move when the art landed.
    expect(EDWARD_ART_SIZE).toEqual({ width: 16, height: 24 });
    const anchor = getAvatarAnchor(EDWARD_ART_SIZE, initialPlayer.size, PIXEL_UNIT);
    expect(anchor).toEqual({ width: 64, height: 96, left: -8, top: -32 });
    expect(anchor.top + anchor.height).toBe(initialPlayer.size.height);
    expect(anchor.left * 2 + anchor.width).toBe(initialPlayer.size.width);
  });

  it("keeps the anchor offset on the art grid for any art size", () => {
    for (let width = 8; width <= 24; width += 1) {
      const anchor = getAvatarAnchor({ width, height: 20 }, initialPlayer.size, PIXEL_UNIT);
      expect(Number.isInteger(anchor.left / PIXEL_UNIT), `width ${width}`).toBe(true);
    }
  });
});

describe("Edward sprite", () => {
  it("keeps every pose inside the 16x24 grid, on whole pixels", () => {
    for (const pose of EDWARD_POSES) {
      for (let frame = 0; frame < 4; frame += 1) {
        for (const rect of record(edwardPoses[pose], frame)) {
          expect(Number.isInteger(rect.x), `${pose} ${frame} x`).toBe(true);
          expect(Number.isInteger(rect.y), `${pose} ${frame} y`).toBe(true);
          expect(rect.x).toBeGreaterThanOrEqual(0);
          expect(rect.y).toBeGreaterThanOrEqual(0);
          expect(rect.x + rect.width).toBeLessThanOrEqual(EDWARD_ART_SIZE.width);
          expect(rect.y + rect.height).toBeLessThanOrEqual(EDWARD_ART_SIZE.height);
        }
      }
    }
  });

  it("draws every pose from the approved palette, plus the contact shadow", () => {
    const approved = new Set<string>(Object.values(palette));
    for (const pose of EDWARD_POSES) {
      for (const rect of record(edwardPoses[pose], 0)) {
        if (rect.color.startsWith("rgba(")) continue;
        expect(approved.has(rect.color), `${pose} uses ${rect.color}`).toBe(true);
      }
    }
  });

  it("grounds every pose with a contact shadow on the last row", () => {
    for (const pose of EDWARD_POSES) {
      const shadow = record(edwardPoses[pose], 0).filter((rect) =>
        rect.color.startsWith("rgba("),
      );
      expect(shadow.length, pose).toBeGreaterThan(0);
      for (const rect of shadow) {
        expect(rect.y + rect.height).toBe(EDWARD_ART_SIZE.height);
      }
    }
  });

  it("keeps the recognisable traits: dark hair, skin, black zip shirt, slate jeans, white sneakers", () => {
    for (const pose of EDWARD_POSES) {
      const colors = new Set(record(edwardPoses[pose], 0).map((rect) => rect.color));
      expect(colors.has(palette.hair), `${pose} hair`).toBe(true);
      expect(colors.has(palette.skin), `${pose} skin`).toBe(true);
      expect(colors.has(palette.jacketLift), `${pose} shirt`).toBe(true);
      expect(colors.has(palette.char), `${pose} shirt fold`).toBe(true);
      expect(colors.has(palette.navy), `${pose} jeans`).toBe(true);
      expect(colors.has(palette.cream), `${pose} sneakers`).toBe(true);
    }
    // Only the poses that show his face carry eyes, the zip seam and an earbud.
    for (const pose of ["front", "walk", "inspect"] as const) {
      const colors = new Set(record(edwardPoses[pose], 0).map((rect) => rect.color));
      expect(colors.has(palette.ink), `${pose} eyes`).toBe(true);
      expect(colors.has(palette.stone3), `${pose} zip`).toBe(true);
      expect(colors.has(palette.glow), `${pose} earbud`).toBe(true);
    }
    expect(new Set(record(edwardPoses.back, 0).map((r) => r.color)).has(palette.ink)).toBe(false);
  });

  it("gives the standing poses a one pixel breath and the walk four distinct frames", () => {
    const key = (pose: (typeof EDWARD_POSES)[number], frame: number) =>
      JSON.stringify(record(edwardPoses[pose], frame));

    expect(key("front", 0)).not.toBe(key("front", 1));
    expect(key("front", 0)).toBe(key("front", 2));

    const walk = new Set([0, 1, 2, 3].map((frame) => key("walk", frame)));
    expect(walk.size).toBe(4);
  });

  it("blinks on the sixth of every eight ambient frames, with the face otherwise unchanged", () => {
    const eyes = (frame: number) =>
      record(edwardPoses.front, frame).filter((r) => r.color === palette.ink).length;
    expect(eyes(0)).toBeGreaterThan(0);
    expect(eyes(6)).toBe(0);
    expect(eyes(14)).toBe(0);
    for (const frame of [1, 2, 3, 4, 5, 7, 8]) expect(eyes(frame)).toBe(eyes(0));
    // The back of his head has no eyes to close.
    expect(record(edwardPoses.back, 6)).toEqual(record(edwardPoses.back, 14));
  });

  it("bobs the walk with the feet: contact frames sit one pixel lower than passing frames", () => {
    const top = (frame: number) =>
      Math.min(...record(edwardPoses.walk, frame).filter((r) => r.color.startsWith("#")).map((r) => r.y));
    expect(top(0)).toBe(top(1) + 1);
    expect(top(2)).toBe(top(3) + 1);
    // Feet stay on the last row on every frame.
    for (const frame of [0, 1, 2, 3]) {
      const bottom = Math.max(
        ...record(edwardPoses.walk, frame).filter((r) => r.color.startsWith("#")).map((r) => r.y + r.height),
      );
      expect(bottom).toBe(EDWARD_ART_SIZE.height);
    }
  });

  it("gives every pose its own silhouette", () => {
    const shapes = EDWARD_POSES.map((pose) => key(pose));
    function key(pose: (typeof EDWARD_POSES)[number]) {
      return JSON.stringify(record(edwardPoses[pose], 0));
    }
    expect(new Set(shapes).size).toBe(EDWARD_POSES.length);
  });
});

describe("walk cycle", () => {
  it("holds the idle pose while standing still", () => {
    expect(getWalkFrame(0, PIXEL_UNIT, false)).toBe(0);
    expect(getWalkFrame(1_234, PIXEL_UNIT, false)).toBe(0);
  });

  it("advances with distance travelled rather than with time", () => {
    const frames = new Set<number>();
    for (let x = 0; x < 400; x += 4) {
      frames.add(getWalkFrame(x, PIXEL_UNIT, true));
    }
    expect(frames.size).toBe(4);
  });

  it("returns a frame that exists for any position in the world", () => {
    for (let x = 0; x <= WORLD_CONFIG.width; x += 17) {
      const frame = getWalkFrame(x, PIXEL_UNIT, true);
      expect(Number.isInteger(frame)).toBe(true);
      expect(frame).toBeGreaterThanOrEqual(0);
      expect(frame).toBeLessThan(4);
    }
  });
});
