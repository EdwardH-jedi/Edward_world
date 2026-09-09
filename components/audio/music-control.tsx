"use client";

import { useEffect, useSyncExternalStore } from "react";
import { BGM_TITLE } from "@/lib/audio/bgm";
import {
  getBgmServerSnapshot,
  getBgmSnapshot,
  resumeBgmIfInterrupted,
  subscribeBgm,
  toggleBgmMuted,
  unlockBgm,
} from "@/lib/audio/bgm-engine";

/**
 * The music control, and the page's one bridge into the audio owner.
 *
 * It is mounted from the root layout rather than from the world, because the
 * visitor can be on `/resume` or a case study — where the world's component
 * tree does not exist — and must still be able to turn the music off.
 *
 * The unlock listener is the other half of that. Browsers will not let a page
 * make sound before a real gesture, so the first click or keypress anywhere
 * creates and resumes the AudioContext while that gesture is still on the
 * stack. It does not start the music: that waits for the world.
 */
export function MusicControl() {
  useEffect(() => {
    // Keep listening after the first unlock: an interrupted context may need
    // a fresh gesture to resume. A running context makes this a no-op.
    const options = { capture: true } as const;
    window.addEventListener("pointerdown", unlockBgm, options);
    window.addEventListener("keydown", unlockBgm, options);
    return () => {
      window.removeEventListener("pointerdown", unlockBgm, options);
      window.removeEventListener("keydown", unlockBgm, options);
    };
  }, []);

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") resumeBgmIfInterrupted();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  return <MusicToggle />;
}

/** Shares the engine's state without installing another set of listeners. */
export function MusicToggle({ inline = false }: { inline?: boolean }) {
  const { state, muted } = useSyncExternalStore(
    subscribeBgm,
    getBgmSnapshot,
    getBgmServerSnapshot,
  );
  const unavailable = state === "ERROR";

  return (
    <button
      aria-label={unavailable ? "Music unavailable" : `Music: ${BGM_TITLE}`}
      aria-pressed={unavailable ? undefined : !muted}
      className={`music-control${inline ? " music-control--inline" : ""}`}
      data-state={state.toLowerCase()}
      disabled={unavailable}
      onClick={toggleBgmMuted}
      title={unavailable ? "Music unavailable" : BGM_TITLE}
      type="button"
    >
      <span aria-hidden="true">{muted || unavailable ? "♪̸" : "♪"}</span>
      {inline ? <span>{unavailable ? "Music unavailable" : muted ? "Music off" : "Music on"}</span> : null}
    </button>
  );
}
