import { garments } from "@/data/wardrobe";
import {
  OUTFIT_SLOTS,
  WARDROBE_STAGES,
  type Garment,
  type Outfit,
  type OutfitSlot,
  type WardrobeStage,
} from "@/types/wardrobe";

/**
 * Rules of the Wardrobe archive.
 *
 * Pure: no React, no DOM, no storage. The reducer is the whole product model
 * in miniature — you cannot compose from garments you have not archived, a
 * slot only accepts the kind of garment that belongs in it, and a look is not
 * a look until it is actually wearable.
 *
 * There is no step pointer and no ADVANCE action. Where the visitor is in the
 * product's loop is *derived* from what they have actually done, so the room
 * never has to ask them to press CONTINUE to reach a stage they are already
 * standing in.
 */

export interface ArchiveState {
  /** The garment on the work table, being looked at. */
  readonly selected: string | null;
  /** Ids of garments captured into the archive, in capture order. */
  readonly archived: readonly string[];
  /** What is on the mannequin. */
  readonly outfit: Outfit;
  /** The look committed to storage during this visit, if any. */
  readonly savedOutfit: Outfit | null;
}

/** Enough of an outfit to be worth saving. */
export const MINIMUM_LOOK_SLOTS = 2;

export function createArchiveState(): ArchiveState {
  return { selected: null, archived: [], outfit: {}, savedOutfit: null };
}

export type ArchiveAction =
  | { type: "SELECT"; garmentId: string }
  | { type: "ARCHIVE"; garmentId: string }
  | { type: "WEAR"; garmentId: string }
  | { type: "REMOVE"; slot: OutfitSlot }
  | { type: "SAVE" }
  | { type: "RESET" };

export function isArchived(state: ArchiveState, garmentId: string) {
  return state.archived.includes(garmentId);
}

export function isWorn(state: ArchiveState, garmentId: string) {
  const garment = getGarmentById(garmentId);
  return garment ? state.outfit[garment.slot] === garmentId : false;
}

/** Slots filled on the mannequin. */
export function countWorn(outfit: Outfit) {
  return OUTFIT_SLOTS.filter((slot) => outfit[slot]).length;
}

export function canSaveLook(state: ArchiveState) {
  return countWorn(state.outfit) >= MINIMUM_LOOK_SLOTS;
}

/** The look has been kept during this visit, so the room is finished. */
export function isComplete(state: ArchiveState) {
  return state.savedOutfit !== null;
}

function getGarmentById(id: string): Garment | undefined {
  return garments.find((garment) => garment.id === id);
}

/** Distinct layers the archive currently holds. */
export function archivedSlots(state: ArchiveState): ReadonlySet<OutfitSlot> {
  const slots = new Set<OutfitSlot>();
  for (const id of state.archived) {
    const garment = getGarmentById(id);
    if (garment) slots.add(garment.slot);
  }
  return slots;
}

/**
 * Which stages the visitor has actually completed.
 *
 * Read only from this visit's own state: a look kept on a previous visit hangs
 * on the wall and is not progress through the loop, so it must not tick a
 * stage or open the room on its ending.
 */
export function completedStages(
  state: ArchiveState,
): Readonly<Record<WardrobeStage, boolean>> {
  return {
    CAPTURE: state.selected !== null || state.archived.length > 0,
    ARCHIVE: state.archived.length > 0,
    ORGANISE: archivedSlots(state).size >= MINIMUM_LOOK_SLOTS,
    COMPOSE: countWorn(state.outfit) > 0,
    SAVE: state.savedOutfit !== null,
  };
}

/** The stage the visitor is standing in: the first one not yet done. */
export function currentStage(state: ArchiveState): WardrobeStage {
  const done = completedStages(state);
  return (
    WARDROBE_STAGES.find((stage) => !done[stage]) ??
    WARDROBE_STAGES[WARDROBE_STAGES.length - 1]
  );
}

export function archiveReducer(
  state: ArchiveState,
  action: ArchiveAction,
): ArchiveState {
  switch (action.type) {
    case "SELECT": {
      if (!getGarmentById(action.garmentId)) return state;
      return { ...state, selected: action.garmentId };
    }

    case "ARCHIVE": {
      if (!getGarmentById(action.garmentId)) return state;
      if (isArchived(state, action.garmentId)) {
        return { ...state, selected: action.garmentId };
      }
      return {
        ...state,
        archived: [...state.archived, action.garmentId],
        selected: action.garmentId,
      };
    }

    case "WEAR": {
      const garment = getGarmentById(action.garmentId);
      // Only archived garments can be worn: the archive is the source of truth.
      if (!garment || !isArchived(state, action.garmentId)) return state;
      return {
        ...state,
        outfit: { ...state.outfit, [garment.slot]: garment.id },
        selected: garment.id,
      };
    }

    case "REMOVE": {
      if (!state.outfit[action.slot]) return state;
      const outfit = { ...state.outfit };
      delete outfit[action.slot];
      return { ...state, outfit };
    }

    case "SAVE":
      if (!canSaveLook(state)) return state;
      return { ...state, savedOutfit: { ...state.outfit } };

    case "RESET":
      return createArchiveState();
  }
}

/** Garments that belong in a given slot. */
export function garmentsForSlot(slot: OutfitSlot): readonly Garment[] {
  return garments.filter((garment) => garment.slot === slot);
}

/** What the archive holds in a given layer, in the order it was captured. */
export function archivedInSlot(
  state: ArchiveState,
  slot: OutfitSlot,
): readonly Garment[] {
  return state.archived
    .map(getGarmentById)
    .filter((garment): garment is Garment => garment?.slot === slot);
}
