import type { Metadata } from "next";
import { SectionLabel } from "@/components/ui/section-label";
import { TerminalWindow } from "@/components/ui/terminal-window";
import { experience } from "@/lib/data";

export const metadata: Metadata = {
  title: "git log --experience — gaurav@portfolio:~$",
};

export default function ExperiencePage() {
  return (
    <div>
      <SectionLabel index="04" label="Experience" />
      <div className="flex flex-col gap-5">
        {experience.map((entry) => (
          <TerminalWindow
            key={`${entry.org}-${entry.role}`}
            title={entry.org}
            meta={entry.period}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-primary text-glow font-semibold">
                {entry.role}
              </p>
              <p className="text-xs text-fg/40">{entry.location}</p>
            </div>
            <p className="mt-2 text-sm text-fg/70">{entry.summary}</p>
            <ul className="mt-3 flex flex-col gap-1.5">
              {entry.highlights.map((h) => (
                <li key={h} className="text-sm text-fg/70">
                  <span aria-hidden="true" className="text-primary">
                    {"> "}
                  </span>
                  {h}
                </li>
              ))}
            </ul>
          </TerminalWindow>
        ))}
      </div>
    </div>
  );
}
