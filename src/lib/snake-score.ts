/**
 * Persistence for the shell game's best score.
 *
 * Its own module rather than inline localStorage calls in the component, for the
 * same reason achievements.ts exists: the key name is a fact about what this
 * site stores on a visitor's device, and every such key has to appear in
 * `lib/storage-inventory.ts` — which is what /privacy and /cookies render from.
 * A key written from an anonymous `localStorage.setItem` buried in a component
 * is exactly the one that never makes it into the policy.
 *
 * @see lib/storage-inventory.ts — SNAKE_BEST_KEY is listed there.
 */

export const SNAKE_BEST_KEY = "suvo:snake-best";

/** Above any score reachable on a 22x12 board; anything larger was hand-edited. */
const MAX_PLAUSIBLE_SCORE = 22 * 12 * 10;

export function readSnakeBest(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(SNAKE_BEST_KEY);
    if (!raw) return 0;
    const value = Number.parseInt(raw, 10);
    // Storage is user-writable, so this is parsed rather than trusted. A NaN
    // would render as "best NaN" forever, which is a worse bug than a lost score.
    if (!Number.isFinite(value) || value < 0 || value > MAX_PLAUSIBLE_SCORE) return 0;
    return value;
  } catch {
    return 0;
  }
}

export function writeSnakeBest(score: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SNAKE_BEST_KEY, String(score));
  } catch {
    // storage unavailable — the score just won't survive the tab
  }
}
