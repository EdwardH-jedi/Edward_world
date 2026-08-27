"use client";

import type { RefObject } from "react";
import {
  DEFAULT_SPORT,
  SPORT_BLURBS,
  SPORTSGANG_SPORTS,
  type SportsgangSport,
  type SportsgangStage,
} from "@/types/sportsgang";

interface PixelPhoneProps {
  phoneRef: RefObject<HTMLDivElement | null>;
  slotRef: RefObject<HTMLDivElement | null>;
  sweepRef: RefObject<HTMLDivElement | null>;
  primaryRef: RefObject<HTMLButtonElement | null>;
  stage: SportsgangStage;
  sport: SportsgangSport | null;
  onChooseSport: (sport: SportsgangSport) => void;
  onAccept: () => void;
}

/** Stages during which the phone is the interface. */
export const PHONE_STAGES: ReadonlySet<SportsgangStage> = new Set([
  "PHONE",
  "SPORT_SELECT",
  "SEARCHING",
  "MATCH_FOUND",
  "COURT_TRANSITION",
]);

/** Stages during which the court is already visible inside the phone screen. */
export const SLOT_STAGES: ReadonlySet<SportsgangStage> = new Set([
  "SEARCHING",
  "MATCH_FOUND",
]);

/**
 * The pixel phone.
 *
 * Deliberately not a mobile app mock: chunky bezel, hard edges, bitmap
 * wordmark, mono body copy, one warm accent. It reads as a device that belongs
 * in this world rather than a screenshot dropped into it.
 */
export function PixelPhone({
  phoneRef,
  slotRef,
  sweepRef,
  primaryRef,
  stage,
  sport,
  onChooseSport,
  onAccept,
}: PixelPhoneProps) {
  const showSlot = SLOT_STAGES.has(stage) || stage === "COURT_TRANSITION";

  return (
    <div className="sg-phone" data-stage={stage} ref={phoneRef}>
      <div className="sg-phone__chassis">
        <div className="sg-phone__speaker" />
        <div className="sg-phone__screen">
          <div className="sg-phone__brand">SPORTSGANG</div>

          {stage === "PHONE" ? (
            <p className="sg-phone__hint">CONNECTING…</p>
          ) : null}

          {stage === "SPORT_SELECT" ? (
            <div className="sg-phone__panel">
              <p className="sg-phone__label">CHOOSE A SPORT</p>
              <ul className="sg-phone__sports">
                {SPORTSGANG_SPORTS.map((option) => (
                  <li key={option}>
                    <button
                      className="sg-phone__sport"
                      data-playable
                      onClick={() => onChooseSport(option)}
                      ref={option === DEFAULT_SPORT ? primaryRef : undefined}
                      type="button"
                    >
                      <span>{option}</span>
                      <span className="sg-phone__soon">{SPORT_BLURBS[option]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {stage === "SEARCHING" ? (
            <div className="sg-phone__panel">
              <p className="sg-phone__label">{sport}</p>
              <p className="sg-phone__status">FINDING SOMEONE NEARBY…</p>
              <div className="sg-phone__sweep-track">
                <div className="sg-phone__sweep" ref={sweepRef} />
              </div>
            </div>
          ) : null}

          {stage === "MATCH_FOUND" || stage === "COURT_TRANSITION" ? (
            <div className="sg-phone__panel">
              <p className="sg-phone__status">MATCH FOUND</p>
              <div className="sg-phone__versus">
                <span className="sg-phone__player">EDWARD</span>
                <span className="sg-phone__vs">VS</span>
                <span className="sg-phone__player">PLAYER 02</span>
              </div>
              {stage === "MATCH_FOUND" ? (
                <button
                  className="sg-phone__accept"
                  onClick={onAccept}
                  ref={primaryRef}
                  type="button"
                >
                  [ ACCEPT ]
                </button>
              ) : null}
            </div>
          ) : null}

          {/*
            The court preview. This is only a placeholder box: the real court
            element is transformed to sit exactly here, so what the visitor sees
            on the screen is already the court they are about to stand on.
          */}
          <div
            className="sg-phone__slot"
            data-visible={showSlot || undefined}
            ref={slotRef}
          />
        </div>
        <div className="sg-phone__home" />
      </div>
    </div>
  );
}
