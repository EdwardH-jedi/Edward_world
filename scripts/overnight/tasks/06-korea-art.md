# Korean districts: scenery and story beats

## Why

Task 05 laid out Incheon, the three schools, Mokdong/TLBU, Jeju and the flight transition with placeholder scenery. This task makes them places. Each district should be recognisable at a glance, carry one small story beat the visitor discovers by walking, and stay inside the existing art language (procedural rows in `lib/pixel/`, the board palette, whole art pixels, ambient motion only on the shared frame).

Copy is already in `data/personal.ts` from task 05; do not add facts. If a beat below needs a fact that is not in that file, do the beat without the fact.

## Per district

**Incheon (2002)**
- Backdrop: apartment towers with lit windows, a harbour crane, a container stack low on the horizon; the far layer's Sydney skyline must not show here (the far layer is per-district sky from task 05 — give Incheon its own distant silhouette in the mid layer).
- Near: a small apartment entrance as the birthplace monument's backdrop, a bus stop sign.
- Beat: the entrance monument reads the Incheon chapter.

**Three schools**
- Three school buildings in a row, same silhouette with different details (gate colour, playground item, a tree vs. a flagpole), each with a sign chip (YUHYEON / SINGOK / MOKDONG) and a READ that gives the school's full name and the one-line reason for the move (the sister's studies — exactly as the data file says).
- Beat: a **moving truck** parked between schools 1→2 and 2→3; boxes on the pavement. On the ambient frame its hazard light blinks. No simulation beyond that.

**Mokdong · TLBU**
- Taller apartment blocks than Incheon, a row of hagwon-style signboards with lit windows in the mid layer (text-free, just lit rectangles), then two gates: the middle-school gate (sign: MOKDONG MS) and, a little further, the international-school gate (sign: TLBU) with a different gate style (lower wall, name board). READ on each with the data file's lines.

**Jeju (2017 – 2022)**
- Backdrop: Hallasan silhouette (already a motif in `lib/pixel/timeline.ts` — reuse it at scale in the mid layer), the sea in the far layer below the horizon with the stream's highlight trick for a 1-px glint, basalt dry-stone walls (돌담) along the ground in the near layer, a few hallabong-orange trees (orange accent is already `palette.orange`; keep it sparse).
- SJA monument at the entrance; the Seoul research-internship station a little further (a small lab window); the **Samsung grand-prize startup** as a stall/booth: counter, a spray bottle on it, a banner reading GRAND PRIZE in the bitmap font drawn as pixels (`glyph` in `lib/pixel/opening.ts`). READ copy only from the data file.

**Flight**
- Ground becomes runway (stripes), a windsock on the ambient frame, a plane shadow sweeping across the ground every N ambient frames (reuse the bird's period logic in `lib/pixel/ambient.ts`). No objects, no banner. ~2 screens wide at unit 7, no more.

**Sydney** — already built; only check the seam from the runway into sandstone and grass reads as arrival (a sign "SYD" at the boundary is enough).

## Constraints

- All art as recorded-raster-testable routines; add tests in the style of `tests/world-art.test.ts` (every routine inside its footprint, palette only, deterministic per frame, motion confined to the elements named above).
- Accent discipline: `signAccent` only on readable/enterable things; `warmGlow` only on lights.
- Keep each near-layer district canvas ≤ 960 art px (task 05's chunking).
- Mid-layer per-district silhouettes must not pop at district boundaries: overlap neighbours by the seam width or fade through the dithered seam.

## Verify

All quality gates. Frames at each beat into `docs/review/districts/` (overwrite task 05's placeholders), 1280x800 and 390x844 for Jeju and the schools. Report which beats you cut and why.
