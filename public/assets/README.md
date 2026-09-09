# Visual assets

Intentionally empty.

The world's art is **procedural**, not file-backed: every sprite, building and
piece of terrain is authored as art-pixel drawing routines in `lib/pixel/` and
rasterised to canvas at run time, the same way the approved concept board's
`scenes.js` works. There are no sprite sheets or image files to ship, and no
binary assets to keep in sync with the design.

Add files here only for things that genuinely cannot be drawn procedurally —
Open Graph images, a favicon, or a downloadable resume PDF.

## The final avatar

The player is not a placeholder — `lib/pixel/characters.ts` draws a finished
design. But a swap is now an anticipated, specified move rather than a
hypothetical one:

- the specification for the final art is `docs/CHARACTER_ASSET_SPEC.md`
- the files land in `public/assets/edward/`, whose README carries the ingest
  contract and the invariants a swap must not break

The short version: art is delivered as transparent, true-resolution PNG and
**converted to sprite rows**, not drawn as a bitmap. Movement, camera, world
bounds, proximity and interaction logic need no changes at all — they read only
`position`, `size` and `facing`, never the art. The player's `48x64` hitbox is
pinned as a literal in `tests/world-art.test.ts` and is independent of how large
the art is; `getAvatarAnchor` anchors the sprite feet-down and centred inside it.
