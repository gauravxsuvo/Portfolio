import type { MetadataRoute } from "next";
import { isCanonicalHost, siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // Preview deployments serve the whole site from a generated *.vercel.app
  // hostname. Left indexable, they show up in search as duplicates of the real
  // domain competing with it. Only the canonical production host invites
  // crawlers.
  if (!isCanonicalHost) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      /**
       * Only /api/ — the private page is deliberately NOT listed here.
       *
       * robots.txt is a public document, and a Disallow line is an advertisement:
       * it's a hand-written list of the paths the owner considered worth hiding,
       * served to anyone who asks, and reading it is the first move of every
       * scanner there is. Naming an auth wall in it does the attacker's
       * reconnaissance for them.
       *
       * Nothing is lost by omitting it, because robots.txt was never what kept
       * that page out of search — the `X-Robots-Tag: noindex` header in
       * next.config.ts is, plus the meta tag on the page itself. Those are in
       * fact *stronger*: a crawler blocked by robots.txt can't fetch the page,
       * so it never sees the noindex, which is exactly how a disallowed URL ends
       * up indexed anyway from inbound links alone. Letting the crawler in to be
       * told "noindex" works better than telling it to stay out.
       */
      disallow: ["/api/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
