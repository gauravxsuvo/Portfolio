import { DEFAULT_PRIMARY_HEX, normalizeHex } from "./color";

export const THEME_STORAGE_KEY = "suvo:theme-primary";
export const CRT_STORAGE_KEY = "suvo:crt-enabled";
export const THEME_CHANGE_EVENT = "suvo:theme-change";
export const OPEN_THEME_PANEL_EVENT = "suvo:open-theme-panel";

const HEX_RE = /^#[0-9a-f]{6}$/i;

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

export function persistThemeColor(hex: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, hex);
  } catch {
    // storage unavailable — theme just won't persist across reloads
  }
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

export function broadcastThemeChange(hex: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: hex }));
}

export function setThemeColor(hex: string): void {
  applyThemeColor(hex);
  persistThemeColor(hex);
  broadcastThemeChange(hex);
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
