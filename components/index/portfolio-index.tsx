"use client";

import Link from "next/link";
import { MusicToggle } from "@/components/audio/music-control";
import { AccessibleDialog } from "@/components/ui/accessible-dialog";
import { contact } from "@/data/personal";
import { projects } from "@/data/projects";
import type { PortfolioProject } from "@/types/portfolio";

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
    <AccessibleDialog
      className="index-dialog"
      title="Portfolio Index"
      onClose={onClose}
      headerActions={<MusicToggle inline />}
    >
      <p className="index-lede">
        {contact.name} — {contact.location}. Four projects, the code behind each
        of them, and their engineering details. The interactive world is optional.
      </p>

      <p className="index-label">Selected work</p>
      <ol className="index-work">
        {projects.map((project: PortfolioProject, position) => (
          <li key={project.id}>
            <span className="index-work__number">
              {String(position + 1).padStart(2, "0")}
            </span>
            <div className="index-work__body">
              <h3>{project.displayName}</h3>
              <p className="index-work__role">{ROLE[project.id] ?? project.category}</p>
              <p className="index-work__descriptor">{project.shortDescriptor}</p>
              {project.framingNote ? (
                <p className="index-work__framing">{project.framingNote}</p>
              ) : null}
              {project.techStack ? (
                <ul className="index-work__stack">
                  {project.techStack.map((entry) => (
                    <li key={entry}>{entry}</li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="index-work__links">
              <Link href={project.caseStudyUrl}>Project details</Link>
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
          <span>Background &amp; contact</span>
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
          Explore Edward&apos;s House for personal interests, collections and
          life outside software. The professional timeline is in{" "}
          <Link href="/resume">Background &amp; contact</Link>.
        </p>
      </section>

      <section className="index-about" aria-labelledby="world-engineering-title">
        <h3 id="world-engineering-title">Under the hood</h3>
        <p>
          Edward&apos;s World uses Next.js App Router and TypeScript, with pixel
          artwork drawn in code on Canvas. Movement advances by elapsed time;
          game rules and the demonstration forecasting pipeline live in pure
          functions that can be tested independently of rendering.
        </p>
        <p className="index-about__more">
          Shared keyboard and pointer controls support play, while dialogs
          manage focus and restore it on close. A Web Audio engine adjusts
          music across surfaces. Automated tests cover movement, game states,
          persistence and audio behavior.
        </p>
      </section>

      <p className="index-footer">
        Portfolio · 2026 · also available as a small world
      </p>
    </AccessibleDialog>
  );
}
