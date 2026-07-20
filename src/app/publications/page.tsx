import type { Metadata } from "next";
import { SectionLabel } from "@/components/ui/section-label";
import { PublicationsExplorer } from "@/components/publications-explorer";
import { publications } from "@/lib/data";
import { pageMetadata } from "@/lib/site";

// Title, description and share card all come from this path's entry in
// lib/page-cards.ts, so they cannot drift apart.
export const metadata: Metadata = pageMetadata({ path: "/publications" });

export default function PublicationsPage() {
  return (
    <div>
      <SectionLabel index="06" label="Research & Publications" />
      <PublicationsExplorer publications={publications} />
    </div>
  );
}
