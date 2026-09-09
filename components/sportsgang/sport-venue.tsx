"use client";

import type { RefObject } from "react";
import { PixelCanvas } from "@/components/world/pixel-canvas";
import { PIXEL_UNIT } from "@/lib/game/terrain";
import {
  edwardRoutines,
  opponentRoutines,
  PLAYER_ART_SIZE,
  type PlayerFrame,
} from "@/lib/pixel/sportsgang";
import type { SportsgangSport } from "@/types/sportsgang";

interface SportVenueProps {
  sport: SportsgangSport;
  courtRef: RefObject<HTMLDivElement | null>;
  edwardRef: RefObject<HTMLDivElement | null>;
  opponentRef: RefObject<HTMLDivElement | null>;
  edwardFrame: PlayerFrame;
  opponentFrame: PlayerFrame;
  showPlayers: boolean;
}

/**
 * The playing surface for whichever sport was chosen.
 *
 * One element, one geometry, four dressings. Keeping the outer `.sg-court` box
 * identical across sports is what lets the phone-to-venue FLIP transition stay
 * exactly as it was: the transform maths never needs to know which sport it is
 * expanding into.
 *
 * Built from DOM blocks rather than a canvas because this element gets scaled
 * from roughly a fifth of its size up to full size, and geometry stays crisp at
 * any scale where a rasterised canvas would not.
 */
export function SportVenue({
  sport,
  courtRef,
  edwardRef,
  opponentRef,
  edwardFrame,
  opponentFrame,
  showPlayers,
}: SportVenueProps) {
  // Running and tennis both draw their own moving figures, so the static pair
  // steps aside for them; `showPlayers` is what decides *when* for tennis,
  // because it only owns the court while a match is actually being played.
  const showStaticPlayers = showPlayers && sport !== "RUNNING";

  return (
    <div aria-hidden="true" className="sg-court" data-sport={sport} ref={courtRef}>
      <div className="sg-court__surface">
        {sport === "TENNIS" ? (
          <>
            <div className="sg-court__line sg-court__line--near" />
            <div className="sg-court__line sg-court__line--service-near" />
            <div className="sg-court__line sg-court__line--centre" />
            <div className="sg-court__line sg-court__line--service-far" />
            <div className="sg-court__line sg-court__line--far" />
          </>
        ) : null}

        {sport === "BASKETBALL" ? (
          <>
            <div className="sg-court__line sg-court__line--near" />
            <div className="sg-court__key" />
            <div className="sg-court__line sg-court__line--far" />
          </>
        ) : null}

        {sport === "RUNNING" ? (
          <>
            <div className="sg-court__lane" style={{ top: "34%" }} />
            <div className="sg-court__lane" style={{ top: "66%" }} />
            <div className="sg-court__finish" />
          </>
        ) : null}

        {sport === "GOLF" ? (
          <>
            <div className="sg-court__tee" />
            <div className="sg-court__green" />
          </>
        ) : null}
      </div>

      {sport === "TENNIS" ? (
        <div className="sg-court__net">
          <div className="sg-court__net-tape" />
        </div>
      ) : null}

      {sport === "BASKETBALL" ? (
        <div className="sg-court__hoop">
          <div className="sg-court__backboard" />
          <div className="sg-court__ring" />
        </div>
      ) : null}

      {sport === "GOLF" ? (
        <div className="sg-court__flag">
          <div className="sg-court__flag-cloth" />
        </div>
      ) : null}

      {showStaticPlayers ? (
        <>
          <div
            className="sg-court__player sg-court__player--near"
            data-sport={sport}
            ref={edwardRef}
          >
            <div>
              <PixelCanvas
                artHeight={PLAYER_ART_SIZE.height}
                artWidth={PLAYER_ART_SIZE.width}
                draw={edwardRoutines[edwardFrame]}
                frame={0}
                unit={PIXEL_UNIT}
              />
            </div>
          </div>
          <div
            className="sg-court__player sg-court__player--far"
            data-sport={sport}
            ref={opponentRef}
          >
            <div>
              <PixelCanvas
                artHeight={PLAYER_ART_SIZE.height}
                artWidth={PLAYER_ART_SIZE.width}
                draw={opponentRoutines[opponentFrame]}
                flipX
                frame={0}
                unit={PIXEL_UNIT}
              />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
