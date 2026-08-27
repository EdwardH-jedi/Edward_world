"use client";

import Link from "next/link";
import { AccessibleDialog } from "@/components/ui/accessible-dialog";
import { contact } from "@/data/personal";
import { projects } from "@/data/projects";

interface PortfolioIndexProps {
  onClose: () => void;
}

/** How the world names each project, for people who never enter it. */
const ROLE: Readonly<Record<string, string>> = {
  sportsgang: "PEER SPORTS COMPETITION",
  "afl-predict": "FORECASTING RESEARCH",
  wardrobe: "LOCAL-FIRST ARCHIVE",
  soonpermario: "PLAYABLE EXPERIMENT",
};

/**
 * The recruiter's fast path.
 *
 * Deliberate whiplash against the pixel world: warm off-white, charcoal, an
 * editorial grid, no game styling anywhere. Everything a reader needs is here
 * in one interaction — what each project is, what it was built with, where the
 * code lives — so nothing professional is ever gated behind gameplay.
 */
export function PortfolioIndex({ onClose }: PortfolioIndexProps) {
  return (
    <AccessibleDialog className="index-dialog" title="Portfolio Index" onClose={onClose}>
      <p className="index-lede">
        {contact.name} — {contact.location}. Four projects, the code behind each
        of them, and the written version. The interactive world is optional.
      </p>

      <p className="index-label">Selected work</p>
      <ol className="index-work">
        {projects.map((project, position) => (
          <li key={project.id}>
            <span className="index-work__number">
              {String(position + 1).padStart(2, "0")}
            </span>
            <div className="index-work__body">
              <h3>{project.displayName}</h3>
              <p className="index-work__role">{ROLE[project.id] ?? project.category}</p>
              <p className="index-work__descriptor">{project.shortDescriptor}</p>
              {project.techStack ? (
                <ul className="index-work__stack">
                  {project.techStack.map((entry) => (
                    <li key={entry}>{entry}</li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="index-work__links">
              <Link href={project.caseStudyUrl}>Case study</Link>
              {project.githubUrl ? (
                <a href={project.githubUrl} rel="noreferrer" target="_blank">
                  GitHub
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      <div className="index-direct">
        <Link className="index-direct__item" href="/resume">
          <span>Resume</span>
          <span aria-hidden="true">↗</span>
        </Link>
        <a
          className="index-direct__item"
          href={contact.github}
          rel="noreferrer"
          target="_blank"
        >
          <span>GitHub</span>
          <span aria-hidden="true">↗</span>
        </a>
        <a
          className="index-direct__item"
          href={contact.linkedin}
          rel="noreferrer"
          target="_blank"
        >
          <span>LinkedIn</span>
          <span aria-hidden="true">↗</span>
        </a>
        <a className="index-direct__item" href={`mailto:${contact.email}`}>
          <span>Contact</span>
          <span aria-hidden="true">↗</span>
        </a>
      </div>

      <section className="index-about" id="about">
        <h3>About</h3>
        <p>
          Software developer in Sydney, finishing a Bachelor of Advanced
          Computing (Computer Science) at the University of Sydney. Most
          recently computer vision and field deployment at Sensorway — Ecopro in
          Hungary: around 750 sensors, Docker, data pipelines, a live rollout.
          Before Sydney: Jeju, and a research internship at Seoul National
          University.
        </p>
        <p className="index-about__more">
          The longer version is discoverable inside the world, in Edward&apos;s
          House.
        </p>
      </section>

      <p className="index-footer">
        Portfolio · 2026 · also available as a small world
      </p>
    </AccessibleDialog>
  );
}
