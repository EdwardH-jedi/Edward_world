/**
 * The decisions behind SportsGang input, with the DOM taken out.
 *
 * The hook in `components/sportsgang/minigames/use-minigame-input.ts` is a thin
 * shell over this: it listens, reads three fields off each event, and asks the
 * functions here what that means. Everything that could be wrong — which key
 * belongs to which channel, whether a keystroke belongs to the game or to the
 * text field the visitor is typing in, whether lifting a finger should cancel a
 * key that is still down — lives here, where the test suite can reach it
 * without a browser. Vitest runs in `node`; a rule that only exists inside an
 * event handler is a rule nothing checks.
 */

/** Every input channel a mini-game can bind to. */
export type Channel = "action" | "up" | "down" | "left" | "right" | "sprint";

export const CHANNELS: readonly Channel[] = [
  "action",
  "up",
  "down",
  "left",
  "right",
  "sprint",
];

/** Physical keys bound to each channel, as `KeyboardEvent.code` values. */
export type KeyMap = Readonly<Partial<Record<Channel, readonly string[]>>>;

/**
 * The mapping every sport had before this pass, unchanged.
 *
 * `KeyS` and `ArrowDown` share `down` here because that is what the shipped
 * sports expect. Running overrides it rather than everyone inheriting a change.
 */
export const DEFAULT_KEY_MAP: KeyMap = {
  action: ["Space", "Enter", "NumpadEnter"],
  up: ["ArrowUp", "KeyW"],
  down: ["ArrowDown", "KeyS"],
  left: ["ArrowLeft", "KeyA"],
  right: ["ArrowRight", "KeyD"],
};

/**
 * Running: arrows steer, `S` is the spurt, and they are pressable together.
 *
 * `ArrowDown` keeps the `down` channel so the existing pace-down control still
 * works; `KeyS` leaves it, which is the whole point — a runner holding the
 * spurt must still be able to steer.
 */
export const RUNNING_KEY_MAP: KeyMap = {
  action: ["Space", "Enter", "NumpadEnter"],
  up: ["ArrowUp"],
  down: ["ArrowDown"],
  left: ["ArrowLeft"],
  right: ["ArrowRight"],
  sprint: ["KeyS"],
};

/** Reverses a key map into the lookup an event handler needs. */
export function invertKeyMap(keyMap: KeyMap): ReadonlyMap<string, Channel> {
  const byCode = new Map<string, Channel>();
  for (const channel of CHANNELS) {
    for (const code of keyMap[channel] ?? []) byCode.set(code, channel);
  }
  return byCode;
}

/**
 * Whether a keystroke belongs to the page rather than to the game.
 *
 * Both facts come from the DOM at the call site; the decision is here.
 * `insideMinigameControl` is the opt-back-in for on-screen buttons, which are
 * `<button>` elements and would otherwise look exactly like something the
 * visitor is operating.
 */
export function shouldYieldToTarget(
  matchesInteractiveTarget: boolean,
  insideMinigameControl: boolean,
) {
  return matchesInteractiveTarget && !insideMinigameControl;
}

/**
 * Whether an IME is composing, in which case the keystroke is text.
 *
 * `keyCode === 229` is the legacy signal some browsers still send instead of
 * `isComposing`, and `event.key` is the literal string "Process" throughout —
 * which is why the rest of this module reads `event.code`.
 */
export function isComposingKeyEvent(event: {
  isComposing?: boolean;
  keyCode?: number;
}) {
  return event.isComposing === true || event.keyCode === 229;
}

/** Which input device is holding a channel down. */
export type InputSource = "keyboard" | "pointer";

/** The two edge flags for one channel. */
export interface ChannelEdges {
  readonly pressed: boolean;
  readonly released: boolean;
}

export interface HeldTracker {
  /**
   * Marks a channel held by one source.
   *
   * The `pressed` edge belongs to the transition into held, so a second source
   * joining an already-held channel does not produce another one.
   */
  press(channel: Channel, source: InputSource): void;
  /**
   * Releases one source's hold.
   *
   * The `released` edge fires only when the last source lets go — which is what
   * stops a lifted finger from cancelling a key that is still down.
   */
  release(channel: Channel, source: InputSource): void;
  isHeld(channel: Channel): boolean;
  /** Non-destructive read of one channel's edges. */
  edgesOf(channel: Channel): ChannelEdges;
  /** Reads and clears every edge. */
  consumeEdges(): Readonly<Record<Channel, ChannelEdges>>;
  /** Drops every hold and every edge. Used when play is suspended. */
  clear(): void;
}

export function createHeldTracker(): HeldTracker {
  let held = new Map<Channel, Set<InputSource>>();
  let edges = new Map<Channel, { pressed: boolean; released: boolean }>();

  function sourcesOf(channel: Channel) {
    let sources = held.get(channel);
    if (!sources) {
      sources = new Set<InputSource>();
      held.set(channel, sources);
    }
    return sources;
  }

  function edgeOf(channel: Channel) {
    let edge = edges.get(channel);
    if (!edge) {
      edge = { pressed: false, released: false };
      edges.set(channel, edge);
    }
    return edge;
  }

  return {
    press(channel, source) {
      const sources = sourcesOf(channel);
      if (sources.size === 0) edgeOf(channel).pressed = true;
      sources.add(source);
    },
    release(channel, source) {
      const sources = sourcesOf(channel);
      if (!sources.delete(source)) return;
      if (sources.size === 0) edgeOf(channel).released = true;
    },
    isHeld(channel) {
      return sourcesOf(channel).size > 0;
    },
    edgesOf(channel) {
      const edge = edgeOf(channel);
      return { pressed: edge.pressed, released: edge.released };
    },
    consumeEdges() {
      const snapshot = {} as Record<Channel, ChannelEdges>;
      for (const channel of CHANNELS) snapshot[channel] = this.edgesOf(channel);
      edges = new Map();
      return snapshot;
    },
    clear() {
      held = new Map();
      edges = new Map();
    },
  };
}
