"use client";

import { useState } from "react";
import { TerminalWindow } from "@/components/ui/terminal-window";
import { CopyButton } from "@/components/copy-button";
import type { Publication } from "@/lib/data";

const STATUS_MAP: Record<Publication["status"], { label: string; className: string }> = {
  published: { label: "PUBLISHED", className: "text-primary border-primary" },
  preprint: { label: "PREPRINT", className: "text-secondary border-secondary" },
  "under-review": { label: "UNDER REVIEW", className: "text-fg/60 border-border" },
};

function buildCitation(pub: Publication): string {
  return `${pub.authors.join(", ")} (${pub.year}). ${pub.title}. ${pub.venue}.`;
}

export function PublicationCard({
  publication,
  onTagClick,
}: {
  publication: Publication;
  onTagClick?: (tag: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = STATUS_MAP[publication.status];
  const links = publication.links ?? {};
  const linkEntries = Object.entries(links).filter(([, href]) => href);

  return (
    <TerminalWindow
      title={publication.title}
      meta={publication.year}
      className="trace-box h-full"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-fg/70">{publication.authors.join(", ")}</p>
        <span
          className={`inline-block border px-1.5 py-0.5 text-[10px] leading-none tracking-widest whitespace-nowrap ${status.className}`}
        >
          [{status.label}]
        </span>
      </div>
      <p className="mt-1 text-xs text-fg/50">{publication.venue}</p>

      {publication.tags && publication.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {publication.tags.map((tag) =>
            onTagClick ? (
              <button
                key={tag}
                type="button"
                onClick={() => onTagClick(tag)}
                className="tap-target-sm text-xs text-secondary hover:text-primary hover:underline underline-offset-2"
              >
                [{tag}]
              </button>
            ) : (
              <span key={tag} className="text-xs text-secondary">
                [{tag}]
              </span>
            )
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="tap-target mt-3 text-sm text-primary hover:text-glow"
      >
        {expanded ? "hide abstract [-]" : "show abstract [+]"}
      </button>
      {expanded && (
        <p className="mt-2 text-sm leading-relaxed text-fg/70">{publication.abstract}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <CopyButton text={buildCitation(publication)} label="COPY CITATION" copiedLabel="COPIED" />
        {linkEntries.map(([kind, href]) => (
          <a
            key={kind}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="tap-target border border-border px-2 py-0.5 text-[11px] uppercase tracking-wide text-fg/60 hover:text-primary hover:border-primary transition-colors"
          >
            [{kind}]
          </a>
        ))}
      </div>
    </TerminalWindow>
  );
}
