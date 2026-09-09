import type { Metadata } from "next";
import Link from "next/link";
import { BgmSurface } from "@/components/audio/bgm-surface";
import { chapters, contact } from "@/data/personal";
import { projects } from "@/data/projects";
import type { PortfolioProject } from "@/types/portfolio";

export const metadata: Metadata = {
  title: "Background & contact",
  description: `${contact.name} — timeline, selected work and contact details.`,
};

/**
 * The direct path, for a reader who will not play anything.
 *
 * Timeline and selected work come from the canonical personal and project data.
 */
export default function BackgroundAndContact() {
  return (
    <main className="document-page doc-page">
      <BgmSurface surface="resume" />
      <Link className="doc-back" href="/?view=index">
        Back to portfolio
      </Link>

      <header className="doc-head">
        <p className="eyebrow">Background &amp; contact</p>
        <h1>{contact.name}</h1>
        <p className="doc-lede">{contact.location}</p>
      </header>

      <section className="doc-section">
        <h2 className="doc-label">Contact</h2>
        <div className="doc-links">
          <a href={`mailto:${contact.email}`}>{contact.email}</a>
          <a href={contact.linkedin} rel="noreferrer" target="_blank">
            LinkedIn
          </a>
          <a href={contact.github} rel="noreferrer" target="_blank">
            GitHub
          </a>
        </div>
      </section>

      <section className="doc-section">
        <h2 className="doc-label">Timeline</h2>
        <ol className="doc-timeline">
          {chapters.map((chapter) => (
            <li key={chapter.id}>
              <p className="doc-timeline__years">{chapter.years}</p>
              <div className="doc-timeline__body">
                <h3>{chapter.place}</h3>
                <ul>
                  {chapter.detail.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="doc-section">
        <h2 className="doc-label">Selected work</h2>
        <ol className="doc-work">
          {projects.map((project: PortfolioProject) => (
            <li key={project.id}>
              <h3>{project.displayName}</h3>
              <p className="doc-work__category">{project.category}</p>
              <p className="doc-work__descriptor">{project.shortDescriptor}</p>
              {project.framingNote ? (
                <p className="doc-constraint">{project.framingNote}</p>
              ) : null}
              {project.techStack ? (
                <ul className="doc-chips">
                  {project.techStack.map((entry) => (
                    <li key={entry}>{entry}</li>
                  ))}
                </ul>
              ) : null}
              <div className="doc-links">
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
      </section>
    </main>
  );
}
