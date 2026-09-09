import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BgmSurface } from "@/components/audio/bgm-surface";
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

  if (!project) return { title: "Project details not found" };

  return {
    title: project.displayName,
    // A framing constraint travels with the description, because the
    // description is the part a search result quotes out of context.
    description: project.framingNote
      ? `${project.shortDescriptor} ${project.framingNote}`
      : project.shortDescriptor,
  };
}

/** The original implementation and its explicitly bounded world representation. */
export default async function ProjectDetails({
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
      <BgmSurface surface="case-study" />
      <Link className="doc-back" href="/?view=index">
        Back to portfolio
      </Link>

      <header className="doc-head">
        <p className="eyebrow">{project.category}</p>
        <h1>{project.displayName}</h1>
        <p className="doc-lede">{project.shortDescriptor}</p>
        <div className="doc-evidence">
          {project.techStack ? (
            <ul aria-label="Technology stack" className="doc-evidence__stack">
              {project.techStack.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
          ) : null}
          {project.githubUrl ? (
            <a href={project.githubUrl} rel="noreferrer" target="_blank">
              Source on GitHub <span aria-hidden="true">↗</span>
            </a>
          ) : null}
        </div>
      </header>

      {project.framingNote ? (
        <p className="doc-constraint">{project.framingNote}</p>
      ) : null}

      <section className="doc-section">
        <h2 className="doc-label">Original project</h2>
        <p className="doc-copy">{project.details.problem}</p>
      </section>

      <section className="doc-section">
        <h2 className="doc-label">Implementation</h2>
        {project.details.implementation.map((paragraph) => (
          <p className="doc-copy" key={paragraph}>{paragraph}</p>
        ))}
      </section>

      <section className="doc-section">
        <h2 className="doc-label">Technical decision</h2>
        <p className="doc-copy">{project.details.decision}</p>
      </section>

      <section className="doc-section">
        <h2 className="doc-label">Result &amp; limits</h2>
        <p className="doc-copy">{project.details.currentState}</p>
      </section>

      <section className="doc-section">
        <h2 className="doc-label">Inside Edward&apos;s World</h2>
        <p className="doc-copy">{project.details.worldRepresentation}</p>
      </section>

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
          <Link href="/?view=index">Back to portfolio</Link>
          <Link href="/resume">Background &amp; contact</Link>
        </div>
      </section>

      <nav aria-label="Other project details" className="doc-section">
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
