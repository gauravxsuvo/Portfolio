/**
 * Persistence for the typing test's best WPM.
 *
 * Its own module for the same reason snake-score.ts is: the key name is a fact
 * about what this site stores on a visitor's device, and every such key has to
 * appear in `lib/storage-inventory.ts` — which is what /privacy and /cookies
 * render from.
 *
 * @see lib/storage-inventory.ts — TYPETEST_BEST_KEY is listed there.
 */

export const TYPETEST_BEST_KEY = "suvo:typetest-best";

/** Nobody types 300 WPM on a portfolio site; anything larger was hand-edited. */
const MAX_PLAUSIBLE_WPM = 300;

export function readTypetestBest(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(TYPETEST_BEST_KEY);
    if (!raw) return 0;
    const value = Number.parseInt(raw, 10);
    // Storage is user-writable, so this is parsed rather than trusted.
    if (!Number.isFinite(value) || value < 0 || value > MAX_PLAUSIBLE_WPM) return 0;
    return value;
  } catch {
    return 0;
  }
}

export function writeTypetestBest(wpm: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TYPETEST_BEST_KEY, String(Math.min(wpm, MAX_PLAUSIBLE_WPM)));
  } catch {
    // storage unavailable — the score just won't survive the tab
  }
}
