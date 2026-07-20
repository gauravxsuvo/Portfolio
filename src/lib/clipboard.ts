/**
 * Copy to clipboard, without ever rejecting.
 *
 * `navigator.clipboard` is unavailable or throws in more situations than it
 * looks: any non-secure context (plain http on a LAN, which is how this site
 * gets viewed off a phone during development), a denied permission, or a call
 * the browser decides wasn't close enough to a user gesture. A floating
 * `navigator.clipboard.writeText(...)` therefore produces an unhandled promise
 * rejection — the command palette's "copy email" action did exactly that.
 *
 * Returns whether the copy actually happened, so callers can say so rather than
 * claiming success and hoping. The execCommand path is deprecated but it is the
 * only thing that works in a non-secure context, and a portfolio whose contact
 * address won't copy is worse than one carrying six dead lines of fallback.
 */
export async function copyText(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to the legacy path rather than giving up here
    }
  }

  if (typeof document === "undefined") return false;

  try {
    const area = document.createElement("textarea");
    area.value = text;
    // Off-screen rather than display:none — a hidden element cannot be selected,
    // and readOnly stops a mobile keyboard appearing for the split second it
    // holds focus.
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-9999px";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
