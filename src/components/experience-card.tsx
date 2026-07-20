"use client";

import { useState } from "react";
import { TerminalWindow } from "@/components/ui/terminal-window";
import type { ExperienceEntry } from "@/lib/data";

export function ExperienceCard({ entry }: { entry: ExperienceEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <TerminalWindow title={entry.org} meta={entry.period} className="trace-box">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-primary text-glow font-semibold">{entry.role}</p>
        <p className="text-xs text-fg/40">{entry.location}</p>
      </div>
      <p className="mt-2 text-sm text-fg/70">{entry.summary}</p>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="tap-target mt-3 text-sm text-primary hover:text-glow"
      >
        {expanded ? "hide highlights [-]" : "show highlights [+]"}
      </button>
      {expanded && (
        <ul className="mt-2 flex flex-col gap-1.5">
          {entry.highlights.map((h) => (
            <li key={h} className="text-sm text-fg/70">
              <span aria-hidden="true" className="text-primary">
                {"> "}
              </span>
              {h}
            </li>
          ))}
        </ul>
      )}
    </TerminalWindow>
  );
}
