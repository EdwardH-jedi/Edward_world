import type { SportResult } from "@/lib/game/minigames/types";

/** Every mini-game is mounted with the same two props and nothing else. */
export interface MinigameProps {
  /** False while the surface is covered or the stage is not PLAY. */
  active: boolean;
  /** Called once, with a result derived entirely from what the player did. */
  onFinish: (result: SportResult) => void;
}
