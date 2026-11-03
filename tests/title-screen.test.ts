import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APPROACH_ART_SIZE, drawApproach } from "@/lib/pixel/monolith";
import { P } from "@/lib/pixel/opening";

/**
 * The title screen's contracts, read from its source and its stylesheet.
 *
 * Vitest runs in `environment: "node"`, so the layout and the tap are checked
 * in a browser (`e2e/title-layout.spec.ts`, `e2e/title-tap.spec.ts`). What is
 * checked here is what those cannot see: that every title string lives in one
 * place, that each long/short pair is chosen by CSS rather than by a render
 * that could differ between server and client, and that the whole screen
 * routes a click to Enter without swallowing its own controls.
 */

const SOURCE = readFileSync(
  new URL("../components/title/title-screen.tsx", import.meta.url),
  "utf8",
);
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const CSS = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

const PAIRS = {
  purpose: {
    long: "A software and AI portfolio you can explore.",
    short: "A software and AI portfolio.",
  },
  enter: { keys: "[ PRESS ENTER ]", touch: "[ TAP TO START ]" },
};

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(tsx?|css)$/.test(name) ? [path] : [];
  });
}

/** The body of the first `@media <media> { … }` block, up to its closing brace. */
function mediaBlock(media: string) {
  const start = CSS.indexOf(`@media ${media} {`);
  expect(start, `@media ${media}`).toBeGreaterThanOrEqual(0);
  return CSS.slice(start, CSS.indexOf("\n}", start));
}

