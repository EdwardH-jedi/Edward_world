import { describe, expect, it } from "vitest";
import { BOTTLES, CARTOUCHE, LANDINGS, ROSE, SEA_NAMES, SERPENT, SHEET } from "@/data/chart";
import { LANDMARKS } from "@/lib/chart-art/landmarks";
import { buildChartScene } from "@/lib/game/chart/scene";
import { distanceAt, type Terrain } from "@/lib/game/chart/terrain";
import type { Landing } from "@/types/chart";
import { recordDrawing, type Extent } from "./support/recording-pen";

/**
 * Phase 2 of the chart brief: landmarks at 1.6–2× and at least 45% of their
 * island's width, islands grown by at most a fifth, anchorages where phase 1
 * put them, and name plates clear of the drawings.
 */

/** Where phase 1 anchored each landing. Phase 2 must not move them. */
const PHASE_1_ANCHORAGES = {
  incheon: { x: 354, y: 247 },
  jeju: { x: 411, y: 444 },
  field: { x: 715, y: 212 },
  shipyard: { x: 619, y: 430 },
  sydney: { x: 901, y: 569 },
  sportsgang: { x: 840, y: 751 },
  afl: { x: 1187, y: 400 },
  arcade: { x: 1231, y: 816 },
} as const;

/** Phase 1 radii; each axis may grow by up to 20%. */
const PHASE_1_RADII = {
  incheon: { x: 95, y: 70 },
  jeju: { x: 120, y: 78 },
  field: { x: 62, y: 46 },
  shipyard: { x: 58, y: 44 },
  sydney: { x: 170, y: 115 },
  sportsgang: { x: 66, y: 48 },
  afl: { x: 78, y: 56 },
  arcade: { x: 52, y: 40 },
} as const;

const scene = buildChartScene(LANDINGS, BOTTLES, SHEET, {
  seas: SEA_NAMES,
  rose: ROSE,
  cartouche: CARTOUCHE,
  serpent: SERPENT,
});
const { terrain } = scene;

/** The landmark as it is drawn on the chart, in chart units. */
function placed(landing: Landing) {
  const { scale, offset } = landing.landmark;
  return recordDrawing((g) => {
    g.translate(landing.centre.x + offset.x, landing.centre.y + offset.y);
    g.scale(scale, scale);
    LANDMARKS[landing.id](g, 0);
  });
}

/** The island's width along the row through its centre. */
function islandWidth(t: Terrain, landing: Landing) {
  let x0 = landing.centre.x;
  let x1 = landing.centre.x;
  while (distanceAt(t, x0 - 1, landing.centre.y) < 0) x0--;
  while (distanceAt(t, x1 + 1, landing.centre.y) < 0) x1++;
  return x1 - x0;
}

/** The name plate's lettering box: island name in caps, and the coordinate beneath when there is one. */
function plateBox(landing: Landing): Extent {
  const at = scene.plates[landing.id];
  const half = (landing.name.length * 11.5 * 0.62 + landing.name.length * 1.1) / 2;
  return { minX: at.x - half, maxX: at.x + half, minY: at.y - 10, maxY: at.y + (landing.coord ? 10 : 3) };
}

const overlaps = (a: Extent, b: Extent) =>
  a.minX < b.maxX && b.minX < a.maxX && a.minY < b.maxY && b.minY < a.maxY;

describe("chart landmarks", () => {
  for (const landing of LANDINGS) {
    describe(landing.name, () => {
      it("keeps its anchorage where phase 1 put it, with open water round it", () => {
        expect(landing.anchorage).toEqual(PHASE_1_ANCHORAGES[landing.id]);
        expect(distanceAt(terrain, landing.anchorage.x, landing.anchorage.y)).toBeGreaterThanOrEqual(14);
      });

      it("grows by no more than a fifth on either axis", () => {
        const base = PHASE_1_RADII[landing.id];
        expect(landing.radii.x / base.x).toBeGreaterThanOrEqual(1);
        expect(landing.radii.x / base.x).toBeLessThanOrEqual(1.2 + 1e-9);
        expect(landing.radii.y / base.y).toBeGreaterThanOrEqual(1);
        expect(landing.radii.y / base.y).toBeLessThanOrEqual(1.2 + 1e-9);
      });

      it("draws its landmark at 1.6–2×", () => {
        expect(landing.landmark.scale).toBeGreaterThanOrEqual(1.6);
        expect(landing.landmark.scale).toBeLessThanOrEqual(2);
      });

      it("gives its main landmark at least 45% of the island's width", () => {
        const { x0, x1 } = landing.landmark.main;
        expect(((x1 - x0) * landing.landmark.scale) / islandWidth(terrain, landing)).toBeGreaterThanOrEqual(0.45);
      });

      it("keeps the whole drawing ashore, clear of the inner coastline", () => {
        const { points } = placed(landing);
        const worst = Math.max(...points.map(([x, y]) => distanceAt(terrain, x, y)));
        expect(worst).toBeLessThanOrEqual(-4);
      });

      it("keeps the name plate off every landmark", () => {
        const plate = plateBox(landing);
        for (const other of LANDINGS) {
          expect(overlaps(plate, placed(other).extent), other.id).toBe(false);
        }
      });
    });
  }

  it("leaves the sea's lettering on open water", () => {
    for (const sea of SEA_NAMES) {
      expect(distanceAt(terrain, sea.at.x, sea.at.y), sea.text).toBeGreaterThan(4);
    }
  });
});
