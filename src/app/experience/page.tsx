import type { Metadata } from "next";
import { SectionLabel } from "@/components/ui/section-label";
import { ExperienceCard } from "@/components/experience-card";
import { experience } from "@/lib/data";
import { pageMetadata } from "@/lib/site";

// Title, description and share card all come from this path's entry in
// lib/page-cards.ts, so they cannot drift apart.
export const metadata: Metadata = pageMetadata({ path: "/experience" });

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
