# Character asset spec — Edward

The specification for the final player avatar. Written before the art exists so
the art can be made to fit the world rather than the world bent to fit the art.

Everything below is a constraint of the existing renderer, not a preference.

---

## 1. Format

| | |
|---|---|
| **Source format** | PNG, 8-bit RGBA |
| **Background** | Fully transparent (alpha 0). Not white, not a checkerboard, not a matte |
| **Resolution** | **True art resolution** — one image pixel = one art pixel. Do **not** upscale before delivering |
| **Anti-aliasing** | None. Every pixel must be either fully opaque or fully transparent, and one of the palette colours below |
| **Shadow** | **Do not draw one.** The contact shadow is procedural, so the same sprite grounds itself on grass, floorboards and arcade carpet |

Rendering is already nearest-neighbour: `PixelCanvas` sets
`imageSmoothingEnabled = false` and `createRaster` rounds every coordinate
before scaling. Nothing is required of the asset to achieve this — but it does
mean a soft-edged source will look wrong rather than blurry-but-acceptable.

## 2. Dimensions

**Recommended: 16 × 24 art pixels → renders at 64 × 96 CSS px.**

The world renders at `PIXEL_UNIT = 4` CSS pixels per art pixel, and that number
is not negotiable — a finer character in a coarser world is the single change
that would visibly break the pixel aesthetic. So the only lever for detail is
the art grid.

| Grid | Rendered | Head height | Verdict |
|---|---|---|---|
| 12 × 16 | 48 × 64 | ~7 px | Today's sprite. Zero structural change, but 2.3 heads tall with single-pixel eyes is squarely the chibi the brief rules out |
| **16 × 24** | **64 × 96** | **~9 px** | **Recommended.** ~3 heads tall, room for a jaw and a hairline. Still comfortably under world scale (buildings are 176–200 px) |

Be plain about what 16 × 24 buys: it is **not** enough to carry a likeness from
a photograph. At this scale identity is carried by **hair silhouette, outfit
shape and palette**, not by facial features. Aim the reference at those three.

12 × 16 remains a valid fallback if 16 × 24 reads too large in the world — the
code supports either without a movement change.

### Visual size vs gameplay size

These are now separate, and the spec depends on that separation:

- **Gameplay footprint (hitbox): 48 × 64 CSS px.** Fixed. It is what movement,
  world bounds, the camera and proximity read, and `tests/world-art.test.ts`
  pins it as a literal so no art change can move it.
- **Visual footprint: whatever the art grid × 4 comes to.** `getAvatarAnchor`
  places it feet-down and centred on the hitbox. At 16 × 24 the sprite overhangs
  by 8 px each side and 32 px above — it grows upward and outward from the same
  standing point, so the player does not move.

The sprite must therefore be **bottom-aligned in its cell**: the lowest opaque
pixel row is the row the feet stand on, with no empty rows beneath it.

## 3. Frames

Seven cells total. This is the minimum for a polished result, and it is minimum
because two things are already free:

- **Idle bob is procedural.** `drawStanding` drops the upper body one pixel on
  alternating ambient ticks with the feet planted — a row-slice operation that
  works on any delivered art. **Do not supply idle animation frames.**
- **Left-facing is procedural.** `PixelCanvas` mirrors with `flipX`. **Supply
  right-facing art only.**

| Pose | Cells | Purpose |
|---|---|---|
| `walk` | **4** | Side-view walk cycle. Frame 0 doubles as the standing side idle |
| `front` | 1 | Facing the viewer. The protagonist pose — the one that reads as *him* |
| `back` | 1 | Walking away, drawn as a building opens |
| `inspect` | 1 | Side view, near hand raised, shown near anything interactable |

The four walk cells are **contact → passing → contact → reach**. Cells 0 and 2
share the leg pose and differ only in arm swing; that is intentional and the
test suite asserts three distinct silhouettes across four frames.

