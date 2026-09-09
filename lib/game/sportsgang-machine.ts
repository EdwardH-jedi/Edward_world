import {
  SPORTSGANG_STAGES,
  type GatedSportsgangStage,
  type SportsgangStage,
  type TimedSportsgangStage,
} from "@/types/sportsgang";

/**
 * Pure stage model for the SportsGang experience.
 *
 * Timings live here, never in the components, so pacing can be tuned without
 * touching choreography or markup. Nothing in this module knows about React,
 * the DOM, or anime.js.
 */
/**
 * How long each self-advancing beat holds.
 *
 * Measured end to end before these were touched: pressing E put 5.6 seconds of
 * animation between the visitor and the game, every time, and the result screen
 * then held a score they had already read for another 3.2. A demonstration is
 * allowed to take a beat; it is not allowed to be something you sit through
 * twice. Trimmed to 4.1s and 2.2s.
 *
 * Every one of these is passed straight to its own choreography timeline, so
 * the animations shorten with the stage rather than finishing early and
 * leaving the screen still.
 */
export const SPORTSGANG_STAGE_TIMINGS: Readonly<
  Record<TimedSportsgangStage, number>
> = {
  ENTER: 700,
  PHONE: 800,
  // The search stays the longest beat on purpose: it is the product's own
  // pitch, and below about a second and a half it reads as a loading flicker
  // rather than as looking for someone nearby.
  SEARCHING: 1_500,
  COURT_TRANSITION: 1_100,
  RESULT: 2_200,
};

const TIMED_STAGES = new Set<SportsgangStage>(
  Object.keys(SPORTSGANG_STAGE_TIMINGS) as TimedSportsgangStage[],
);

const GATED_STAGES = new Set<SportsgangStage>([
  "SPORT_SELECT",
  "MATCH_FOUND",
  "MEET",
  "PLAY",
  "RANK",
]);

/**
 * Longest a stage may dwell when the visitor has asked for reduced motion.
 *
 * This deliberately differs from `getIntroStageDuration`, which collapses to a
 * single millisecond. The intro's durations are motion; these are *reading*
 * time, and collapsing them would fire the whole sequence past someone before
 * they could see it. Reduced motion here means the tweens stop moving (handled
 * in the motion layer) while the beats stay legible.
 */
export const REDUCED_MOTION_STAGE_CEILING = 800;

export function nextSportsgangStage(stage: SportsgangStage): SportsgangStage {
  const index = SPORTSGANG_STAGES.indexOf(stage);
  return SPORTSGANG_STAGES[Math.min(index + 1, SPORTSGANG_STAGES.length - 1)];
}

export function isTimedSportsgangStage(
  stage: SportsgangStage,
): stage is TimedSportsgangStage {
  return TIMED_STAGES.has(stage);
}

export function isGatedSportsgangStage(
  stage: SportsgangStage,
): stage is GatedSportsgangStage {
  return GATED_STAGES.has(stage);
}

export function getSportsgangStageDuration(
  stage: TimedSportsgangStage,
  prefersReducedMotion: boolean,
) {
  const duration = SPORTSGANG_STAGE_TIMINGS[stage];
  return prefersReducedMotion
    ? Math.min(duration, REDUCED_MOTION_STAGE_CEILING)
    : duration;
}

/**
 * How long the greeting animation runs before play may begin. The MEET stage
 * itself is gated on the visitor, so this is choreography timing only.
 */
export const GREETING_MS = 900;
