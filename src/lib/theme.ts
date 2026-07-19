import { DEFAULT_PRIMARY_HEX, normalizeHex } from "./color";
import {
  DEFAULT_RETRO_TEMPLATE,
  RETRO_TEMPLATES,
  isRetroTemplateId,
  type RetroTemplateId,
} from "./retro-templates";

/**
 * Serialized into THEME_INIT_SCRIPT below, which runs before hydration and so
 * can't import anything — the list has to be baked into the string. Derived
 * from the registry rather than hand-written, so a new template can't be
 * validated everywhere except the one place that runs first.
 */
const RETRO_TEMPLATE_IDS: string[] = RETRO_TEMPLATES.map((t) => t.id);

export const THEME_STORAGE_KEY = "suvo:theme-primary";
export const THEME_MODE_STORAGE_KEY = "suvo:theme-mode";
export const RETRO_TEMPLATE_STORAGE_KEY = "suvo:retro-template";
export const CRT_STORAGE_KEY = "suvo:crt-enabled";
export const THEME_CHANGE_EVENT = "suvo:theme-change";
export const THEME_MODE_CHANGE_EVENT = "suvo:theme-mode-change";
export const OPEN_THEME_PANEL_EVENT = "suvo:open-theme-panel";

const HEX_RE = /^#[0-9a-f]{6}$/i;

/**
 * Two display modes:
 *  - "retro": the default. Warm paper-white body text with the ANSI accent set
 *    (green/cyan/magenta/amber) cycling through headings, tags and nav — the
 *    look of a real color terminal. Palette lives in CSS under
 *    `html[data-mode="retro"]`.
 *  - "mono": the single-phosphor look. One primary color (user-pickable via
 *    the display panel) drives everything, applied as inline custom properties.
 *
 * The inline/CSS split is the whole mechanism: mono writes --color-* inline on
 * <html> (they must outrank the stylesheet, the color is user-chosen), so
 * entering retro has to *remove* those inline properties or the retro palette
 * never shows through.
 */
export type ThemeMode = "retro" | "mono";

export const DEFAULT_THEME_MODE: ThemeMode = "retro";

/**
 * Which retro palette is active. Written to `<html data-retro>` so the
 * stylesheet can switch the six accent slots; meaningless in mono mode, but
 * left in place there so flipping back doesn't lose the choice.
 */
export type { RetroTemplateId };

/**
 * Who wrote the theme. The display panel broadcasts its own changes so the rest
 * of the app can react, but it must *not* re-derive its slider state from that
 * broadcast: hex is a lossy encoding of HSL (lightness 100 collapses to #ffffff,
 * which decodes back to hue 0 / saturation 0), so echoing your own change through
 * the hex round-trip yanks the other two sliders to zero mid-drag. Listeners
 * compare against their own id and skip.
 */
export type ThemeSource = "panel" | "shell" | "system";

/**
 * `committed` separates "the user settled on this colour" from "a frame of a
 * drag". Both broadcast, because the CRT overlay and friends must repaint every
 * frame — but a listener that records history (analytics) wants only the former.
 * Without it, one drag of the hue slider emitted an event per pointermove.
 */
export type ThemeChangeDetail = { hex: string; source: ThemeSource; committed: boolean };

export function getComputedPrimaryHex(): string {
  if (typeof document === "undefined") return DEFAULT_PRIMARY_HEX;
  const computed = getComputedStyle(document.documentElement)
    .getPropertyValue("--color-primary")
    .trim();
  return normalizeHex(computed) ?? DEFAULT_PRIMARY_HEX;
}

export function applyThemeColor(hex: string): void {
  if (typeof document === "undefined") return;
  const style = document.documentElement.style;
  style.setProperty("--color-primary", hex);
  style.setProperty("--color-fg", hex);
  style.setProperty("--color-accent", hex);
}

/**
 * Writing --color-primary invalidates style for the whole document (every token
 * derives from it, several through color-mix). At pointer-move frequency that is
 * enough to drop frames on a phone, so coalesce to one write per frame.
 */
let pendingHex: string | null = null;
let rafId = 0;

export function scheduleThemeColor(hex: string): void {
  if (typeof window === "undefined") return applyThemeColor(hex);
  pendingHex = hex;
  if (rafId) return;
  rafId = window.requestAnimationFrame(() => {
    rafId = 0;
    if (pendingHex) applyThemeColor(pendingHex);
    pendingHex = null;
  });
}

export function persistThemeColor(hex: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, hex);
  } catch {
    // storage unavailable — theme just won't persist across reloads
  }
}

/**
 * localStorage.setItem is synchronous and hits disk. Called once per drag tick it
 * is a visible source of jank, and only the value the user lands on matters, so
 * write on a trailing edge instead.
 */
let persistTimer: ReturnType<typeof setTimeout> | undefined;

export function persistThemeColorDebounced(hex: string, delayMs = 220): void {
  if (typeof window === "undefined") return;
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => persistThemeColor(hex), delayMs);
}

