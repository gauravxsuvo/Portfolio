import type { Metadata } from "next";
import { TerminalWindow } from "@/components/ui/terminal-window";
import { SkillGroups } from "@/components/ui/skill-groups";
import { SectionLabel } from "@/components/ui/section-label";
import { bio, education, skillGroups } from "@/lib/data";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "whoami",
  // The whole thing, not a slice: the bio is 181 characters now, and cutting it
  // at 150 truncated mid-word ("...learning Korean and Ja…").
  description: bio.summary,
  path: "/about",
});

export default function AboutPage() {
  return (
    <div className="flex flex-col gap-12">
      <section id="section-whoami" data-label="whoami" className="scroll-mt-24" aria-labelledby="whoami-heading">
        <SectionLabel id="whoami-heading" index="00" label="whoami" />
        <TerminalWindow title="about.txt" meta="R/O" className="trace-box">
          <div className="prose-measure flex flex-col gap-4 text-sm leading-relaxed text-fg/80 sm:text-base">
            {bio.about.map((para) => (
              <p key={para}>{para}</p>
            ))}
          </div>
          <dl className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex gap-2">
              <dt className="text-fg/40">name:</dt>
              <dd className="text-fg">{bio.name}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-fg/40">role:</dt>
              <dd className="text-fg">{bio.role}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-fg/40">location:</dt>
              <dd className="text-fg">{bio.location}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-fg/40">focus:</dt>
              <dd className="text-fg">{bio.focus.join(", ")}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-fg/40">orcid:</dt>
              <dd className="text-fg">
                <a
                  href={`https://orcid.org/${bio.orcid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-4 decoration-border hover:text-glow"
                >
                  {bio.orcid}
                </a>
              </dd>
            </div>
          </dl>
        </TerminalWindow>
      </section>

      <section id="section-skills" data-label="skills" className="scroll-mt-24" aria-labelledby="skills-heading">
        <SectionLabel id="skills-heading" index="01" label="Skills" />
        <SkillGroups groups={skillGroups} />
      </section>

      <section id="section-education" data-label="education" className="scroll-mt-24" aria-labelledby="education-heading">
        <SectionLabel id="education-heading" index="02" label="Education" />
        <TerminalWindow title={education.school} meta={education.period} className="trace-box">
          <p className="text-sm text-primary">{education.degree}</p>
          <p className="mt-2 text-sm text-fg/70">{education.summary}</p>
          {education.highlights.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1.5">
              {education.highlights.map((h) => (
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
      </section>
    </div>
  );
}
