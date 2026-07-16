/**
 * "Skip to content" — the first focusable thing in the document.
 *
 * WCAG 2.4.1 (Bypass Blocks, Level A). Without it, every keyboard and screen
 * reader user tabs through the whole nav — and on this site also the theme
 * panel and the shell — on every single page before reaching the actual
 * content. It's the cheapest accessibility win there is and its absence is a
 * genuine conformance failure, not a nice-to-have.
 *
 * Hidden until focused: sr-only takes it out of the visual flow, and
 * focus:not-sr-only brings it back the instant someone tabs to it. Mouse users
 * never see it; keyboard users get it as their first stop.
 *
 * z-index sits above the boot overlay (z-45) and the consent banner (z-60),
 * because a skip link that renders *underneath* something is a skip link that
 * doesn't work.
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:border focus:border-primary focus:bg-bg focus:px-3 focus:py-2 focus:text-sm focus:text-primary focus:outline-none focus:text-glow"
    >
      [ skip to content ]
    </a>
  );
}
