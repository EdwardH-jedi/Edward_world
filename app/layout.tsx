import type { Metadata, Viewport } from "next";
import "./globals.css";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
