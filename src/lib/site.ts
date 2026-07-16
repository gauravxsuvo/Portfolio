import type { Metadata } from "next";

/**
 * The canonical origin, hardcoded on purpose.
 *
 * This used to derive from VERCEL_PROJECT_PRODUCTION_URL. That was right while
 * the site had no domain of its own, but it is actively harmful now that it
 * does: the variable resolves to whichever domain Vercel considers production,
 * which is still the *.vercel.app host under several project configurations.
 * Every canonical tag, OG image URL, sitemap entry and robots.txt line is built
 * from this constant, so a wrong value here silently tells Google the site
 * lives at two origins and splits its ranking between them.
 *
 * A domain is a deliberate, rare change — worth an edit here rather than
 * something that can drift when a hosting dashboard is reconfigured. The env
 * var stays supported for preview deployments, which genuinely do serve from a
 * generated hostname and shouldn't claim to be the canonical site.
 */
const PRODUCTION_ORIGIN = "https://mysuvo.com";

function resolveSiteUrl(): string {
  // Explicit override wins — used by preview deploys and any self-host.
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_ENV === "production") return PRODUCTION_ORIGIN;
  // Preview builds: describe themselves honestly rather than as the real site.
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.NODE_ENV === "production") return PRODUCTION_ORIGIN;
  return "http://localhost:3000";
}

export const siteUrl = resolveSiteUrl();

/**
 * Whether this deployment is the real site rather than a preview or a local dev
 * server. Drives robots.txt and the `robots` metadata: only the canonical host
 * should ever invite indexing.
 */
export const isCanonicalHost = siteUrl === PRODUCTION_ORIGIN;

/** Bare hostname, e.g. "mysuvo.com". For display (neofetch, terms, shell). */
export const siteHost = siteUrl.replace(/^https?:\/\//, "");

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
  const fullTitle = `${title} · ${siteName}`;
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
