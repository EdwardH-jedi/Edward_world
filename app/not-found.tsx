import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The requested path does not exist in Edward's World.",
};

export default function NotFound() {
  return (
    <main className="document-page not-found-page">
      <p className="eyebrow">404 · Outside the world boundary</p>
      <h1>This path doesn&apos;t lead anywhere yet.</h1>
      <p>
        Return to the interactive world, or use the resume route for the direct path.
      </p>
      <div className="document-page__links">
        <Link href="/">Return to Edward&apos;s World</Link>
        <Link href="/resume">View resume</Link>
      </div>
    </main>
  );
}
