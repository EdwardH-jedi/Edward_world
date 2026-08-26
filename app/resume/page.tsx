import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Resume",
  description: "Edward Hwang's resume placeholder.",
};

export default function ResumePlaceholder() {
  return (
    <main className="document-page">
      <p className="eyebrow">Resume placeholder</p>
      <h1>Edward Hwang</h1>
      <p>The final resume document and content will be connected here.</p>
      <Link href="/">Return to Edward&apos;s World</Link>
    </main>
  );
}