export function readStoredThemeColor(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return raw && HEX_RE.test(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function broadcastThemeChange(
  hex: string,
  source: ThemeSource,
  committed: boolean
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ThemeChangeDetail>(THEME_CHANGE_EVENT, {
      detail: { hex, source, committed },
    })
  );
}

/** Commit a color everywhere: paint it, remember it, tell everyone. */
export function setThemeColor(hex: string, source: ThemeSource = "system"): void {
  applyThemeColor(hex);
  persistThemeColor(hex);
  broadcastThemeChange(hex, source, true);
}

/** Drag-time variant: paints every frame, but defers the disk write. */
export function previewThemeColor(hex: string, source: ThemeSource = "panel"): void {
  scheduleThemeColor(hex);
  persistThemeColorDebounced(hex);
  // committed:false — this fires at pointer frequency.
  broadcastThemeChange(hex, source, false);
}

export function readStoredThemeMode(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(THEME_MODE_STORAGE_KEY);
    return raw === "retro" || raw === "mono" ? raw : null;
  } catch {
    return null;
  }
}

/**
 * Same resolution the pre-hydration script uses: an explicit stored choice
 * wins; a stored custom phosphor from before modes existed means the visitor
 * had picked a color, so they get mono rather than having their choice
 * repainted; everyone else gets the retro default.
 */
export function resolveThemeMode(): ThemeMode {
  return readStoredThemeMode() ?? (readStoredThemeColor() ? "mono" : DEFAULT_THEME_MODE);
}

export function readStoredRetroTemplate(): RetroTemplateId | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(RETRO_TEMPLATE_STORAGE_KEY);
    return isRetroTemplateId(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function resolveRetroTemplate(): RetroTemplateId {
  return readStoredRetroTemplate() ?? DEFAULT_RETRO_TEMPLATE;
}

export function applyThemeMode(mode: ThemeMode, template?: RetroTemplateId): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.mode = mode;
  // Always stamped, even in mono: the attribute is inert there (no stylesheet
  // rule matches without data-mode="retro"), and keeping it means flipping back
  // to retro doesn't have to re-read storage to know which palette to restore.
  root.dataset.retro = template ?? resolveRetroTemplate();

  const style = root.style;
  if (mode === "retro") {
    // The retro palette is stylesheet-driven; inline properties left over from
    // mono (or from `party`) would outrank it, so clear them.
    style.removeProperty("--color-primary");
    style.removeProperty("--color-fg");
    style.removeProperty("--color-accent");
  } else {
    applyThemeColor(readStoredThemeColor() ?? DEFAULT_PRIMARY_HEX);
  }
}

function broadcastMode(mode: ThemeMode, template: RetroTemplateId): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<{ mode: ThemeMode; template: RetroTemplateId }>(
      THEME_MODE_CHANGE_EVENT,
      { detail: { mode, template } }
    )
  );
}

/** Commit a mode everywhere: paint it, remember it, tell everyone. */
export function setThemeMode(mode: ThemeMode): void {
  const template = resolveRetroTemplate();
  applyThemeMode(mode, template);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_MODE_STORAGE_KEY, mode);
  } catch {
    // storage unavailable — the mode just won't persist across reloads
  }
  broadcastMode(mode, template);
}

/**
 * Pick a retro palette. Implies retro mode — choosing a palette while in mono
 * and staying in mono would be a control that visibly does nothing, which is
 * the same reasoning that makes picking a phosphor colour imply mono.
 */
export function setRetroTemplate(template: RetroTemplateId): void {
  applyThemeMode("retro", template);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RETRO_TEMPLATE_STORAGE_KEY, template);
    window.localStorage.setItem(THEME_MODE_STORAGE_KEY, "retro");
  } catch {
    // storage unavailable — the choice just won't persist across reloads
  }
  broadcastMode("retro", template);
}

export function readCrtEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(CRT_STORAGE_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setCrtEnabled(enabled: boolean): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.crt = enabled ? "on" : "off";
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CRT_STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // ignore
  }
}

// Dependency-free literal: runs as a raw <script> before hydration, so it can't
// import anything. Only replays already-validated storage — no guardrail logic.
// Mode resolution mirrors resolveThemeMode(): explicit choice > legacy custom
// color (implies mono) > retro default. The stored hex is only painted in mono;
// in retro the stylesheet palette must win, so no inline properties are set.
export const THEME_INIT_SCRIPT = `(function(){try{
var d=document.documentElement;
var m=localStorage.getItem(${JSON.stringify(THEME_MODE_STORAGE_KEY)});
var v=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
var t=localStorage.getItem(${JSON.stringify(RETRO_TEMPLATE_STORAGE_KEY)});
var ok=v&&/^#[0-9a-f]{6}$/i.test(v);
if(m!=="retro"&&m!=="mono"){m=ok?"mono":"retro";}
d.dataset.mode=m;
d.dataset.retro=${JSON.stringify(RETRO_TEMPLATE_IDS)}.indexOf(t)>=0?t:${JSON.stringify(DEFAULT_RETRO_TEMPLATE)};
if(m==="mono"&&ok){
var s=d.style;
s.setProperty("--color-primary",v);
s.setProperty("--color-fg",v);
s.setProperty("--color-accent",v);
}
if(localStorage.getItem(${JSON.stringify(CRT_STORAGE_KEY)})==="0"){
d.dataset.crt="off";
}
}catch(e){}})();`;
