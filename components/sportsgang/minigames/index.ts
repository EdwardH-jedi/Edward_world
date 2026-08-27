import type { ComponentType } from "react";
import { BasketballGame } from "@/components/sportsgang/minigames/basketball-game";
import { GolfGame } from "@/components/sportsgang/minigames/golf-game";
import { RunningGame } from "@/components/sportsgang/minigames/running-game";
import { TennisGame } from "@/components/sportsgang/minigames/tennis-game";
import type { MinigameProps } from "@/components/sportsgang/minigames/types";
import type { SportsgangSport } from "@/types/sportsgang";

/**
 * The sport registry.
 *
 * Adding a sport means writing a pure simulation, a component that drives it,
 * and one line here — nothing in the phone, the matchmaking or the venue
 * transition needs to know it happened.
 */
export const MINIGAMES: Readonly<Record<SportsgangSport, ComponentType<MinigameProps>>> = {
  TENNIS: TennisGame,
  BASKETBALL: BasketballGame,
  RUNNING: RunningGame,
  GOLF: GolfGame,
};

export type { MinigameProps };
