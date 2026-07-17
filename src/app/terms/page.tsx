import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { SectionLabel } from "@/components/ui/section-label";
import { TerminalWindow } from "@/components/ui/terminal-window";
import { bio } from "@/lib/data";
import { pageMetadata, siteUrl } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "cat terms.txt",
  description:
    "The terms for using this site: what you may reuse, what you may not, and the limits of what's promised.",
  path: "/terms",
});

const LAST_UPDATED = "2026-07-16";
const host = siteUrl.replace(/^https?:\/\//, "");

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

function A({ href, children, external }: { href: string; children: ReactNode; external?: boolean }) {
  const cls = "text-primary underline underline-offset-4 decoration-border hover:text-glow";
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

export default function TermsPage() {
  return (
    <div>
      <SectionLabel index="00" label="Terms" />
      <TerminalWindow title="terms.txt" meta="R/O" className="trace-box">
        <div className="prose-measure flex flex-col text-sm text-fg/70">
          <p className="mb-6 text-fg">
            This is a personal portfolio, not a product. There&apos;s no account to make and
            nothing to buy, so these terms are short and mostly say what you&apos;re free to
            do. Using {host} means you&apos;re okay with them.
          </p>

          <Section>
            <H3>1. Who this agreement is with</H3>
            <p>
              {host} is operated by me, {bio.name}, an individual in India. Throughout this
              page &quot;I&quot; and &quot;me&quot; mean that person, and &quot;you&quot;
              means whoever is reading the site. No company, no legal entity, no support
              desk.
            </p>
          </Section>

          <Section>
            <H3>2. What you can do here</H3>
            <p>
              Read it, poke at the shell, find the easter eggs, and get in touch. That&apos;s
              the whole feature set. You don&apos;t need permission and there&apos;s nothing
              to sign up for.
            </p>
          </Section>

          <Section>
            <H3>3. Two different licenses — this part matters</H3>
            <p className="mb-3">
              People conflate these constantly, so to be explicit: the code and the writing
              are licensed separately.
            </p>
            <dl className="flex flex-col gap-3 border border-border p-3 text-xs sm:text-sm">
              <div>
                <dt className="mb-1 text-fg/50">The site&apos;s source code</dt>
                <dd>
                  MIT licensed, in{" "}
                  <A href={`${bio.github}/Portfolio`} external>
                    the repository it&apos;s built from
                  </A>
                  . Fork it, learn from it, ship your own version. That&apos;s what it&apos;s
                  there for.
                </dd>
              </div>
              <div>
                <dt className="mb-1 text-fg/50">The content</dt>
                <dd>
                  My bio, project write-ups, publication abstracts, and the design of this
                  site are <strong className="text-fg">not</strong>{" "}
                  covered by that MIT license. They&apos;re mine, all rights reserved. Quote a sentence or two
                  with credit and a link — that&apos;s fair and I&apos;d appreciate it. Just
                  don&apos;t republish the writing as yours or present my projects as your
                  own work.
                </dd>
              </div>
            </dl>
            <p className="mt-3">
              The projects this site links to are separate repositories under their own
              licenses, stated in each one. The MIT license here doesn&apos;t reach them.
            </p>
          </Section>

          <Section>
            <H3>4. Accuracy, and where it&apos;s thin</H3>
            <p>
              The project write-ups and publication entries are my own account of my own
              work, and I&apos;ve tried to describe them accurately — including where
              something underperformed, not just the best-case numbers. The DeepDarcy page
              reports its 38.3% holdout error for exactly that reason. Still: this is a
              portfolio, written by the person it flatters. Treat it as a claim, not an
              audit. If you&apos;re making a hiring or funding decision, the code and the
              paper are both public — go read them. If you spot something wrong, email me and
              I&apos;ll fix it.
            </p>
          </Section>

          <Section>
            <H3>5. Don&apos;t attack it</H3>
            <p className="mb-3">
              Obvious, but worth writing down. Don&apos;t try to break into it, scrape it at
              a volume that costs me money, flood the endpoints, or use it to host or push
              anything illegal. Automated bulk collection for training or resale isn&apos;t
              welcome.
            </p>
            <p>
              Security research is a different thing, and it&apos;s welcome. If you find a
              vulnerability, tell me at <A href={`mailto:${bio.email}`}>{bio.email}</A>{" "}
              before you tell anyone else, and I&apos;ll be glad you did.
            </p>
          </Section>

          <Section>
            <H3>6. Analytics</H3>
            <p>
              This site collects analytics, but only if you say yes to the prompt, and only
              about how the site is used — never sold, never shared, never handed to an ad
              network. What&apos;s collected and how to switch it off is spelled out on the{" "}
              <A href="/privacy">privacy page</A>, which forms part of these terms.
            </p>
          </Section>

          <Section>
            <H3>7. Links to other places</H3>
            <p>
              GitHub repos, live project demos, LinkedIn, ORCID, and the Zenodo DOI are
              third-party sites I don&apos;t control and can&apos;t vouch for the uptime or
              content of. A live demo linked from a project page may go offline or change
              without notice — several run on free tiers that sleep when idle.
            </p>
          </Section>

          <Section>
            <H3>8. No warranty</H3>
            <p>
              This site and everything on it is provided &quot;as is&quot;, with no guarantee
              that it&apos;ll be available, accurate, current, or error-free, and no
              warranties of any kind, express or implied. It&apos;s a portfolio on a free
              hosting plan. It will occasionally be down.
            </p>
          </Section>

          <Section>
            <H3>9. Limit of liability</H3>
            <p>
              To the fullest extent the law allows, I&apos;m not liable for any loss or
              damage arising from your use of this site or anything it links to, including
              decisions made on the strength of what it says. Nothing here excludes
              liability that legally cannot be excluded, such as for fraud.
            </p>
          </Section>

          <Section>
            <H3>10. Governing law</H3>
            <p>
              These terms are governed by the laws of India, and the courts of India have
              jurisdiction over any dispute arising from them. If any part of this page turns
              out to be unenforceable, the rest still stands.
            </p>
          </Section>

          <Section>
            <H3>11. Changes</H3>
            <p>
              These terms can change as the site does; the date below is the only version
              history there is. Last updated: {LAST_UPDATED}.
            </p>
          </Section>

          <Section>
            <H3>12. Questions</H3>
            <p>
              Email me at <A href={`mailto:${bio.email}`}>{bio.email}</A>. I&apos;d rather
              hear from you than have you guess.
            </p>
          </Section>
        </div>
      </TerminalWindow>
    </div>
  );
}
