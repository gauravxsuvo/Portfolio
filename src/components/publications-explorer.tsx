"use client";

import { useMemo, useState } from "react";
import { PromptInput } from "@/components/ui/prompt-input";
import { PublicationCard } from "@/components/publication-card";
import { useFilterTracking } from "@/hooks/use-filter-tracking";
import type { Publication } from "@/lib/data";

export function PublicationsExplorer({ publications }: { publications: Publication[] }) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const types = useMemo(
    () => Array.from(new Set(publications.map((p) => p.type))),
    [publications]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return publications.filter((p) => {
      if (typeFilter && p.type !== typeFilter) return false;
      if (!q) return true;
      return [p.title, p.venue, ...p.authors, ...(p.tags ?? [])].some((field) =>
        field.toLowerCase().includes(q)
      );
    });
  }, [publications, query, typeFilter]);

  // Reports the settled term only — never a keystroke. See the hook for why.
  useFilterTracking("publications", query, filtered.length);

  return (
    <div className="flex flex-col gap-6">
      <PromptInput
        promptLabel="guest@site"
        path="~/publications$"
        placeholder="grep --author singh  (filter by title, author, venue, or tag)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Filter publications by title, author, venue, or tag"
      />

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => setTypeFilter(null)}
          className={`tap-target border px-2 py-1 transition-colors ${
            typeFilter === null
              ? "border-primary text-primary"
              : "border-border text-fg/50 hover:text-primary hover:border-primary"
          }`}
        >
          ALL
        </button>
        {types.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setTypeFilter((t) => (t === type ? null : type))}
            className={`tap-target border px-2 py-1 uppercase transition-colors ${
              typeFilter === type
                ? "border-primary text-primary"
                : "border-border text-fg/50 hover:text-primary hover:border-primary"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <p className="text-xs text-fg/40" aria-live="polite">
        {filtered.length} result{filtered.length === 1 ? "" : "s"}
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        {filtered.map((publication) => (
          <PublicationCard
            key={publication.id}
            publication={publication}
            onTagClick={(tag) => setQuery(tag)}
          />
        ))}

        {filtered.length === 0 && (
          <p className="text-sm text-error sm:col-span-2">
            [ERR] no publications matched query &quot;{query}&quot;
          </p>
        )}
      </div>
    </div>
  );
}
