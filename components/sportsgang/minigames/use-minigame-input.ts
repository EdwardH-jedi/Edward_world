"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { IDLE_INPUT, type MinigameInput } from "@/lib/game/minigames/types";

/** Every input channel a mini-game can bind to. */
type Channel = "action" | "up" | "down" | "left" | "right";

const ACTION_KEYS = new Set([" ", "spacebar", "enter"]);
const UP_KEYS = new Set(["arrowup", "w"]);
const DOWN_KEYS = new Set(["arrowdown", "s"]);
const LEFT_KEYS = new Set(["arrowleft", "a"]);
const RIGHT_KEYS = new Set(["arrowright", "d"]);
const INTERACTIVE_TARGETS =
  'a[href], button, input, select, textarea, [contenteditable="true"]';

function isUnboundInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return (
    target.closest(INTERACTIVE_TARGETS) !== null &&
    target.closest("[data-minigame-control]") === null
  );
}

/**
 * Collects keyboard and pointer input into the neutral shape the simulations
 * expect.
 *
 * Edges (`pressed` / `released`) are latched as they happen and cleared when
 * the loop consumes them, so a tap between two frames is never dropped and
 * never counted twice.
 */
export function useMinigameInput(
  active: boolean,
  { captureActionKeys = true }: { captureActionKeys?: boolean } = {},
) {
  const held = useRef({
    action: false,
    up: false,
    down: false,
    left: false,
    right: false,
  });
  const edges = useRef({ pressed: false, released: false });

  const press = useCallback((channel: Channel) => {
    if (channel === "action") {
      if (!held.current.action) edges.current.pressed = true;
      held.current.action = true;
      return;
    }
    held.current[channel] = true;
  }, []);

  const release = useCallback((channel: Channel) => {
    if (channel === "action") {
      if (held.current.action) edges.current.released = true;
      held.current.action = false;
      return;
    }
    held.current[channel] = false;
  }, []);

  useEffect(() => {
    if (!active) {
      held.current = {
        action: false,
        up: false,
        down: false,
        left: false,
        right: false,
      };
      edges.current = { pressed: false, released: false };
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      if (captureActionKeys && ACTION_KEYS.has(key)) {
        if (isUnboundInteractiveTarget(event.target)) return;
        event.preventDefault();
        // Auto-repeat must not read as a fresh press.
        if (!event.repeat) press("action");
      } else if (UP_KEYS.has(key)) {
        event.preventDefault();
        press("up");
      } else if (DOWN_KEYS.has(key)) {
        event.preventDefault();
        press("down");
      } else if (LEFT_KEYS.has(key)) {
        event.preventDefault();
        press("left");
      } else if (RIGHT_KEYS.has(key)) {
        event.preventDefault();
        press("right");
      }
    }

    function onKeyUp(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      if (captureActionKeys && ACTION_KEYS.has(key)) release("action");
      else if (UP_KEYS.has(key)) release("up");
      else if (DOWN_KEYS.has(key)) release("down");
      else if (LEFT_KEYS.has(key)) release("left");
      else if (RIGHT_KEYS.has(key)) release("right");
    }

    function clear() {
      if (held.current.action) release("action");
      held.current = {
        action: false,
        up: false,
        down: false,
        left: false,
        right: false,
      };
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clear);
      clear();
    };
  }, [active, captureActionKeys, press, release]);

  /** Snapshot for one tick; clears the edge flags. */
  const consume = useCallback((): MinigameInput => {
    const input: MinigameInput = {
      ...IDLE_INPUT,
      action: held.current.action,
      pressed: edges.current.pressed,
      released: edges.current.released,
      up: held.current.up,
      down: held.current.down,
      left: held.current.left,
      right: held.current.right,
    };
    edges.current = { pressed: false, released: false };
    return input;
  }, []);

  /** Props for an on-screen control, so touch has a real path in. */
  const bind = useCallback(
    (channel: Channel) => ({
      "data-minigame-control": channel,
      onPointerDown: (event: React.PointerEvent) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        press(channel);
      },
      onPointerUp: (event: React.PointerEvent) => {
        event.preventDefault();
        release(channel);
      },
      onPointerCancel: () => release(channel),
      onPointerLeave: () => release(channel),
    }),
    [press, release],
  );

  return useMemo(() => ({ consume, bind }), [bind, consume]);
}
