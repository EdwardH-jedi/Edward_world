"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProjectSummary } from "@/components/locations/project-summary";
import { PixelCanvas } from "@/components/world/pixel-canvas";
import {
  describeAgreement,
  formatProbability,
  formatSigned,
  runPipeline,
} from "@/lib/game/afl-pipeline";
import { PIXEL_UNIT } from "@/lib/game/terrain";
import { animateElement, motionPresets } from "@/lib/motion/animate-element";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import { edwardRoutines, PLAYER_ART_SIZE } from "@/lib/pixel/sportsgang";
import {
  PIPELINE_STAGES,
  TEAM_A,
  TEAM_B,
  type LabPhase,
  type PipelineStage,
  type TeamPick,
} from "@/types/afl";

interface AflExperienceProps {
  onExit: () => void;
}

const PRODUCT_FLOW = [
  "MATCH DATA",
  "FEATURES",
  "MODELS",
  "CALIBRATION",
  "PREDICTION",
  "EVALUATION",
] as const;

/** How long each rack panel holds before the next one lights up. */
const STAGE_MS = 700;
const REDUCED_STAGE_MS = 260;

/** Seeds are demonstration rounds, not fixtures. Advancing gives a new one. */
const FIRST_SEED = 11;

const TEAMS: readonly TeamPick[] = [TEAM_A, TEAM_B];

