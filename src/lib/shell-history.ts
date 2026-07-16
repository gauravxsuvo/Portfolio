/**
 * Shell history that survives a reload, the way a real shell's does.
 *
 * The shell already kept history in a ref, but only for the life of the page —
 * navigating to /about and back wiped it, which is exactly when you want the
 * command you just typed. This persists it to localStorage, capped, and exposes
 * the reverse-search used by ctrl+r.
 */

const HISTORY_KEY = "suvo:shell-history";

/**
 * Enough to be useful, small enough that the synchronous read on mount stays
 * trivial and a shared machine's storage doesn't grow without bound.
 */
const MAX_ENTRIES = 60;

export function readHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Anything could be under this key — another tab, an older build, a user
    // poking at devtools. Only take what's actually a list of strings.
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string").slice(-MAX_ENTRIES);
  } catch {
    return [];
  }
}

export function writeHistory(entries: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    // Storage unavailable or full — history just won't outlive the session.
  }
}

export function clearHistory(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(HISTORY_KEY);
  } catch {
    // ignore
  }
}

/**
 * Append a command, collapsing an immediate repeat.
 *
 * Running the same thing twice in a row shouldn't cost two ↑ presses to get
 * past — this is what bash's HISTCONTROL=ignoredups does, and the ↑ key feels
 * broken without it.
 */
export function appendHistory(entries: string[], command: string): string[] {
  if (entries[entries.length - 1] === command) return entries;
  return [...entries, command].slice(-MAX_ENTRIES);
}

/**
 * Newest-first search for ctrl+r, matching bash: a plain substring match, and
 * `skip` walks to successively older hits as you press ctrl+r again.
 */
export function reverseSearch(
  entries: string[],
  term: string,
  skip = 0
): { command: string; index: number } | null {
  if (!term) return null;
  const needle = term.toLowerCase();
  let seen = 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (!entries[i].toLowerCase().includes(needle)) continue;
    if (seen === skip) return { command: entries[i], index: i };
    seen++;
  }
  return null;
}
