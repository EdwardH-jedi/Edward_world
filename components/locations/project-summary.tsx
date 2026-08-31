"use client";

import Link from "next/link";
import type { ReactNode, RefObject } from "react";
import { getProjectById } from "@/data/projects";
import type { PortfolioProjectId } from "@/types/portfolio";

interface ProjectSummaryProps {
  /** Which canonical project this location represents. */
  projectId: PortfolioProjectId;
  /** The wordmark as the world spells it. */
  wordmark: string;
  /** What the location is, in the world's own words. */
  role: string;
  /** The product's loop, as scene copy. */
  flow: readonly string[];
  /** Focused when the summary appears. */
  firstActionRef?: RefObject<HTMLAnchorElement | null>;
  onExit: () => void;
  onReplay: () => void;
  replayLabel?: string;
  /** What the link to the case study is called here. */
  caseStudyLabel?: string;
  /** Location-specific content, shown between the stack and the actions. */
  children?: ReactNode;
}

/**
 * The panel every project location ends on.
 *
 * Descriptor, stack and links come from `data/projects.ts` and are never
 * restated here — a location supplies only what is specific to it: how the
 * world names the place and what the product's loop is called.
 */
export function ProjectSummary({
  projectId,
  wordmark,
  role,
  flow,
  firstActionRef,
  onExit,
  onReplay,
  replayLabel = "REPLAY",
  caseStudyLabel = "VIEW CASE STUDY",
  children,
}: ProjectSummaryProps) {
  const project = getProjectById(projectId);
  if (!project) return null;

  return (
    <div className="loc-summary">
      <p className="loc-summary__wordmark">{wordmark}</p>
      <p className="loc-summary__role">{role}</p>
      <p className="loc-summary__descriptor">{project.shortDescriptor}</p>

      <ol className="loc-summary__flow">
        {flow.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      {project.techStack ? (
        <ul className="loc-summary__stack">
          {project.techStack.map((entry) => (
            <li key={entry}>{entry}</li>
          ))}
        </ul>
      ) : null}

      {children}

      <div className="loc-summary__actions">
        <Link
          className="loc-button loc-button--primary"
          href={project.caseStudyUrl}
          ref={firstActionRef}
        >
          {caseStudyLabel}
        </Link>
        {project.githubUrl ? (
          <a
            className="loc-button"
            href={project.githubUrl}
            rel="noreferrer"
            target="_blank"
          >
            GITHUB
          </a>
        ) : null}
        <button className="loc-button" onClick={onExit} type="button">
          BACK TO WORLD
        </button>
        <button className="loc-button loc-button--quiet" onClick={onReplay} type="button">
          {replayLabel}
        </button>
      </div>
    </div>
  );
}
