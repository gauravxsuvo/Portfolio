"use client";

import { useEffect, useState } from "react";
import { bio, projects, skills } from "@/lib/data";

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
  const topLanguages = skills
    .slice(0, 3)
    .map((s) => s.label)
    .join(", ");

  const rows: [string, string][] = [
    ["os", "SuvoOS (portfolio edition)"],
    ["host", "gauravxsuvo.dev"],
    ["shell", "gsh 1.0 [react]"],
    ["resolution", "1920x1080 @ 60Hz (crt)"],
    ["theme", "terminal-green [phosphor]"],
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
        <div aria-hidden="true" className="mt-3 flex gap-1.5">
          {SWATCHES.map((s) => (
            <span
              key={s.label}
              className={`inline-block h-3 w-6 ${s.className}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
