/**
 * The basketball, drawn as geometry rather than as a coloured circle.
 *
 * A basketball is recognised by its seams, not by being orange: an orange disc
 * with a cross on it reads as a beach ball, and a hex pattern reads as a
 * football. What makes it a basketball is four seams — two that pass through
 * the middle and two that bow out towards the left and right edges — sitting on
 * a curved surface, so the lines bend away from the viewer as they approach the
 * silhouette.
 *
 * So the seams are modelled on an actual sphere. Each one is a great circle
 * given by its plane's normal; the ball is spun with a Rodrigues rotation about
 * a fixed axis; the points are projected orthographically; and anything on the
 * far hemisphere is dropped. Curvature and occlusion therefore come out of the
 * geometry rather than being drawn in by hand, which is what keeps the panel
 * structure readable at every spin angle instead of only at the one that was
 * authored.
 *
 * **SVG, not `PixelCanvas`.** The play layer this ball lives in is DOM
 * geometry for a stated reason — `sport-venue.tsx` builds the hoop, the
 * backboard and the court lines from elements "because this element gets
 * scaled ... and geometry stays crisp at any scale where a rasterised canvas
 * would not". The ball is the smallest thing in that layer: roughly 27 CSS
 * pixels on a desktop court and 15 on a phone. A raster grid fine enough to
 * carry a seam at 27px loses the seam entirely at 15px, where each art pixel
 * would fall below one CSS pixel. Vector strokes hold at both. Everything in
 * this file is pure and frame-indexed, so the geometry is unit-testable
 * without a DOM.
 */

/** The SVG user-space box the ball is authored in. */
export const BALL_VIEWBOX = 64;
export const BALL_CENTRE = BALL_VIEWBOX / 2;
/** Leaves room for the outline stroke to sit inside the box. */
export const BALL_RADIUS = 29;

/**
 * Spin phases baked at module load.
 *
 * 24 is a full turn in 15° steps: fine enough that a spin does not strobe at
 * the flight speeds this sport uses, coarse enough that the whole set is a few
 * kilobytes of path data computed once.
 */
export const BALL_SPIN_FRAMES = 24;

/** How many points each great circle is sampled at before culling. */
const SEAM_SAMPLES = 96;

/**
 * Points closer to the silhouette than this are dropped.
 *
 * Exactly at the limb a seam is edge-on and smears along the outline, which
 * reads as a dent in the ball rather than as a seam going round the back.
 */
const FRONT_EPSILON = 0.08;

type Vec3 = readonly [number, number, number];

/**
 * The four seams, as the unit normals of the planes their great circles lie in.
 *
 * With the viewer looking down `-z`, a normal lying in the view plane projects
 * its circle to a straight diameter, and tilting the normal towards the viewer
 * squashes the projection into an ellipse. `0.55` is the resulting half-width
 * of the two bowed seams — they cross the ball a little over halfway out, which
 * is where they sit on a real ball.
 */
const SEAM_NORMALS: readonly Vec3[] = [
  // Through the poles: the seam that reads as vertical when the ball is still.
  [1, 0, 0],
  // Around the middle: the seam that reads as horizontal.
  [0, 1, 0],
  // The two that bow out to the sides. Mirrored, hence the sign on x.
  [0.835, 0, 0.55],
  [-0.835, 0, 0.55],
];

/**
 * The spin axis, tilted a little off the view axis.
 *
 * A ball spinning about the view axis exactly is a flat disc turning: the
 * pattern rotates rigidly and nothing ever passes behind. The tilt makes the
 * seams also slide across the face and disappear round the limb, which is what
 * sells the surface as curved. Kept small so the panel structure stays legible
 * through the whole turn rather than folding away at some angles.
 */
const SPIN_AXIS = normalise([0.08, 0.17, 0.98]);

