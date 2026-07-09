import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TerminalWindow } from "@/components/ui/terminal-window";
import { BracketLink } from "@/components/ui/bracket-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { projects } from "@/lib/data";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);
  return { title: project ? `${project.name} — gaurav@portfolio:~$` : "not found" };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);

  if (!project) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/projects"
        className="text-sm text-fg/50 hover:text-primary transition-colors w-fit"
      >
        &lt;- cd ..
      </Link>

      <TerminalWindow title={project.name} meta={project.year}>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={project.status} />
          <p className="text-sm text-fg/70">{project.tagline}</p>
        </div>

        <p className="mt-5 text-sm sm:text-base leading-relaxed text-fg/80">
          {project.description}
        </p>

        <div className="mt-5">
          <p className="text-xs text-fg/40 mb-2">stack:</p>
          <div className="flex flex-wrap gap-1.5">
            {project.stack.map((tech) => (
              <span key={tech} className="text-xs text-secondary">
                [{tech}]
              </span>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {project.repoUrl && (
            <BracketLink href={project.repoUrl} external>
              SOURCE
            </BracketLink>
          )}
          {project.liveUrl && (
            <BracketLink href={project.liveUrl} external variant="secondary">
              LIVE DEMO
            </BracketLink>
          )}
        </div>
      </TerminalWindow>
    </div>
  );
}
