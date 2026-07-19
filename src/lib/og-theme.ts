// Static colors for pre-rendered social/share images and icons — these are
// baked into PNGs at build time, so they intentionally use the site's *default*
// palette rather than a visitor's live-customized theme color.
//
// That default is retro mode (see globals.css), so these track the retro
// accents: magenta leads, cyan and amber answer it. They were green when green
// was the default; a link preview that doesn't look like the page it opens is
// the thing to avoid here.
export const OG_BG = "#0a0a0a";
export const OG_MAGENTA = "#ff4fd8";
export const OG_CYAN = "#22e0ff";
export const OG_AMBER = "#ffc233";
export const OG_LIME = "#7cff4d";
export const OG_PURPLE = "#b57bff";
export const OG_ERROR = "#ff3333";
export const OG_BORDER = "#4a3566";

export const STATUS_STYLE: Record<
  "ok" | "wip" | "err" | "live",
  { label: string; color: string }
> = {
  ok: { label: "OK", color: OG_LIME },
  live: { label: "LIVE", color: OG_LIME },
  wip: { label: "WIP", color: OG_AMBER },
  err: { label: "ARCHIVED", color: OG_ERROR },
};
