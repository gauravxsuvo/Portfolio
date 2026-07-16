import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SectionLabel } from "@/components/ui/section-label";
import { TerminalWindow } from "@/components/ui/terminal-window";
import { bio } from "@/lib/data";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "cat privacy.txt",
  description: "What this site collects (not much), and why there's no cookie banner.",
  path: "/privacy",
});

/**
 * Every localStorage key the site actually writes, kept here in one place so
 * this list can't quietly drift from what the code does. If a future feature
 * adds a key, it belongs on this page too.
 */
const LOCAL_STORAGE_ITEMS: { key: string; purpose: string }[] = [
  { key: "suvo:theme-primary", purpose: "the phosphor color you picked in display settings" },
  { key: "suvo:crt-enabled", purpose: "whether the scanline overlay is on" },
  { key: "suvo:booted", purpose: "whether you've seen the boot sequence, so it doesn't replay every visit" },
  { key: "suvo:achievements", purpose: "which of the site's hidden easter eggs you've found" },
  { key: "suvo:sections-visited", purpose: "which homepage sections you've scrolled to, for one achievement" },
  { key: "suvo:shell-history", purpose: "commands you've typed into the shell, so ↑ and ctrl+r work" },
];

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

export default function PrivacyPage() {
  return (
    <div>
      <SectionLabel index="00" label="Privacy" />
      <TerminalWindow title="privacy.txt" meta="R/O" className="trace-box">
        <div className="prose-measure flex flex-col text-sm text-fg/70">
          <p className="mb-6 text-fg">
            The short version: no analytics, no ads, no cookies, no accounts. Nothing you do
            here is sold or shared. Here&apos;s the actual detail, not just the summary.
          </p>

          <Section>
            <H3>What&apos;s stored on your device</H3>
            <p className="mb-3">
              A few site preferences and the odd bit of shell state live in your
              browser&apos;s localStorage. It&apos;s the same kind of technology as a cookie,
              but it never leaves your device: it isn&apos;t sent to me, to a server, or to
              anyone else, and it isn&apos;t used to track you across sites or serve ads.
              That&apos;s the actual reason there&apos;s no cookie banner here, not an
              oversight. Here&apos;s everything it stores:
            </p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs sm:text-sm">
              {LOCAL_STORAGE_ITEMS.map((item) => (
                <div key={item.key} className="contents">
                  <dt className="whitespace-nowrap text-fg/50">{item.key}</dt>
                  <dd>{item.purpose}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3">
              Clearing your browser&apos;s site data removes all of it. The shell&apos;s own{" "}
              <code className="text-fg/50">history -c</code> command clears just the history
              entry.
            </p>
          </Section>

          <Section>
            <H3>Server logs</H3>
            <p>
              This site is hosted on Vercel, which keeps standard request logs (things like IP
              address and user agent) the way any web host does. I don&apos;t have analytics
              wired up, and I don&apos;t look at those logs unless something&apos;s actually
              broken.
            </p>
          </Section>

          <Section>
            <H3>The GitHub stats you see</H3>
            <p>
              The star counts on the projects page come from a route on this site that calls
              the GitHub API on the server, not from your browser. No data about you is sent to
              GitHub to fetch them.
            </p>
          </Section>

          <Section>
            <H3>If you email me</H3>
            <p>
              The contact links just open your own mail client. If you email me, I keep that
              email to reply to it, for as long as I&apos;d keep any other conversation.
              Nothing more automated than that.
            </p>
          </Section>

          <Section>
            <H3>Changes</H3>
            <p>
              If what this site collects ever changes, I&apos;ll update this page. Last
              updated: 2026-07-16.
            </p>
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
