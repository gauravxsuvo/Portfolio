import type { Metadata } from "next";
import { SectionLabel } from "@/components/ui/section-label";
import { PublicationsExplorer } from "@/components/publications-explorer";
import { publications } from "@/lib/data";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "cat publications.bib",
  description: "Research publications and preprints.",
  path: "/publications",
});

export default function PublicationsPage() {
  return (
    <div>
      <SectionLabel index="06" label="Research & Publications" />
      <PublicationsExplorer publications={publications} />
    </div>
  );
}
