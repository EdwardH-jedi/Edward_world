# Final avatar drop slot

Empty on purpose. This is where the final Edward character art lands.

**Nothing here is loaded at run time.** The world's renderer is procedural and
synchronous — `lib/pixel/raster.ts` fills rectangles and cannot draw a bitmap —
so a PNG dropped here does not become the player by itself. These files are the
*source* for an ingest step that converts the art into `SpriteRows` +
`SpriteMap` data in `lib/pixel/characters.ts`, which is what actually renders.

That is deliberate, and it is the cheaper half of the trade:

- no image loading, no async, no flash of a missing sprite
- server and client draw identically, so nothing hydrates differently
- every guard in `tests/world-art.test.ts` — grid bounds, approved palette,
  contact shadow, recognisable traits, distinct silhouettes — keeps running
  against the delivered art instead of being bypassed by a bitmap

## What to put here

See `docs/CHARACTER_ASSET_SPEC.md` for the full specification. In short, seven
cells of true-resolution, transparent, right-facing pixel art:

```
public/assets/edward/
  edward-walk.png      4-cell horizontal strip: contact, passing, contact, reach
  edward-front.png     1 cell, facing the viewer
  edward-back.png      1 cell, walking away
  edward-inspect.png   1 cell, side view, near hand raised
```

No baked drop shadow — the contact shadow is drawn procedurally so the same
sprite grounds itself on grass, floorboards or arcade carpet.

## The invariants an ingest must not break

- **The hitbox never moves.** `initialPlayer.size` in `data/world.ts` stays
  `48x64`. `tests/world-art.test.ts` pins it as a literal. Art larger than the
  hitbox is anchored feet-down and centred by `getAvatarAnchor`, so a taller
  avatar grows upward rather than relocating the player.
- **All four poses must resolve.** `components/world/main-world.tsx` picks
  between `walk`, `front`, `back` and `inspect` from state the world already
  keeps.
- **Right-facing only.** `PixelCanvas` mirrors with `flipX`.
- **One unit for the whole world.** Art is authored at `PIXEL_UNIT` = 4 CSS px
  per art pixel, the same density as every building and the terrain. A finer
  character in a coarser world is the one thing that visibly breaks the style.

## Scope of a swap

`lib/pixel/characters.ts` feeds the main world, Edward's House and the arcade —
all three change together. The other two depictions of Edward are separate
sprites on their own grids and are **not** covered: `lib/pixel/sportsgang.ts`
(18x16) and `tinyAvatar` in `lib/pixel/opening.ts` (6x8).
