import type { Metadata } from "next";
import { Suspense } from "react";
import { PortfolioExperience } from "@/components/portfolio-experience";

/**
 * The side-view town that `/` used to be, kept whole and unlisted until Edward
 * decides whether it retires or becomes somewhere the chart can reach
 * (`docs/chart-overworld/BRIEF.md`, open question 2). Nothing links here.
 */
export const metadata: Metadata = {
  title: "Town",
  robots: { index: false, follow: false },
};

export default function TownPage() {
  return (
    <Suspense fallback={<main className="experience-shell" aria-label="Loading portfolio" />}>
      <PortfolioExperience />
    </Suspense>
  );
}
