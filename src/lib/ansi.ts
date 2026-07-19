/**
 * The accent cycle used by retro mode.
 *
 * Components that want a per-item accent set `--retro-accent` inline from this
 * cycle and add one of the `.retro-*` classes; the CSS in globals.css only
 * reads the property under `html[data-mode="retro"]`, so in mono mode the
 * inline property is inert and the element's normal utilities apply. That's
 * what lets server components participate without knowing the client's mode.
 *
 * The slots are **numbered, not named**. Each retro template (see
 * `lib/retro-templates.ts`) redefines all six, and the colour sitting in slot 3
 * is amber in one template and lime in another — so a name here would be a lie
 * in three templates out of four. Slot order is a design decision that holds
 * across every template: adjacent slots alternate warm/cool, because they're
 * what land next to each other in a nav row or a rainbow wordmark. Running the
 * spectrum in order instead puts pink beside purple and reads as a smear.
 */

const ANSI_ACCENT_VARS = [
  "--color-ansi-1",
  "--color-ansi-2",
  "--color-ansi-3",
  "--color-ansi-4",
  "--color-ansi-5",
  "--color-ansi-6",
] as const;

export const ANSI_ACCENT_COUNT = ANSI_ACCENT_VARS.length;

/** CSS value for the nth accent in the cycle, e.g. `var(--color-ansi-2)`. */
export function ansiAccent(index: number): string {
  const n = ANSI_ACCENT_VARS.length;
  return `var(${ANSI_ACCENT_VARS[((index % n) + n) % n]})`;
}

/** Inline style carrying the accent, typed so JSX accepts the custom property. */
export function retroAccentStyle(index: number): React.CSSProperties {
  return { "--retro-accent": ansiAccent(index) } as React.CSSProperties;
}
