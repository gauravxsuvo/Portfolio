"use client";

import { useMemo, useState } from "react";
import { PromptInput } from "@/components/ui/prompt-input";
import { ProjectCard } from "@/components/project-card";
import { useFilterTracking } from "@/hooks/use-filter-tracking";
import type { Project } from "@/lib/data";

const STATUS_ORDER: Record<Project["status"], number> = { live: 0, ok: 1, wip: 2, err: 3 };

export function ProjectsExplorer({ projects }: { projects: Project[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"newest" | "status">("newest");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    // `description` is in scope on purpose: the shell's `grep` searches it, and a
    // filter box sitting on the projects page that quietly searched less than the
    // shell did was the more surprising of the two behaviours. Terms like
    // "Theis" or "LangGraph" only appear in the long copy.
    const matches = q
      ? projects.filter((p) =>
          [p.name, p.tagline, p.description, p.year, ...p.stack].some((field) =>
            field.toLowerCase().includes(q)
          )
        )
      : projects;

    return [...matches].sort((a, b) =>
      sort === "newest"
        ? Number(b.year) - Number(a.year)
        : STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    );
  }, [projects, query, sort]);

  // Reports the settled term only — never a keystroke. See the hook for why.
  useFilterTracking("projects", query, filtered.length);

  return (
    <div className="flex flex-col gap-6">
      <PromptInput
        promptLabel="guest@site"
        path="~/projects$"
        placeholder="grep --tag react  (filter by name or stack)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Filter projects by name or technology"
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <p className="text-fg/40" aria-live="polite">
          {filtered.length} result{filtered.length === 1 ? "" : "s"}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-fg/40">sort:</span>
          {(["newest", "status"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSort(option)}
              className={`tap-target border px-2 py-1 uppercase transition-colors ${
                sort === option
                  ? "border-primary text-primary"
                  : "border-border text-fg/50 hover:text-primary hover:border-primary"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {filtered.map((project) => (
          <ProjectCard key={project.slug} project={project} onTagClick={setQuery} />
        ))}

        {filtered.length === 0 && (
          <p className="text-sm text-error sm:col-span-2">
            [ERR] no projects matched query &quot;{query}&quot;
          </p>
        )}
      </div>
    </div>
  );
}
