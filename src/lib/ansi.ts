/**
 * The ANSI accent cycle used by retro mode.
 *
 * Components that want a per-item accent set `--retro-accent` inline from this
 * cycle and add one of the `.retro-*` classes; the CSS in globals.css only
 * reads the property under `html[data-mode="retro"]`, so in mono mode the
 * inline property is inert and the element's normal utilities apply. That's
 * what lets server components participate without knowing the client's mode.
 */

/**
 * Cycle order matters: adjacent entries are what land next to each other in a
 * nav row or a rainbow wordmark, so they alternate warm/cool rather than
 * running the spectrum in order (which puts magenta beside purple and reads as
 * a gradient smear at small sizes).
 */
const ANSI_ACCENT_VARS = [
  "--color-ansi-magenta",
  "--color-ansi-cyan",
  "--color-ansi-amber",
  "--color-ansi-lime",
  "--color-ansi-purple",
  "--color-ansi-orange",
] as const;

export const ANSI_ACCENT_COUNT = ANSI_ACCENT_VARS.length;

/** CSS value for the nth accent in the cycle, e.g. `var(--color-ansi-cyan)`. */
export function ansiAccent(index: number): string {
  const n = ANSI_ACCENT_VARS.length;
  return `var(${ANSI_ACCENT_VARS[((index % n) + n) % n]})`;
}

/** Inline style carrying the accent, typed so JSX accepts the custom property. */
export function retroAccentStyle(index: number): React.CSSProperties {
  return { "--retro-accent": ansiAccent(index) } as React.CSSProperties;
}
