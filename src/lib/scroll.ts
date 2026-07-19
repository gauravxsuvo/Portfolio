/**
 * Programmatic scrolling that honours `prefers-reduced-motion`.
 *
 * The reduced-motion media query at the bottom of globals.css neutralises CSS
 * animations and transitions, but it has no reach into `scrollIntoView({
 * behavior: "smooth" })` or `scrollTo({ behavior: "smooth" })` — those are
 * imperative calls, and the browser animates them regardless of what the
 * stylesheet says. Six call sites were smooth-scrolling unconditionally (the
 * shell's `unlock`, the section rail, the focus tags, the secrets counter,
 * selection-search and back-to-top), which is exactly the kind of large-area
 * motion the setting exists to suppress — a long smooth scroll is a common
 * vestibular migraine trigger, and it's the one animation on the site a visitor
 * cannot look away from, because it moves the thing they're reading.
 *
 * So the choice of behaviour belongs in one place rather than at each call site,
 * where the next one added is the one that forgets. `"auto"` still scrolls — it
 * just arrives instantly instead of gliding, which is the documented reduced-
 * motion contract: don't remove the functionality, remove the animation.
 */

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** `behavior` for any programmatic scroll: smooth normally, instant if asked. */
export function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? "auto" : "smooth";
}

/** scrollIntoView with the motion preference already applied. */
export function scrollToElement(
  el: Element | null | undefined,
  options: Omit<ScrollIntoViewOptions, "behavior"> = {}
): void {
  el?.scrollIntoView({ ...options, behavior: scrollBehavior() });
}

/** window.scrollTo with the motion preference already applied. */
export function scrollWindowTo(top: number): void {
  if (typeof window === "undefined") return;
  window.scrollTo({ top, behavior: scrollBehavior() });
}
