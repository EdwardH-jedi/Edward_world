import type { Metadata } from "next";
import Link from "next/link";
import { chapters, contact } from "@/data/personal";
import { projects } from "@/data/projects";
import type { PortfolioProject } from "@/types/portfolio";

export const metadata: Metadata = {
  title: "Resume",
  description: `${contact.name} — timeline, selected work and contact details.`,
};

/**
 * The direct path, for a reader who will not play anything.
 *
 * Every line is read from `data/personal.ts` and `data/projects.ts`, which
 * hold only what Edward's own repositories say. A resume is an identity
 * document: nothing is summarised into a claim here, and the formal signed-off
 * document is still Edward's to supply.
 */
export default function Resume() {
  return (
    <main className="document-page doc-page">
      <Link className="doc-back" href="/">
        Edward&apos;s World
      </Link>

      <header className="doc-head">
        <p className="eyebrow">Resume</p>
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
      </section>

      <p className="doc-pending">
        This page is assembled from Edward&apos;s own public repositories. A
        formal resume document, and anything it would add beyond the above, is
        his to supply.
      </p>
    </main>
  );
}
