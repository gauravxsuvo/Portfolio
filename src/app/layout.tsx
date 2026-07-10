import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { CrtOverlay } from "@/components/crt-overlay";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { BootGate } from "@/components/boot-gate";
import { CursorTrail } from "@/components/cursor-trail";
import { ConsoleEasterEgg } from "@/components/console-easter-egg";
import { KonamiListener } from "@/components/konami-listener";
import { NavShortcuts } from "@/components/nav-shortcuts";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
});

export const metadata: Metadata = {
  title: "gaurav@portfolio:~$",
  description:
    "Software developer portfolio — projects, experience, and contact, rendered as a terminal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-bg text-fg font-mono selection:bg-primary selection:text-bg">
        <noscript>
          <style>{`[data-boot-gate]{display:none !important;}[data-reveal-item]{opacity:1 !important;transform:none !important;}`}</style>
        </noscript>
        <CrtOverlay />
        <CursorTrail />
        <ConsoleEasterEgg />
        <KonamiListener />
        <NavShortcuts />
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
