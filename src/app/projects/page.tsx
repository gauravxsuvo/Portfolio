import type { Metadata } from "next";
import { SectionLabel } from "@/components/ui/section-label";
import { ProjectsExplorer } from "@/components/projects-explorer";
import { projects } from "@/lib/data";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "ls -la ~/projects",
  description: "Machine learning, geospatial, and full-stack projects.",
  path: "/projects",
});

export default function ProjectsPage() {
  return (
    <div>
      <SectionLabel index="03" label="Projects" />
      <ProjectsExplorer projects={projects} />
    </div>
  );
}
