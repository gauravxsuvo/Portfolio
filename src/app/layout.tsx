import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { CrtOverlay } from "@/components/crt-overlay";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { BootGate } from "@/components/boot-gate";
import { CursorLayer } from "@/components/cursor-layer";
import { ConsoleEasterEgg } from "@/components/console-easter-egg";
import { KonamiListener } from "@/components/konami-listener";
import { NavShortcuts } from "@/components/nav-shortcuts";
import { ThemePanel } from "@/components/theme-panel";
import { AchievementToast } from "@/components/achievement-toast";
import { CommandPalette } from "@/components/command-palette";
import { ShortcutsOverlay } from "@/components/shortcuts-overlay";
import { RouteTransition } from "@/components/route-transition";
import { SiteFrame } from "@/components/site-frame";
import { AmbientGrid } from "@/components/ambient-grid";
import { SelectionSearch } from "@/components/selection-search";
import { ScrollFx } from "@/components/scroll-fx";
import { SkipLink } from "@/components/skip-link";
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";
import { ConsentBanner } from "@/components/analytics/consent-banner";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { bio } from "@/lib/data";
import { isCanonicalHost, siteName, siteUrl } from "@/lib/site";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
});

// The summary alone, not `${bio.role}. ${bio.summary}`: the bio now opens by
// saying what he studies, so prefixing the role restated it in the first twelve
// words of every search result.
const description = bio.summary;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: siteName, template: `%s · ${siteName}` },
  description,
  applicationName: `${bio.name} Portfolio`,
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
    siteName: `${bio.name} Portfolio`,
    title: siteName,
    description,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description,
  },
  // Matches robots.ts: preview deployments must not be indexed as duplicates of
  // the real domain.
  robots: isCanonicalHost
    ? { index: true, follow: true }
    : { index: false, follow: false },
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
        {/* First focusable element in the document, on purpose — a skip link
            that isn't first is one you have to tab past the nav to reach. */}
        <SkipLink />
        <AmbientGrid />
        <CrtOverlay />
        <CursorLayer />
        <ScrollFx />
        <RouteTransition />
        <AchievementToast />
        <CommandPalette />
        <ShortcutsOverlay />
        <SelectionSearch />
        <ConsoleEasterEgg />
        <KonamiListener />
        <NavShortcuts />
        <ThemePanel />
        <AnalyticsProvider />
        <BootGate>
          <SiteNav />
          <SiteFrame>{children}</SiteFrame>
          <SiteFooter />
        </BootGate>
        {/* Outside BootGate: it gates on the boot-complete event itself, and
            nesting it here would let the boot screen's `inert` swallow the
            buttons. */}
        <ConsentBanner />
      </body>
    </html>
  );
}
