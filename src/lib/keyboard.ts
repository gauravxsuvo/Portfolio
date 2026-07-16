/**
 * Shared guards for the site's global keyboard listeners.
 *
 * Several components listen on `window` for bare keys — "/" opens the palette,
 * "g" arms the nav jump, "?" opens the shortcut sheet. Every one of them has to
 * answer the same two questions first, and they were each answering them
 * slightly differently.
 */

/**
 * Is the user typing right now? A bare-key shortcut must not fire if so.
 *
 * The tagName test alone (what this replaced) missed two real cases: a
 * contenteditable region, and <select>, where the browser uses letter keys for
 * type-ahead option matching.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.tagName !== "string") return false;
  if (el.isContentEditable) return true;
  return /^(input|textarea|select)$/i.test(el.tagName);
}

/**
 * Is a modal that owns the keyboard currently up?
 *
 * These overlays render above the page and are mounted *outside* the inert
 * wrapper that covers it, so `inert` doesn't stop window-level listeners from
 * reacting to keys aimed at the overlay — they have to opt out here.
 *
 * A modal that consults this must exempt itself, or it can't handle its own
 * close key: see ShortcutsOverlay, which only checks while it is closed.
 */
const KEY_CAPTURING_MODALS = "[data-boot-gate],[data-modal-keys]";

export function isModalCapturingKeys(): boolean {
  if (typeof document === "undefined") return false;
  return document.querySelector(KEY_CAPTURING_MODALS) !== null;
}
