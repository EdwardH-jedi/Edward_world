import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "lib", "game");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.name.endsWith(".ts") ? [path] : [];
  });
}

// Comments are stripped first: several modules say "no React, no DOM" in their
// docs, and `windowStart` is game vocabulary. Only code may not touch these.
const stripComments = (text: string) =>
  text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const BANNED = [
  /\bfrom\s+["']react(?:\/[^"']*)?["']/,
  /\bwindow\b/,
  /\bdocument\b/,
  /\brequestAnimationFrame\b/,
];

describe("lib/game stays browser-free", () => {
  const files = sourceFiles(ROOT);

  it("finds the game layer", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(files.map((file) => [file.slice(ROOT.length + 1), file]))(
    "%s has no React or browser globals",
    (_name, file) => {
      const code = stripComments(readFileSync(file, "utf8"));
      for (const banned of BANNED) expect(code).not.toMatch(banned);
    },
  );
});
