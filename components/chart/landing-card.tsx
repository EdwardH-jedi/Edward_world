"use client";

import Link from "next/link";
import { useRef, type RefObject } from "react";
import { useDialogFocus } from "@/components/ui/accessible-dialog";
import type { LandingCard as LandingCardContent } from "@/types/chart";

interface LandingCardProps {
  card: LandingCardContent;
  onLeave: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}

/** What `E` opens at an anchorage. Phase 3 replaces it with going ashore. */
export function LandingCard({ card, onLeave, returnFocusRef }: LandingCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const leaveRef = useRef<HTMLButtonElement>(null);
  useDialogFocus({ containerRef: cardRef, initialFocusRef: leaveRef, onClose: onLeave, returnFocusRef });

  return (
    <div className="chart-overlay chart-landing" role="presentation">
      <div
        aria-labelledby="chart-landing-heading"
        aria-modal="true"
        className="chart-card"
        ref={cardRef}
        role="dialog"
        tabIndex={-1}
      >
        <p className="chart-eyebrow">{card.eyebrow}</p>
        <h2 id="chart-landing-heading">{card.heading}</h2>
        <p>{card.lede}</p>
        {card.lines.length > 0 ? (
          <ul>
            {card.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
        {card.stack.length > 0 ? (
          <div className="chart-stack">
            {card.stack.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        ) : null}
        {card.links.length > 0 ? (
          <div className="chart-row">
            {card.links.map((link) =>
              link.external ? (
                <a className="chart-btn" href={link.href} key={link.href} rel="noreferrer" target="_blank">
                  {link.label} &rarr;
                </a>
              ) : (
                <Link className="chart-btn" href={link.href} key={link.href}>
                  {link.label} &rarr;
                </Link>
              ),
            )}
          </div>
        ) : null}
        <div className="chart-row">
          <button className="chart-btn chart-btn--primary" onClick={onLeave} ref={leaveRef} type="button">
            Back to the boat<kbd>Esc</kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
