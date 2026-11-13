"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useDialogFocus } from "@/components/ui/accessible-dialog";
import { LANDINGS, SHEET } from "@/data/chart";
import type { LandingId } from "@/types/chart";

interface LandingsPanelProps {
  charted: readonly LandingId[];
  /** Draws the whole sheet, small, into the panel's map. */
  drawMap: (canvas: HTMLCanvasElement) => void;
  onClose: () => void;
  onSail: (landing: LandingId) => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}

/** The map is drawn with a 30-unit margin round the sheet. */
const MAP_MARGIN = 30;
const pinAt = (v: number, extent: number) => `${((v + MAP_MARGIN) / (extent + MAP_MARGIN * 2)) * 100}%`;

/** Every landing, reachable at once. Nothing is locked. */
export function LandingsPanel({ charted, drawMap, onClose, onSail, returnFocusRef }: LandingsPanelProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const mapRef = useRef<HTMLCanvasElement>(null);
  useDialogFocus({ containerRef: cardRef, initialFocusRef: closeRef, onClose, returnFocusRef });

  useEffect(() => {
    if (mapRef.current) drawMap(mapRef.current);
  }, [drawMap]);

  return (
    <div className="chart-overlay chart-landings" role="presentation">
      <div
        aria-labelledby="chart-landings-heading"
        aria-modal="true"
        className="chart-card"
        ref={cardRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="chart-row chart-row--split">
          <h2 id="chart-landings-heading">Landings</h2>
          <button className="chart-btn" onClick={onClose} ref={closeRef} type="button">
            Close<kbd>Esc</kbd>
          </button>
        </div>
        <p>Pick a landing to sail straight there. Nothing is locked.</p>
        <div className="chart-landings__body">
          <div className="chart-landings__map">
            <canvas aria-hidden="true" height={600} ref={mapRef} width={900} />
            {LANDINGS.map((landing, i) => (
              <button
                aria-label={`Sail to ${landing.name}`}
                className="chart-pin"
                data-charted={charted.includes(landing.id)}
                key={landing.id}
                onClick={() => onSail(landing.id)}
                style={{ left: pinAt(landing.centre.x, SHEET.width), top: pinAt(landing.centre.y, SHEET.height) }}
                tabIndex={-1}
                type="button"
              >
                {i + 1}
              </button>
            ))}
          </div>
          <ol className="chart-dest">
            {LANDINGS.map((landing, i) => (
              <li key={landing.id}>
                <button data-charted={charted.includes(landing.id)} onClick={() => onSail(landing.id)} type="button">
                  <span className="chart-dest__n">{i + 1}</span>
                  <span className="chart-dest__name">{landing.name}</span>
                  <span className="chart-dest__tag">{landing.tag}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
