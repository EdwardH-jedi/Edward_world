import type { PortfolioEntryView } from "@/lib/game/portfolio-entry";
import type { LandingId } from "@/types/chart";

/**
 * The voyage, as a pure state machine.
 *
 *   LOG -> CHART -> ISLAND(landing) -> PLACE(landing, place)
 *            ^  ^        |                  |
 *            |  +--Esc---+  <------Esc------+
 *            +-> LANDINGS (from the chart or an island; Esc goes back)
 *
 * INDEX is a link, reachable from every state. It opens over the voyage
 * rather than replacing it, and OPEN_INDEX settles whatever was open first, as
 * the town's index does: the log is done with, a place or the Landings panel
 * closes, the boat and the island stay where they are. Timers and input drive
 * this machine; animation never does. The camera's zoom follows the mode, it
 * does not decide it.
 */

export type VoyageMode = "LOG" | "CHART" | "LANDINGS" | "ISLAND" | "PLACE";

export interface VoyageState {
  readonly mode: VoyageMode;
  /** The island ashore, in ISLAND and PLACE, and in LANDINGS opened from an island. */
  readonly landing: LandingId | null;
  /** The place open, in PLACE. */
  readonly place: string | null;
  /** Where Escape from the Landings panel goes back to. */
  readonly returnTo: "CHART" | "ISLAND";
  /** Every landing gone ashore at, in the order it happened. */
  readonly charted: readonly LandingId[];
}

export type VoyageEvent =
  /** "Set sail" on the log. */
  | { readonly type: "SET_SAIL" }
  /** `E` at an anchorage: go ashore. */
  | { readonly type: "DROP_ANCHOR"; readonly landing: LandingId }
  /** `E` at a place's door. */
  | { readonly type: "ENTER_PLACE"; readonly place: string }
  /** A place's own way out: its exit button, or a card's "Back". */
  | { readonly type: "LEAVE_PLACE" }
  /** `E` at the jetty: back to the boat. */
  | { readonly type: "LEAVE_ISLAND" }
  /** The Landings button. */
  | { readonly type: "OPEN_LANDINGS" }
  /** `M`: opens the Landings panel, and closes it again. */
  | { readonly type: "TOGGLE_LANDINGS" }
  /** A landing picked in the panel. The caller moves the boat. */
  | { readonly type: "SAIL_TO"; readonly landing: LandingId }
  | { readonly type: "ESCAPE" }
  /** The index opened over the voyage. */
  | { readonly type: "OPEN_INDEX" };

export const INITIAL_VOYAGE: VoyageState = {
  mode: "LOG",
  landing: null,
  place: null,
  returnTo: "CHART",
  charted: [],
};

const toChart = (state: VoyageState): VoyageState => ({ ...state, mode: "CHART", landing: null, place: null });

/**
 * Where a visit begins. Only a cold visit opens on the captain's log: an
 * explicit `?view=` — coming back from a document, a refresh after setting
 * sail, the index — starts under way, the rule `/` has always had.
 */
export function startVoyage(entry: PortfolioEntryView): VoyageState {
  return entry === "intro" ? INITIAL_VOYAGE : toChart(INITIAL_VOYAGE);
}
const toIsland = (state: VoyageState): VoyageState => ({ ...state, mode: "ISLAND", place: null });
const toLandings = (state: VoyageState, from: "CHART" | "ISLAND"): VoyageState => ({
  ...state,
  mode: "LANDINGS",
  place: null,
  returnTo: from,
});

/** Unrecognised events leave the state untouched (the same object), so React can bail out. */
export function voyageReducer(state: VoyageState, event: VoyageEvent): VoyageState {
  switch (state.mode) {
    case "LOG":
      return event.type === "SET_SAIL" || event.type === "ESCAPE" || event.type === "OPEN_INDEX" ? toChart(state) : state;

    case "CHART":
      if (event.type === "DROP_ANCHOR") {
        return {
          ...state,
          mode: "ISLAND",
          landing: event.landing,
          place: null,
          charted: state.charted.includes(event.landing) ? state.charted : [...state.charted, event.landing],
        };
      }
      if (event.type === "OPEN_LANDINGS" || event.type === "TOGGLE_LANDINGS") return toLandings(state, "CHART");
      return state;

    case "LANDINGS":
      if (event.type === "SAIL_TO") return toChart(state);
      if (event.type === "ESCAPE" || event.type === "TOGGLE_LANDINGS" || event.type === "OPEN_INDEX") {
        return state.returnTo === "ISLAND" && state.landing ? toIsland(state) : toChart(state);
      }
      return state;

    case "ISLAND":
      if (event.type === "ENTER_PLACE") return { ...state, mode: "PLACE", place: event.place };
      if (event.type === "ESCAPE" || event.type === "LEAVE_ISLAND") return toChart(state);
      if (event.type === "OPEN_LANDINGS" || event.type === "TOGGLE_LANDINGS") return toLandings(state, "ISLAND");
      return state;

    case "PLACE":
      return event.type === "ESCAPE" || event.type === "LEAVE_PLACE" || event.type === "OPEN_INDEX" ? toIsland(state) : state;
  }
}

/** Whether the boat answers the helm in this state. */
export function isSailing(state: VoyageState): boolean {
  return state.mode === "CHART";
}

/** Whether Edward is ashore, walking or inside a place. */
export function isAshore(state: VoyageState): boolean {
  return state.mode === "ISLAND" || state.mode === "PLACE" || (state.mode === "LANDINGS" && state.returnTo === "ISLAND");
}