Walk timing is **distance-driven, not time-driven**: `getWalkFrame` advances one
cell per 5 art pixels travelled, so the feet stay in step with the ground at any
frame rate. Nothing in the asset controls timing.

The ambient tick that drives the idle bob is 450 ms and **freezes entirely under
`prefers-reduced-motion`** — the world renders its full first frame and stops
advancing. No asset-side accommodation is needed.

## 4. Layout and naming

Four files rather than one sheet: the poses are authored independently and a
single sheet would only add slicing offsets to get wrong.

```
public/assets/edward/
  edward-walk.png       64 × 24  — 4 cells of 16 × 24, left to right, no gutter
  edward-front.png      16 × 24  — 1 cell
  edward-back.png       16 × 24  — 1 cell
  edward-inspect.png    16 × 24  — 1 cell
```

(At the 12 × 16 fallback: `48 × 16` and `12 × 16` respectively.)

Cells in the walk strip are butt-joined — no separator pixels, no padding — so
cell *n* occupies columns `n × 16` to `n × 16 + 15`.

## 5. Palette

Every pixel must be one of these. The world's palette is deliberately
desaturated and aged; a saturated character would sit outside it immediately.

| Role | Hex | Palette key |
|---|---|---|
| Hair | `#26221D` | `hair` |
| Hair highlight | `#453D34` | `hairLift` |
| Skin | `#D8B28A` | `skin` |
| Skin shade | `#BC946E` | `skinShade` |
| Eyes / shoes | `#1E1B17` | `ink` |
| Outerwear | `#3B4756` | `navy` |
| Outerwear shade | `#2A323D` | `navy2` |
| Shirt | `#DCD5C0` | `shirt` |
| Trousers | `#3A362F` | `denim` |
| Bag strap | `#7C6450` | `brown2` |
| Bag body | `#57473A` | `brown3` |

More colours are permitted if they come from `lib/pixel/palette.ts`. Colours
from outside it require a design pass — `tests/world-art.test.ts` rejects them.

If the final outfit genuinely differs from this direction, the palette entries
and the trait test are updated **at integration**, not now.

## 6. Character direction

- Personal to Edward / Soon Hyun Hwang — the current sprite reads as him via a
  centre-parted curtain fringe of near-black hair, a slim build, and a brown
  messenger bag worn across the body. Those are the identity anchors at this
  scale; keep them or replace them deliberately.
- Clean pixel-art protagonist, modern indie quality. Not a generic fantasy NPC.
- Light, slightly floating adventure feel — carried by the procedural bob, so
  the art itself should be a settled standing pose, not pre-tilted.
- Not so chibi that the head swallows the body: ~3 heads tall at 16 × 24.

## 7. Ingest

The delivered PNG is **converted to sprite rows**, not loaded at run time. The
renderer is synchronous and rectangle-based; there is no bitmap path, and adding
one would cost an image primitive, async loading in a synchronous pipeline, and
every guard in `tests/world-art.test.ts` going dark.

Conversion, per file: crop to the art grid → quantise to the palette above,
reporting any off-palette pixel rather than silently snapping it → emit rows of
single-character keys into `lib/pixel/characters.ts`. If the reference arrives
as a large, soft-edged, AI-generated image, downscaling to true art resolution
and hand-correcting the result is part of the job, not an afterthought.

Then, in the same change: update `EDWARD_ART_SIZE`, and leave everything else
alone. `data/world.ts`, `lib/game/movement.ts`, `lib/game/interactions.ts` and
`lib/game/terrain.ts` are not touched by an avatar swap.

## 8. Out of scope

`lib/pixel/characters.ts` feeds the main world, Edward's House and the arcade —
those three change together. Two other depictions of Edward are separate sprites
on their own grids and each need their own decision:

- `lib/pixel/sportsgang.ts` — 18 × 16 athlete
- `tinyAvatar` in `lib/pixel/opening.ts` — 6 × 8, for the intro sequence
