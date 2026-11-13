import type { Vec } from "@/types/chart";

/**
 * The view onto the sheet: `k` CSS pixels per chart unit, centred on (cx, cy).
 *
 * The log shows the whole sheet; once under way the camera comes down to the
 * boat and leads it slightly. Pure: the frame loop owns time.
 */

export interface View {
  readonly k: number;
  readonly cx: number;
  readonly cy: number;
}

export interface Screen {
  readonly width: number;
  readonly height: number;
}

interface Sheet {
  readonly width: number;
  readonly height: number;
}

/** How far past the sheet's edge the camera may look, in chart units. */
export const EDGE_MARGIN = 34;

/** Scale while sailing: about two pixels a unit on a laptop, clamped for phones and wide screens. */
export function playScale(screen: Screen): number {
  return Math.max(1.25, Math.min(3.4, Math.min(screen.width / 560, screen.height / 340)));
}

/** Scale that shows the whole sheet, or most of it on a screen of the wrong shape. */
export function fitScale(screen: Screen, sheet: Sheet): number {
  const a = screen.width / (sheet.width + 70);
  const b = screen.height / (sheet.height + 70);
  return Math.max(Math.min(a, b), Math.max(a, b) * 0.6);
}

/** The view the camera is heading for: the whole sheet, or the boat with a little lead. */
export function cameraTarget(
  focus: "sheet" | { readonly x: number; readonly y: number; readonly vx: number; readonly vy: number },
  screen: Screen,
  sheet: Sheet,
): View {
  const k = focus === "sheet" ? fitScale(screen, sheet) : playScale(screen);
  let cx = focus === "sheet" ? sheet.width / 2 : focus.x + focus.vx * 0.25;
  let cy = focus === "sheet" ? sheet.height / 2 : focus.y + focus.vy * 0.25;
  const hw = screen.width / k / 2;
  const hh = screen.height / k / 2;
  const m = EDGE_MARGIN;
  cx = hw * 2 >= sheet.width + m * 2 ? sheet.width / 2 : Math.max(hw - m, Math.min(sheet.width + m - hw, cx));
  cy = hh * 2 >= sheet.height + m * 2 ? sheet.height / 2 : Math.max(hh - m, Math.min(sheet.height + m - hh, cy));
  return { k, cx, cy };
}

/** Eases the view toward `target`. With reduced motion it arrives at once. */
export function stepView(view: View, target: View, dt: number, reduced: boolean): View {
  const a = reduced ? 1 : Math.min(1, dt * 3.2);
  const b = reduced ? 1 : Math.min(1, dt * 5);
  return {
    k: view.k + (target.k - view.k) * a,
    cx: view.cx + (target.cx - view.cx) * b,
    cy: view.cy + (target.cy - view.cy) * b,
  };
}

/** The chart point at the top-left of the screen. */
export function viewOrigin(view: View, screen: Screen): Vec {
  return { x: view.cx - screen.width / view.k / 2, y: view.cy - screen.height / view.k / 2 };
}

export function screenToChart(view: View, screen: Screen, px: number, py: number): Vec {
  const o = viewOrigin(view, screen);
  return { x: o.x + px / view.k, y: o.y + py / view.k };
}

export function chartToScreen(view: View, screen: Screen, at: Vec): Vec {
  const o = viewOrigin(view, screen);
  return { x: (at.x - o.x) * view.k, y: (at.y - o.y) * view.k };
}

/**
 * Where to pin the bearing marker for an off-screen target: on the edge of an
 * inset box, along the line from the screen's centre. `null` while the target
 * is comfortably on screen.
 */
export function bearingMarker(
  view: View,
  screen: Screen,
  target: Vec,
): { readonly left: number; readonly top: number; readonly angle: number } | null {
  const t = chartToScreen(view, screen, target);
  const mx = Math.min(150, screen.width * 0.3);
  const my = 112;
  if (t.x >= mx && t.x <= screen.width - mx && t.y >= my && t.y <= screen.height - my) return null;
  const ox = screen.width / 2;
  const oy = screen.height / 2;
  const dx = t.x - ox;
  const dy = t.y - oy;
  const scale = Math.min((ox - mx) / Math.abs(dx || 1e-6), (oy - my) / Math.abs(dy || 1e-6));
  return { left: ox + dx * scale, top: oy + dy * scale, angle: Math.atan2(dy, dx) };
}

/** Chart units per nautical mile on the cartouche's scale bar. */
export const UNITS_PER_MILE = 12;
