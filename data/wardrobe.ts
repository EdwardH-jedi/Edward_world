import type { Garment } from "@/types/wardrobe";
import { palette } from "@/lib/pixel/palette";

/**
 * The garments hanging in the room.
 *
 * Deliberately few and deliberately plain: the point of the location is the
 * archive loop, not a catalogue. Every field is something you could read off
 * the garment itself.
 */
export const garments: readonly Garment[] = [
  {
    id: "field-jacket",
    name: "FIELD JACKET",
    slot: "OUTER",
    colour: palette.green3,
    colourName: "OLIVE",
    fabric: "COTTON TWILL",
    season: "COOL",
  },
  {
    id: "wool-overshirt",
    name: "WOOL OVERSHIRT",
    slot: "OUTER",
    colour: palette.brown2,
    colourName: "BROWN",
    fabric: "WOOL",
    season: "COOL",
  },
  {
    id: "grey-hoodie",
    name: "GREY HOODIE",
    slot: "TOP",
    colour: palette.hoodie,
    colourName: "GREY",
    fabric: "COTTON FLEECE",
    season: "ALL YEAR",
  },
  {
    id: "cream-tee",
    name: "CREAM TEE",
    slot: "TOP",
    colour: palette.cream,
    colourName: "CREAM",
    fabric: "COTTON JERSEY",
    season: "WARM",
  },
  {
    id: "faded-denim",
    name: "FADED DENIM",
    slot: "BOTTOM",
    colour: palette.blue2,
    colourName: "FADED BLUE",
    fabric: "DENIM",
    season: "ALL YEAR",
  },
  {
    id: "work-trousers",
    name: "WORK TROUSERS",
    slot: "BOTTOM",
    colour: palette.denim,
    colourName: "CHARCOAL",
    fabric: "COTTON CANVAS",
    season: "ALL YEAR",
  },
  {
    id: "canvas-runners",
    name: "CANVAS RUNNERS",
    slot: "SHOES",
    colour: palette.glow,
    colourName: "OFF WHITE",
    fabric: "CANVAS",
    season: "WARM",
  },
  {
    id: "leather-boots",
    name: "LEATHER BOOTS",
    slot: "SHOES",
    colour: palette.brown3,
    colourName: "DARK BROWN",
    fabric: "LEATHER",
    season: "COOL",
  },
] as const;

export function getGarment(id: string) {
  return garments.find((garment) => garment.id === id);
}