/** Declarations of the first rule for `selector` inside that block. */
function ruleInMedia(media: string, selector: string) {
  const rule = new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`).exec(mediaBlock(media));
  return rule?.[1] ?? "";
}

describe("title copy", () => {
  it("declares every string once, in the component's copy table", () => {
    for (const text of [
      "WELCOME TO",
      PAIRS.purpose.long,
      PAIRS.purpose.short,
      PAIRS.enter.keys,
      PAIRS.enter.touch,
      "VIEW PROJECTS →",
    ]) {
      expect(SOURCE.split(`"${text}"`).length - 1, text).toBe(1);
    }
    // Rendered from the table, not retyped in the markup.
    for (const key of ["purpose.long", "purpose.short", "enter.keys", "enter.touch", "skip"]) {
      expect(CODE).toContain(`{TITLE_COPY.${key}}`);
    }
  });

  it("keeps the strings out of every other component, stylesheet and data file", () => {
    const others = [...sourceFiles("components"), ...sourceFiles("app"), ...sourceFiles("data")]
      .filter((path) => !path.endsWith(join("title", "title-screen.tsx")));
    for (const path of others) {
      const text = readFileSync(path, "utf8");
      for (const copy of [PAIRS.purpose.long, PAIRS.purpose.short, PAIRS.enter.keys, PAIRS.enter.touch]) {
        expect(text.includes(copy), `${copy} in ${path}`).toBe(false);
      }
    }
  });

  it("makes the short purpose line a strict cut of the long one", () => {
    // Same claim, fewer words: the phone does not get a different pitch.
    expect(PAIRS.purpose.short.length).toBeLessThan(PAIRS.purpose.long.length);
    expect(PAIRS.purpose.long.startsWith(PAIRS.purpose.short.replace(/\.$/, ""))).toBe(true);
  });
});

describe("each pair is chosen by CSS, so hydration cannot mismatch", () => {
  it("renders both halves unconditionally", () => {
    for (const name of [
      "title-purpose__long",
      "title-purpose__short",
      "title-enter__keys",
      "title-enter__touch",
    ]) {
      expect(CODE).toContain(`className="${name}"`);
    }
    // No device or width read in script.
    expect(CODE).not.toMatch(/matchMedia|maxTouchPoints|innerWidth|useMediaQuery/);
  });

  it("hides the short purpose line and the touch prompt by default", () => {
    const base = /\.title-purpose__short,\s*\.title-enter__touch\s*\{([^}]*)\}/.exec(CSS);
    expect(base?.[1]).toMatch(/display:\s*none/);
  });

  it("swaps the purpose line at a phone's width", () => {
    expect(ruleInMedia("(max-width: 480px)", ".title-purpose__long")).toMatch(/display:\s*none/);
    expect(ruleInMedia("(max-width: 480px)", ".title-purpose__short")).toMatch(/display:\s*inline/);
  });

  it("swaps the prompt on a device with no hover and a coarse pointer", () => {
    const media = "(hover: none) and (pointer: coarse)";
    expect(ruleInMedia(media, ".title-enter__keys")).toMatch(/display:\s*none/);
    expect(ruleInMedia(media, ".title-enter__touch")).toMatch(/display:\s*inline/);
  });
});

describe("the whole screen is the Start button", () => {
  it("routes a click on the screen to Enter", () => {
    expect(CODE).toMatch(/<main[\s\S]*?onClick=\{handleClick\}/);
  });

  it("lets the screen's own controls answer their own clicks", () => {
    expect(CODE).toMatch(/closest\("button"\)\)\s*return;/);
  });

  it("keeps the Enter key handler as it was", () => {
    expect(CODE).toContain('if (event.key !== "Enter") return;');
    expect(CODE).toContain("if (document.activeElement instanceof HTMLButtonElement) return;");
  });
});

/**
 * `e2e/title-layout.spec.ts` keeps the title copy off the avatar and above the
 * water by measuring art coordinates it declares itself. Those are pinned to
 * the art here, read straight out of the spec, so moving the avatar or the
 * shoreline cannot leave that check measuring an empty patch of lawn.
 */
describe("the art the layout spec measures", () => {
  const SPEC = readFileSync(new URL("../e2e/title-layout.spec.ts", import.meta.url), "utf8");
  const avatarMatch =
    /const AVATAR = \{ x: (\d+), y: (\d+), width: (\d+), height: (\d+) \};/.exec(SPEC);
  const horizonMatch = /const HORIZON_ROW = (\d+);/.exec(SPEC);
  const artMatch = /const ART = \{ width: (\d+), height: (\d+) \};/.exec(SPEC);

  const calls: { x: number; y: number; w: number; h: number; colour: string }[] = [];
  drawApproach((x, y, w, h, colour) => calls.push({ x, y, w, h, colour }), 0, 0);

  it("declares the approach art's size", () => {
    expect(artMatch?.slice(1).map(Number)).toEqual([
      APPROACH_ART_SIZE.width,
      APPROACH_ART_SIZE.height,
    ]);
  });

  it("puts the avatar where the art stands it, at the title's camera", () => {
    expect(avatarMatch).not.toBeNull();
    const [x, y, width, height] = avatarMatch!.slice(1).map(Number);
    // tinyAvatar's hair and coat are its own colours; nothing else uses them here.
    const hair = calls.filter((c) => c.colour === "#26221D");
    const coat = calls.filter((c) => c.colour === "#3F3A33" && c.w === 1 && c.h === 1);
    expect(hair.length).toBeGreaterThan(0);
    expect(Math.min(...hair.map((c) => c.y))).toBe(y);
    expect(Math.min(...coat.map((c) => c.x))).toBe(x);
    expect(Math.max(...coat.map((c) => c.x))).toBe(x + width - 1);
    // The white shoes: the last row of the figure, one pixel each, inside the
    // box. (The stone path is also drawn a pixel wide, so match the colour.)
    const shoes = calls.filter(
      (c) =>
        c.colour === P.opera &&
        c.y === y + height - 1 &&
        c.w === 1 &&
        c.x >= x &&
        c.x < x + width,
    );
    expect(shoes.length).toBe(2);
  });

  it("starts the water on the declared horizon row", () => {
    expect(horizonMatch).not.toBeNull();
    const row = Number(horizonMatch![1]);
    expect(
      calls.some(
        (c) => c.x === 0 && c.y === row && c.w === APPROACH_ART_SIZE.width && c.colour === P.water,
      ),
    ).toBe(true);
  });
});

describe("the portrait title clears the HUD strip on the unit grid", () => {
  it("shares the strip's height expression", () => {
    const base = /\.title-screen\s*\{([^}]*)\}/.exec(CSS)?.[1] ?? "";
    expect(base).toContain("--hud-h: calc(var(--unit) * 11);");
    const rounded = /@supports \(height: round\(up, 44px, 4px\)\) \{\s*\.title-screen,/.exec(CSS);
    expect(rounded, "the round(up, 44px, unit) override covers the title too").not.toBeNull();
  });

  it("starts the column one unit below the strip, in whole units", () => {
    // The strip is two units down and --hud-h tall; one more unit of air.
    expect(mediaBlock("(max-aspect-ratio: 1/1)")).toContain(
      "padding: calc(var(--hud-h) + var(--unit) * 3) calc(var(--unit) * 3) calc(var(--unit) * 2);",
    );
  });
});
