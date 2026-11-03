import { type Chapter, chapters } from "@/data/personal";
import { getGroundYForFootprint, PIXEL_UNIT, TIMELINE_STREET } from "@/lib/game/terrain";
import type { Sign } from "@/types/world";

/**
 * The timeline street: one readable station per chapter of Edward's story,
 * standing between the Arcade and the exit gate in the order it happened.
 *
 * Every word a station shows is taken from `chapters` in `data/personal.ts`
 * without rewording — the heading is the place and its years, the body is the
 * detail lines joined, and the chip is the place up to its first comma. That
 * file's rule applies here unchanged: nothing is inferred, rounded up or
 * written to sound better than it is. Adding a chapter there adds a station
 * here, laid out evenly along the same stretch.
 */

/**
 * A station's footprint: a plaque on a post, on the 4px art grid, as tall as
 * Edward so its label chip always clears his head.
 */
export const STATION_SIZE = { width: 40, height: 96 } as const;

/** How far a station answers E, the same reach as the directions post. */
export const STATION_RANGE = 68;

const STATION_ID_PREFIX = "station-";

export function stationId(chapter: Pick<Chapter, "id">) {
  return `${STATION_ID_PREFIX}${chapter.id}`;
}

/**
 * The chapter a world object is the station for, or `undefined` when it is
 * not a timeline station at all.
 */
export function chapterIdOfStation(objectId: string) {
  return objectId.startsWith(STATION_ID_PREFIX)
    ? objectId.slice(STATION_ID_PREFIX.length)
    : undefined;
}

/**
 * The label chip, which is also the station's accessible name: the place up
 * to its first comma. Years stay in the heading, because a chip carrying
 * them is wider than the street has room for between neighbouring stations.
 */
export function stationLabel(chapter: Pick<Chapter, "place">) {
  return chapter.place.split(",")[0].trim();
}

/** The dialog heading and the index line: place and years, as written. */
export function stationHeading(chapter: Pick<Chapter, "place" | "years">) {
  return `${chapter.place} · ${chapter.years}`;
}

/** The dialog body: the detail lines, verbatim, joined into one paragraph. */
export function stationText(chapter: Pick<Chapter, "detail">) {
  return chapter.detail.join(" ");
}

/** The left edge of each of `count` stations, evenly spread on the grid. */
function stationXs(count: number) {
  const { startX, endX } = TIMELINE_STREET;
  const room = endX - startX - STATION_SIZE.width;
  const toGrid = (value: number) => Math.floor(value / PIXEL_UNIT) * PIXEL_UNIT;
  if (count <= 1) return [startX + toGrid(room / 2)];
  const step = toGrid(room / (count - 1));
  return Array.from({ length: count }, (_, index) => startX + index * step);
}

/** One `READ` sign per chapter, left to right in chapter order. */
export function buildTimelineStations(list: readonly Chapter[] = chapters): Sign[] {
  const xs = stationXs(list.length);
  return list.map((chapter, index) => {
    const x = xs[index];
    return {
      kind: "sign",
      id: stationId(chapter),
      label: stationLabel(chapter),
      position: {
        x,
        y: getGroundYForFootprint(x, STATION_SIZE.width) - STATION_SIZE.height,
      },
      size: { ...STATION_SIZE },
      interactionRange: STATION_RANGE,
      interaction: {
        type: "READ",
        heading: stationHeading(chapter),
        text: stationText(chapter),
      },
    };
  });
}

export const timelineStations: readonly Sign[] = buildTimelineStations();
