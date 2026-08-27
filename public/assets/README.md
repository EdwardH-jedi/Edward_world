# Visual assets

Intentionally empty.

The world's art is **procedural**, not file-backed: every sprite, building and
piece of terrain is authored as art-pixel drawing routines in `lib/pixel/` and
rasterised to canvas at run time, the same way the approved concept board's
`scenes.js` works. There are no sprite sheets or image files to ship, and no
binary assets to keep in sync with the design.

Add files here only for things that genuinely cannot be drawn procedurally —
Open Graph images, a favicon, or a downloadable resume PDF.
