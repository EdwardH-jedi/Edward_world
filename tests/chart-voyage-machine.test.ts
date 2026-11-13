import { describe, expect, it } from "vitest";
import {
  INITIAL_VOYAGE,
  isAshore,
  isSailing,
  voyageReducer,
  type VoyageEvent,
  type VoyageState,
} from "@/lib/game/chart/voyage-machine";

const base = { landing: null, place: null, returnTo: "CHART", charted: [] } as const;
const log = INITIAL_VOYAGE;
const chart: VoyageState = { ...base, mode: "CHART" };
const landingsFromChart: VoyageState = { ...base, mode: "LANDINGS" };
const island: VoyageState = { ...base, mode: "ISLAND", landing: "sydney", charted: ["sydney"] };
const landingsFromIsland: VoyageState = { ...island, mode: "LANDINGS", returnTo: "ISLAND" };
const place: VoyageState = { ...island, mode: "PLACE", place: "edwards-house" };

const EVENTS: readonly VoyageEvent[] = [
  { type: "SET_SAIL" },
  { type: "DROP_ANCHOR", landing: "jeju" },
  { type: "ENTER_PLACE", place: "quadrangle" },
  { type: "LEAVE_PLACE" },
  { type: "LEAVE_ISLAND" },
  { type: "OPEN_LANDINGS" },
  { type: "TOGGLE_LANDINGS" },
  { type: "SAIL_TO", landing: "afl" },
  { type: "ESCAPE" },
];

type Want = VoyageState["mode"] | "same";
const row = (
  SET_SAIL: Want, DROP_ANCHOR: Want, ENTER_PLACE: Want, LEAVE_PLACE: Want, LEAVE_ISLAND: Want,
  OPEN_LANDINGS: Want, TOGGLE_LANDINGS: Want, SAIL_TO: Want, ESCAPE: Want,
): Record<VoyageEvent["type"], Want> => ({
  SET_SAIL, DROP_ANCHOR, ENTER_PLACE, LEAVE_PLACE, LEAVE_ISLAND, OPEN_LANDINGS, TOGGLE_LANDINGS, SAIL_TO, ESCAPE,
});

/** Expected mode after every event from every state; `same` means the state object comes back untouched. */
const TABLE: readonly [string, VoyageState, Record<VoyageEvent["type"], Want>][] = [
  ["LOG", log, row("CHART", "same", "same", "same", "same", "same", "same", "same", "CHART")],
  ["CHART", chart, row("same", "ISLAND", "same", "same", "same", "LANDINGS", "LANDINGS", "same", "same")],
  ["LANDINGS (from the chart)", landingsFromChart, row("same", "same", "same", "same", "same", "same", "CHART", "CHART", "CHART")],
  ["LANDINGS (from an island)", landingsFromIsland, row("same", "same", "same", "same", "same", "same", "ISLAND", "CHART", "ISLAND")],
  ["ISLAND", island, row("same", "same", "PLACE", "same", "CHART", "LANDINGS", "LANDINGS", "same", "CHART")],
  ["PLACE", place, row("same", "same", "same", "ISLAND", "same", "same", "same", "same", "ISLAND")],
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

  it("steps back one level on Escape from every state, and from the chart goes nowhere", () => {
    expect(voyageReducer(log, { type: "ESCAPE" }).mode).toBe("CHART");
    expect(voyageReducer(place, { type: "ESCAPE" })).toMatchObject({ mode: "ISLAND", landing: "sydney", place: null });
    expect(voyageReducer(island, { type: "ESCAPE" })).toMatchObject({ mode: "CHART", landing: null });
    expect(voyageReducer(landingsFromIsland, { type: "ESCAPE" })).toMatchObject({ mode: "ISLAND", landing: "sydney" });
    expect(voyageReducer(landingsFromChart, { type: "ESCAPE" }).mode).toBe("CHART");
    expect(voyageReducer(chart, { type: "ESCAPE" })).toBe(chart);
  });

  it("goes ashore at the landing, charts it once, and keeps it charted", () => {
    const ashore = voyageReducer(chart, { type: "DROP_ANCHOR", landing: "jeju" });
    expect(ashore).toMatchObject({ mode: "ISLAND", landing: "jeju", charted: ["jeju"] });
    const back = voyageReducer(ashore, { type: "LEAVE_ISLAND" });
    expect(back).toMatchObject({ mode: "CHART", landing: null, charted: ["jeju"] });
    expect(voyageReducer(back, { type: "DROP_ANCHOR", landing: "jeju" }).charted).toEqual(["jeju"]);
  });

  it("opens a place on the island it belongs to and comes back to the same island", () => {
    const inside = voyageReducer(island, { type: "ENTER_PLACE", place: "quadrangle" });
    expect(inside).toMatchObject({ mode: "PLACE", landing: "sydney", place: "quadrangle" });
    expect(voyageReducer(inside, { type: "LEAVE_PLACE" })).toMatchObject({ mode: "ISLAND", landing: "sydney", place: null });
  });

  it("sails, and counts as ashore, only where it should", () => {
    const states = [log, chart, landingsFromChart, landingsFromIsland, island, place];
    expect(states.map(isSailing)).toEqual([false, true, false, false, false, false]);
    expect(states.map(isAshore)).toEqual([false, false, false, true, true, true]);
  });
});
