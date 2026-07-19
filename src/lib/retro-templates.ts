/**
 * The four retro palettes.
 *
 * Each one redefines the six accent slots plus the foreground/primary pair.
 * The *colours* live in `globals.css` under
 * `html[data-mode="retro"][data-retro="<id>"]`, because they have to be applied
 * before first paint by a stylesheet rather than by React. This file is the
 * registry the UI reads: the id, the label, and the swatch strip the display
 * panel and command palette draw. The two must stay in step — if you add a
 * template, add its CSS block and an entry here in the same change.
 *
 * Every accent clears WCAG AA (4.5:1) against the background; the dimmest is
 * ~6:1. `primary` is a near-white in all four on purpose: it's what prompts,
 * buttons, borders and the cursor derive from, so a *coloured* primary drowns
 * out the accents that are supposed to be doing the colour work. The templates
 * differ in the six accents, not in the chrome.
 */

export type RetroTemplateId = "ansi" | "synthwave" | "arcade" | "vaporwave";

export type RetroTemplate = {
  id: RetroTemplateId;
  label: string;
  /** One-line description, shown under the label in the display panel. */
  blurb: string;
  /** The six accents, in slot order — mirrors the CSS block exactly. */
  swatch: [string, string, string, string, string, string];
};

export const RETRO_TEMPLATES: RetroTemplate[] = [
  {
    id: "ansi",
    label: "ANSI",
    blurb: "classic xterm",
    swatch: ["#ff5f56", "#5ff5f5", "#ffd75f", "#5cff8f", "#6ab0ff", "#ff6ac1"],
  },
  {
    id: "synthwave",
    label: "SYNTHWAVE",
    blurb: "miami sunset",
    swatch: ["#ff4fd8", "#22e0ff", "#ffd166", "#b57bff", "#ff7a45", "#8f86ff"],
  },
  {
    id: "arcade",
    label: "ARCADE",
    blurb: "cga cabinet",
    swatch: ["#ff2ec4", "#00e5ff", "#ffe600", "#00ff7f", "#c77dff", "#ff6b35"],
  },
  {
    id: "vaporwave",
    label: "VAPORWAVE",
    blurb: "soft pastels",
    swatch: ["#ffb3de", "#9ff5d4", "#ffe9a3", "#c9b6ff", "#a8d8ff", "#ffc9a3"],
  },
];

export const DEFAULT_RETRO_TEMPLATE: RetroTemplateId = "ansi";

const IDS = new Set<string>(RETRO_TEMPLATES.map((t) => t.id));

export function isRetroTemplateId(value: unknown): value is RetroTemplateId {
  return typeof value === "string" && IDS.has(value);
}

export function getRetroTemplate(id: RetroTemplateId): RetroTemplate {
  return RETRO_TEMPLATES.find((t) => t.id === id) ?? RETRO_TEMPLATES[0];
}
