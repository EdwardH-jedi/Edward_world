import { palette } from "@/lib/pixel/palette";
import type { ArtRoutine, SpriteMap, SpriteRows } from "@/lib/pixel/raster";
import { sprite } from "@/lib/pixel/raster";
import type { Outfit, OutfitSlot } from "@/types/wardrobe";

/**
 * Wardrobe art: a dress form and the garments that go on it.
 *
 * Everything here is authored on the same grid the rest of the world uses, and
 * every garment is drawn in the colour the catalogue records for it rather
 * than in a colour chosen here — the art is a view of the data, which is why
 * dressing the mannequin can be the room's payoff instead of a diagram.
 */

export const MANNEQUIN_ART_SIZE = { width: 16, height: 20 } as const;
export const GARMENT_ART_SIZE = { width: 12, height: 11 } as const;
export const HANGER_ART_SIZE = { width: 12, height: 14 } as const;

/** Darkens a `#rrggbb` by a fraction, for the one shaded edge each piece gets. */
export function shadeHex(hex: string, amount = 0.26) {
  const value = hex.replace("#", "");
  if (value.length !== 6) return hex;
  const channels = [0, 2, 4].map((offset) => {
    const channel = Number.parseInt(value.slice(offset, offset + 2), 16);
    return Math.max(0, Math.round(channel * (1 - amount)));
  });
  return `#${channels.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** A bare dress form: timber, headless, nothing to read as a character. */
const FORM: SpriteRows = [
  "................",
  "......dddd......",
  "......ddwd......",
  "......ddwd......",
  "....dddddddd....",
  "...ddddddddwd...",
  "...ddddddddwd...",
  "...ddddddddwd...",
  "...ddddddddwd...",
  "....dddddddd....",
  ".....dddddd.....",
  ".....dddddd.....",
  "....dddddddd....",
  "....dddddddd....",
  "....dd....dd....",
  "....dd....dd....",
  "....dd....dd....",
  "....dd....dd....",
  "....dd....dd....",
  "...ddd....ddd...",
];

const FORM_MAP: SpriteMap = { d: palette.brown, w: palette.brown2 };

/**
 * One layer of clothing on the form.
 *
 * The coat is cut open down the middle on purpose: when a top is already on
 * the form you can see it through the opening, so layering is visible rather
 * than asserted.
 */
const LAYERS: Readonly<Record<OutfitSlot, SpriteRows>> = {
  BOTTOM: [
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "....gggggggx....",
    "...gggggggggx...",
    "...gggggggggx...",
    "...ggg....ggx...",
    "...ggg....ggx...",
    "...ggg....ggx...",
    "...ggg....ggx...",
    "...xxx....xxx...",
  ],
  TOP: [
    "................",
    "................",
    "................",
    "................",
    "...gggggggggx...",
    "..gggggggggggx..",
    "..gggggggggggx..",
    "...gggggggggx...",
    "...gggggggggx...",
    "...gggggggggx...",
    "....xxxxxxxx....",
  ],
  OUTER: [
    "................",
    "................",
    "................",
    "................",
    "..gggggggggggx..",
    ".gggggggggggggx.",
    ".ggggg....ggggx.",
    ".ggggg....ggggx.",
    ".ggggg....ggggx.",
    ".ggggg....ggggx.",
    "..gggg....gggx..",
    "..xxxx....xxxx..",
  ],
  SHOES: [
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "..gggx....gggx..",
  ],
};

/** Coat over top over trousers, exactly the order a person dresses in. */
const LAYER_ORDER: readonly OutfitSlot[] = ["BOTTOM", "TOP", "OUTER", "SHOES"];

/**
 * The dress form wearing whatever the outfit holds.
 *
 * Takes resolved colours rather than garment ids so the art never has to reach
 * back into the catalogue, and so an empty outfit is simply a bare form.
 */
export function createMannequinRoutine(
  colours: Partial<Record<OutfitSlot, string>>,
): ArtRoutine {
  return (draw) => {
    sprite(draw, 0, 0, FORM, FORM_MAP);
    for (const slot of LAYER_ORDER) {
      const colour = colours[slot];
      if (!colour) continue;
      sprite(draw, 0, 0, LAYERS[slot], {
        g: colour,
        x: shadeHex(colour),
      });
    }
  };
}

/** Garment icons, one silhouette per layer. */
const ICONS: Readonly<Record<OutfitSlot, SpriteRows>> = {
  OUTER: [
    "..gg....gg..",
    ".gggggggggx.",
    "ggggggggggmx",
    "ggggggggggmx",
    "ggggg..gggmx",
    "ggggg..gggmx",
    ".gggg..ggmx.",
    ".gggg..ggmx.",
    "..ggg..ggx..",
    "..ggg..ggx..",
    "..xxx..xxx..",
  ],
  TOP: [
    "............",
    "..gg....gg..",
    ".gggg..ggggx",
    "ggggggggggmx",
    "ggggggggggmx",
    "ggggggggggmx",
    "..gggggggx..",
    "..gggggggx..",
    "..gggggggx..",
    "..gggggggx..",
    "..xxxxxxxx..",
  ],
  BOTTOM: [
    "............",
    "..gggggggx..",
    "..gggggggx..",
    "..gggggggx..",
    "..gggggggx..",
    "..gg...ggx..",
    "..gg...ggx..",
    "..gg...ggx..",
    "..gg...ggx..",
    "..gg...ggx..",
    "..xx...xxx..",
  ],
  SHOES: [
    "............",
    "............",
    "............",
    "............",
    "............",
    "............",
    ".ggg...ggg..",
    ".gggx..gggx.",
    ".gggx..gggx.",
    ".gggx..gggx.",
    ".xxxx..xxxx.",
  ],
};

/** One garment, drawn flat: what a shelf tile and the work table both show. */
export function createGarmentRoutine(
  slot: OutfitSlot,
  colour: string,
): ArtRoutine {
  const map: SpriteMap = {
    g: colour,
    x: shadeHex(colour),
    m: shadeHex(colour, 0.12),
  };
  return (draw) => {
    sprite(draw, 0, 0, ICONS[slot], map);
  };
}

const HANGER: SpriteRows = [
  ".....gg.....",
  "....g..g....",
  "..gggggggg..",
];

/** Rows the hanger occupies before the garment starts. */
const HANGER_DEPTH = HANGER.length;

const HANGER_MAP: SpriteMap = { g: palette.stone3 };

/** The same garment on a wire hanger, which is how the rail shows it. */
export function createHangingRoutine(
  slot: OutfitSlot,
  colour: string,
): ArtRoutine {
  const garment = createGarmentRoutine(slot, colour);
  return (draw, frame) => {
    sprite(draw, 0, 0, HANGER, HANGER_MAP);
    garment(
      (x, y, width, height, fill) => draw(x, y + HANGER_DEPTH, width, height, fill),
      frame,
    );
  };
}

/** Resolves an outfit into the colours the mannequin needs. */
export function outfitColours(
  outfit: Outfit,
  lookup: (id: string) => { colour: string } | undefined,
): Partial<Record<OutfitSlot, string>> {
  const colours: Partial<Record<OutfitSlot, string>> = {};
  for (const slot of LAYER_ORDER) {
    const id = outfit[slot];
    const garment = id ? lookup(id) : undefined;
    if (garment) colours[slot] = garment.colour;
  }
  return colours;
}