function normalise([x, y, z]: Vec3): Vec3 {
  const length = Math.hypot(x, y, z);
  return [x / length, y / length, z / length];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(a: Vec3, b: Vec3) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/** Rotates a point about a unit axis by `angle`, the Rodrigues formula. */
function rotate(point: Vec3, axis: Vec3, angle: number): Vec3 {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const perpendicular = cross(axis, point);
  const along = dot(axis, point) * (1 - cosine);
  return [
    point[0] * cosine + perpendicular[0] * sine + axis[0] * along,
    point[1] * cosine + perpendicular[1] * sine + axis[1] * along,
    point[2] * cosine + perpendicular[2] * sine + axis[2] * along,
  ];
}

/** Samples the great circle whose plane has the given normal. */
function greatCircle(normal: Vec3): readonly Vec3[] {
  // Any two orthonormal vectors in the plane will do. Picking the first one in
  // the view plane keeps the seam list below reading the way it is described.
  const inPlane = normalise(
    Math.abs(normal[2]) < 0.99
      ? [-normal[1], normal[0], 0]
      : [1, 0, 0],
  );
  const second = cross(normal, inPlane);

  const points: Vec3[] = [];
  for (let index = 0; index < SEAM_SAMPLES; index += 1) {
    const t = (index / SEAM_SAMPLES) * Math.PI * 2;
    const cosine = Math.cos(t);
    const sine = Math.sin(t);
    points.push([
      inPlane[0] * cosine + second[0] * sine,
      inPlane[1] * cosine + second[1] * sine,
      inPlane[2] * cosine + second[2] * sine,
    ]);
  }
  return points;
}

const SEAM_CIRCLES = SEAM_NORMALS.map(greatCircle);

function project([x, y]: Vec3) {
  // SVG's y axis points down, so the sphere's y is negated on the way out.
  const screenX = BALL_CENTRE + x * BALL_RADIUS;
  const screenY = BALL_CENTRE - y * BALL_RADIUS;
  return `${round(screenX)} ${round(screenY)}`;
}

/** Two decimals is under a thousandth of the ball's width. */
function round(value: number) {
  return Math.round(value * 100) / 100;
}

/**
 * The visible part of one seam at one spin angle, as an SVG path.
 *
 * The circle is closed, so a visible run can straddle the sample the loop
 * happens to start at; the scan therefore begins at the first hidden point and
 * wraps, which keeps a run that crosses the seam of the *array* from being cut
 * into two paths with a false gap between them.
 */
function seamPath(circle: readonly Vec3[], angle: number): string {
  const rotated = circle.map((point) => rotate(point, SPIN_AXIS, angle));
  const visible = rotated.map((point) => point[2] > FRONT_EPSILON);

  const firstHidden = visible.indexOf(false);
  // A seam entirely on the near side has no gap to start scanning from. That
  // cannot happen for a great circle under orthographic projection — half of
  // every one of them is always behind — but the path builder should not
  // depend on that being true.
  if (firstHidden === -1) {
    return `M ${rotated.map(project).join(" L ")} Z`;
  }

  const commands: string[] = [];
  let drawing = false;
  for (let offset = 1; offset <= rotated.length; offset += 1) {
    const index = (firstHidden + offset) % rotated.length;
    if (!visible[index]) {
      drawing = false;
      continue;
    }
    commands.push(`${drawing ? "L" : "M"} ${project(rotated[index])}`);
    drawing = true;
  }
  return commands.join(" ");
}

/** Every seam of the ball at one spin phase. */
function seamsAt(frameIndex: number): readonly string[] {
  const angle = (frameIndex / BALL_SPIN_FRAMES) * Math.PI * 2;
  return SEAM_CIRCLES.map((circle) => seamPath(circle, angle));
}

const SPIN_PHASES: readonly (readonly string[])[] = Object.freeze(
  Array.from({ length: BALL_SPIN_FRAMES }, (_, index) => Object.freeze(seamsAt(index))),
);

/**
 * The seam paths for a spin phase. Any integer is accepted and wrapped, so a
 * caller may hand over a monotonically rising frame counter.
 */
export function basketballSeams(frameIndex: number): readonly string[] {
  const wrapped = ((Math.round(frameIndex) % BALL_SPIN_FRAMES) + BALL_SPIN_FRAMES) %
    BALL_SPIN_FRAMES;
  return SPIN_PHASES[wrapped];
}

/**
 * The ball's colours.
 *
 * `lib/pixel/palette.ts` is not this session's to edit and its single `orange`
 * is a muted tan chosen for signage, so the ball carries its own four. They are
 * deliberately held at the board's low saturation — a fully saturated basketball
 * orange would be the loudest thing in Edward's World by a distance — while
 * still being unmistakably an orange ball against the brown court.
 */
export const BALL_COLORS = {
  /** Lit side, upper left. */
  light: "#DE9A5A",
  base: "#C87A38",
  /** Turning away from the light, lower right. */
  shade: "#9A5525",
  /** Seams and silhouette. Sits beside `palette.ink`. */
  line: "#241A12",
} as const;

/** Seam width in view-box units. Wider than life, so it survives at 15px. */
export const BALL_SEAM_WIDTH = 2.6;
/** Silhouette width in view-box units. */
export const BALL_OUTLINE_WIDTH = 2.2;

/**
 * Where the lit-to-shaded gradient is centred, as a fraction of the ball.
 *
 * Up and to the left, matching the venue's floodlights.
 */
export const BALL_LIGHT_ORIGIN = { x: 0.34, y: 0.28 } as const;
