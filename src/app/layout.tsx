import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { CrtOverlay } from "@/components/crt-overlay";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

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
        <CrtOverlay />
        <SiteNav />
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-10">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
