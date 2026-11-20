import type { Metadata, Viewport } from "next";
import { Anton, Instrument_Serif, Manrope } from "next/font/google";
import "./globals.css";
import { event } from "@/content/event";
import { publicEnv } from "@/lib/env";
import { longDate } from "@/lib/time";
import MotionRoot from "@/lib/motion/MotionRoot";
import PwaRoot from "@/components/ui/PwaRoot";

const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--font-anton", display: "swap" });
const instrument = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

const desc = `${event.title} — ${longDate(event.date)} at ${event.venue.name}, ${event.venue.city}. Event details, schedule, venue and live updates.`;

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: { default: `${event.title} · ${event.organization}`, template: `%s · ${event.title}` },
  description: desc,
  applicationName: event.title,
  manifest: "/manifest.webmanifest",
  icons: { icon: [{ url: "/favicon.png", sizes: "48x48" }, { url: "/icons/icon-192.png", sizes: "192x192" }], apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: event.shortTitle, statusBarStyle: "black-translucent" },
  openGraph: { title: event.title, description: desc, type: "website", siteName: event.organization },
  twitter: { card: "summary_large_image", title: event.title, description: desc },
};

export const viewport: Viewport = {
  themeColor: "#0A0B10",
  colorScheme: "dark",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${anton.variable} ${instrument.variable} ${manrope.variable}`}>
      <head>
        {/* Marks JS availability so animated initial states never hide content for no-JS visitors. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js');setTimeout(function(){if(!document.documentElement.classList.contains('motion-ready'))document.documentElement.classList.add('motion-failed')},3500)" }} />
      </head>
      <body>
        <a href="#main" className="skip">Skip to content</a>
        {children}
        <MotionRoot />
        <PwaRoot />
      </body>
    </html>
  );
}
