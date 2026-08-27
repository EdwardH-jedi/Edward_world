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

interface TennisCourtProps {
  courtRef: RefObject<HTMLDivElement | null>;
  ballRef: RefObject<HTMLDivElement | null>;
  edwardRef: RefObject<HTMLDivElement | null>;
  opponentRef: RefObject<HTMLDivElement | null>;
  edwardFrame: PlayerFrame;
  opponentFrame: PlayerFrame;
  showPlayers: boolean;
  showBall: boolean;
}

/**
 * The tennis court, in side view like the rest of Edward's World.
 *
 * Built from DOM blocks rather than a canvas for one reason: this element is
 * the thing the phone screen turns into. It gets scaled from roughly a fifth of
 * its size up to full size, and geometry stays crisp at any scale where a
 * rasterised canvas would not.
 */
export function TennisCourt({
  courtRef,
  ballRef,
  edwardRef,
  opponentRef,
  edwardFrame,
  opponentFrame,
  showPlayers,
  showBall,
}: TennisCourtProps) {
  return (
    <div aria-hidden="true" className="sg-court" ref={courtRef}>
      <div className="sg-court__surface">
        <div className="sg-court__line sg-court__line--near" />
        <div className="sg-court__line sg-court__line--service-near" />
        <div className="sg-court__line sg-court__line--centre" />
        <div className="sg-court__line sg-court__line--service-far" />
        <div className="sg-court__line sg-court__line--far" />
      </div>
      <div className="sg-court__net">
        <div className="sg-court__net-tape" />
      </div>

      {showPlayers ? (
        <>
          <div className="sg-court__player sg-court__player--near" ref={edwardRef}>
            <PixelCanvas
              artHeight={PLAYER_ART_SIZE.height}
              artWidth={PLAYER_ART_SIZE.width}
              draw={edwardRoutines[edwardFrame]}
              frame={0}
              unit={PIXEL_UNIT}
            />
          </div>
          <div className="sg-court__player sg-court__player--far" ref={opponentRef}>
            <PixelCanvas
              artHeight={PLAYER_ART_SIZE.height}
              artWidth={PLAYER_ART_SIZE.width}
              draw={opponentRoutines[opponentFrame]}
              flipX
              frame={0}
              unit={PIXEL_UNIT}
            />
          </div>
        </>
      ) : null}

      {showBall ? <div className="sg-court__ball" ref={ballRef} /> : null}
    </div>
  );
}
