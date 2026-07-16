export const BOOT_STORAGE_KEY = "suvo:booted";

/**
 * Fired when the boot sequence finishes (or is skipped because it has already
 * been seen). Exists so overlays that live *outside* BootGate — the consent
 * banner is the first — can wait their turn: the boot screen is a fixed,
 * full-viewport dialog, and anything with a higher z-index would otherwise paint
 * straight over the animation on a visitor's very first impression of the site.
 */
export const BOOT_COMPLETE_EVENT = "suvo:boot-complete";

export const REPLAY_BOOT_EVENT = "suvo:replay-boot";

export function hasBooted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(BOOT_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}
