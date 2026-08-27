"use client";

import type { Timeline } from "animejs";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ProjectSummary } from "@/components/locations/project-summary";
import { MINIGAMES } from "@/components/sportsgang/minigames";
import { PHONE_STAGES, PixelPhone } from "@/components/sportsgang/pixel-phone";
import { SportVenue } from "@/components/sportsgang/sport-venue";
import { PixelCanvas } from "@/components/world/pixel-canvas";
import type { SportResult } from "@/lib/game/minigames/types";
import {
  getSportsgangStageDuration,
  isTimedSportsgangStage,
  nextSportsgangStage,
  SPORTSGANG_STAGE_TIMINGS,
} from "@/lib/game/sportsgang-machine";
import { PIXEL_UNIT } from "@/lib/game/terrain";
import {
  applyCourtProjection,
  measureCourtProjection,
  playCourtExpansion,
  playPhoneRaise,
  playResultReveal,
  playSearchSweep,
  resetChoreographyStyles,
  settleCourtExpansion,
  type CourtProjection,
} from "@/lib/motion/sportsgang-choreography";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import {
  drawCourtside,
  drawVenue,
  VENUE_ART_SIZE,
  type PlayerFrame,
} from "@/lib/pixel/sportsgang";
import { DEFAULT_SPORT, type SportsgangSport, type SportsgangStage } from "@/types/sportsgang";

interface SportsgangExperienceProps {
  onExit: () => void;
}

/** Captions announced to assistive technology as the sequence progresses. */
const STAGE_CAPTIONS: Readonly<Record<SportsgangStage, string>> = {
  ENTER: "Arriving at SportsGang",
  PHONE: "Opening the SportsGang app",
  SPORT_SELECT: "Choose a sport",
  SEARCHING: "Finding someone nearby",
  MATCH_FOUND: "Match found: Edward versus Player 02",
  COURT_TRANSITION: "Heading to the court",
  MEET: "Player 02 has arrived",
  PLAY: "Your turn to play",
  RESULT: "Result",
  COMPLETE: "SportsGang project summary",
};

/** The product's own loop, as the brief states it. Scene copy, not project data. */
const PRODUCT_FLOW = ["DISCOVER", "MATCH", "PLAY", "RESULT", "RANK"] as const;

