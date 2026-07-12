import type { Metadata } from "next";
import { SectionLabel } from "@/components/ui/section-label";
import { PublicationsExplorer } from "@/components/publications-explorer";
import { publications } from "@/lib/data";

export const metadata: Metadata = {
  title: "cat publications.bib — gaurav@portfolio:~$",
};

export default function PublicationsPage() {
  return (
    <div>
      <SectionLabel index="06" label="Research & Publications" />
      <PublicationsExplorer publications={publications} />
    </div>
  );
}
