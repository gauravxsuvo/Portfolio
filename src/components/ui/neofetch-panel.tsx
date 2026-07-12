"use client";

import { useEffect, useState } from "react";
import { bio, projects, skillGroups } from "@/lib/data";
import { OPEN_THEME_PANEL_EVENT } from "@/lib/theme";

const GLYPH = String.raw`┌───────────┐
│ $ _       │
│           │
└───────────┘`;

const SWATCHES = [
  { label: "primary", className: "bg-primary" },
  { label: "secondary", className: "bg-secondary" },
  { label: "border", className: "bg-border" },
  { label: "error", className: "bg-error" },
];

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
  const topLanguages =
    skillGroups.find((g) => g.category === "Languages")?.items.join(", ") ?? "";

  const rows: [string, string][] = [
    ["os", "SuvoOS (portfolio edition)"],
    ["host", "gauravxsuvo.dev"],
    ["shell", "gsh 1.0 [react]"],
    ["resolution", "1920x1080 @ 60Hz (crt)"],
    ["theme", "user-selectable [phosphor]"],
    ["cpu", `${bio.role} (human-grade)`],
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
          {SWATCHES.map((s) =>
            s.label === "primary" ? (
              <button
                key={s.label}
                type="button"
                onClick={() => window.dispatchEvent(new Event(OPEN_THEME_PANEL_EVENT))}
                aria-label="Open display settings to change the phosphor color"
                title="change phosphor color"
                className={`inline-block h-3 w-6 transition-transform hover:scale-110 ${s.className}`}
              />
            ) : (
              <span key={s.label} aria-hidden="true" className={`inline-block h-3 w-6 ${s.className}`} />
            )
          )}
        </div>
      </div>
    </div>
  );
}
