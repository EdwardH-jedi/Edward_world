/**
 * The Wardrobe archive.
 *
 * Five stages, all of them the visitor's to take — there is nothing timed here
 * and nothing to unlock, so this needs a stage list rather than the timed
 * machinery SportsGang uses. The stages mirror the product's own loop, and the
 * room reaches each one by being used rather than by a CONTINUE button.
 */
export const WARDROBE_STAGES = [
  "CAPTURE",
  "ARCHIVE",
  "ORGANISE",
  "COMPOSE",
  "SAVE",
] as const;

export type WardrobeStage = (typeof WARDROBE_STAGES)[number];

/** How each stage is spelled on the ribbon, in the product's own words. */
export const STAGE_LABEL: Readonly<Record<WardrobeStage, string>> = {
  CAPTURE: "CAPTURE",
  ARCHIVE: "ARCHIVE",
  ORGANISE: "ORGANISE",
  COMPOSE: "COMPOSE",
  SAVE: "SAVE LOOK",
};

/** Where a garment sits on the mannequin. One garment per slot. */
export const OUTFIT_SLOTS = ["OUTER", "TOP", "BOTTOM", "SHOES"] as const;
export type OutfitSlot = (typeof OUTFIT_SLOTS)[number];

/** How the room names each layer on its shelves. */
export const SLOT_LABEL: Readonly<Record<OutfitSlot, string>> = {
  OUTER: "OUTER",
  TOP: "TOPS",
  BOTTOM: "BOTTOMS",
  SHOES: "SHOES",
};

export type Season = "ALL YEAR" | "WARM" | "COOL";

/**
 * Structural metadata only.
 *
 * The real product reads garments from photographs; this room photographs a
 * garment already hanging in it. Either way what gets stored is a description
 * of the thing — no inferred style, no confidence score, nothing claimed about
 * recognition.
 */
export interface Garment {
  readonly id: string;
  readonly name: string;
  readonly slot: OutfitSlot;
  readonly colour: string;
  readonly colourName: string;
  readonly fabric: string;
  readonly season: Season;
}

/** A composed outfit: at most one garment per slot. */
export type Outfit = Partial<Record<OutfitSlot, string>>;
