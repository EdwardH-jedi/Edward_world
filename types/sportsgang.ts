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
  "RALLY",
  "RESULT",
  "COMPLETE",
] as const;

export type SportsgangStage = (typeof SPORTSGANG_STAGES)[number];

/** Stages that advance on their own after a fixed dwell. */
export type TimedSportsgangStage = Extract<
  SportsgangStage,
  "ENTER" | "PHONE" | "SEARCHING" | "COURT_TRANSITION" | "RALLY" | "RESULT"
>;

/** Stages that wait for the visitor to act. */
export type GatedSportsgangStage = Extract<
  SportsgangStage,
  "SPORT_SELECT" | "MATCH_FOUND" | "MEET"
>;

export const SPORTSGANG_SPORTS = ["TENNIS", "BASKETBALL", "RUNNING"] as const;
export type SportsgangSport = (typeof SPORTSGANG_SPORTS)[number];

/** The only sport wired through to a full match in this version. */
export const PLAYABLE_SPORT: SportsgangSport = "TENNIS";
