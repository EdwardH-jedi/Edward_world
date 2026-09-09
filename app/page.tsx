import { Suspense } from "react";
import { PortfolioExperience } from "@/components/portfolio-experience";

export default function Home() {
  return (
    <Suspense fallback={<main className="experience-shell" aria-label="Loading portfolio" />}>
      <PortfolioExperience />
    </Suspense>
  );
}
