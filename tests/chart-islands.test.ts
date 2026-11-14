import { describe, expect, it } from "vitest";
import { getLanding, LANDINGS } from "@/data/chart";
import { ISLAND_PLANS } from "@/data/islands";
import {
  COAST_CLEARANCE,
  FIGURE_HALF,
  groundDistance,
  groundFor,
  isActionable,
  isWalkBlocked,
  nearestDoor,
  stepWalker,
  walkerAt,
  type Walker,
} from "@/lib/game/chart/island-walk";
import { LANDING_IDS, type Place, type Rect, type Vec } from "@/types/chart";

const inside = (p: Vec, r: Rect) => p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h;
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const rectEdge = (r: Rect): Vec[] => {
  const out: Vec[] = [];
  for (let i = 0; i <= 8; i++) {
    out.push({ x: r.x + (r.w * i) / 8, y: r.y }, { x: r.x + (r.w * i) / 8, y: r.y + r.h });
    out.push({ x: r.x, y: r.y + (r.h * i) / 8 }, { x: r.x + r.w, y: r.y + (r.h * i) / 8 });
  }
  return out;
};

function walk(ground: ReturnType<typeof groundFor>, places: readonly Place[], from: Vec, to: Vec, frames: number, check?: (w: Walker) => void) {
  let w = walkerAt(from);
  for (let i = 0; i < frames; i++) {
    const dx = to.x - w.x;
    const dy = to.y - w.y;
    const d = Math.hypot(dx, dy) || 1;
    w = stepWalker(ground, places, w, { x: dx / d, y: dy / d }, 1 / 60);
    check?.(w);
  }
  return w;
}

describe("island plans", () => {
  it("has a plan for every landing, and nothing else", () => {
    expect(Object.keys(ISLAND_PLANS).sort()).toEqual([...LANDING_IDS].sort());
    for (const id of LANDING_IDS) expect(ISLAND_PLANS[id].landing).toBe(id);
  });

  for (const landing of LANDINGS) {
    const plan = ISLAND_PLANS[landing.id];
    const ground = groundFor(getLanding(landing.id), plan);

    describe(landing.name, () => {
      it("lands Edward on firm ground at the jetty", () => {
        expect(isWalkBlocked(ground, plan.places, plan.jetty.x, plan.jetty.y)).toBe(false);
      });

      it("keeps every footprint apart, and every plot and building on land", () => {
        plan.places.forEach((a, i) =>
          plan.places.slice(i + 1).forEach((b) => expect(overlaps(a.rect, b.rect), `${a.id} / ${b.id}`).toBe(false)),
        );
        for (const place of plan.places) {
          if (!isActionable(place) && place.kind !== "placeholder") continue;
          const worst = Math.max(...rectEdge(place.rect).map((p) => groundDistance(ground, p.x, p.y)));
          expect(worst, place.id).toBeLessThanOrEqual(-COAST_CLEARANCE);
        }
      });

      it("puts every door on standable ground, outside every footprint, beside its own", () => {
        for (const place of plan.places.filter(isActionable)) {
          expect(isWalkBlocked(ground, plan.places, place.door.x, place.door.y), place.id).toBe(false);
          for (const other of plan.places) expect(inside(place.door, other.rect), `${place.id} in ${other.id}`).toBe(false);
          const r = place.rect;
          const gap = Math.hypot(
            Math.max(r.x - place.door.x, 0, place.door.x - (r.x + r.w)),
            Math.max(r.y - place.door.y, 0, place.door.y - (r.y + r.h)),
          );
          expect(gap, place.id).toBeLessThanOrEqual(30);
        }
      });

      it("can walk from the jetty to every door", () => {
        const step = 6;
        const cols = Math.ceil(plan.size.x / step);
        const rows = Math.ceil(plan.size.y / step);
        const seen = new Uint8Array(cols * rows);
        const start = Math.round(plan.jetty.x / step) + Math.round(plan.jetty.y / step) * cols;
        const queue = [start];
        seen[start] = 1;
        while (queue.length) {
          const i = queue.pop()!;
          const cx = i % cols;
          const cy = (i - cx) / cols;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
            const j = nx + ny * cols;
            if (seen[j] || isWalkBlocked(ground, plan.places, nx * step, ny * step)) continue;
            seen[j] = 1;
            queue.push(j);
          }
        }
        for (const place of plan.places.filter(isActionable)) {
          const near = [-1, 0, 1].some((ox) =>
            [-1, 0, 1].some((oy) => seen[Math.round(place.door.x / step) + ox + (Math.round(place.door.y / step) + oy) * cols]),
          );
          expect(near, place.id).toBe(true);
        }
      });

      it("never walks into a footprint or off the coast", () => {
        for (const place of plan.places) {
          const centre = { x: place.rect.x + place.rect.w / 2, y: place.rect.y + place.rect.h / 2 };
          walk(ground, plan.places, plan.jetty, centre, 400, (w) => {
            for (const p of plan.places) {
              const foot = { x: w.x - FIGURE_HALF, y: w.y - FIGURE_HALF, w: FIGURE_HALF * 2, h: FIGURE_HALF * 2 };
              expect(overlaps(foot, p.rect), `${place.id}: inside ${p.id}`).toBe(false);
            }
          });
        }
        for (const corner of [{ x: 0, y: 0 }, { x: plan.size.x, y: 0 }, { x: 0, y: plan.size.y }, { x: plan.size.x, y: plan.size.y }]) {
          walk(ground, plan.places, plan.jetty, corner, 600, (w) => {
            expect(groundDistance(ground, w.x, w.y)).toBeLessThanOrEqual(-COAST_CLEARANCE);
          });
        }
      });
    });
  }

  it("walks from Sydney's jetty to Edward's House holding one arrow key", () => {
    const plan = ISLAND_PLANS.sydney;
    const ground = groundFor(getLanding("sydney"), plan);
    let w = walkerAt(plan.jetty);
    for (let i = 0; i < 60 * 8; i++) w = stepWalker(ground, plan.places, w, { x: 1, y: 0 }, 1 / 60);
    expect(nearestDoor(plan.places, w)?.id).toBe("edwards-house");
  });
});
