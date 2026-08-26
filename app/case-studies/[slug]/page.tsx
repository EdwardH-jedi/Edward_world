import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { projects } from "@/data/projects";

export function generateStaticParams() {
  return projects.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = projects.find((entry) => entry.slug === slug);

  if (!project) return { title: "Case study not found" };

  return {
    title: project.displayName,
    description: project.shortDescriptor,
  };
}

export default async function CaseStudyPlaceholder({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = projects.find((entry) => entry.slug === slug);
  if (!project) notFound();

  return (
    <main className="document-page">
      <p className="eyebrow">Case study placeholder</p>
      <h1>{project.displayName}</h1>
      <p>{project.shortDescriptor}</p>
      <p>This route is ready for final case-study content and visual assets.</p>
      {project.githubUrl ? (
        <a href={project.githubUrl} rel="noreferrer" target="_blank">View GitHub repository</a>
      ) : null}
      <Link href="/">Return to Edward&apos;s World</Link>
    </main>
  );
}
