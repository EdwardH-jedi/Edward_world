/**
 * Stages of the SportsGang location experience.
 *
 * The sequence is linear and terminates at COMPLETE. Some stages advance on a
 * timer; the rest wait for the visitor, which is what keeps the demonstration
 * something you move through rather than something that plays at you.
 */
export const SPORTSGANG_STAGES = [
  "ENTER",
  "PHONE",
  "SPORT_SELECT",
  "SEARCHING",
  "MATCH_FOUND",
  "COURT_TRANSITION",
  "MEET",
  "PLAY",
  "RESULT",
  "RANK",
  "COMPLETE",
] as const;

export type SportsgangStage = (typeof SPORTSGANG_STAGES)[number];

/** Stages that advance on their own after a fixed dwell. */
export type TimedSportsgangStage = Extract<
  SportsgangStage,
  "ENTER" | "PHONE" | "SEARCHING" | "COURT_TRANSITION" | "RESULT"
>;

/**
 * Stages that wait rather than tick.
 *
 * `PLAY` is here because it lasts exactly as long as the player takes: the
 * mini-game reports its own completion, so no timer may move it on. `RANK` is
 * here because standings are reading material — a timer would take them away
 * mid-sentence.
 */
export type GatedSportsgangStage = Extract<
  SportsgangStage,
  "SPORT_SELECT" | "MATCH_FOUND" | "MEET" | "PLAY" | "RANK"
>;

export const SPORTSGANG_SPORTS = ["TENNIS", "BASKETBALL", "RUNNING", "GOLF"] as const;
export type SportsgangSport = (typeof SPORTSGANG_SPORTS)[number];

/** Sport shown first, and the one the phone focuses on arrival. */
export const DEFAULT_SPORT: SportsgangSport = "TENNIS";

/**
 * The person the app finds you.
 *
 * Only tennis has a real opponent so far — the sport you can actually play a
 * match against. The others keep the anonymous PLAYER 02 they already had,
 * because giving them a name would promise a person who is not there yet.
 */
export interface SportsgangOpponent {
  readonly name: string;
  readonly skill: string;
}

export const SPORT_OPPONENTS: Readonly<
  Partial<Record<SportsgangSport, SportsgangOpponent>>
> = {
  TENNIS: { name: "ALEX", skill: "INTERMEDIATE" },
};

/** What each sport is called in the world, and how it is played. */
export const SPORT_BLURBS: Readonly<Record<SportsgangSport, string>> = {
  TENNIS: "PLAY A MATCH",
  BASKETBALL: "HOLD AND RELEASE",
  RUNNING: "MANAGE YOUR PACE",
  GOLF: "POWER THEN CONTACT",
};
