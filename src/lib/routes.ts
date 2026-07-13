export type SiteRoute = { href: string; label: string };

export type PageSection = { id: string; label: string };

/**
 * Section index per route, for the scroll-spy rail.
 *
 * Declared here rather than scraped from the DOM on mount: a DOM scrape can't run
 * until after the first paint, so the rail would render empty and then pop in,
 * and reconciling it needs a setState inside an effect — a cascading render on
 * every single navigation. These ids must match the `<section id>` on each page.
 */
export const PAGE_SECTIONS: Record<string, PageSection[]> = {
  "/": [
    { id: "section-shell", label: "try the shell" },
    { id: "section-skills", label: "core skills" },
    { id: "section-projects", label: "featured projects" },
    { id: "section-status", label: "system status" },
    { id: "section-publications", label: "publications" },
    { id: "section-changelog", label: "changelog" },
  ],
  "/about": [
    { id: "section-whoami", label: "whoami" },
    { id: "section-skills", label: "skills" },
    { id: "section-education", label: "education" },
  ],
};

/** Canonical reading order — drives the nav, the prev/next footer, and `ls`. */
export const SITE_ROUTES: SiteRoute[] = [
  { href: "/", label: "~/home" },
  { href: "/about", label: "~/about" },
  { href: "/projects", label: "~/projects" },
  { href: "/experience", label: "~/experience" },
  { href: "/publications", label: "~/publications" },
  { href: "/contact", label: "~/contact" },
];

export function adjacentRoutes(pathname: string) {
  const i = SITE_ROUTES.findIndex((r) => r.href === pathname);
  if (i === -1) return { prev: null, next: null };
  return {
    prev: i > 0 ? SITE_ROUTES[i - 1] : null,
    next: i < SITE_ROUTES.length - 1 ? SITE_ROUTES[i + 1] : null,
  };
}
