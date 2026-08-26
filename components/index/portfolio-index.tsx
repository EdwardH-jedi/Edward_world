"use client";

import Link from "next/link";
import { projects } from "@/data/projects";
import { AccessibleDialog } from "@/components/ui/accessible-dialog";

interface PortfolioIndexProps {
  onClose: () => void;
}

export function PortfolioIndex({ onClose }: PortfolioIndexProps) {
  return (
    <AccessibleDialog className="index-dialog" title="Portfolio Index" onClose={onClose}>
      <p className="index-intro">
        A direct, recruiter-friendly route through Edward&apos;s selected work.
      </p>
      <ul className="project-index">
        {projects.map((project) => (
          <li key={project.id}>
            <div>
              <p className="eyebrow">{project.category}</p>
              <h3>{project.displayName}</h3>
              <p>{project.shortDescriptor}</p>
            </div>
            <div className="project-index__links">
              <Link href={project.caseStudyUrl}>Case study</Link>
              {project.githubUrl ? (
                <a href={project.githubUrl} rel="noreferrer" target="_blank">
                  GitHub
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <div className="index-sections">
        <section id="about">
          <h3>About</h3>
          <p>Developer focused on useful products, evidence, and playful interfaces.</p>
        </section>
        <section>
          <h3>Direct links</h3>
          <ul className="direct-links">
            <li><Link href="/resume">Resume</Link></li>
            <li><a href="https://github.com/EdwardH-jedi" rel="noreferrer" target="_blank">GitHub</a></li>
            <li><span>Contact — details coming soon</span></li>
          </ul>
          <p className="placeholder-note">Contact details will be connected when provided.</p>
        </section>
      </div>
    </AccessibleDialog>
  );
}
