import type { BuildingArt } from "@/lib/pixel/buildings";
import { palette } from "@/lib/pixel/palette";
import { dashes, type ArtRoutine, type Raster, sprite, type SpriteMap, type SpriteRows } from "@/lib/pixel/raster";

/**
 * The timeline street's stations: one plaque on a post per chapter.
 *
 * Every station shares the same plaque so the street reads as one series, and
 * each carries its own small motif so the chapters tell apart at a glance:
 * Hallasan over the sea for Jeju, a flask for the Seoul research internship,
 * a sandstone arch for Sydney, a fence post with its sensor for Hungary.
 *
 * The plaque's top rail is the only `signAccent` on it. It is the "readable"
 * mark, the plaque's equivalent of the door frames on the enterable
 * buildings, and it only ever touches the paper face below it and open sky
 * above. Nothing here is lit: `warmGlow` stays with the player and the places
 * you walk into.
 */

const ART_WIDTH = 10;
/**
 * Edward's height, so the plaque's top is level with his head. Shorter, and
 * the label chip that hangs three units over the plaque would sit behind his
 * head whenever he stood at the station he was about to read.
 */
const ART_HEIGHT = 24;

export const STATION_ART_SIZE = { width: ART_WIDTH, height: ART_HEIGHT } as const;

/** The plaque's face, inside its frame, in local art pixels. */
const FACE = { x: 1, y: 1, width: 8, height: 9 } as const;

/** Where a motif is stamped: the face less one row of paper above and below. */
const MOTIF = { x: FACE.x, y: FACE.y + 1, width: 8, height: 7 } as const;

/** A chapter's motif, drawn into the face once the plaque is up. */
type Motif = (draw: Raster, frame: number) => void;

function stamp(rows: SpriteRows, map: SpriteMap): Motif {
  return (draw) => sprite(draw, MOTIF.x, MOTIF.y, rows, map);
}

/** Jeju: Hallasan, lit from the left, over a sea that rolls on the ambient tick. */
const jeju: Motif = (draw, frame) => {
  sprite(
    draw,
    MOTIF.x,
    MOTIF.y,
    ["...gG...", "..ggGG..", ".gggGGG.", "ggggGGGG"],
    { g: palette.green2, G: palette.green3 },
  );
  const sea = MOTIF.y + 4;
  draw(MOTIF.x, sea, MOTIF.width, 2, palette.blue2);
  draw(MOTIF.x, sea + 2, MOTIF.width, 1, palette.blue3);
  for (let x = frame % 2; x < MOTIF.width; x += 3) {
    draw(MOTIF.x + x, sea, 1, 1, palette.blue);
  }
};

/** Seoul: a flask, lip and long neck first, for the materials-science internship. */
const seoul = stamp(
  [".cccccc.", "..c..c..", "..c..c..", ".c....c.", ".clbllc.", "cllllllc", "cccccccc"],
  { c: palette.brown3, l: palette.blue2, b: palette.blue },
);

/** Sydney: an arch through a sandstone wall, its right-hand side in shade. */
const sydney = stamp(
  [".ooooOO.", "oooooOOO", "ooo..oOO", "oo....OO", "oo....OO", "oo....OO", "oo....OO"],
  { o: palette.brown, O: palette.brown2 },
);

/** Hungary: a fence post carrying a sensor, its status light blinking. */
const hungary: Motif = (draw, frame) => {
  sprite(
    draw,
    MOTIF.x,
    MOTIF.y,
    ["..hhhh..", "..hlh...", "p..pp..p", "ssssssss", "p..pp..p", "ssssssss", "p..pp..p"],
    { h: palette.char, l: palette.blue, p: palette.brown3, s: palette.stone3 },
  );
  draw(MOTIF.x + 5, MOTIF.y + 1, 1, 1, frame % 4 === 3 ? palette.brown3 : palette.orange);
};

/** A chapter with no motif of its own yet still gets a plaque: written lines. */
const unwritten: Motif = (draw) => {
  dashes(draw, MOTIF.x + 1, MOTIF.y + 1, 6, palette.ink);
  dashes(draw, MOTIF.x + 1, MOTIF.y + 3, 5, palette.ink);
  dashes(draw, MOTIF.x + 1, MOTIF.y + 5, 6, palette.ink);
};

/** Each chapter's motif, keyed by `Chapter.id` in `data/personal.ts`. */
export const STATION_MOTIFS: Readonly<Record<string, Motif>> = {
  jeju,
  seoul,
  sydney,
  hungary,
};

/** The plaque every station shares, with `motif` on its face. */
function plaque(motif: Motif): ArtRoutine {
  return (draw, frame) => {
    // The post and its stone footing, standing on the ground line.
    draw(4, 11, 1, ART_HEIGHT - 12, palette.brown2);
    draw(5, 11, 1, ART_HEIGHT - 12, palette.brown3);
    draw(3, ART_HEIGHT - 2, 4, 1, palette.stone2);
    draw(2, ART_HEIGHT - 1, 6, 1, palette.stone3);

    // Frame, then the paper face.
    draw(0, 1, 1, 10, palette.brown3);
    draw(ART_WIDTH - 1, 1, 1, 10, palette.brown3);
    draw(0, 10, ART_WIDTH, 1, palette.brown3);
    draw(FACE.x, FACE.y, FACE.width, FACE.height, palette.paper);

    // The readable mark: a top rail in the sign accent, over paper only.
    draw(FACE.x, 0, FACE.width, 1, palette.signAccent);

    motif(draw, frame);
  };
}

const stationArts: Readonly<Record<string, BuildingArt>> = Object.fromEntries(
  Object.entries(STATION_MOTIFS).map(([id, motif]) => [
    id,
    { size: STATION_ART_SIZE, draw: plaque(motif) },
  ]),
);

const unwrittenStationArt: BuildingArt = { size: STATION_ART_SIZE, draw: plaque(unwritten) };

/**
 * The art for a chapter's station. Stable per chapter, so a canvas is not
 * redrawn just because the world re-rendered.
 */
export function stationArt(chapterId: string): BuildingArt {
  return stationArts[chapterId] ?? unwrittenStationArt;
}
