import { bio } from "./data";

/**
 * One entry per page that has its own share card.
 *
 * This is the single source of truth for three things that used to be the same
 * string written twice: the page's `<title>`, its meta description, and the
 * text on its social card. `pageMetadata()` in `site.ts` reads titles and
 * descriptions from here, and each route's `opengraph-image.tsx` reads the card
 * copy from here, so a card can't quietly disagree with the page it links to —
 * the failure this codebase has already had twice, with the email address and
 * with the OG palette.
 *
 * **Membership in this registry is what switches a page's card on.**
 * `pageMetadata` points a page at its own `<path>/opengraph-image` only if the
 * path appears here; anything else falls back to the site-wide card. So adding
 * a page card is two steps that belong in one commit: an entry here, and an
 * `opengraph-image.tsx` in that route's folder. Add the entry without the file
 * and the page advertises an image route that 404s.
 *
 * `/admin` is deliberately absent and must stay that way. It is noindex, it is
 * not linked from any public page, and giving it a share card would publish
 * both its existence and its name in every unfurled link.
 */

export type PageCardKind = "page" | "policy";

export type PageCard = {
  /** The shell command this page is themed as. Doubles as the `<title>`. */
  command: string;
  /** Plain-language name, set large on the card. */
  heading: string;
  /** One or two sentences. Doubles as the meta description. */
  blurb: string;
  /**
   * Which of the six ANSI accent slots this page owns, 1-indexed to match
   * `--color-ansi-N` in globals.css. Fixed per page rather than derived from
   * position, so reordering this object can't reshuffle every card's colour.
   */
  accent: 1 | 2 | 3 | 4 | 5 | 6;
  /**
   * `policy` pages get a marker on the card. A privacy policy and a projects
   * index arriving in a chat window looking identical is a small dishonesty —
   * one is a legal document and should say so before it's opened.
   */
  kind: PageCardKind;
};

export const PAGE_CARDS: Record<string, PageCard> = {
  "/about": {
    command: "whoami",
    heading: "About",
    // The whole summary, not a slice: it is already written to be the hero
    // line, the meta description and the shell's about.txt.
    blurb: bio.summary,
    accent: 1,
    kind: "page",
  },
  "/projects": {
    command: "ls -la ~/projects",
    heading: "Projects",
    blurb: "Machine learning, geospatial, and full-stack projects.",
    accent: 2,
    kind: "page",
  },
  "/experience": {
    command: "git log --experience",
    heading: "Experience",
    blurb: "Work history and freelance background.",
    accent: 3,
    kind: "page",
  },
  "/publications": {
    command: "cat publications.bib",
    heading: "Publications",
    blurb: "Research publications and preprints.",
    accent: 4,
    kind: "page",
  },
  "/contact": {
    command: "cat contact.txt",
    heading: "Contact",
    blurb: "Email, GitHub, LinkedIn.",
    accent: 6,
    kind: "page",
  },

  // Policy pages. The blurbs are the ones already vetted on each page — no
  // claims are invented here. That matters more than it looks: the cards are
  // the most-copied summary of a legal document the site has, and /privacy's
  // IP claim in particular is deliberately *scoped* ("analytics never store
  // your IP"). Never restate a policy on a card in shorter, broader words.
  "/privacy": {
    command: "cat privacy.txt",
    heading: "Privacy",
    blurb: "What this site collects, why, how long it's kept, and how to turn it off.",
    accent: 5,
    kind: "policy",
  },
  "/cookies": {
    command: "cat cookies.txt",
    heading: "Cookies",
    blurb:
      "Every cookie and storage key this site writes, what it's for, and how long it lasts.",
    accent: 3,
    kind: "policy",
  },
  "/terms": {
    command: "cat terms.txt",
    heading: "Terms",
    blurb:
      "The terms for using this site: what you may reuse, what you may not, and the limits of what's promised.",
    accent: 2,
    kind: "policy",
  },
  "/security": {
    command: "cat security.txt",
    heading: "Security",
    blurb: "How to report a security vulnerability in this site, and what's in scope.",
    accent: 1,
    kind: "policy",
  },
  "/accessibility": {
    command: "cat accessibility.txt",
    heading: "Accessibility",
    blurb: "How accessible this site is, what's been done, and where it honestly falls short.",
    accent: 4,
    kind: "policy",
  },
};

export function getPageCard(path: string): PageCard | undefined {
  return PAGE_CARDS[path];
}
