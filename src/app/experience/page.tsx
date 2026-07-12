import type { Metadata } from "next";
import { SectionLabel } from "@/components/ui/section-label";
import { ExperienceCard } from "@/components/experience-card";
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
          <ExperienceCard key={`${entry.org}-${entry.role}`} entry={entry} />
        ))}
      </div>
    </div>
  );
}
