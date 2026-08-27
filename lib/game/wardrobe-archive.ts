import { garments } from "@/data/wardrobe";
import {
  OUTFIT_SLOTS,
  WARDROBE_STEPS,
  type Garment,
  type Outfit,
  type OutfitSlot,
  type WardrobeStep,
} from "@/types/wardrobe";

/**
 * Rules of the Wardrobe archive.
 *
 * Pure: no React, no DOM, no storage. The reducer is the whole product model
 * in miniature — you cannot compose from garments you have not archived, a
 * slot only accepts the kind of garment that belongs in it, and a look is not
 * a look until it is actually wearable.
 */

export interface ArchiveState {
  readonly step: WardrobeStep;
  /** Ids of garments captured into the archive, in capture order. */
  readonly archived: readonly string[];
  /** Id currently being inspected, if any. */
  readonly inspecting: string | null;
  /** What is on the mannequin. */
  readonly outfit: Outfit;
  /** The look that has been committed to storage, if any. */
  readonly savedOutfit: Outfit | null;
}

/** Enough of an outfit to be worth saving. */
export const MINIMUM_LOOK_SLOTS = 2;

export function createArchiveState(savedOutfit: Outfit | null = null): ArchiveState {
  return {
    step: "CAPTURE",
    archived: [],
    inspecting: null,
    outfit: {},
    savedOutfit,
  };
}

export function nextWardrobeStep(step: WardrobeStep): WardrobeStep {
  const index = WARDROBE_STEPS.indexOf(step);
  return WARDROBE_STEPS[Math.min(index + 1, WARDROBE_STEPS.length - 1)];
}

export type ArchiveAction =
  | { type: "INSPECT"; garmentId: string }
  | { type: "CAPTURE"; garmentId: string }
  | { type: "WEAR"; garmentId: string }
  | { type: "REMOVE"; slot: OutfitSlot }
  | { type: "SAVE" }
  | { type: "CLEAR_SAVED" }
  | { type: "ADVANCE" }
  | { type: "RESET"; savedOutfit: Outfit | null };

export function isArchived(state: ArchiveState, garmentId: string) {
  return state.archived.includes(garmentId);
}

/** Slots filled on the mannequin. */
export function countWorn(outfit: Outfit) {
  return OUTFIT_SLOTS.filter((slot) => outfit[slot]).length;
}

export function canSaveLook(state: ArchiveState) {
  return countWorn(state.outfit) >= MINIMUM_LOOK_SLOTS;
}

/** Whether a step's own precondition is met, so the visitor can move on. */
export function canAdvance(state: ArchiveState) {
  switch (state.step) {
    case "CAPTURE":
      return state.archived.length > 0;
    case "ARCHIVE":
      return state.archived.length > 0;
    case "ORGANISE":
      // Enough kinds archived that composing is a real choice.
      return new Set(
        state.archived
          .map((id) => garments.find((garment) => garment.id === id)?.slot)
          .filter(Boolean),
      ).size >= MINIMUM_LOOK_SLOTS;
    case "COMPOSE":
      return canSaveLook(state);
    case "SAVE":
      return state.savedOutfit !== null;
    case "COMPLETE":
      return false;
  }
}

export function archiveReducer(
  state: ArchiveState,
  action: ArchiveAction,
): ArchiveState {
  switch (action.type) {
    case "INSPECT":
      return { ...state, inspecting: action.garmentId };

    case "CAPTURE": {
      if (isArchived(state, action.garmentId)) {
        return { ...state, inspecting: action.garmentId };
      }
      return {
        ...state,
        archived: [...state.archived, action.garmentId],
        inspecting: action.garmentId,
      };
    }

    case "WEAR": {
      const garment = garments.find((entry) => entry.id === action.garmentId);
      // Only archived garments can be worn: the archive is the source of truth.
      if (!garment || !isArchived(state, action.garmentId)) return state;
      return {
        ...state,
        outfit: { ...state.outfit, [garment.slot]: garment.id },
        inspecting: garment.id,
      };
    }

    case "REMOVE": {
      const outfit = { ...state.outfit };
      delete outfit[action.slot];
      return { ...state, outfit };
    }

    case "SAVE":
      if (!canSaveLook(state)) return state;
      return { ...state, savedOutfit: { ...state.outfit }, step: "COMPLETE" };

    case "CLEAR_SAVED":
      return { ...state, savedOutfit: null };

    case "ADVANCE":
      if (!canAdvance(state)) return state;
      return { ...state, step: nextWardrobeStep(state.step) };

    case "RESET":
      return createArchiveState(action.savedOutfit);
  }
}

/** Garments that belong in a given slot. */
export function garmentsForSlot(slot: OutfitSlot): readonly Garment[] {
  return garments.filter((garment) => garment.slot === slot);
}
