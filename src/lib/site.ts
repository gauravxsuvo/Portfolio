import type { Metadata } from "next";

// VERCEL_PROJECT_PRODUCTION_URL is set automatically by Vercel to whatever
// domain currently serves production — the *.vercel.app one today, and the
// custom domain the moment one is attached, with no code change required.
export const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const siteName = "gaurav@portfolio:~$";

// Shared shape for every route's metadata export — keeps title/description
// in sync across the plain <title> tag, OpenGraph, and Twitter cards.
//
// Next.js metadata merging *replaces* a segment's whole `openGraph`/`twitter`
// object rather than deep-merging it with the parent's, so once a page sets
// its own openGraph/twitter (needed for a page-specific title/description),
// any image inherited from an ancestor's opengraph-image file convention is
// silently dropped unless re-specified here — so every call sites the image
// explicitly rather than relying on cross-segment inheritance.
export function pageMetadata({
  title,
  description,
  path = "",
  image = "/opengraph-image",
}: {
  title: string;
  description: string;
  path?: string;
  image?: string;
}): Metadata {
  const fullTitle = `${title} — ${siteName}`;
  const url = `${siteUrl}${path}`;
  const images = [{ url: `${siteUrl}${image}`, width: 1200, height: 630, alt: fullTitle }];
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title: fullTitle, description, url, images },
    twitter: { card: "summary_large_image", title: fullTitle, description, images },
  };
}
