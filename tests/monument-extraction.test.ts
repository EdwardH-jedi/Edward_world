import { describe, expect, it } from "vitest";
import { SOCKET_COUNT } from "@/lib/game/name-gate";
import {
  drawMonolith,
  letterAt,
  R,
  SEL,
  selTarget,
  SHRINE_ART_SIZE,
} from "@/lib/pixel/monolith";
import type { Raster } from "@/lib/pixel/raster";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  colour: string;
}

/**
 * Records what an art routine draws, without needing a canvas.
 *
 * Frame 3 on purpose: a selected letter still sitting in its carving pulses
 * between warm and glow, and on this frame it is drawn in glow — while a
 * letter in flight is always warm. That is what lets the two be told apart
 * without guessing at coordinates.
 */
function record(lifted: number, phase: 3 | 4 | 5 = 4, frame = 3) {
  const rects: Rect[] = [];
  const draw: Raster = (x, y, w, h, colour) => {
    rects.push({ x, y, w, h, colour });
  };
  drawMonolith(draw, 118, 100, frame, phase, 0, lifted);
  return rects;
}

/** The 6x6 recesses left where a letter used to be. */
function sockets(rects: Rect[]) {
  return rects.filter((r) => r.colour === R.socket && r.w === 6 && r.h === 6);
}

/** Every glyph pixel drawn in the warm "in flight" colour. */
function inFlight(rects: Rect[]) {
  return rects.filter((r) => r.colour === R.warm && r.w === 1 && r.h === 1);
}

describe("letters are taken from the monument", () => {
  it("leaves nothing disturbed before the selection starts", () => {
    const rects = record(0);
    expect(sockets(rects)).toHaveLength(0);
    // Nothing is travelling yet either.
    expect(inFlight(rects)).toHaveLength(0);
  });

  it("opens exactly one recess per letter that has pulled free", () => {
    for (const lifted of [1, 4, 7, 11, SOCKET_COUNT]) {
      expect(sockets(record(lifted)), `lifted=${lifted}`).toHaveLength(lifted);
    }
  });

  it("empties every socket once the whole name is out", () => {
    expect(sockets(record(SOCKET_COUNT))).toHaveLength(SEL.length);
    expect(SEL).toHaveLength(SOCKET_COUNT);
  });

  it("shows repeated letters coming from separate carvings", () => {
    // SOON HYUN HWANG repeats O, N and H. Each repeat must be its own recess,
    // so the extraction cannot be read as one letter used twice.
    const rects = record(SOCKET_COUNT);
    const positions = sockets(rects).map((r) => `${r.x},${r.y}`);
    expect(new Set(positions).size).toBe(SOCKET_COUNT);

    const letters = SEL.map(letterAt);
    for (const repeated of ["O", "N", "H"]) {
      expect(letters.filter((l) => l === repeated).length).toBeGreaterThan(1);
    }
  });

  it("carries each letter from its own carving toward its place in the name", () => {
    // Halfway through, the first letter is most of the way across and the last
    // has not moved at all — the wave the board asks for, not a single cut.
    const early = record(0.5);
    const late = record(12.5);
    expect(inFlight(early).length).toBeGreaterThan(0);
    expect(inFlight(late).length).toBeGreaterThan(inFlight(early).length);
  });

  it("lands each letter exactly where the assembled name will hold it", () => {
    // At full travel a letter must sit on the name's own coordinates, so the
    // cut from selection to the hero beat is continuous rather than a jump.
    const landed = record(SOCKET_COUNT);
    const first = selTarget(0, 118 - 100, 16);
    const hit = inFlight(landed).some(
      (r) => r.x >= first.x && r.x < first.x + 5 && r.y >= first.y && r.y < first.y + 8,
    );
    expect(hit).toBe(true);
  });

  it("draws no recesses at all while the monument is still dormant", () => {
    expect(sockets(record(SOCKET_COUNT, 3))).toHaveLength(0);
  });

  it("keeps every recess inside the carved face", () => {
    for (const socket of sockets(record(SOCKET_COUNT))) {
      expect(socket.x).toBeGreaterThan(118 - 21);
      expect(socket.x).toBeLessThan(118 - 21 + 42);
      expect(socket.y).toBeGreaterThan(0);
      expect(socket.y).toBeLessThan(SHRINE_ART_SIZE.height);
    }
  });
});
