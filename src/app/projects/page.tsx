import type { Metadata } from "next";
import { SectionLabel } from "@/components/ui/section-label";
import { ProjectsExplorer } from "@/components/projects-explorer";
import { projects } from "@/lib/data";
import { pageMetadata } from "@/lib/site";

// Title, description and share card all come from this path's entry in
// lib/page-cards.ts, so they cannot drift apart.
export const metadata: Metadata = pageMetadata({ path: "/projects" });

export default function ProjectsPage() {
  return (
    <div>
      <SectionLabel index="03" label="Projects" />
      <ProjectsExplorer projects={projects} />
    </div>
  );
}
