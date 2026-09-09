"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createHeldTracker,
  DEFAULT_KEY_MAP,
  invertKeyMap,
  isComposingKeyEvent,
  shouldYieldToTarget,
  type Channel,
  type HeldTracker,
  type KeyMap,
} from "@/lib/game/minigames/input-core";
import { IDLE_INPUT, type MinigameInput } from "@/lib/game/minigames/types";

export {
  CHANNELS,
  DEFAULT_KEY_MAP,
  RUNNING_KEY_MAP,
  type Channel,
  type KeyMap,
} from "@/lib/game/minigames/input-core";

const INTERACTIVE_TARGETS =
  'a[href], button, input, select, textarea, [contenteditable="true"], [contenteditable=""]';

/**
 * True when the event belongs to something the visitor is genuinely operating
 * — a link, a form field, the nickname box — rather than to the game.
 *
 * On-screen game controls opt back in with `data-minigame-control`, which is
 * what `bind` stamps on them.
 */
function isUnboundInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return shouldYieldToTarget(
    target.closest(INTERACTIVE_TARGETS) !== null,
    target.closest("[data-minigame-control]") !== null,
  );
}

/**
 * Collects keyboard and pointer input into the neutral shape the simulations
 * expect.
 *
 * Three things changed here for the polish pass, and each of them was a real
 * defect rather than a preference:
 *
 * 1. **Keys are read from `event.code`, not `event.key`.** `event.key` is the
 *    character produced, which depends on the layout, and during an IME
 *    composition it is the literal string `"Process"`. `code` is the physical
 *    key, which is what a game means by "S".
 * 2. **Typing is never swallowed.** The old guard ran only for the action
 *    keys, so `preventDefault()` on `A`/`S`/`W`/`D` fired even while the
 *    caret sat in a text field — which would have eaten half the alphabet out
 *    of the nickname box. The guard now runs before any branch, and an
 *    in-progress IME composition is ignored outright.
 * 3. **A channel is held per source.** Keyboard and touch each hold a channel
 *    independently, so lifting a finger cannot cancel a key that is still
 *    down, and a `pointercancel` cannot strand a channel held forever.
 *
 * Edges (`pressed` / `released`) are latched as they happen and cleared when
 * the loop consumes them, so a tap between two frames is never dropped and
 * never counted twice.
 */

export interface MinigameInputOptions {
  /**
   * Whether the action channel claims its keys.
   *
   * Kept for the sports that let the surrounding stage own Space/Enter.
   */
  readonly captureActionKeys?: boolean;
  /** Per-sport key bindings. Defaults to the shipped mapping. */
  readonly keyMap?: KeyMap;
}

export function useMinigameInput(
  active: boolean,
  { captureActionKeys = true, keyMap = DEFAULT_KEY_MAP }: MinigameInputOptions = {},
) {
  // Lazy `useState` rather than a ref: the tracker is mutable state that must
  // be created once and stay identical for the component's life, and reading a
  // ref during render is exactly what React tells you not to do.
  const [tracker] = useState<HeldTracker>(createHeldTracker);

  const clearAll = useCallback(() => tracker.clear(), [tracker]);

  const byCode = useMemo(() => invertKeyMap(keyMap), [keyMap]);

  useEffect(() => {
    if (!active) {
      clearAll();
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      // An IME is mid-composition: these keystrokes belong to the text, and
      // `event.key` would be "Process" anyway.
      if (isComposingKeyEvent(event)) return;
      // The visitor is operating a control or typing. Never steal it — this
      // guard used to run only for the action keys.
      if (isUnboundInteractiveTarget(event.target)) return;

      const channel = byCode.get(event.code);
      if (!channel) return;
      if (channel === "action" && !captureActionKeys) return;

      event.preventDefault();
      // Auto-repeat holds the channel but must not read as a fresh press.
      if (!event.repeat) tracker.press(channel, "keyboard");
    }

    function onKeyUp(event: KeyboardEvent) {
      if (isComposingKeyEvent(event)) return;
      const channel = byCode.get(event.code);
      if (!channel) return;
      if (channel === "action" && !captureActionKeys) return;
      tracker.release(channel, "keyboard");
    }

    /** Leaving the page, or hiding it, ends every hold. */
    function suspend() {
      clearAll();
    }

    function onVisibility() {
      if (document.visibilityState === "hidden") suspend();
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", suspend);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", suspend);
      document.removeEventListener("visibilitychange", onVisibility);
      clearAll();
    };
  }, [active, byCode, captureActionKeys, clearAll, tracker]);

  /** Snapshot for one tick; clears every edge flag. */
  const consume = useCallback((): MinigameInput => {
    const edges = tracker.consumeEdges();
    return {
      ...IDLE_INPUT,
      action: tracker.isHeld("action"),
      // `pressed` / `released` stay the action channel's edges, because that
      // is what every shipped simulation reads them as.
      pressed: edges.action.pressed,
      released: edges.action.released,
      up: tracker.isHeld("up"),
      down: tracker.isHeld("down"),
      left: tracker.isHeld("left"),
      right: tracker.isHeld("right"),
      sprint: tracker.isHeld("sprint"),
    };
  }, [tracker]);

  /**
   * Edges for a channel other than `action`, for a sport that needs them.
   *
   * Read it before `consume`, which is what clears the flags.
   */
  const edgeOf = useCallback(
    (channel: Channel) => tracker.edgesOf(channel),
    [tracker],
  );

  /** Props for an on-screen control, so touch has a real path in. */
  const bind = useCallback(
    (channel: Channel) => ({
      "data-minigame-control": channel,
      onPointerDown: (event: React.PointerEvent) => {
        event.preventDefault();
        // Capture is best-effort. It throws `NotFoundError` whenever the id is
        // not currently an active pointer — a race between a release and a
        // re-press, or a synthetic event from a test harness — and because it
        // runs before the press is recorded, an uncaught throw would leave the
        // control looking dead. Registering the press matters; capturing does
        // not (REQUESTS.md C-3).
        try {
          event.currentTarget.setPointerCapture?.(event.pointerId);
        } catch {
          // Without capture the release still arrives via pointerup or
          // pointercancel, both of which are already bound below.
        }
        tracker.press(channel, "pointer");
      },
      onPointerUp: (event: React.PointerEvent) => {
        event.preventDefault();
        tracker.release(channel, "pointer");
      },
      // Capture makes `pointerleave` fire in places it should not, so the
      // release comes from cancel and from capture being lost instead.
      onPointerCancel: () => tracker.release(channel, "pointer"),
      onLostPointerCapture: () => tracker.release(channel, "pointer"),
    }),
    [tracker],
  );

  return useMemo(
    () => ({ consume, bind, edgeOf, clear: clearAll }),
    [bind, consume, edgeOf, clearAll],
  );
}
