import type { Metadata } from "next";
import { SectionLabel } from "@/components/ui/section-label";
import { ProjectsExplorer } from "@/components/projects-explorer";
import { projects } from "@/lib/data";

export const metadata: Metadata = {
  title: "ls -la ~/projects — gaurav@portfolio:~$",
};

export default function ProjectsPage() {
  return (
    <div>
      <SectionLabel index="03" label="Projects" />
      <ProjectsExplorer projects={projects} />
    </div>
  );
}
