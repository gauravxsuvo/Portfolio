import type { Metadata } from "next";
import { SectionLabel } from "@/components/ui/section-label";
import { TerminalWindow } from "@/components/ui/terminal-window";
import { BracketLink } from "@/components/ui/bracket-button";
import { CopyButton } from "@/components/copy-button";
import { pageMetadata } from "@/lib/site";
import { bio } from "@/lib/data";

export const metadata: Metadata = pageMetadata({
  title: "cat contact.txt",
  description: "Get in touch — email, GitHub, LinkedIn.",
  path: "/contact",
});

const EMAIL = bio.email;

const CHANNELS = [
  {
    label: "EMAIL",
    value: EMAIL,
    href: `mailto:${EMAIL}`,
    copyValue: EMAIL,
  },
  {
    label: "GITHUB",
    value: bio.github.replace("https://", ""),
    href: bio.github,
    external: true,
    copyValue: bio.github,
  },
  {
    label: "LINKEDIN",
    value: bio.linkedin.replace("https://www.", ""),
    href: bio.linkedin,
    external: true,
    copyValue: bio.linkedin,
  },
  {
    label: "WEBSITE",
    value: bio.website.replace("https://", ""),
    href: bio.website,
    external: true,
    copyValue: bio.website,
  },
  {
    label: "ORCID",
    value: bio.orcid,
    href: `https://orcid.org/${bio.orcid}`,
    external: true,
    copyValue: `https://orcid.org/${bio.orcid}`,
  },
];

export default function ContactPage() {
  return (
    <div>
      <SectionLabel index="05" label="Contact" />
      <TerminalWindow title="contact.txt" meta="R/O">
        <p className="text-sm text-fg/70">
          Open to new roles, research collaborations, and interesting problems.
          Reach out on any of the channels below — email is fastest.
        </p>

        <dl className="mt-6 flex flex-col gap-3">
          {CHANNELS.map((c) => (
            <div
              key={c.label}
              className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3"
            >
              <dt className="text-xs text-fg/40 w-24 shrink-0">[{c.label}]</dt>
              <dd className="flex flex-wrap items-center gap-2">
                <a
                  href={c.href}
                  target={c.external ? "_blank" : undefined}
                  rel={c.external ? "noopener noreferrer" : undefined}
                  className="text-primary underline underline-offset-4 decoration-border hover:text-glow break-all"
                >
                  {c.value}
                </a>
                <CopyButton text={c.copyValue} />
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-8 flex flex-wrap gap-3">
          <BracketLink href={`mailto:${EMAIL}`}>SEND EMAIL</BracketLink>
          <BracketLink href="/projects" variant="ghost">
            BACK TO PROJECTS
          </BracketLink>
        </div>
      </TerminalWindow>
    </div>
  );
}
