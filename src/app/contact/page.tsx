import type { Metadata } from "next";
import { SectionLabel } from "@/components/ui/section-label";
import { TerminalWindow } from "@/components/ui/terminal-window";
import { BracketLink } from "@/components/ui/bracket-button";

export const metadata: Metadata = {
  title: "cat contact.txt — gaurav@portfolio:~$",
};

const CHANNELS = [
  {
    label: "EMAIL",
    value: "gauravrajsinghoppo@gmail.com",
    href: "mailto:gauravrajsinghoppo@gmail.com",
  },
  {
    label: "GITHUB",
    value: "github.com/",
    href: "https://github.com/",
    external: true,
  },
  {
    label: "LINKEDIN",
    value: "linkedin.com/in/",
    href: "https://www.linkedin.com/",
    external: true,
  },
];

export default function ContactPage() {
  return (
    <div>
      <SectionLabel index="05" label="Contact" />
      <TerminalWindow title="contact.txt" meta="R/O">
        <p className="text-sm text-fg/70">
          Open to new roles and interesting problems. Reach out on any of the
          channels below — email is fastest.
        </p>

        <dl className="mt-6 flex flex-col gap-3">
          {CHANNELS.map((c) => (
            <div
              key={c.label}
              className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3"
            >
              <dt className="text-xs text-fg/40 w-24 shrink-0">[{c.label}]</dt>
              <dd>
                <a
                  href={c.href}
                  target={c.external ? "_blank" : undefined}
                  rel={c.external ? "noopener noreferrer" : undefined}
                  className="text-primary underline underline-offset-4 decoration-border hover:text-glow break-all"
                >
                  {c.value}
                </a>
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-8 flex flex-wrap gap-3">
          <BracketLink href="mailto:gauravrajsinghoppo@gmail.com">
            SEND EMAIL
          </BracketLink>
          <BracketLink href="/projects" variant="ghost">
            BACK TO PROJECTS
          </BracketLink>
        </div>
      </TerminalWindow>
    </div>
  );
}
