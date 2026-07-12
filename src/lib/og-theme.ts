// Static colors for pre-rendered social/share images and icons — these are
// baked into PNGs at build time, so they intentionally use the *default*
// phosphor palette rather than a visitor's live-customized theme color.
export const OG_BG = "#0a0a0a";
export const OG_GREEN = "#33ff00";
export const OG_AMBER = "#ffb000";
export const OG_ERROR = "#ff3333";
export const OG_BORDER = "#1f6e1f";

export const STATUS_STYLE: Record<
  "ok" | "wip" | "err" | "live",
  { label: string; color: string }
> = {
  ok: { label: "OK", color: OG_GREEN },
  live: { label: "LIVE", color: OG_GREEN },
  wip: { label: "WIP", color: OG_AMBER },
  err: { label: "ARCHIVED", color: OG_ERROR },
};
