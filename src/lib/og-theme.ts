/**
 * Static colours for the pre-rendered share images and icons.
 *
 * These are baked into PNGs at build time, so they use the site's *default*
 * palette rather than a visitor's live-customised theme. A link preview that
 * doesn't look like the page it opens is the thing to avoid here.
 *
 * **They must track `DEFAULT_RETRO_TEMPLATE` in `lib/retro-templates.ts`.**
 * They drifted once already: the constants stayed on the synthwave accents
 * (magenta/violet) after the default moved to `ansi`, so every shared link
 * unfurled as a pink card and then opened a coral-and-cyan site. The values
 * below are copied from the `html[data-mode="retro"][data-retro="ansi"]` block
 * in `globals.css` — if the default template changes, change these with it.
 *
 * Slots are numbered rather than named for the same reason the CSS numbers
 * them: each template redefines all six, so "magenta" would be a lie in three
 * templates out of four.
 */

export const OG_BG = "#0a0a0a";

/**
 * Retro's chrome pair. `primary` is the near-white the wordmark, prompts and
 * borders are drawn in; `fg` sits a step dimmer for body copy. Keeping the
 * wordmark on `primary` here is deliberate — the hero is one colour on the
 * site, and rendering it in an accent on the card made the preview louder than
 * the page it links to.
 */
export const OG_PRIMARY = "#f5f3ff";
export const OG_FG = "#c9c4d6";
export const OG_BORDER = "#4a3f5c";

/** The six ANSI accent slots, in slot order — mirrors the CSS block exactly. */
export const OG_ACCENT_1 = "#ff5f56";
export const OG_ACCENT_2 = "#5ff5f5";
export const OG_ACCENT_3 = "#ffd75f";
export const OG_ACCENT_4 = "#5cff8f";
export const OG_ACCENT_5 = "#6ab0ff";
export const OG_ACCENT_6 = "#ff6ac1";

/** The accent cycle, for anything that runs a list through the palette. */
export const OG_ACCENTS = [
  OG_ACCENT_1,
  OG_ACCENT_2,
  OG_ACCENT_3,
  OG_ACCENT_4,
  OG_ACCENT_5,
  OG_ACCENT_6,
] as const;

/**
 * `--mist-1` for the ansi template: the hue the phosphor mist and the hero's
 * bloom are tinted with. The wordmark's glow uses it here for the same reason
 * the site does — it makes the name read as the brightest part of one
 * continuous light rather than as an object with its own colour scheme.
 */
export const OG_MIST = "#6ab0ff";

export const OG_ERROR = "#ff3333";

export const STATUS_STYLE: Record<
  "ok" | "wip" | "err" | "live",
  { label: string; color: string }
> = {
  ok: { label: "OK", color: OG_ACCENT_4 },
  live: { label: "LIVE", color: OG_ACCENT_4 },
  wip: { label: "WIP", color: OG_ACCENT_3 },
  err: { label: "ARCHIVED", color: OG_ERROR },
};
