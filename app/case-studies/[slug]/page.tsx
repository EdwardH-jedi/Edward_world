import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectBySlug, projects } from "@/data/projects";

export function generateStaticParams() {
  return projects.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) return { title: "Case study not found" };

  return {
    title: project.displayName,
    // A framing constraint travels with the description, because the
    // description is the part a search result quotes out of context.
    description: project.framingNote
      ? `${project.shortDescriptor} ${project.framingNote}`
      : project.shortDescriptor,
  };
}

/**
 * One project, said only in facts the repository itself records.
 *
 * The written case study — problem, decisions, outcome — is Edward's to
 * author. Until he does, this page shows what is verifiable and says plainly
 * that the rest is missing, rather than filling the space with prose that
 * sounds like a case study.
 */
export default async function CaseStudy({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) notFound();

  const others = projects.filter((entry) => entry.slug !== project.slug);

  return (
    <main className="document-page doc-page">
      <Link className="doc-back" href="/">
        Edward&apos;s World
      </Link>

      <header className="doc-head">
        <p className="eyebrow">{project.category}</p>
        <h1>{project.displayName}</h1>
        <p className="doc-lede">{project.shortDescriptor}</p>
      </header>

      {project.framingNote ? (
        <p className="doc-constraint">{project.framingNote}</p>
      ) : null}

      {project.repositorySummary ? (
        <section className="doc-section">
          <h2 className="doc-label">In its own words</h2>
          <blockquote className="doc-quote">
            <p>{project.repositorySummary}</p>
          </blockquote>
        </section>
      ) : null}

      {project.repositoryNotes ? (
        <section className="doc-section">
          <h2 className="doc-label">How it plays</h2>
          <ul className="doc-list">
            {project.repositoryNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {project.techStack ? (
        <section className="doc-section">
          <h2 className="doc-label">Stack</h2>
          <ul className="doc-chips">
            {project.techStack.map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="doc-section">
        <h2 className="doc-label">Go further</h2>
        <div className="doc-links">
          {project.githubUrl ? (
            <a href={project.githubUrl} rel="noreferrer" target="_blank">
              Source on GitHub
            </a>
          ) : null}
          <Link href="/">Visit it in the world</Link>
          <Link href="/resume">Resume</Link>
        </div>
      </section>

      <p className="doc-pending">
        The written account — what the problem was, what was decided, what came
        of it — is Edward&apos;s to write and is not here yet. Everything above
        is what the repository itself records.
      </p>

      <nav aria-label="Other case studies" className="doc-section">
        <h2 className="doc-label">Other work</h2>
        <ul className="doc-more">
          {others.map((entry) => (
            <li key={entry.id}>
              <Link href={entry.caseStudyUrl}>
                <span className="doc-more__name">{entry.displayName}</span>
                <span className="doc-more__descriptor">{entry.shortDescriptor}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
