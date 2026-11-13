"use client";

import Link from "next/link";
import { useRef, type CSSProperties, type RefObject } from "react";
import { useDialogFocus } from "@/components/ui/accessible-dialog";
import { CAPTAINS_LOG } from "@/data/chart";

interface CaptainsLogProps {
  onSetSail: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}

/** Each line rises in turn; reduced motion shows them all at once (see chart.css). */
const rise = (i: number) => ({ "--i": i }) as CSSProperties;

/** The opening card, over the whole sheet. Enter or Escape sets sail. */
export function CaptainsLog({ onSetSail, returnFocusRef }: CaptainsLogProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const sailRef = useRef<HTMLButtonElement>(null);
  useDialogFocus({ containerRef: cardRef, initialFocusRef: sailRef, onClose: onSetSail, returnFocusRef });

  return (
    <div className="chart-overlay chart-log" role="presentation">
      <div
        aria-labelledby="chart-log-heading"
        aria-modal="true"
        className="chart-card"
        ref={cardRef}
        role="dialog"
        tabIndex={-1}
      >
        <p className="chart-eyebrow chart-log__line" style={rise(0)}>
          {CAPTAINS_LOG.eyebrow}
        </p>
        <h1 className="chart-log__line" id="chart-log-heading" style={rise(1)}>
          {CAPTAINS_LOG.heading}
        </h1>
        <p className="chart-log__lede chart-log__line" style={rise(2)}>
          {CAPTAINS_LOG.lede}
        </p>
        {CAPTAINS_LOG.lines.map((line, i) => (
          <p className="chart-log__line" key={line} style={rise(3 + i)}>
            {line}
          </p>
        ))}
        <div className="chart-row chart-log__line" style={rise(3 + CAPTAINS_LOG.lines.length)}>
          <button className="chart-btn chart-btn--primary" onClick={onSetSail} ref={sailRef} type="button">
            Set sail<kbd>Enter</kbd>
          </button>
          <Link className="chart-btn" href="/?view=index">
            Skip to index &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
