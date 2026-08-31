import { createTimeline, utils } from "animejs";
import { prefersReducedMotion } from "@/lib/motion/animate-element";

/**
 * Scripted choreography for the AFL Predict Lab.
 *
 * The same contract as the other choreography modules here: nothing in this
 * file advances application state. The lab's stage machine keeps its own time
 * on `setTimeout`, and these functions only describe what that looks like —
 * because anime.js runs on `requestAnimationFrame`, which browsers throttle
 * hard in a backgrounded tab, a run that waited on `onComplete` would stall
 * halfway down the bench.
 *
 * The motion here is load-bearing rather than decorative. A packet crossing
 * from one CRT to the next is the only thing on screen that says the six
 * panels are a *pipeline* and not a dashboard, and the power-on is what marks
 * the moment a stage's numbers became real.
 *
 * Under reduced motion each function pins its end state and returns null.
 */

/** A packet's journey between two panels, in pixels inside the rack's box. */
export interface PacketHop {
  readonly fromX: number;
  readonly fromY: number;
  readonly toX: number;
  readonly toY: number;
}

function centreOf(container: HTMLElement, node: HTMLElement) {
  const box = container.getBoundingClientRect();
  const rect = node.getBoundingClientRect();
  return {
    x: rect.left - box.left + rect.width / 2,
    y: rect.top - box.top + rect.height / 2,
    width: rect.width,
  };
}

/**
 * Measures one hop, live, from the DOM.
 *
 * Measured per hop rather than once per run on purpose: the rack re-flows from
 * six columns to three to two across the breakpoints, and a resize mid-run
 * would otherwise leave the packet flying to where a panel used to be. A hop
 * with no `from` is the intake — the round arriving from the tape deck — and
 * enters from just outside the first panel's leading edge.
 */
export function measurePacketHop(
  container: HTMLElement | null,
  from: HTMLElement | null,
  to: HTMLElement | null,
): PacketHop | null {
  if (!container || !to) return null;

  const target = centreOf(container, to);
  if (!target.width) return null;

  const source = from ? centreOf(container, from) : null;
  return {
    fromX: source ? source.x : target.x - target.width * 0.85,
    fromY: source ? source.y : target.y,
    toX: target.x,
    toY: target.y,
  };
}

/**
 * Flies one packet of data from the previous stage into the next.
 *
 * It fades up as it leaves, travels, and bursts as it lands — the burst is
 * what hands over to the panel's own power-on, so the two read as one event
 * rather than two animations that happened to overlap.
 */
export function playPacketHop(
  packet: HTMLElement | null,
  hop: PacketHop | null,
  duration: number,
) {
  if (!packet) return null;
  if (!hop || prefersReducedMotion()) {
    utils.set(packet, { opacity: 0 });
    return null;
  }

  return createTimeline()
    .set(packet, {
      translateX: hop.fromX,
      translateY: hop.fromY,
      opacity: 0,
      scale: 0.5,
    })
    .add(
      packet,
      { opacity: 1, scale: 1, duration: duration * 0.3, ease: "outQuad" },
      0,
    )
    .add(
      packet,
      {
        translateX: hop.toX,
        translateY: hop.toY,
        duration,
        ease: "inOutQuad",
      },
      0,
    )
    .add(
      packet,
      { opacity: 0, scale: 2.4, duration: duration * 0.34, ease: "outQuad" },
      duration * 0.72,
    );
}

/** Parks the packet out of sight. Used whenever the run is not in flight. */
export function hidePacket(packet: HTMLElement | null) {
  if (!packet) return;
  utils.set(packet, { opacity: 0, scale: 0.5 });
}

/**
 * Powers a CRT on: the picture opens out of a scan line and the tube flashes.
 *
 * `delay` is what keeps the beat legible — the panel lights as the packet
 * lands in it, not while the packet is still crossing the gap.
 */
export function playCrtPowerOn(
  screen: HTMLElement | null,
  flash: HTMLElement | null,
  duration: number,
  delay: number,
) {
  if (!screen) return null;
  if (prefersReducedMotion()) {
    settleCrt(screen, flash);
    return null;
  }

  const timeline = createTimeline()
    .set(screen, { opacity: 0, scaleY: 0.04 })
    .add(
      screen,
      { opacity: 1, scaleY: 1, duration, ease: "outExpo" },
      delay,
    );

  if (flash) {
    timeline
      .set(flash, { opacity: 0 })
      .add(flash, { opacity: 0.85, duration: duration * 0.18 }, delay)
      .add(
        flash,
        { opacity: 0, duration: duration * 0.9, ease: "outQuad" },
        delay + duration * 0.18,
      );
  }

  return timeline;
}

/**
 * Pins a CRT on.
 *
 * The stage machine runs on timers and the tube runs on rAF, so on a slow
 * frame — or in a background tab — a panel can still be mid-power-on when the
 * run moves past it. Without this it would be left permanently squashed into
 * its scan line. Called whenever a panel settles into `done`, so a lit screen
 * never depends on its animation having arrived.
 */
export function settleCrt(screen: HTMLElement | null, flash: HTMLElement | null) {
  if (screen) utils.set(screen, { opacity: 1, scaleY: 1 });
  if (flash) utils.set(flash, { opacity: 0 });
}
