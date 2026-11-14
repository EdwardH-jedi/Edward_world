import type { LandingId } from "@/types/chart";

/**
 * The voyage, as a pure state machine.
 *
 *   LOG -> CHART -> CARD(landing)
 *            ^  \-> LANDINGS
 *            +-----Esc-----+
 *
 * Timers and input drive it; animation never does. The camera's zoom from the
 * whole sheet to the boat follows the mode, it does not decide it. Phase 3
 * replaces CARD with ISLAND and PLACE; the shape of the machine stays.
 */

export type VoyageMode = "LOG" | "CHART" | "CARD" | "LANDINGS";

export interface VoyageState {
  readonly mode: VoyageMode;
  /** The landing whose card is open, in CARD. */
  readonly landing: LandingId | null;
  /** Every landing whose card has been opened, in the order it happened. */
  readonly charted: readonly LandingId[];
}

export type VoyageEvent =
  /** "Set sail" on the log, or "Back to the boat" on a card. */
  | { readonly type: "SET_SAIL" }
  /** `E` at an anchorage. */
  | { readonly type: "DROP_ANCHOR"; readonly landing: LandingId }
  /** The HUD's Landings button. */
  | { readonly type: "OPEN_LANDINGS" }
  /** `M`: opens the Landings panel from the chart, closes it again. */
  | { readonly type: "TOGGLE_LANDINGS" }
  /** A landing picked in the panel. The caller moves the boat. */
  | { readonly type: "SAIL_TO"; readonly landing: LandingId }
  | { readonly type: "ESCAPE" };

export const INITIAL_VOYAGE: VoyageState = { mode: "LOG", landing: null, charted: [] };

const toChart = (state: VoyageState): VoyageState =>
  state.mode === "CHART" && state.landing === null ? state : { ...state, mode: "CHART", landing: null };

/** Unrecognised events leave the state untouched (the same object), so React can bail out. */
export function voyageReducer(state: VoyageState, event: VoyageEvent): VoyageState {
  switch (state.mode) {
    case "LOG":
      return event.type === "SET_SAIL" || event.type === "ESCAPE" ? toChart(state) : state;

    case "CHART":
      if (event.type === "DROP_ANCHOR") {
        return {
          mode: "CARD",
          landing: event.landing,
          charted: state.charted.includes(event.landing) ? state.charted : [...state.charted, event.landing],
        };
      }
      if (event.type === "OPEN_LANDINGS" || event.type === "TOGGLE_LANDINGS") {
        return { ...state, mode: "LANDINGS" };
      }
      return state;

    case "CARD":
      return event.type === "ESCAPE" || event.type === "SET_SAIL" ? toChart(state) : state;

    case "LANDINGS":
      return event.type === "ESCAPE" || event.type === "TOGGLE_LANDINGS" || event.type === "SAIL_TO"
        ? toChart(state)
        : state;
  }
}

/** Whether the boat answers the helm in this state. */
export function isSailing(state: VoyageState): boolean {
  return state.mode === "CHART";
}
