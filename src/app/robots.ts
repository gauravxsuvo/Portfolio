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
      // Nothing here is secret, but there's no reason to spend crawl budget on
      // an auth wall or a JSON endpoint, and /admin should never surface in
      // search results.
      disallow: ["/admin", "/api/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
