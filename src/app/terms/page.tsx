import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SectionLabel } from "@/components/ui/section-label";
import { TerminalWindow } from "@/components/ui/terminal-window";
import { bio } from "@/lib/data";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "cat terms.txt",
  description: "Terms for using this site and its code.",
  path: "/terms",
});

function H3({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-secondary">
      {children}
    </h3>
  );
}

function Section({ children }: { children: ReactNode }) {
  return <section className="mb-6 last:mb-0">{children}</section>;
}

export default function TermsPage() {
  return (
    <div>
      <SectionLabel index="00" label="Terms" />
      <TerminalWindow title="terms.txt" meta="R/O" className="trace-box">
        <div className="prose-measure flex flex-col text-sm text-fg/70">
          <p className="mb-6 text-fg">
            This is a personal portfolio, not a product. There&apos;s no account to make and
            nothing to buy, so these terms are short.
          </p>

          <Section>
            <H3>This site&apos;s code</H3>
            <p>
              The source for this site is MIT licensed, in the{" "}
              <a
                href={bio.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4 decoration-border hover:text-glow"
              >
                repository it&apos;s built from
              </a>
              . Use it under the terms of that license. The projects it links to are separate
              repositories with their own licensing, stated in each one.
            </p>
          </Section>

          <Section>
            <H3>What&apos;s on this site</H3>
            <p>
              The bio, project write-ups, and publication entries are my own account of my
              own work. I&apos;ve tried to describe them accurately, including where something
              underperformed, not just the best-case numbers. If you spot something wrong,
              email me and I&apos;ll fix it.
            </p>
          </Section>

          <Section>
            <H3>Links to other places</H3>
            <p>
              GitHub repos, live project demos, LinkedIn, ORCID, and the Zenodo DOI are all
              third-party sites I don&apos;t control and can&apos;t vouch for the uptime or
              content of. A live demo linked from a project page may go offline or change
              without notice.
            </p>
          </Section>

          <Section>
            <H3>No warranty</H3>
            <p>
              This site and anything it links to is provided as is, with no guarantee
              it&apos;ll be available, accurate, or error-free. I&apos;m not liable for
              anything that comes from using it.
            </p>
          </Section>

          <Section>
            <H3>Changes</H3>
            <p>These terms can change as the site does. Last updated: 2026-07-16.</p>
          </Section>

          <Section>
            <H3>Questions</H3>
            <p>
              Email me at{" "}
              <a
                href={`mailto:${bio.email}`}
                className="text-primary underline underline-offset-4 decoration-border hover:text-glow"
              >
                {bio.email}
              </a>
              .
            </p>
          </Section>
        </div>
      </TerminalWindow>
    </div>
  );
}
