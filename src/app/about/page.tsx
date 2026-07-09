import type { Metadata } from "next";
import { TerminalWindow } from "@/components/ui/terminal-window";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SectionLabel } from "@/components/ui/section-label";
import { bio, experience, skills } from "@/lib/data";

export const metadata: Metadata = {
  title: "whoami — gaurav@portfolio:~$",
};

export default function AboutPage() {
  const education = experience.find((e) => e.org === "University");

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
          </dl>
        </TerminalWindow>
      </section>

      <section aria-labelledby="skills-heading">
        <SectionLabel index="01" label="Skills" />
        <div className="grid gap-5 sm:grid-cols-2">
          {skills.map((skill) => (
            <ProgressBar key={skill.label} label={skill.label} value={skill.value} />
          ))}
        </div>
      </section>

      {education && (
        <section aria-labelledby="education-heading">
          <SectionLabel index="02" label="Education" />
          <TerminalWindow title={education.org} meta={education.period}>
            <p className="text-sm text-primary">{education.role}</p>
            <p className="mt-2 text-sm text-fg/70">{education.summary}</p>
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
          </TerminalWindow>
        </section>
      )}
    </div>
  );
}
