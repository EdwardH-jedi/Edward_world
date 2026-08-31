"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProjectSummary } from "@/components/locations/project-summary";
import { PixelCanvas } from "@/components/world/pixel-canvas";
import {
  CALIBRATION_TEMPERATURE,
  describeAgreement,
  ENSEMBLE_SPLIT,
  formatProbability,
  formatSigned,
  runPipeline,
} from "@/lib/game/afl-pipeline";
import { PIXEL_UNIT } from "@/lib/game/terrain";
import {
  hidePacket,
  measurePacketHop,
  playCrtPowerOn,
  playPacketHop,
  settleCrt,
} from "@/lib/motion/afl-choreography";
import { driveValue } from "@/lib/motion/intro-choreography";
import { useAmbientFrame } from "@/lib/motion/use-ambient-frame";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import { drawAflLab, LAB_ART_SIZE } from "@/lib/pixel/afl-lab";
import { edwardRoutines, PLAYER_ART_SIZE } from "@/lib/pixel/sportsgang";
import {
  PIPELINE_STAGES,
  STAGE_NOTES,
  TEAM_A,
  TEAM_B,
  type LabPhase,
  type PipelineStage,
  type TeamPick,
} from "@/types/afl";

interface AflExperienceProps {
  onExit: () => void;
}

/** How long each panel holds the bench before the packet moves on. */
const STAGE_MS = 820;
const REDUCED_STAGE_MS = 260;
/** The hop between two panels. Comfortably inside one stage. */
const PACKET_MS = 360;
/** The tube coming up, and how long after the packet leaves it starts. */
const POWER_ON_MS = 320;
const POWER_ON_DELAY = 280;
/** The reveal at the end: the calibrated number counting off even. */
const REVEAL_MS = 900;

/** Seeds are demonstration rounds, not fixtures. Advancing gives a new one. */
const FIRST_SEED = 11;

const TEAMS: readonly TeamPick[] = [TEAM_A, TEAM_B];

