import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { SectionLabel } from "@/components/ui/section-label";
import { TerminalWindow } from "@/components/ui/terminal-window";
import { ConsentControls } from "@/components/analytics/consent-controls";
import { bio } from "@/lib/data";
import { pageMetadata } from "@/lib/site";
// Rendered from the shared inventory rather than a copy kept here: this page
// and /cookies previously would have hand-maintained the same list, which is
// the same drift bug as a copy-pasted email address — except a stale copy here
// is a false statement in a legal document.
import { localStorageEntries } from "@/lib/storage-inventory";

export const metadata: Metadata = pageMetadata({
  title: "cat privacy.txt",
  description: "What this site collects, why, how long it's kept, and how to turn it off.",
  path: "/privacy",
});

const LAST_UPDATED = "2026-07-16";

const COLLECTED: { what: string; detail: string }[] = [
  { what: "Pages you view", detail: "the path only — never the query string" },
  {
    what: "Where you came from",
    detail: 'the referring site\'s domain only (e.g. "github.com"), never the full URL',
  },
  {
    what: "Rough location",
    detail: "country, region and city, derived from your IP by my host. Never a precise location",
  },
  {
    what: "Your device",
    detail: "browser, operating system, whether you're on mobile/tablet/desktop, and window size",
  },
  {
    what: "What you interact with",
    detail:
      "shell commands you run, easter eggs you find, theme changes, command-palette opens, and clicks on outbound links like my GitHub or email",
  },
  {
    what: "What you search for",
    detail:
      "if you type in the project or publication filter, the finished term — once you stop typing, never keystroke by keystroke — and how many results it found. A term that finds nothing tells me something's missing",
  },
  {
    what: "How far you read",
    detail: "scroll depth in 25% steps, and how many seconds you spent on a page",
  },
  {
    what: "How fast the site loaded",
    detail: "standard Web Vitals timings, so I can tell if it's slow for real people",
  },
  {
    what: "Random IDs",
    detail: "one for your browser, one for the visit — so I can tell 100 visits from 100 people",
  },
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
            The short version: this site has analytics, but they&apos;re mine, they only run
            if you say yes, and nothing is ever sold or shared. No ad networks, no Google
            Analytics, no third-party trackers of any kind. If you decline, nothing about
            your visit is recorded at all.
          </p>

          <Section>
            <H3>Who&apos;s responsible</H3>
            <p>
              This site is run by me, {bio.name}, as a personal portfolio. I decide what it
              collects and why, which makes me the data controller for it. There&apos;s no
              company behind it and no one else has access.
            </p>
          </Section>

          <Section>
            <H3>Nothing happens until you choose</H3>
            <p>
              The first time you visit, you get a prompt asking whether analytics are okay.
              Until you answer, no analytics event is recorded — not a pageview, not a
              timing, nothing. Declining is one click, exactly like accepting, and it
              sticks. I don&apos;t re-ask on every visit to wear you down.
            </p>
          </Section>

          <Section>
            <H3>What&apos;s collected if you accept</H3>
            <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 text-xs sm:grid-cols-[minmax(0,auto)_1fr] sm:text-sm">
              {COLLECTED.map((item) => (
                <div key={item.what} className="contents">
                  <dt className="text-fg/50 sm:whitespace-nowrap">{item.what}</dt>
                  <dd className="mb-2 sm:mb-0">{item.detail}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section>
            <H3>What&apos;s deliberately not collected</H3>
            <p>
              Your IP address is never stored. It&apos;s used in memory to work out your
              country and to stop one person flooding the endpoint, and what gets saved
              instead is a salted hash that rotates every day — so even I can&apos;t link
              your visits across two days by it, and it can&apos;t be turned back into an
              address by anyone who obtains the database. There&apos;s no session recording,
              no heatmap, no keystroke logging, no cross-site tracking, no fingerprinting,
              no ad profile, and nothing you type into the shell is stored server-side
              beyond the name of the command itself.
            </p>
          </Section>

          <Section>
            <H3>Why I collect it</H3>
            <p>
              Honestly? Curiosity and craft. I want to know whether anyone finds the shell,
              which projects people actually read, and whether the site is slow on real
              phones. My lawful basis is your consent, which is why the prompt exists and
              why declining costs you nothing — every part of this site works identically
              either way.
            </p>
          </Section>

          <Section>
            <H3>Where it goes and how long it&apos;s kept</H3>
            <p>
              Events go to a Postgres database I run on{" "}
              <a
                href="https://neon.tech"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4 decoration-border hover:text-glow"
              >
                Neon
              </a>
              , read only by me, through a password-protected page on this site. Raw events
              are deleted automatically after 90 days. Nothing is sold, shared, or handed to
              an advertiser, ever.
            </p>
          </Section>

          <Section>
            <H3>What&apos;s stored on your device</H3>
            <p className="mb-3">
              Site preferences and analytics IDs live in your browser&apos;s localStorage.
              It&apos;s the same kind of technology as a cookie — which is exactly why you
              get asked before the analytics ones are written. The preference keys below
              never leave your device and aren&apos;t sent anywhere:
            </p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs sm:text-sm">
              {localStorageEntries.map((item) => (
                <div key={item.key} className="contents">
                  <dt className="whitespace-nowrap text-fg/50">{item.key}</dt>
                  <dd>{item.purpose}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3">
              Clearing your browser&apos;s site data removes all of it. The shell&apos;s own{" "}
              <code className="text-fg/50">history -c</code> command clears just the history
              entry. The{" "}
              <Link
                href="/cookies"
                className="text-primary underline underline-offset-4 decoration-border hover:text-glow"
              >
                cookie policy
              </Link>{" "}
              breaks the same list down by whether each item needs your consent.
            </p>
          </Section>

          <Section>
            <H3>Your choice, changeable any time</H3>
            <p className="mb-3">
              Whatever you picked, you can change it here. Withdrawing consent stops
              collection immediately and deletes the IDs from your browser, so a later
              &quot;yes&quot; can&apos;t be linked back to your earlier visits.
            </p>
            <ConsentControls />
          </Section>

          <Section>
            <H3>Your rights</H3>
            <p>
              Under the GDPR and India&apos;s DPDP Act you can ask what I hold about you,
              ask for it deleted, or object to it entirely. In practice the honest answer is
              that the data is pseudonymous — I hold a random ID, not your name — so if you
              want it gone the fastest route is to clear this site&apos;s storage, which
              orphans it permanently, and it ages out within 90 days regardless. If
              you&apos;d rather I did something specific, email me and I will.
            </p>
          </Section>

          <Section>
            <H3>Server logs</H3>
            <p>
              This site is hosted on Vercel, which keeps standard request logs (things like
              IP address and user agent) the way any web host does. That&apos;s separate
              from my analytics, happens whether or not you consent, and is what makes it
              possible to serve the site to you at all. I don&apos;t look at them unless
              something&apos;s broken.
            </p>
          </Section>

          <Section>
            <H3>The GitHub stats you see</H3>
            <p>
              The star counts on the projects page come from a route on this site that calls
              the GitHub API on the server, not from your browser. No data about you is sent
              to GitHub to fetch them.
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
              If what this site collects ever changes, I&apos;ll update this page. If it
              changes in a way that widens what&apos;s collected, the prompt asks again
              rather than assuming your old answer covers it. Last updated: {LAST_UPDATED}.
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
