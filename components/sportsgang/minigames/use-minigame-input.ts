"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { IDLE_INPUT, type MinigameInput } from "@/lib/game/minigames/types";

const ACTION_KEYS = new Set([" ", "spacebar", "enter"]);
const UP_KEYS = new Set(["arrowup", "w"]);
const DOWN_KEYS = new Set(["arrowdown", "s"]);

/**
 * Collects keyboard and pointer input into the neutral shape the simulations
 * expect.
 *
 * Edges (`pressed` / `released`) are latched as they happen and cleared when
 * the loop consumes them, so a tap between two frames is never dropped and
 * never counted twice.
 */
export function useMinigameInput(active: boolean) {
  const held = useRef({ action: false, up: false, down: false });
  const edges = useRef({ pressed: false, released: false });

  const press = useCallback((channel: "action" | "up" | "down") => {
    if (channel === "action") {
      if (!held.current.action) edges.current.pressed = true;
      held.current.action = true;
      return;
    }
    held.current[channel] = true;
  }, []);

  const release = useCallback((channel: "action" | "up" | "down") => {
    if (channel === "action") {
      if (held.current.action) edges.current.released = true;
      held.current.action = false;
      return;
    }
    held.current[channel] = false;
  }, []);

  useEffect(() => {
    if (!active) {
      held.current = { action: false, up: false, down: false };
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      if (ACTION_KEYS.has(key)) {
        event.preventDefault();
        // Auto-repeat must not read as a fresh press.
        if (!event.repeat) press("action");
      } else if (UP_KEYS.has(key)) {
        event.preventDefault();
        press("up");
      } else if (DOWN_KEYS.has(key)) {
        event.preventDefault();
        press("down");
      }
    }

    function onKeyUp(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      if (ACTION_KEYS.has(key)) release("action");
      else if (UP_KEYS.has(key)) release("up");
      else if (DOWN_KEYS.has(key)) release("down");
    }

    function clear() {
      if (held.current.action) release("action");
      held.current = { action: false, up: false, down: false };
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clear);
    };
  }, [active, press, release]);

  /** Snapshot for one tick; clears the edge flags. */
  const consume = useCallback((): MinigameInput => {
    const input: MinigameInput = {
      ...IDLE_INPUT,
      action: held.current.action,
      pressed: edges.current.pressed,
      released: edges.current.released,
      up: held.current.up,
      down: held.current.down,
    };
    edges.current = { pressed: false, released: false };
    return input;
  }, []);

  /** Props for an on-screen control, so touch has a real path in. */
  const bind = useCallback(
    (channel: "action" | "up" | "down") => ({
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
