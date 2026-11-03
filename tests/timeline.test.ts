import { describe, expect, it } from "vitest";
import { type Chapter, chapters } from "@/data/personal";
import {
  buildTimelineStations,
  chapterIdOfStation,
  STATION_RANGE,
  stationHeading,
  stationLabel,
  stationText,
  timelineStations,
} from "@/data/timeline";
import { buildings, signs, WORLD_CONFIG, worldObjects } from "@/data/world";
import { getGroundYForFootprint, PIXEL_UNIT, TIMELINE_STREET } from "@/lib/game/terrain";
import type { Sign } from "@/types/world";

/**
 * The timeline street's data contract: the stations are derived from
 * `chapters`, so these hold for whatever the chapters are — the real four,
 * and a longer list standing in for the next chapter Edward adds.
 */

const exit = signs.find(({ id }) => id === "world-exit")!;
const arcade = buildings.find(({ id }) => id === "arcade")!;

function expectStreetContract(stations: readonly Sign[], list: readonly Chapter[]) {
  expect(stations).toHaveLength(list.length);
  stations.forEach((station, index) => {
    const chapter = list[index];
    expect(station.kind).toBe("sign");
    expect(chapterIdOfStation(station.id)).toBe(chapter.id);

    // On the grid, standing on the ground, inside the world, on the street.
    for (const value of [station.position.x, station.position.y, station.size.width, station.size.height]) {
      expect(value % PIXEL_UNIT, station.id).toBe(0);
    }
    expect(station.position.y + station.size.height).toBe(
      getGroundYForFootprint(station.position.x, station.size.width),
    );
    expect(station.position.x).toBeGreaterThanOrEqual(TIMELINE_STREET.startX);
    expect(station.position.x + station.size.width).toBeLessThanOrEqual(TIMELINE_STREET.endX);
    expect(station.position.x).toBeGreaterThan(arcade.position.x + arcade.size.width);
    expect(station.position.x + station.size.width).toBeLessThan(exit.position.x);
    expect(station.position.x + station.size.width).toBeLessThanOrEqual(WORLD_CONFIG.width);

    // Readable, in the chapter's own words.
    expect(station.interaction.type).toBe("READ");
    if (station.interaction.type === "READ") {
      expect(station.interaction.heading.trim()).not.toBe("");
      expect(station.interaction.text.trim()).not.toBe("");
      expect(station.interaction.heading).toContain(chapter.place);
      expect(station.interaction.heading).toContain(chapter.years);
      for (const line of chapter.detail) expect(station.interaction.text).toContain(line);
    }
  });

  // In chapter order, left to right, without touching.
  for (let index = 1; index < stations.length; index += 1) {
    const left = stations[index - 1];
    const right = stations[index];
    expect(right.position.x, right.id).toBeGreaterThan(left.position.x + left.size.width);
  }
}

describe("timeline stations", () => {
  it("are one READ sign per chapter, in order, on the street, left of the exit", () => {
    expectStreetContract(timelineStations, chapters);
  });

  it("are the world's own signs, between the directions post and the exit", () => {
    expect(signs[0].id).toBe("movement-sign");
    expect(signs.at(-1)?.id).toBe("world-exit");
    expect(signs.slice(1, -1)).toEqual(timelineStations);
    for (const station of timelineStations) {
      expect(worldObjects.filter(({ id }) => id === station.id)).toHaveLength(1);
    }
  });

  it("take their words verbatim from the chapters", () => {
    timelineStations.forEach((station, index) => {
      const chapter = chapters[index];
      expect(station.label).toBe(stationLabel(chapter));
      expect(station.interaction).toEqual({
        type: "READ",
        heading: stationHeading(chapter),
        text: stationText(chapter),
      });
    });
    expect(timelineStations.map(({ label }) => label)).toEqual([
      "Jeju Island",
      "Seoul",
      "Sydney",
      "Hungary",
    ]);
    expect(timelineStations.map((station) => station.interaction.type === "READ" && station.interaction.heading)).toEqual([
      "Jeju Island, Korea · 2017 – 2022",
      "Seoul, Korea · 2021",
      "Sydney, Australia · 2026 · Final-year undergraduate",
      "Hungary · 2025 – 2026",
    ]);
  });

  it("keep their label chips short enough to fit a phone", () => {
    for (const station of timelineStations) {
      expect(station.label.length, station.label).toBeLessThanOrEqual(18);
      expect(station.label.trim()).toBe(station.label);
    }
    expect(new Set(timelineStations.map(({ label }) => label)).size).toBe(timelineStations.length);
  });

  it("reach as far as the directions post", () => {
    for (const station of timelineStations) expect(station.interactionRange).toBe(STATION_RANGE);
    expect(STATION_RANGE).toBe(signs[0].interactionRange);
  });

  it("only treat their own ids as stations", () => {
    for (const object of worldObjects) {
      const isStation = timelineStations.some(({ id }) => id === object.id);
      expect(chapterIdOfStation(object.id) !== undefined, object.id).toBe(isStation);
    }
  });

  it("grow with the chapters: a fifth chapter is a fifth station on the same street", () => {
    const next: Chapter = {
      id: "next",
      place: "Somewhere, Next",
      years: "2027",
      detail: ["A line.", "Another line."],
    };
    const longer = [...chapters, next];
    expectStreetContract(buildTimelineStations(longer), longer);
    expectStreetContract(buildTimelineStations([chapters[0]]), [chapters[0]]);
  });
});
