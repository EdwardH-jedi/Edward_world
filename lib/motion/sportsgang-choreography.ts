import { createTimeline, utils } from "animejs";
import { prefersReducedMotion } from "@/lib/motion/animate-element";

/**
 * Scripted choreography for the SportsGang sequence.
 *
 * Nothing here advances application state. Every function is fire-and-forget:
 * it starts a timeline, hands it back so the caller can revert it, and the
 * stage machine keeps its own time on `setTimeout`. That separation matters —
 * anime.js runs on `requestAnimationFrame`, which browsers throttle hard in
 * backgrounded tabs, so a sequence that waited on `onComplete` would stall.
 *
 * Under reduced motion each function snaps to its end state and returns null.
 */

/** Where the court has to sit to look like it is inside the phone screen. */
export interface CourtProjection {
  translateX: number;
  translateY: number;
  scale: number;
}

/**
 * Measures the transform that maps a full-size element onto a small slot.
 *
 * Used by any location whose small screen becomes the real thing: the phone's
 * court preview, the arcade cabinet's display.
 *
 * `getBoundingClientRect` reports the *transformed* box, so the court's own
 * transform is cleared for the measurement and restored immediately after —
 * otherwise every recomputation would compound the previous one.
 */
export function measureScreenProjection(
  slot: HTMLElement,
  court: HTMLElement,
): CourtProjection | null {
  const previous = court.style.transform;
  court.style.transform = "none";
  const target = court.getBoundingClientRect();
  court.style.transform = previous;

  const source = slot.getBoundingClientRect();
  if (!target.width || !target.height || !source.width || !source.height) {
    return null;
  }

  // Uniform scale, then centred in the slot, so the court never distorts.
  const scale = Math.min(
    source.width / target.width,
    source.height / target.height,
  );

  return {
    translateX: source.left + (source.width - target.width * scale) / 2 - target.left,
    translateY: source.top + (source.height - target.height * scale) / 2 - target.top,
    scale,
  };
}

/** anime.js owns the court transform end to end, so writes go through it. */
export function applyScreenProjection(
  court: HTMLElement,
  projection: CourtProjection | null,
) {
  const { translateX, translateY, scale } = projection ?? {
    translateX: 0,
    translateY: 0,
    scale: 1,
  };
  utils.set(court, { translateX, translateY, scale });
}

export function playPhoneRaise(phone: HTMLElement, duration: number) {
  if (prefersReducedMotion()) {
    utils.set(phone, { opacity: 1, translateY: 0, scale: 1 });
    return null;
  }

  return createTimeline().add(phone, {
    opacity: [0, 1],
    translateY: [160, 0],
    scale: [0.68, 1],
    rotate: [-6, 0],
    duration,
    ease: "outBack",
  });
}

/** The matchmaking sweep: a bar tracking across the screen while it searches. */
export function playSearchSweep(sweep: HTMLElement, duration: number) {
  if (prefersReducedMotion()) {
    utils.set(sweep, { opacity: 1, translateX: 0 });
    return null;
  }

  return createTimeline({ loop: true }).add(sweep, {
    translateX: ["-110%", "110%"],
    duration: Math.max(600, duration / 3),
    ease: "inOutQuad",
  });
}

interface CourtExpansionTargets {
  court: HTMLElement;
  phone: HTMLElement;
  venue: HTMLElement;
  courtside: HTMLElement;
  projection: CourtProjection | null;
  duration: number;
}

/**
 * The centrepiece: the court graphic inside the phone becomes the real court.
 *
 * The court element is always the full-size one. During the phone stages it
 * carries an inverse transform that parks it inside the phone screen; this
 * timeline animates that transform back to identity, so the thing the visitor
 * was looking at on the phone is literally the thing they end up standing on.
 * The phone dissolves outward underneath it and the backdrop cross-fades from
 * the venue approach to court level.
 */
export function playCourtExpansion({
  court,
  phone,
  venue,
  courtside,
  projection,
  duration,
}: CourtExpansionTargets) {
  if (prefersReducedMotion()) {
    utils.set(court, { translateX: 0, translateY: 0, scale: 1 });
    utils.set(phone, { opacity: 0 });
    utils.set(venue, { opacity: 0 });
    utils.set(courtside, { opacity: 1 });
    return null;
  }

  const start = projection ?? { translateX: 0, translateY: 0, scale: 0.2 };
  // Finish fractionally ahead of the stage timer so the tween is visibly done
  // before `settleCourtExpansion` pins the end state.
  const span = duration * 0.86;

  return createTimeline()
    .add(
      court,
      {
        translateX: [start.translateX, 0],
        translateY: [start.translateY, 0],
        scale: [start.scale, 1],
        duration: span,
        ease: "inOutQuart",
      },
      0,
    )
    // The phone opens out and lets go rather than simply disappearing.
    .add(
      phone,
      {
        opacity: [1, 0],
        scale: [1, 1.45],
        duration: span * 0.55,
        ease: "inQuad",
      },
      0,
    )
    .add(
      venue,
      { opacity: [1, 0], duration: span * 0.7, ease: "inOutQuad" },
      span * 0.2,
    )
    .add(
      courtside,
      { opacity: [0, 1], duration: span * 0.7, ease: "inOutQuad" },
      span * 0.2,
    );
}

/**
 * Pins the end state of the expansion.
 *
 * The stage machine runs on timers and the tween runs on rAF, so in a
 * background tab — or on any slow frame — the timeline can still be mid-flight
 * when the stage advances. Without this the phone would be left half faded and
 * the backdrop half swapped, permanently. Called on the way out of the
 * transition, so the destination never depends on the animation arriving.
 */
export function settleCourtExpansion({
  court,
  phone,
  venue,
  courtside,
}: Omit<CourtExpansionTargets, "projection" | "duration">) {
  utils.set(court, { translateX: 0, translateY: 0, scale: 1 });
  utils.set(phone, { opacity: 0 });
  utils.set(venue, { opacity: 0 });
  utils.set(courtside, { opacity: 1 });
}

/** The score arriving, then the line that puts it into the ranking. */
export function playResultReveal(
  score: HTMLElement,
  note: HTMLElement,
  duration: number,
) {
  if (prefersReducedMotion()) {
    utils.set(score, { opacity: 1, scale: 1 });
    utils.set(note, { opacity: 1, translateY: 0 });
    return null;
  }

  return createTimeline()
    .add(
      score,
      { opacity: [0, 1], scale: [0.86, 1], duration: duration * 0.28, ease: "outBack" },
      0,
    )
    .add(
      note,
      { opacity: [0, 1], translateY: [10, 0], duration: duration * 0.3, ease: "outQuad" },
      duration * 0.45,
    );
}

/**
 * Clears every inline style this module may have written.
 *
 * Reverting timelines is not enough on its own: under reduced motion the
 * functions above write final states with `utils.set` and return no timeline,
 * so a replay would start from the end of the previous run. Stage-driven CSS
 * takes over again once the attributes are gone.
 */
export function resetChoreographyStyles(
  elements: readonly (HTMLElement | null)[],
) {
  for (const element of elements) element?.removeAttribute("style");
}
