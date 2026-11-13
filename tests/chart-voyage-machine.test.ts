import { describe, expect, it } from "vitest";
import {
  INITIAL_VOYAGE,
  isSailing,
  voyageReducer,
  type VoyageEvent,
  type VoyageState,
} from "@/lib/game/chart/voyage-machine";

const log = INITIAL_VOYAGE;
const chart: VoyageState = { mode: "CHART", landing: null, charted: [] };
const card: VoyageState = { mode: "CARD", landing: "sydney", charted: ["sydney"] };
const landings: VoyageState = { mode: "LANDINGS", landing: null, charted: ["sydney"] };

const EVENTS: readonly VoyageEvent[] = [
  { type: "SET_SAIL" },
  { type: "DROP_ANCHOR", landing: "jeju" },
  { type: "OPEN_LANDINGS" },
  { type: "TOGGLE_LANDINGS" },
  { type: "SAIL_TO", landing: "afl" },
  { type: "ESCAPE" },
];

/** Expected mode after each event, per starting state; `same` means the state object is returned untouched. */
const TABLE: readonly [string, VoyageState, Record<VoyageEvent["type"], VoyageState["mode"] | "same">][] = [
  ["LOG", log, { SET_SAIL: "CHART", DROP_ANCHOR: "same", OPEN_LANDINGS: "same", TOGGLE_LANDINGS: "same", SAIL_TO: "same", ESCAPE: "CHART" }],
  ["CHART", chart, { SET_SAIL: "same", DROP_ANCHOR: "CARD", OPEN_LANDINGS: "LANDINGS", TOGGLE_LANDINGS: "LANDINGS", SAIL_TO: "same", ESCAPE: "same" }],
  ["CARD", card, { SET_SAIL: "CHART", DROP_ANCHOR: "same", OPEN_LANDINGS: "same", TOGGLE_LANDINGS: "same", SAIL_TO: "same", ESCAPE: "CHART" }],
  ["LANDINGS", landings, { SET_SAIL: "same", DROP_ANCHOR: "same", OPEN_LANDINGS: "same", TOGGLE_LANDINGS: "CHART", SAIL_TO: "CHART", ESCAPE: "CHART" }],
];

describe("voyage machine", () => {
  for (const [name, state, expected] of TABLE) {
    for (const event of EVENTS) {
      it(`${name} + ${event.type}`, () => {
        const next = voyageReducer(state, event);
        const want = expected[event.type];
        if (want === "same") expect(next).toBe(state);
        else expect(next.mode).toBe(want);
      });
    }
  }

  it("Escape always leads back to the chart, and from the chart goes nowhere", () => {
    for (const state of [log, card, landings]) {
      expect(voyageReducer(state, { type: "ESCAPE" }).mode).toBe("CHART");
    }
    expect(voyageReducer(chart, { type: "ESCAPE" })).toBe(chart);
  });

  it("charts a landing once, when its card opens, and keeps it charted", () => {
    const opened = voyageReducer(chart, { type: "DROP_ANCHOR", landing: "jeju" });
    expect(opened).toMatchObject({ mode: "CARD", landing: "jeju", charted: ["jeju"] });
    const back = voyageReducer(opened, { type: "ESCAPE" });
    expect(back).toMatchObject({ mode: "CHART", landing: null, charted: ["jeju"] });
    const again = voyageReducer(back, { type: "DROP_ANCHOR", landing: "jeju" });
    expect(again.charted).toEqual(["jeju"]);
  });

  it("only sails in CHART", () => {
    expect([log, chart, card, landings].map(isSailing)).toEqual([false, true, false, false]);
  });
});