export function AflExperience({ onExit }: AflExperienceProps) {
  const [seed, setSeed] = useState(FIRST_SEED);
  const [phase, setPhase] = useState<LabPhase>("PICK");
  const [pick, setPick] = useState<TeamPick | null>(null);
  const [litStages, setLitStages] = useState(0);
  /** The probability the reveal has counted up to, or null before it runs. */
  const [revealed, setRevealed] = useState<number | null>(null);
  const reducedMotion = useReducedMotion();
  const ambientFrame = useAmbientFrame(true);

  const rootRef = useRef<HTMLElement>(null);
  const bayRef = useRef<HTMLDivElement>(null);
  const packetRef = useRef<HTMLSpanElement>(null);
  const crtRefs = useRef<(HTMLDivElement | null)[]>([]);
  const screenRefs = useRef<(HTMLDivElement | null)[]>([]);
  const flashRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const firstPickRef = useRef<HTMLButtonElement>(null);
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

  // The bench lights one panel at a time. Timer-driven, like every other
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

  // What the run looks like: a packet crosses the gap, then the panel it
  // landed in comes up out of its scan line. Both are measured live, so the
  // six-across bench and the wrapped mobile one need no separate handling.
  useEffect(() => {
    const packet = packetRef.current;
    if (phase !== "RUNNING" || litStages >= PIPELINE_STAGES.length) {
      hidePacket(packet);
      return;
    }

    const screen = screenRefs.current[litStages] ?? null;
    const flash = flashRefs.current[litStages] ?? null;
    const hop = measurePacketHop(
      bayRef.current,
      litStages === 0 ? null : (crtRefs.current[litStages - 1] ?? null),
      crtRefs.current[litStages] ?? null,
    );

    const flight = playPacketHop(packet, hop, PACKET_MS);
    const powerOn = playCrtPowerOn(screen, flash, POWER_ON_MS, POWER_ON_DELAY);

    return () => {
      flight?.revert();
      powerOn?.revert();
      // The panel stays lit whether or not its animation ever arrived.
      settleCrt(screen, flash);
      hidePacket(packet);
    };
  }, [litStages, phase]);

  // The reveal. One tween drives both the number and the split bar, so they
  // can never disagree about what the model said.
  useEffect(() => {
    // `newRound` is the only way back out of RESULT and it clears the reveal,
    // so there is nothing to reset here — and resetting would cost a render.
    if (phase !== "RESULT") return;
    const reveal = driveValue(setRevealed, {
      from: 0.5,
      to: run.calibratedProbability,
      duration: REVEAL_MS,
      ease: "outQuart",
    });
    return () => reveal.cancel();
  }, [phase, run.calibratedProbability]);

  useEffect(() => {
    if (phase === "PICK") firstPickRef.current?.focus();
    if (phase === "RESULT") summaryRef.current?.focus();
  }, [phase]);

  const startRun = useCallback(() => {
    setLitStages(0);
    setPhase("RUNNING");
  }, []);

  const newRound = useCallback(() => {
    setSeed((current) => current + 1);
    setPick(null);
    setLitStages(0);
    setRevealed(null);
    setPhase("PICK");
  }, []);

  const stageContent = useCallback(
    (stage: PipelineStage): readonly (readonly [string, string])[] => {
      const { features, models, fixture } = run;
      switch (stage) {
        case "MATCH DATA":
          return [
            ["A FORM", fixture.home.margins.map(formatSigned).join(" ")],
            ["B FORM", fixture.away.margins.map(formatSigned).join(" ")],
            ["REST", `${fixture.home.restDays}d / ${fixture.away.restDays}d`],
            ["TRAVEL", `${fixture.home.travelKm} / ${fixture.away.travelKm}km`],
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
            [
              "WEIGHTS",
              `${ENSEMBLE_SPLIT.toFixed(2)} / ${(1 - ENSEMBLE_SPLIT).toFixed(2)}`,
            ],
            ["ENSEMBLE", formatSigned(models.ensemble)],
          ];
        case "CALIBRATION":
          return [
            ["METHOD", "TEMPERATURE"],
            ["T", CALIBRATION_TEMPERATURE.toFixed(1)],
            ["RAW", formatProbability(run.rawProbability)],
            ["CALIBRATED", formatProbability(run.calibratedProbability)],
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

  const activeStage = PIPELINE_STAGES[Math.min(litStages, PIPELINE_STAGES.length - 1)];
  const round = seed - FIRST_SEED + 1;
  // Before the reveal starts, the bar reads even rather than empty.
  const modelShare = revealed ?? 0.5;
  // Read aloud, "TEAM B at 41%" is a confusing thing to hear, so the announcer
  // quotes the probability of the side it just named rather than TEAM A's.
  const modelPickShare =
    run.modelPick === TEAM_A
      ? run.calibratedProbability
      : 1 - run.calibratedProbability;

  return (
    <section
      aria-label="AFL Predict Lab"
      className="loc-experience afl-lab"
      data-phase={phase}
      ref={rootRef}
      tabIndex={-1}
    >
      <div className="loc-backdrop">
        <PixelCanvas
          artHeight={LAB_ART_SIZE.height}
          artWidth={LAB_ART_SIZE.width}
          className="loc-backdrop__canvas"
          draw={drawAflLab}
          fill
          frame={ambientFrame}
          unit={PIXEL_UNIT}
        />
      </div>

      <div aria-hidden="true" className="afl-edward">
        <PixelCanvas
          artHeight={PLAYER_ART_SIZE.height}
          artWidth={PLAYER_ART_SIZE.width}
          draw={edwardRoutines.idle}
          frame={0}
          unit={PIXEL_UNIT}
        />
      </div>

      <button className="loc-exit" onClick={onExit} type="button">
        ESC · BACK TO WORLD
      </button>

      <p aria-live="polite" className="loc-announcer">
        {phase === "PICK"
          ? "Choose which side you think wins, then run the model."
          : phase === "RUNNING"
            ? `${activeStage}. ${STAGE_NOTES[activeStage]}`
            : `Model pick ${run.modelPick} at ${formatProbability(modelPickShare)}. ${pick ? describeAgreement(pick, run) : ""}`}
      </p>

      <div className="afl-bay" ref={bayRef}>
        <div className="afl-rack">
          {PIPELINE_STAGES.map((stage, index) => {
            const state =
              phase === "PICK"
                ? "idle"
                : phase === "RESULT" || index < litStages
                  ? "done"
                  : index === litStages
                    ? "active"
                    : "idle";
            return (
              <div
                className="afl-crt"
                data-state={state}
                key={stage}
                ref={(node) => {
                  crtRefs.current[index] = node;
                }}
              >
                <p className="afl-crt__label">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {stage}
                </p>
                <div
                  className="afl-crt__screen"
                  ref={(node) => {
                    screenRefs.current[index] = node;
                  }}
                >
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
                  <span
                    aria-hidden="true"
                    className="afl-crt__flash"
                    ref={(node) => {
                      flashRefs.current[index] = node;
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <span aria-hidden="true" className="afl-packet" ref={packetRef} />
      </div>

      {phase === "PICK" ? (
        <div className="afl-console">
          <p className="afl-console__question">WHO DO YOU THINK WINS?</p>
          <p className="afl-console__body">
            Demonstration round {round}. Two generated sides — no real clubs, no
            real results. Call it, then send the round down the bench.
          </p>
          <div className="afl-deck">
            {TEAMS.map((team, index) => {
              const side = team === TEAM_A ? run.fixture.home : run.fixture.away;
              return (
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
                    {side.margins.map(formatSigned).join("  ")}
                  </span>
                  <span className="afl-pick__meta">
                    {side.restDays}d REST · {side.travelKm}km TRAVEL
                  </span>
                </button>
              );
            })}
            <div className="afl-deck__go">
              <button
                className="loc-button loc-button--primary"
                disabled={pick === null}
                onClick={startRun}
                type="button"
              >
                RUN MODEL
              </button>
              <span className="afl-console__hint">
                {pick ? `YOU PICKED ${pick}` : "PICK A SIDE FIRST"}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {phase === "RUNNING" ? (
        <div className="afl-console afl-console--running">
          <p className="afl-console__question">
            <span className="afl-console__step">
              {String(Math.min(litStages + 1, PIPELINE_STAGES.length)).padStart(2, "0")}
            </span>
            {activeStage}
          </p>
          <p className="afl-console__body">{STAGE_NOTES[activeStage]}</p>
          <p className="afl-console__hint">
            RUNNING ON DEMONSTRATION DATA · NOT A LIVE SERVICE
          </p>
        </div>
      ) : null}

      {phase === "RESULT" ? (
        <ProjectSummary
          firstActionRef={summaryRef}
          flow={PIPELINE_STAGES}
          onExit={onExit}
          onReplay={newRound}
          projectId="afl-predict"
          replayLabel="NEW ROUND"
          role="FORECASTING RESEARCH"
          wordmark="AFL PREDICT"
        >
          <div className="afl-verdict">
            <div className="afl-verdict__cards">
              <p className="afl-verdict__card">
                <span className="afl-verdict__label">YOUR PICK</span>
                <span className="afl-verdict__value">{pick}</span>
              </p>
              <p className="afl-verdict__card" data-model="true">
                <span className="afl-verdict__label">MODEL PICK</span>
                <span className="afl-verdict__value">{run.modelPick}</span>
              </p>
            </div>

            <div aria-hidden="true" className="afl-split">
              <span
                className="afl-split__fill"
                style={{ width: `${(modelShare * 100).toFixed(1)}%` }}
              />
              <span className="afl-split__mark" />
            </div>
            <p className="afl-verdict__reading">
              <span>{formatProbability(modelShare)} {TEAM_A}</span>
              <span className="afl-verdict__divider">/</span>
              <span>{formatProbability(1 - modelShare)} {TEAM_B}</span>
              <span className="afl-verdict__agreement">
                {pick ? describeAgreement(pick, run) : ""}
              </span>
            </p>
          </div>

          <p className="afl-console__disclaimer">
            AFL Predict is a forecasting pipeline: it ingests match data,
            engineers features, blends models, calibrates them and scores itself
            on what comes back. What just ran is that pipeline&apos;s shape on
            generated data. It is paper-trading research — not a tipping
            service, and no accuracy is claimed here.
          </p>
        </ProjectSummary>
      ) : null}
    </section>
  );
}
