import type { Metadata } from "next";
import { IM_Fell_English, IM_Fell_English_SC, Nanum_Pen_Script } from "next/font/google";
import { ChartWorld } from "@/components/chart/chart-world";

/**
 * The chart overworld, at `/chart` while it is built. Phase 5 makes it `/`.
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

export const metadata: Metadata = {
  title: "Chart",
  description: "A sea chart of Edward's World, from Incheon to Sydney.",
  // Not indexed until it replaces the town at `/`.
  robots: { index: false, follow: false },
};

const FONTS = {
  display: fell.style.fontFamily,
  caps: fellCaps.style.fontFamily,
  hand: pen.style.fontFamily,
};

export default function ChartPage() {
  return (
    <main className={`${fell.variable} ${fellCaps.variable} ${pen.variable}`}>
      <ChartWorld fonts={FONTS} />
    </main>
  );
}
