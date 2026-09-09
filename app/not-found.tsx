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
      <h1>This path doesn&apos;t lead anywhere.</h1>
      <p>
        Return to the portfolio, or find Edward&apos;s background and contact details.
      </p>
      <div className="document-page__links">
        <Link href="/?view=index">Back to portfolio</Link>
        <Link href="/resume">Background &amp; contact</Link>
      </div>
    </main>
  );
}
