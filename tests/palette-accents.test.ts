import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildingArt } from "@/lib/pixel/buildings";
import { edwardPoses } from "@/lib/pixel/characters";
import { palette } from "@/lib/pixel/palette";

/** WCAG 2.x relative luminance of a #rrggbb colour. */
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function colours(draw: (r: (...args: [number, number, number, number, string]) => void, f: number) => void) {
  const seen = new Set<string>();
  draw((_x, _y, _w, _h, colour) => seen.add(colour), 0);
  return seen;
}

/*
 * Contrast is asserted against the surface each accent is actually drawn on.
 * A single mid-luminance accent cannot reach 3:1 against both the light paper
 * facades and the dark brown ones (or against mid-tone turf and dirt), so
 * "every ground and base colour" is not a satisfiable requirement; these pairs
 * are the ones that carry the "accent = interactive" read.
 */
describe("accent tokens", () => {
  it("exist and are valid colours", () => {
    for (const token of ["warmGlow", "signAccent", "playerOutline"] as const) {
      expect(palette[token], token).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it("keeps warmGlow legible on the dark surfaces it lights (>= 3:1)", () => {
    for (const base of [palette.char, palette.brown3, palette.soil]) {
      expect(contrast(palette.warmGlow, base), base).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps signAccent legible on the light facades and sky (>= 3:1)", () => {
    for (const base of [palette.paper, palette.cream, palette.sky]) {
      expect(contrast(palette.signAccent, base), base).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps the interaction chip text readable on signAccent (>= 3:1)", () => {
    expect(contrast(palette.cream, palette.signAccent)).toBeGreaterThanOrEqual(3);
  });

  it("separates the player outline from the ground and light buildings (>= 3:1)", () => {
    for (const base of [palette.dirt, palette.turf, palette.stone2, palette.paper]) {
      expect(contrast(palette.playerOutline, base), base).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps the chip's CSS accent in step with the palette token", () => {
    const css = readFileSync("app/globals.css", "utf8");
    expect(css).toContain(`--world-sign: ${palette.signAccent.toLowerCase()}`);
  });
});

describe("accent usage", () => {
  it("outlines every player pose", () => {
    for (const pose of Object.values(edwardPoses)) {
      for (const frame of [0, 1, 2, 3]) {
        const seen = new Set<string>();
        pose((_x, _y, _w, _h, colour) => seen.add(colour), frame);
        expect(seen.has(palette.playerOutline)).toBe(true);
      }
    }
  });

  it("marks every enterable building and leaves the scaffolding plain", () => {
    const enterable = ["edwards-house", "wardrobe", "sportsgang", "afl-lab", "arcade"] as const;
    for (const id of enterable) {
      const seen = colours(buildingArt[id].draw);
      expect(seen.has(palette.signAccent), `${id} sign`).toBe(true);
    }
    for (const id of ["edwards-house", "wardrobe", "afl-lab", "arcade"] as const) {
      expect(colours(buildingArt[id].draw).has(palette.warmGlow), `${id} window`).toBe(true);
    }
    const scaffold = colours(buildingArt["construction-area"].draw);
    expect(scaffold.has(palette.signAccent)).toBe(false);
    expect(scaffold.has(palette.warmGlow)).toBe(false);
  });
});
