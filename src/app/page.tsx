import Link from "next/link";
import { Typewriter } from "@/components/ui/typewriter";
import { TerminalWindow } from "@/components/ui/terminal-window";
import { BracketLink } from "@/components/ui/bracket-button";
import { SkillGroups } from "@/components/ui/skill-groups";
import { SectionLabel } from "@/components/ui/section-label";
import { Reveal } from "@/components/ui/reveal";
import { NeofetchPanel } from "@/components/ui/neofetch-panel";
import { CommandShell } from "@/components/command-shell";
import { HeroLogo } from "@/components/hero-logo";
import { ProjectCard } from "@/components/project-card";
import { PublicationCard } from "@/components/publication-card";
import { FocusTags } from "@/components/focus-tags";
import { bio, projects, publications, skillGroups } from "@/lib/data";
import { changelog } from "@/lib/changelog";

export default function Home() {
  const featured = projects.filter((p) => p.status !== "err").slice(0, 3);
  const topSkillGroups = skillGroups.slice(0, 3);
  const topPublications = publications.slice(0, 2);

  return (
    <div className="flex flex-col gap-16">
      <section>
        <Reveal trigger="mount" staggerMs={120}>
          <HeroLogo />

          <p className="mt-3 text-primary text-glow text-base sm:text-lg">
            <Typewriter
              text={`> ${bio.role.toLowerCase()} // shipping physics-informed ML and multi-agent systems`}
              startDelay={1900}
            />
          </p>

          <p className="mt-5 max-w-2xl text-fg/70 text-sm sm:text-base leading-relaxed">
            {bio.summary}
          </p>

          <FocusTags tags={bio.focus} />

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
        <Reveal>
          <SkillGroups groups={topSkillGroups} />
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
            <ProjectCard key={project.slug} project={project} />
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

      <section
        id="section-publications"
        className="scroll-mt-24"
        aria-labelledby="publications-heading"
      >
        <SectionLabel index="05" label="Publications" />
        <Reveal className="grid gap-5 sm:grid-cols-2" staggerMs={90}>
          {topPublications.map((pub) => (
            <PublicationCard key={pub.id} publication={pub} />
          ))}
        </Reveal>
        <div className="mt-4">
          <Link
            href="/publications"
            className="text-sm text-fg/50 hover:text-primary transition-colors"
          >
            cat publications.bib -&gt;
          </Link>
        </div>
      </section>

      <section id="section-changelog" className="scroll-mt-24" aria-labelledby="changelog-heading">
        <SectionLabel index="06" label="Changelog" />
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
