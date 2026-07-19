"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { bio, projects, skillGroups } from "@/lib/data";
import { siteHost } from "@/lib/site";
import {
  DEFAULT_THEME_MODE,
  OPEN_THEME_PANEL_EVENT,
  THEME_MODE_CHANGE_EVENT,
  resolveThemeMode,
  type ThemeMode,
} from "@/lib/theme";

const GLYPH = String.raw`┌───────────┐
│ $ _       │
│           │
└───────────┘`;

/**
 * The swatch strip — neofetch's ANSI color bar. In retro mode it shows the
 * actual ANSI accent set; in mono it collapses to the phosphor tokens, which is
 * what "everything derives from one color" looks like as a bar. "primary" is
 * always first: it's the button that opens display settings.
 */
const MONO_SWATCHES = [
  { label: "primary", className: "bg-primary" },
  { label: "secondary", className: "bg-secondary" },
  { label: "border", className: "bg-border" },
  { label: "error", className: "bg-error" },
];

const RETRO_SWATCHES = [
  { label: "primary", className: "bg-primary" },
  { label: "cyan", className: "bg-[var(--color-ansi-cyan)]" },
  { label: "magenta", className: "bg-[var(--color-ansi-magenta)]" },
  { label: "amber", className: "bg-[var(--color-ansi-amber)]" },
  { label: "border", className: "bg-border" },
  { label: "error", className: "bg-error" },
];

/**
 * The display mode as an external store: localStorage is the source of truth
 * and THEME_MODE_CHANGE_EVENT is its change signal. useSyncExternalStore keeps
 * the server render on the default (retro) and swaps to the real value on the
 * client without a setState-in-effect cascade.
 */
function subscribeThemeMode(onChange: () => void) {
  window.addEventListener(THEME_MODE_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(THEME_MODE_CHANGE_EVENT, onChange);
}
const getServerThemeMode = () => DEFAULT_THEME_MODE;

function formatUptime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function useSessionUptime() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      setSeconds(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return seconds;
}

export function NeofetchPanel() {
  const uptime = useSessionUptime();
  const mode: ThemeMode = useSyncExternalStore(
    subscribeThemeMode,
    resolveThemeMode,
    getServerThemeMode
  );

  const topLanguages =
    skillGroups.find((g) => g.category === "Languages")?.items.join(", ") ?? "";

  const rows: [string, string][] = [
    ["os", "SuvoOS (portfolio edition)"],
    // Derived, not hardcoded: this used to read "gauravxsuvo.dev", a domain
    // that was never registered — so the one row in this panel claiming to
    // report the real host was the only fabricated line in it.
    ["host", siteHost],
    ["shell", "gsh 1.0 [react]"],
    ["resolution", "1920x1080 @ 60Hz (crt)"],
    ["theme", mode === "retro" ? "retro [ansi colors]" : "mono [phosphor]"],
    ["cpu", bio.role],
    ["packages", `${projects.length} (portfolio)`],
    ["locale", bio.location],
    ["languages", topLanguages],
    ["uptime", `${formatUptime(uptime)} (this session)`],
  ];

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:gap-8">
      <pre
        aria-hidden="true"
        className="shrink-0 text-xs leading-tight text-primary text-glow"
      >
        {GLYPH}
      </pre>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-primary text-glow">
          guest@gauravxsuvo
        </p>
        <p className="mb-2 text-xs text-fg/30">-----------------------</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs sm:text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-secondary">{k}:</dt>
              <dd className="truncate text-fg/80">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-3 flex gap-1.5">
          {(mode === "retro" ? RETRO_SWATCHES : MONO_SWATCHES).map((s) =>
            s.label === "primary" ? (
              // p-2 -m-2 grows the actual tap target to ~40x28 (clearing the
              // 24px touch-target minimum) without disturbing the visible
              // swatch row, which stays flush with its decorative siblings.
              <button
                key={s.label}
                type="button"
                onClick={() => window.dispatchEvent(new Event(OPEN_THEME_PANEL_EVENT))}
                aria-label="Open display settings to change the phosphor color"
                title="change phosphor color"
                className="-m-2 inline-flex items-center justify-center p-2 transition-transform hover:scale-110"
              >
                <span aria-hidden="true" className={`inline-block h-3 w-6 ${s.className}`} />
              </button>
            ) : (
              <span key={s.label} aria-hidden="true" className={`inline-block h-3 w-6 ${s.className}`} />
            )
          )}
        </div>
      </div>
    </div>
  );
}