export function AflExperience({ onExit }: AflExperienceProps) {
  const [seed, setSeed] = useState(FIRST_SEED);
  const [phase, setPhase] = useState<LabPhase>("PICK");
  const [pick, setPick] = useState<TeamPick | null>(null);
  const [litStages, setLitStages] = useState(0);
  const reducedMotion = useReducedMotion();

  const rootRef = useRef<HTMLElement>(null);
  const consoleRef = useRef<HTMLDivElement>(null);
  const firstPickRef = useRef<HTMLButtonElement>(null);
  const runRef = useRef<HTMLButtonElement>(null);
  const summaryRef = useRef<HTMLAnchorElement>(null);

  const run = useMemo(() => runPipeline(seed), [seed]);

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

  // The rack lights one panel at a time. Timer-driven, like every other
  // sequence in the project — animation never advances state.
  useEffect(() => {
    if (phase !== "RUNNING") return;
    if (litStages >= PIPELINE_STAGES.length) {
      const settle = window.setTimeout(() => setPhase("RESULT"), STAGE_MS);
      return () => window.clearTimeout(settle);
    }
    const step = window.setTimeout(
      () => setLitStages((count) => count + 1),
      reducedMotion ? REDUCED_STAGE_MS : STAGE_MS,
    );
    return () => window.clearTimeout(step);
  }, [litStages, phase, reducedMotion]);

  useEffect(() => {
    if (phase === "PICK") firstPickRef.current?.focus();
    if (phase === "RESULT") summaryRef.current?.focus();
  }, [phase]);

  useEffect(() => {
    if (!consoleRef.current) return;

    const animation = animateElement(consoleRef.current, motionPresets.screenSwap, {
      duration: 240,
    });
    return () => {
      animation.revert();
    };
  }, [phase]);

  const startRun = useCallback(() => {
    setLitStages(0);
    setPhase("RUNNING");
  }, []);

  const newRound = useCallback(() => {
    setSeed((current) => current + 1);
    setPick(null);
    setLitStages(0);
    setPhase("PICK");
  }, []);

  const stageContent = useCallback(
    (stage: PipelineStage): readonly (readonly [string, string])[] => {
      const { features, models, fixture } = run;
      switch (stage) {
        case "MATCH DATA":
          return [
            ["A LAST 5", fixture.home.margins.map(formatSigned).join(" ")],
            ["B LAST 5", fixture.away.margins.map(formatSigned).join(" ")],
            ["REST", `${fixture.home.restDays}d / ${fixture.away.restDays}d`],
            ["TRAVEL", `${fixture.home.travelKm} / ${fixture.away.travelKm} km`],
          ];
        case "FEATURES":
          return [
            ["FORM DIFF", formatSigned(features.formDiff)],
            ["RECENT DIFF", formatSigned(features.recentDiff)],
            ["REST DIFF", formatSigned(features.restDiff)],
            ["TRAVEL DIFF", formatSigned(features.travelDiff)],
          ];
        case "MODELS":
          return [
            ["FORM MODEL", formatSigned(models.formModel)],
            ["RECENT MODEL", formatSigned(models.recentModel)],
            ["ENSEMBLE", formatSigned(models.ensemble)],
            ["WEIGHTS", "0.65 / 0.35"],
          ];
        case "CALIBRATION":
          return [
            ["RAW", formatProbability(run.rawProbability)],
            ["CALIBRATED", formatProbability(run.calibratedProbability)],
            ["METHOD", "TEMPERATURE"],
            ["EFFECT", "PULLED TOWARDS EVEN"],
          ];
        case "PREDICTION":
          return [
            [TEAM_A, formatProbability(run.calibratedProbability)],
            [TEAM_B, formatProbability(1 - run.calibratedProbability)],
            ["MODEL PICK", run.modelPick],
            ["BASIS", "DEMO DATA"],
          ];
        case "EVALUATION":
          return [
            ["YOUR PICK", pick ?? "—"],
            ["MODEL PICK", run.modelPick],
            ["", pick ? describeAgreement(pick, run) : ""],
            ["SCOPE", "PIPELINE SHAPE ONLY"],
          ];
      }
    },
    [pick, run],
  );

  return (
    <section
      aria-label="AFL Lab"
      className="loc-experience afl-lab"
      data-phase={phase}
      ref={rootRef}
      tabIndex={-1}
    >
      <div aria-hidden="true" className="afl-room">
        <div className="afl-wall" />
        <div className="afl-bench" />
        <div className="afl-edward">
          <PixelCanvas
            artHeight={PLAYER_ART_SIZE.height}
            artWidth={PLAYER_ART_SIZE.width}
            draw={edwardRoutines.idle}
            frame={0}
            unit={PIXEL_UNIT}
          />
        </div>
      </div>

      <button className="loc-exit" onClick={onExit} type="button">
        ESC · BACK TO WORLD
      </button>

      <p aria-live="polite" className="loc-announcer">
        {phase === "PICK"
          ? "Choose which side you think wins"
          : phase === "RUNNING"
            ? `Running the pipeline: ${PIPELINE_STAGES[Math.min(litStages, PIPELINE_STAGES.length - 1)]}`
            : `Model picked ${run.modelPick}. ${pick ? describeAgreement(pick, run) : ""}`}
      </p>

      <div className="afl-rack">
        {PIPELINE_STAGES.map((stage, index) => {
          const state =
            phase === "PICK"
              ? "idle"
              : index < litStages
                ? "done"
                : index === litStages && phase === "RUNNING"
                  ? "active"
                  : phase === "RESULT"
                    ? "done"
                    : "idle";
          return (
            <div className="afl-crt" data-state={state} key={stage}>
              <p className="afl-crt__label">
                <span>{String(index + 1).padStart(2, "0")}</span>
                {stage}
              </p>
              <div className="afl-crt__screen">
                {state === "idle" ? (
                  <p className="afl-crt__standby">STANDBY</p>
                ) : (
                  <dl>
                    {stageContent(stage).map(([key, value], row) =>
                      value ? (
                        <div key={`${stage}-${key}-${row}`}>
                          {key ? <dt>{key}</dt> : null}
                          <dd data-wide={!key || undefined}>{value}</dd>
                        </div>
                      ) : null,
                    )}
                  </dl>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {phase !== "RESULT" ? (
      <div className="afl-console" ref={consoleRef}>
        {phase === "PICK" ? (
          <>
            <p className="afl-console__question">WHO WINS?</p>
            <p className="afl-console__body">
              Demonstration round {seed - FIRST_SEED + 1}. The form below is
              generated, not a real fixture — make a call, then watch the
              pipeline make its own.
            </p>
            <div className="afl-picks">
              {TEAMS.map((team, index) => (
                <button
                  className="afl-pick"
                  data-selected={pick === team || undefined}
                  key={team}
                  onClick={() => setPick(team)}
                  ref={index === 0 ? firstPickRef : undefined}
                  type="button"
                >
                  <span className="afl-pick__name">{team}</span>
                  <span className="afl-pick__form">
                    {(team === TEAM_A ? run.fixture.home : run.fixture.away).margins
                      .map(formatSigned)
                      .join("  ")}
                  </span>
                  <span className="afl-pick__meta">
                    {(team === TEAM_A ? run.fixture.home : run.fixture.away).restDays}
                    d REST ·{" "}
                    {(team === TEAM_A ? run.fixture.home : run.fixture.away).travelKm}
                    km
                  </span>
                </button>
              ))}
            </div>
            <div className="afl-console__actions">
              <button
                className="loc-button loc-button--primary"
                disabled={pick === null}
                onClick={startRun}
                ref={runRef}
                type="button"
              >
                RUN MODEL
              </button>
              <span className="afl-console__hint">
                {pick ? `YOU PICKED ${pick}` : "PICK A SIDE TO RUN THE MODEL"}
              </span>
            </div>
          </>
        ) : null}

        {phase === "RUNNING" ? (
          <>
            <p className="afl-console__question">RUNNING</p>
            <p className="afl-console__body">
              Ingest, engineer features, run the ensemble, calibrate, predict,
              evaluate. Every figure on the rack is computed from the
              demonstration round above.
            </p>
          </>
        ) : null}

      </div>

      ) : null}

      {phase === "RESULT" ? (
        <ProjectSummary
          firstActionRef={summaryRef}
          flow={PRODUCT_FLOW}
          onExit={onExit}
          onReplay={newRound}
          projectId="afl-predict"
          replayLabel="NEW ROUND"
          role="FORECASTING RESEARCH"
          wordmark="AFL PREDICT"
        >
          <p className="afl-console__scoreline">
            <span>YOU {pick}</span>
            <span className="afl-console__divider">/</span>
            <span>MODEL {run.modelPick}</span>
            <span className="afl-console__prob">
              {formatProbability(run.calibratedProbability)} {TEAM_A}
            </span>
          </p>
          <p className="afl-console__disclaimer">
            This is the pipeline&apos;s shape running on generated data. It is
            paper-trading research — not a tipping service, not a forecast, and
            no accuracy is claimed here.
          </p>
        </ProjectSummary>
      ) : null}
    </section>
  );
}
