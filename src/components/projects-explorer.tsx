"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PromptInput } from "@/components/ui/prompt-input";
import { TerminalWindow } from "@/components/ui/terminal-window";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Project } from "@/lib/data";

export function ProjectsExplorer({ projects }: { projects: Project[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) =>
      [p.name, p.tagline, ...p.stack].some((field) =>
        field.toLowerCase().includes(q)
      )
    );
  }, [projects, query]);

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
      <p className="text-xs text-fg/40" aria-live="polite">
        {filtered.length} result{filtered.length === 1 ? "" : "s"}
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        {filtered.map((project) => (
          <TerminalWindow key={project.slug} title={project.name} meta={project.year}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-fg/70">{project.tagline}</p>
              <StatusBadge status={project.status} />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {project.stack.map((tech) => (
                <span key={tech} className="text-xs text-secondary">
                  [{tech}]
                </span>
              ))}
            </div>
            <Link
              href={`/projects/${project.slug}`}
              className="mt-4 inline-block text-sm text-primary underline underline-offset-4 decoration-border"
            >
              read more -&gt;
            </Link>
          </TerminalWindow>
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
