/**
 * The ANSI accent cycle used by retro mode.
 *
 * Components that want a per-item accent set `--retro-accent` inline from this
 * cycle and add one of the `.retro-*` classes; the CSS in globals.css only
 * reads the property under `html[data-mode="retro"]`, so in mono mode the
 * inline property is inert and the element's normal utilities apply. That's
 * what lets server components participate without knowing the client's mode.
 */

const ANSI_ACCENT_VARS = [
  "--color-ansi-green",
  "--color-ansi-cyan",
  "--color-ansi-magenta",
  "--color-ansi-amber",
] as const;

/** CSS value for the nth accent in the cycle, e.g. `var(--color-ansi-cyan)`. */
export function ansiAccent(index: number): string {
  const n = ANSI_ACCENT_VARS.length;
  return `var(${ANSI_ACCENT_VARS[((index % n) + n) % n]})`;
}

/** Inline style carrying the accent, typed so JSX accepts the custom property. */
export function retroAccentStyle(index: number): React.CSSProperties {
  return { "--retro-accent": ansiAccent(index) } as React.CSSProperties;
}
