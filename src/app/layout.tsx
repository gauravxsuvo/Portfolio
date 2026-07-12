import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { CrtOverlay } from "@/components/crt-overlay";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { BootGate } from "@/components/boot-gate";
import { CursorTrail } from "@/components/cursor-trail";
import { ConsoleEasterEgg } from "@/components/console-easter-egg";
import { KonamiListener } from "@/components/konami-listener";
import { NavShortcuts } from "@/components/nav-shortcuts";
import { ThemePanel } from "@/components/theme-panel";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { bio } from "@/lib/data";
import { siteName, siteUrl } from "@/lib/site";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
});

const description = `${bio.role}. ${bio.summary}`.slice(0, 200);

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: siteName, template: `%s — ${siteName}` },
  description,
  applicationName: `${bio.name} — Portfolio`,
  authors: [{ name: bio.name, url: siteUrl }],
  creator: bio.name,
  keywords: [
    bio.name,
    bio.handle,
    "software developer",
    "portfolio",
    "machine learning",
    "full-stack development",
    ...bio.focus,
  ],
  alternates: { canonical: siteUrl },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: `${bio.name} — Portfolio`,
    title: siteName,
    description,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-fg font-mono selection:bg-primary selection:text-bg">
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        <noscript>
          <style>{`[data-boot-gate]{display:none !important;}[data-reveal-item]{opacity:1 !important;transform:none !important;}`}</style>
        </noscript>
        <CrtOverlay />
        <CursorTrail />
        <ConsoleEasterEgg />
        <KonamiListener />
        <NavShortcuts />
        <ThemePanel />
        <BootGate>
          <SiteNav />
          <main
            tabIndex={-1}
            className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-10 outline-none"
          >
            {children}
          </main>
          <SiteFooter />
        </BootGate>
      </body>
    </html>
  );
}