export function SportsgangExperience({ onExit }: SportsgangExperienceProps) {
  const [stage, setStage] = useState<SportsgangStage>("ENTER");
  const [sport, setSport] = useState<SportsgangSport | null>(null);
  const [result, setResult] = useState<SportResult | null>(null);
  const reducedMotion = useReducedMotion();

  const rootRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const sweepRef = useRef<HTMLDivElement>(null);
  const courtRef = useRef<HTMLDivElement>(null);
  const edwardRef = useRef<HTMLDivElement>(null);
  const opponentRef = useRef<HTMLDivElement>(null);
  const venueRef = useRef<HTMLDivElement>(null);
  const courtsideRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLParagraphElement>(null);
  const rankNoteRef = useRef<HTMLParagraphElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const readyRef = useRef<HTMLButtonElement>(null);
  const completeRef = useRef<HTMLAnchorElement>(null);

  const projectionRef = useRef<CourtProjection | null>(null);
  const expansionRef = useRef<Timeline | null>(null);

  /* ── Stage machine ──────────────────────────────────────────────────────
     Driven by setTimeout, never by an animation callback. anime.js runs on
     requestAnimationFrame, which browsers throttle in background tabs; a
     sequence that waited on a timeline would stall there. */
  useEffect(() => {
    if (!isTimedSportsgangStage(stage)) return;

    const timeout = window.setTimeout(
      () => setStage((current) => nextSportsgangStage(current)),
      getSportsgangStageDuration(stage, reducedMotion),
    );
    return () => window.clearTimeout(timeout);
  }, [reducedMotion, stage]);

  /* ── Court projection ───────────────────────────────────────────────────
     While the phone is the interface the real court is parked inside the
     phone's slot by an inverse transform. This effect is the single authority
     on that transform for every stage except the expansion itself, which the
     timeline owns. */
  useLayoutEffect(() => {
    const court = courtRef.current;
    if (!court) return;
    if (stage === "COURT_TRANSITION") return;

    const slot = slotRef.current;
    if (!PHONE_STAGES.has(stage) || !slot) {
      projectionRef.current = null;
      applyCourtProjection(court, null);
      return;
    }

    const update = () => {
      const projection = measureCourtProjection(slot, court);
      projectionRef.current = projection;
      applyCourtProjection(court, projection);
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [stage]);

  /* ── Choreography ───────────────────────────────────────────────────────
     One timeline per stage, reverted on the way out so a replay starts from
     CSS rest state rather than the last frame of the previous run. */
  useEffect(() => {
    let timeline: Timeline | null = null;

    if (stage === "PHONE" && phoneRef.current) {
      timeline = playPhoneRaise(
        phoneRef.current,
        getSportsgangStageDuration("PHONE", reducedMotion),
      );
    }

    if (stage === "SEARCHING" && sweepRef.current) {
      timeline = playSearchSweep(
        sweepRef.current,
        getSportsgangStageDuration("SEARCHING", reducedMotion),
      );
    }

    if (stage === "RESULT" && scoreRef.current && rankNoteRef.current) {
      timeline = playResultReveal(
        scoreRef.current,
        rankNoteRef.current,
        SPORTSGANG_STAGE_TIMINGS.RESULT,
      );
    }

    return () => {
      timeline?.revert();
    };
  }, [reducedMotion, stage]);

  /* The expansion is held separately: reverting it would undo the very
     transform that leaves the court at full size. It is only paused. */
  useEffect(() => {
    if (stage !== "COURT_TRANSITION") return;
    const court = courtRef.current;
    const phone = phoneRef.current;
    const venue = venueRef.current;
    const courtside = courtsideRef.current;
    if (!court || !phone || !venue || !courtside) return;

    expansionRef.current = playCourtExpansion({
      court,
      phone,
      venue,
      courtside,
      projection: projectionRef.current,
      duration: getSportsgangStageDuration("COURT_TRANSITION", reducedMotion),
    });

    const timeline = expansionRef.current;
    return () => {
      timeline?.pause();
      settleCourtExpansion({ court, phone, venue, courtside });
    };
  }, [reducedMotion, stage]);

  useEffect(
    () => () => {
      expansionRef.current?.revert();
    },
    [],
  );

  /* ── Exit, focus and keyboard ───────────────────────────────────────────── */
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    rootRef.current?.focus();
    return () => previousFocus?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onExit();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onExit]);

  // Move focus to whatever the visitor is being asked to do next.
  useEffect(() => {
    if (stage === "SPORT_SELECT" || stage === "MATCH_FOUND") {
      primaryRef.current?.focus();
    } else if (stage === "MEET") {
      readyRef.current?.focus();
    } else if (stage === "COMPLETE") {
      completeRef.current?.focus();
    }
  }, [stage]);

  const advance = useCallback(
    () => setStage((current) => nextSportsgangStage(current)),
    [],
  );

  const chooseSport = useCallback(
    (choice: SportsgangSport) => {
      setSport(choice);
      advance();
    },
    [advance],
  );

  const replay = useCallback(() => {
    expansionRef.current?.revert();
    expansionRef.current = null;
    projectionRef.current = null;
    resetChoreographyStyles([
      phoneRef.current,
      courtRef.current,
      venueRef.current,
      courtsideRef.current,
      edwardRef.current,
      opponentRef.current,
      sweepRef.current,
    ]);
    setSport(null);
    setResult(null);
    setStage("ENTER");
  }, []);

  const frames = useMemo<{ edward: PlayerFrame; opponent: PlayerFrame }>(() => {
    if (stage === "MEET") return { edward: "greet", opponent: "greet" };
    if (stage === "PLAY") return { edward: "ready", opponent: "ready" };
    return { edward: "idle", opponent: "idle" };
  }, [stage]);

  const activeSport = sport ?? DEFAULT_SPORT;
  const Minigame = MINIGAMES[activeSport];
  const showCourtPlayers = ["MEET", "PLAY", "RESULT", "COMPLETE"].includes(stage);

  const finishPlay = useCallback((sportResult: SportResult) => {
    setResult(sportResult);
    setStage((current) => nextSportsgangStage(current));
  }, []);

  return (
    <section
      aria-label="SportsGang"
      className="loc-experience"
      data-stage={stage}
      ref={rootRef}
      tabIndex={-1}
    >
      <div className="loc-backdrop loc-backdrop--venue" ref={venueRef}>
        <PixelCanvas
          artHeight={VENUE_ART_SIZE.height}
          artWidth={VENUE_ART_SIZE.width}
          className="loc-backdrop__canvas"
          draw={drawVenue}
          fill
          frame={0}
          unit={PIXEL_UNIT}
        />
      </div>
      <div className="loc-backdrop loc-backdrop--courtside" ref={courtsideRef}>
        <PixelCanvas
          artHeight={VENUE_ART_SIZE.height}
          artWidth={VENUE_ART_SIZE.width}
          className="loc-backdrop__canvas"
          draw={drawCourtside}
          fill
          frame={0}
          unit={PIXEL_UNIT}
        />
      </div>

      <SportVenue
        courtRef={courtRef}
        edwardFrame={frames.edward}
        edwardRef={edwardRef}
        opponentFrame={frames.opponent}
        opponentRef={opponentRef}
        showPlayers={showCourtPlayers}
        sport={activeSport}
      />

      {stage === "PLAY" ? (
        <Minigame active onFinish={finishPlay} />
      ) : null}

      <PixelPhone
        onAccept={advance}
        onChooseSport={chooseSport}
        phoneRef={phoneRef}
        primaryRef={primaryRef}
        slotRef={slotRef}
        sport={sport}
        stage={stage}
        sweepRef={sweepRef}
      />

      <button className="loc-exit" onClick={onExit} type="button">
        ESC · BACK TO WORLD
      </button>

      <p aria-live="polite" className="loc-announcer">
        {STAGE_CAPTIONS[stage]}
      </p>

      {stage === "ENTER" ? (
        <p className="loc-caption loc-caption--title">SPORTSGANG</p>
      ) : null}

      {stage === "MEET" ? (
        <div className="loc-beat">
          <p className="loc-beat__text">PLAYER 02 IS READY · {activeSport}</p>
          <button
            className="loc-button loc-button--primary"
            onClick={advance}
            ref={readyRef}
            type="button"
          >
            [ NOD AND START ]
          </button>
        </div>
      ) : null}

      {stage === "RESULT" && result ? (
        <div className="sg-result">
          <p className="sg-result__heading">{result.heading}</p>
          <p className="sg-result__score" ref={scoreRef}>
            <span>{result.playerLabel}</span>
            <span className="sg-result__numbers">{result.playerScore}</span>
            {result.opponentLabel ? (
              <>
                <span className="sg-result__divider">/</span>
                <span>{result.opponentLabel}</span>
                <span className="sg-result__numbers">{result.opponentScore}</span>
              </>
            ) : null}
          </p>
          <p className="sg-result__note" ref={rankNoteRef}>
            {result.note}
          </p>
        </div>
      ) : null}

      {stage === "COMPLETE" ? (
        <ProjectSummary
          firstActionRef={completeRef}
          flow={PRODUCT_FLOW}
          onExit={onExit}
          onReplay={replay}
          projectId="sportsgang"
          role="PEER SPORTS COMPETITION"
          wordmark="SPORTSGANG"
        />
      ) : null}
    </section>
  );
}
