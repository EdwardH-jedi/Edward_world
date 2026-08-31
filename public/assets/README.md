# Visual assets

Intentionally empty.

The world's art is **procedural**, not file-backed: every sprite, building and
piece of terrain is authored as art-pixel drawing routines in `lib/pixel/` and
rasterised to canvas at run time, the same way the approved concept board's
`scenes.js` works. There are no sprite sheets or image files to ship, and no
binary assets to keep in sync with the design.

Add files here only for things that genuinely cannot be drawn procedurally —
Open Graph images, a favicon, or a downloadable resume PDF.

## If a final avatar ever arrives as an image

The player is not a placeholder. `lib/pixel/characters.ts` draws a finished
design — a 12x16 art-pixel grid, four poses (`walk`, `front`, `back`,
`inspect`), and a four-frame walk cycle stepped by distance travelled rather
than by time, so the feet keep pace with the ground at any speed. Swapping it
is a deliberate art decision, not an unfinished task.

Should that decision ever be made, the contract to keep is small:

- **The one invariant.** `EDWARD_ART_SIZE * PIXEL_UNIT` must keep equalling
  `initialPlayer.size` in `data/world.ts`. `tests/world-art.test.ts` asserts
  this, and it is what stops a new sprite from silently changing the player's
  collision footprint.
- **The four poses** must all still resolve. `components/world/main-world.tsx`
  picks between them from state the world already keeps.
- **Only right-facing art is needed.** `PixelCanvas` mirrors it with `flipX`.

Movement, camera, world bounds, proximity and interaction logic need no
changes: they read only `position`, `size` and `facing`, never the art
routine. Art enters the tree at exactly one place — the `PixelCanvas` element
in `main-world.tsx`.

An image-backed avatar would be the larger part of the job. Nothing in
`lib/pixel/raster.ts` can draw a bitmap today — `Raster` fills rectangles —
so it would need an image-drawing primitive, sprite-sheet slicing, and async
loading in a pipeline that is currently synchronous. Files would live under
`public/assets/edward/`. The three other depictions of Edward
(`lib/pixel/sportsgang.ts` at 18x16, `lib/pixel/opening.ts`'s 6x8 `tinyAvatar`,
and Edward's House) are independent sprites and would each need their own
decision.
