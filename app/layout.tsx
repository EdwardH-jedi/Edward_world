import type { Metadata, Viewport } from "next";
import { MusicControl } from "@/components/audio/music-control";
import { Archivo, IBM_Plex_Mono, Silkscreen } from "next/font/google";
import "./globals.css";

/**
 * Two deliberate type systems, per the approved design direction: a bitmap face
 * for anything inside the game world, a grotesk for portfolio UI, and a mono
 * for metadata and machine-ish labels.
 */
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

const silkscreen = Silkscreen({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-bitmap",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Edward's World",
    template: "%s | Edward's World",
  },
  description: "An interactive developer portfolio by Edward Hwang.",
  applicationName: "Edward's World",
  authors: [{ name: "Edward Hwang" }],
  creator: "Edward Hwang",
  publisher: "Edward Hwang",
  keywords: [
    "Edward Hwang",
    "software developer",
    "developer portfolio",
    "interactive portfolio",
  ],
  category: "technology",
  manifest: "/manifest.webmanifest",
  formatDetection: {
    address: false,
    email: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_AU",
    title: "Edward's World",
    description: "An interactive developer portfolio by Edward Hwang.",
    siteName: "Edward's World",
  },
  twitter: {
    card: "summary",
    title: "Edward's World",
    description: "An interactive developer portfolio by Edward Hwang.",
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f4f2ec",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      className={`${archivo.variable} ${plexMono.variable} ${silkscreen.variable}`}
      lang="en"
    >
      <body>
        {children}
        <MusicControl />
      </body>
    </html>
  );
}
