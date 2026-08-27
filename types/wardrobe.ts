/**
 * The Wardrobe archive.
 *
 * Five steps, all of them the visitor's to take — there is nothing timed here,
 * so this needs a step list rather than the timed/gated machinery SportsGang
 * uses. The steps mirror the product's own loop.
 */
export const WARDROBE_STEPS = [
  "CAPTURE",
  "ARCHIVE",
  "ORGANISE",
  "COMPOSE",
  "SAVE",
  "COMPLETE",
] as const;

export type WardrobeStep = (typeof WARDROBE_STEPS)[number];

/** Where a garment sits on the mannequin. One garment per slot. */
export const OUTFIT_SLOTS = ["OUTER", "TOP", "BOTTOM", "SHOES"] as const;
export type OutfitSlot = (typeof OUTFIT_SLOTS)[number];

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
