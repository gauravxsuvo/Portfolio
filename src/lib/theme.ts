import { DEFAULT_PRIMARY_HEX, normalizeHex } from "./color";

export const THEME_STORAGE_KEY = "suvo:theme-primary";
export const CRT_STORAGE_KEY = "suvo:crt-enabled";
export const THEME_CHANGE_EVENT = "suvo:theme-change";
export const OPEN_THEME_PANEL_EVENT = "suvo:open-theme-panel";

const HEX_RE = /^#[0-9a-f]{6}$/i;

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
export const THEME_INIT_SCRIPT = `(function(){try{
var v=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
if(v&&/^#[0-9a-f]{6}$/i.test(v)){
var s=document.documentElement.style;
s.setProperty("--color-primary",v);
s.setProperty("--color-fg",v);
s.setProperty("--color-accent",v);
}
if(localStorage.getItem(${JSON.stringify(CRT_STORAGE_KEY)})==="0"){
document.documentElement.dataset.crt="off";
}
}catch(e){}})();`;
