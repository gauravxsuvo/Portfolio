import Link from "next/link";
import { Typewriter } from "@/components/ui/typewriter";
import { TerminalWindow } from "@/components/ui/terminal-window";
import { BracketLink } from "@/components/ui/bracket-button";
import { SkillGroups } from "@/components/ui/skill-groups";
import { SectionLabel } from "@/components/ui/section-label";
import { Reveal } from "@/components/ui/reveal";
import { Magnetic } from "@/components/ui/magnetic";
import { Tilt } from "@/components/ui/tilt";
import { NeofetchPanel } from "@/components/ui/neofetch-panel";
import { LiveStatus } from "@/components/live-status";
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
      <section aria-label="Introduction">
        <Reveal trigger="mount" staggerMs={120}>
          <HeroLogo />

          <p className="mt-3 text-base text-primary text-glow sm:text-lg">
            <Typewriter
              text={`> ${bio.role.toLowerCase()} // shipping physics-informed ML and multi-agent systems`}
              startDelay={1900}
            />
          </p>

          {/* Prose stays narrow even though the column got wider — a 1100px line
              of monospace is not readable. */}
          <p className="prose-measure mt-5 text-sm text-fg/70 sm:text-base">{bio.summary}</p>

          <FocusTags tags={bio.focus} />

          <div className="mt-8 flex flex-wrap gap-3">
            <Magnetic>
              <BracketLink href="/projects">VIEW PROJECTS</BracketLink>
            </Magnetic>
            <Magnetic>
              <BracketLink href="/contact" variant="secondary">
                GET IN TOUCH
              </BracketLink>
            </Magnetic>
          </div>
        </Reveal>
      </section>

      <section
        id="section-shell"
        data-label="try the shell"
        className="scroll-mt-24"
        aria-labelledby="shell-heading"
      >
        <SectionLabel id="shell-heading" index="01" label="Try the shell" />
        <CommandShell />
      </section>

      <section
        id="section-skills"
        data-label="core skills"
        className="scroll-mt-24"
        aria-labelledby="skills-heading"
      >
        <SectionLabel id="skills-heading" index="02" label="Core Skills" />
        <Reveal>
          <SkillGroups groups={topSkillGroups} />
        </Reveal>
        <div className="mt-4">
          <Link href="/about" className="link-wipe text-sm text-fg/50 hover:text-primary">
            cat about.txt --full-skill-list -&gt;
          </Link>
        </div>
      </section>

      <section
        id="section-projects"
        data-label="featured projects"
        className="scroll-mt-24"
        aria-labelledby="projects-heading"
      >
        <SectionLabel id="projects-heading" index="03" label="Featured Projects" />
        <Reveal className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" staggerMs={90}>
          {featured.map((project) => (
            <Tilt key={project.slug}>
              <ProjectCard project={project} />
            </Tilt>
          ))}
        </Reveal>
        <div className="mt-4">
          <Link href="/projects" className="link-wipe text-sm text-fg/50 hover:text-primary">
            ls -la ~/projects -&gt;
          </Link>
        </div>
      </section>

      <section
        id="section-status"
        data-label="system status"
        className="scroll-mt-24"
        aria-labelledby="neofetch-heading"
      >
        <SectionLabel id="neofetch-heading" index="04" label="System Status" />
        <Reveal>
          <TerminalWindow title="neofetch" meta="R/O" className="trace-box">
            <NeofetchPanel />
            <LiveStatus />
          </TerminalWindow>
        </Reveal>
      </section>

      <section
        id="section-publications"
        data-label="publications"
        className="scroll-mt-24"
        aria-labelledby="publications-heading"
      >
        <SectionLabel id="publications-heading" index="05" label="Publications" />
        <Reveal className="grid gap-5 sm:grid-cols-2" staggerMs={90}>
          {topPublications.map((pub) => (
            <Tilt key={pub.id} max={3}>
              <PublicationCard publication={pub} />
            </Tilt>
          ))}
        </Reveal>
        <div className="mt-4">
          <Link href="/publications" className="link-wipe text-sm text-fg/50 hover:text-primary">
            cat publications.bib -&gt;
          </Link>
        </div>
      </section>

      <section
        id="section-changelog"
        data-label="changelog"
        className="scroll-mt-24"
        aria-labelledby="changelog-heading"
      >
        <SectionLabel id="changelog-heading" index="06" label="Changelog" />
        <Reveal>
          <TerminalWindow title="git log --oneline" meta={`${changelog.length} commits`}>
            <ul className="flex flex-col gap-1.5 text-sm">
              {changelog.map((entry) => (
                <li key={entry.hash} className="flex flex-wrap items-baseline gap-2 text-fg/70">
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
