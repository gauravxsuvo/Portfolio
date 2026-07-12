import type { Metadata } from "next";
import { TerminalWindow } from "@/components/ui/terminal-window";
import { SkillGroups } from "@/components/ui/skill-groups";
import { SectionLabel } from "@/components/ui/section-label";
import { bio, education, skillGroups } from "@/lib/data";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "whoami",
  description: `${bio.summary.slice(0, 150)}…`,
  path: "/about",
});

export default function AboutPage() {
  return (
    <div className="flex flex-col gap-12">
      <section>
        <SectionLabel index="00" label="whoami" />
        <TerminalWindow title="about.txt" meta="R/O">
          <p className="text-sm sm:text-base leading-relaxed text-fg/80">
            {bio.summary}
          </p>
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
                  href="https://orcid.org/0009-0009-0810-5513"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-4 decoration-border hover:text-glow"
                >
                  0009-0009-0810-5513
                </a>
              </dd>
            </div>
          </dl>
        </TerminalWindow>
      </section>

      <section aria-labelledby="skills-heading">
        <SectionLabel index="01" label="Skills" />
        <SkillGroups groups={skillGroups} />
      </section>

      <section aria-labelledby="education-heading">
        <SectionLabel index="02" label="Education" />
        <TerminalWindow title={education.school} meta={education.period}>
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
