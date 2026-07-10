import Link from "next/link";
import { Typewriter } from "@/components/ui/typewriter";
import { TerminalWindow } from "@/components/ui/terminal-window";
import { BracketLink } from "@/components/ui/bracket-button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { SectionLabel } from "@/components/ui/section-label";
import { Reveal } from "@/components/ui/reveal";
import { NeofetchPanel } from "@/components/ui/neofetch-panel";
import { CommandShell } from "@/components/command-shell";
import { HeroLogo } from "@/components/hero-logo";
import { bio, projects, skills } from "@/lib/data";
import { changelog } from "@/lib/changelog";

export default function Home() {
  const featured = projects.filter((p) => p.status !== "err").slice(0, 3);
  const topSkills = skills.slice(0, 4);

  return (
    <div className="flex flex-col gap-16">
      <section>
        <Reveal trigger="mount" staggerMs={120}>
          <HeroLogo />

          <h1 className="glitch-hover text-2xl sm:text-3xl font-bold tracking-wide text-fg">
            {bio.name.toUpperCase()}
          </h1>

          <p className="mt-3 text-primary text-glow text-base sm:text-lg">
            <Typewriter
              text={`> ${bio.role.toLowerCase()} // building systems that don't page anyone at 3am`}
              startDelay={350}
            />
          </p>

          <p className="mt-5 max-w-2xl text-fg/70 text-sm sm:text-base leading-relaxed">
            {bio.summary}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {bio.focus.map((tag) => (
              <span
                key={tag}
                className="border border-border px-2 py-0.5 text-xs text-fg/60"
              >
                #{tag.replace(/\s+/g, "-")}
              </span>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <BracketLink href="/projects">VIEW PROJECTS</BracketLink>
            <BracketLink href="/contact" variant="secondary">
              GET IN TOUCH
            </BracketLink>
          </div>
        </Reveal>
      </section>

      <section id="section-shell" className="scroll-mt-24" aria-labelledby="shell-heading">
        <SectionLabel index="01" label="Try the shell" />
        <CommandShell />
      </section>

      <section id="section-skills" className="scroll-mt-24" aria-labelledby="skills-heading">
        <SectionLabel index="02" label="Core Skills" />
        <Reveal className="grid gap-5 sm:grid-cols-2" staggerMs={80}>
          {topSkills.map((skill) => (
            <ProgressBar key={skill.label} label={skill.label} value={skill.value} />
          ))}
        </Reveal>
        <div className="mt-4">
          <Link
            href="/about"
            className="text-sm text-fg/50 hover:text-primary transition-colors"
          >
            cat about.txt --full-skill-list -&gt;
          </Link>
        </div>
      </section>

      <section id="section-projects" className="scroll-mt-24" aria-labelledby="projects-heading">
        <SectionLabel index="03" label="Featured Projects" />
        <Reveal className="grid gap-5 sm:grid-cols-2" staggerMs={90}>
          {featured.map((project) => (
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
                className="mt-4 inline-block text-sm text-primary hover:text-glow underline underline-offset-4 decoration-border"
              >
                read more -&gt;
              </Link>
            </TerminalWindow>
          ))}
        </Reveal>
        <div className="mt-4">
          <Link
            href="/projects"
            className="text-sm text-fg/50 hover:text-primary transition-colors"
          >
            ls -la ~/projects -&gt;
          </Link>
        </div>
      </section>

      <section id="section-status" className="scroll-mt-24" aria-labelledby="neofetch-heading">
        <SectionLabel index="04" label="System Status" />
        <Reveal>
          <TerminalWindow title="neofetch" meta="R/O">
            <NeofetchPanel />
          </TerminalWindow>
        </Reveal>
      </section>

      <section id="section-changelog" className="scroll-mt-24" aria-labelledby="changelog-heading">
        <SectionLabel index="05" label="Changelog" />
        <Reveal>
          <TerminalWindow
            title="git log --oneline"
            meta={`${changelog.length} commits`}
          >
            <ul className="flex flex-col gap-1.5 text-sm">
              {changelog.map((entry) => (
                <li
                  key={entry.hash}
                  className="flex flex-wrap items-baseline gap-2 text-fg/70"
                >
                  <span className="text-secondary">{entry.hash}</span>
                  <span className="text-xs text-fg/40">{entry.date}</span>
                  <span>{entry.message}</span>
                </li>
              ))}
            </ul>
          </TerminalWindow>
        </Reveal>
      </section>
    </div>
  );
}
