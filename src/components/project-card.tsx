import Link from "next/link";
import { TerminalWindow } from "@/components/ui/terminal-window";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Project } from "@/lib/data";

export function ProjectCard({
  project,
  onTagClick,
}: {
  project: Project;
  onTagClick?: (tag: string) => void;
}) {
  return (
    <TerminalWindow
      title={project.name}
      meta={project.year}
      className="trace-box group h-full"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-fg/70">{project.tagline}</p>
        <StatusBadge status={project.status} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {project.stack.map((tech) =>
          onTagClick ? (
            <button
              key={tech}
              type="button"
              onClick={() => onTagClick(tech)}
              className="text-xs text-secondary underline-offset-2 hover:text-primary hover:underline"
            >
              [{tech}]
            </button>
          ) : (
            <span key={tech} className="text-xs text-secondary">
              [{tech}]
            </span>
          )
        )}
      </div>
      <Link
        href={`/projects/${project.slug}`}
        className="link-wipe mt-4 inline-flex items-center gap-1 text-sm text-primary hover:text-glow"
      >
        read more
        <span
          aria-hidden="true"
          className="inline-block transition-transform duration-200 group-hover:translate-x-1"
        >
          -&gt;
        </span>
      </Link>
    </TerminalWindow>
  );
}
