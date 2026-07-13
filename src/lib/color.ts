export type HSL = { h: number; s: number; l: number };

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function hslToHex({ h, s, l }: HSL): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 100) / 100;
  const light = clamp(l, 0, 100) / 100;

  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToHsl(hex: string): HSL {
  const [r, g, b] = hexToRgb(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function normalizeHex(input: string): string | null {
  const trimmed = input.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(trimmed)) {
    const [r, g, b] = trimmed.split("");
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  if (/^[0-9a-f]{6}$/i.test(trimmed)) {
    return `#${trimmed}`.toLowerCase();
  }
  return null;
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = normalizeHex(hex) ?? "#33ff00";
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  return [r, g, b];
}

function srgbToLinear(channel: number) {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(srgbToLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexA) + 0.05;
  const lumB = relativeLuminance(hexB) + 0.05;
  return lumA > lumB ? lumA / lumB : lumB / lumA;
}

/**
 * A flat lightness floor isn't enough — luminance is hue-weighted (green reads far
 * brighter than blue at the same L), so this nudges L up against the real WCAG
 * contrast ratio until the color is actually readable on the fixed black bg.
 */
export function ensureReadableAgainstBg(
  hsl: HSL,
  bgHex = "#0a0a0a",
  minRatio = 4.5
): HSL {
  let candidate: HSL = { h: hsl.h, s: clamp(hsl.s, 0, 100), l: clamp(hsl.l, 20, 100) };
  for (let i = 0; i < 12; i++) {
    const hex = hslToHex(candidate);
    if (contrastRatio(hex, bgHex) >= minRatio) break;
    candidate = { ...candidate, l: clamp(candidate.l + 4, 0, 100) };
  }
  return candidate;
}

export const BG_HEX = "#0a0a0a";

/** WCAG bucket for the primary color against the fixed black background. */
export function contrastGrade(hex: string, bgHex = BG_HEX) {
  const ratio = contrastRatio(hex, bgHex);
  const grade = ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : ratio >= 3 ? "AA-LG" : "FAIL";
  return { ratio, grade };
}

export function randomReadableHsl(): HSL {
  return ensureReadableAgainstBg({
    h: Math.floor(Math.random() * 360),
    s: 65 + Math.floor(Math.random() * 35),
    l: 45 + Math.floor(Math.random() * 25),
  });
}

export const DEFAULT_PRIMARY_HEX = "#33ff00";

export const PRESETS: { id: string; label: string; hex: string }[] = [
  { id: "green", label: "Green Phosphor", hex: "#33ff00" },
  { id: "amber", label: "Amber", hex: "#ffc233" },
  { id: "cyan", label: "Cyan", hex: "#33e0ff" },
  { id: "red", label: "Red Alert", hex: "#ff4d4d" },
  { id: "white", label: "Paper White", hex: "#e8e8e8" },
  { id: "purple", label: "Purple Haze", hex: "#c07bff" },
  { id: "magenta", label: "Magenta Burn", hex: "#ff5cc8" },
  { id: "ice", label: "Ice Blue", hex: "#8ab4ff" },
  { id: "lime", label: "Toxic Lime", hex: "#c6ff4d" },
  { id: "sand", label: "Sandstorm", hex: "#e0c391" },
];
