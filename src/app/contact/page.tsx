import type { Metadata } from "next";
import { SectionLabel } from "@/components/ui/section-label";
import { TerminalWindow } from "@/components/ui/terminal-window";
import { BracketLink } from "@/components/ui/bracket-button";
import { CopyButton } from "@/components/copy-button";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "cat contact.txt",
  description: "Get in touch — email, GitHub, LinkedIn.",
  path: "/contact",
});

const EMAIL = "workwithggaurav@gmail.com";

const CHANNELS = [
  {
    label: "EMAIL",
    value: EMAIL,
    href: `mailto:${EMAIL}`,
    copyValue: EMAIL,
  },
  {
    label: "GITHUB",
    value: "github.com/gauravxsuvo",
    href: "https://github.com/gauravxsuvo",
    external: true,
    copyValue: "https://github.com/gauravxsuvo",
  },
  {
    label: "LINKEDIN",
    value: "linkedin.com/in/gauravxsuvo",
    href: "https://www.linkedin.com/in/gauravxsuvo",
    external: true,
    copyValue: "https://www.linkedin.com/in/gauravxsuvo",
  },
  {
    label: "WEBSITE",
    value: "cinexg.com",
    href: "https://cinexg.com",
    external: true,
    copyValue: "https://cinexg.com",
  },
  {
    label: "ORCID",
    value: "0009-0009-0810-5513",
    href: "https://orcid.org/0009-0009-0810-5513",
    external: true,
    copyValue: "https://orcid.org/0009-0009-0810-5513",
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
