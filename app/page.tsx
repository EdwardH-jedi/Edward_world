import { Suspense } from "react";
import { IM_Fell_English, IM_Fell_English_SC, Nanum_Pen_Script } from "next/font/google";
import { ChartExperience } from "@/components/chart/chart-experience";

/**
 * The chart overworld: Edward's World at `/`.
 *
 * The three faces are loaded here rather than in the root layout, so the rest
 * of the site does not pay for them. The canvas cannot read CSS variables, so
 * their hashed family names are handed to the chart as well.
 */
const fell = IM_Fell_English({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-fell",
  display: "swap",
});

const fellCaps = IM_Fell_English_SC({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-fell-sc",
  display: "swap",
});

const pen = Nanum_Pen_Script({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-pen",
  display: "swap",
  preload: false,
});

const FONTS = {
  display: fell.style.fontFamily,
  caps: fellCaps.style.fontFamily,
  hand: pen.style.fontFamily,
};

export default function Home() {
  return (
    <main className={`${fell.variable} ${fellCaps.variable} ${pen.variable}`}>
      {/* `?view=` is read on the client, so the page itself stays static. */}
      <Suspense fallback={<div aria-busy="true" className="chart-stage" />}>
        <ChartExperience fonts={FONTS} />
      </Suspense>
    </main>
  );
}
