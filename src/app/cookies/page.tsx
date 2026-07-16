import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { SectionLabel } from "@/components/ui/section-label";
import { TerminalWindow } from "@/components/ui/terminal-window";
import { ConsentControls } from "@/components/analytics/consent-controls";
import { bio } from "@/lib/data";
import { pageMetadata } from "@/lib/site";
import {
  analyticsEntries,
  cookieEntries,
  necessaryEntries,
  type StorageEntry,
} from "@/lib/storage-inventory";

export const metadata: Metadata = pageMetadata({
  title: "cat cookies.txt",
  description:
    "Every cookie and storage key this site writes, what it's for, and how long it lasts.",
  path: "/cookies",
});

const LAST_UPDATED = "2026-07-16";

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

function A({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="text-primary underline underline-offset-4 decoration-border hover:text-glow"
    >
      {children}
    </Link>
  );
}

/**
 * Renders as a real table, not a definition list: this is tabular data with
 * three consistent columns, and a screen reader reading "key, purpose,
 * retention" per row is genuinely better here than a nested dl.
 *
 * It scrolls inside its own container rather than letting the page scroll
 * sideways on a phone.
 */
function StorageTable({ entries }: { entries: StorageEntry[] }) {
  if (entries.length === 0) return <p className="text-xs text-fg/30">none</p>;
  return (
    <div className="overflow-x-auto border border-border">
      <table className="w-full min-w-[34rem] border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-border text-fg/40">
            <th scope="col" className="px-3 py-2 font-normal">name</th>
            <th scope="col" className="px-3 py-2 font-normal">type</th>
            <th scope="col" className="px-3 py-2 font-normal">what it&apos;s for</th>
            <th scope="col" className="px-3 py-2 font-normal">lasts</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.key} className="border-b border-border/50 last:border-0 align-top">
              <td className="whitespace-nowrap px-3 py-2 text-fg/70">{e.key}</td>
              <td className="whitespace-nowrap px-3 py-2 text-fg/40">
                {e.kind === "cookie" ? "cookie" : "localStorage"}
              </td>
              <td className="px-3 py-2 text-fg/60">{e.purpose}</td>
              <td className="whitespace-nowrap px-3 py-2 text-fg/40">{e.retention}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CookiesPage() {
  return (
    <div>
      <SectionLabel index="00" label="Cookies" />
      <TerminalWindow title="cookies.txt" meta="R/O" className="trace-box">
        <div className="prose-measure flex flex-col text-sm text-fg/70">
          <p className="mb-6 text-fg">
            This site sets <strong className="text-primary">no cookies at all</strong> for
            visitors. Not one. What it does use is localStorage, which is the same idea and
            gets treated the same way here — including asking first for anything that
            isn&apos;t strictly necessary.
          </p>

          <Section>
            <H3>Why a &quot;cookie policy&quot; that isn&apos;t about cookies</H3>
            <p>
              The law people call &quot;the cookie law&quot; (the EU ePrivacy Directive, and
              India&apos;s DPDP Act in a similar spirit) isn&apos;t actually about cookies.
              It covers <em>storing or reading anything on your device</em>. localStorage is
              squarely inside that, so calling this site &quot;cookie-free&quot; and moving
              on would be a technically true sentence used to dodge the point. It stores
              things on your device; here&apos;s the full list.
            </p>
          </Section>

          <Section>
            <H3>Strictly necessary — no consent needed</H3>
            <p className="mb-3">
              These either make the site work or exist only to remember a choice you made.
              Under the ePrivacy Directive they&apos;re exempt from consent, and none of
              them are ever sent to a server — they live in your browser and stay there.
            </p>
            <StorageTable entries={necessaryEntries.filter((e) => e.kind === "local-storage")} />
          </Section>

          <Section>
            <H3>Analytics — only if you say yes</H3>
            <p className="mb-3">
              These are <strong className="text-fg">not</strong> written until you accept the
              prompt, and they&apos;re deleted the moment you decline or withdraw. If you
              never accept, these keys never exist on your device.
            </p>
            <StorageTable entries={analyticsEntries} />
          </Section>

          <Section>
            <H3>Cookies</H3>
            <p className="mb-3">
              For completeness, since this page is called cookies.txt: there are none. Not
              for visitors, not for me — nothing on this site sets one, for any purpose.
              This table is generated from the same list as the rest of the page — if a
              cookie is ever added, it appears here automatically rather than relying on me
              remembering to update this sentence.
            </p>
            <StorageTable entries={cookieEntries} />
          </Section>

          <Section>
            <H3>No third parties. At all.</H3>
            <p>
              There is no Google Analytics, no Facebook pixel, no ad network, no tag manager,
              no embedded widget, no CDN font, and no third-party script of any kind on this
              site. Nothing here can track you across other websites, because nothing here
              talks to another website. The analytics are ones I wrote, served from this
              domain, stored in a database I run. The site&apos;s security policy blocks
              scripts from any other origin outright, so this isn&apos;t just a promise —
              it&apos;s enforced by the browser.
            </p>
          </Section>

          <Section>
            <H3>Your choice, changeable any time</H3>
            <p className="mb-3">
              Same control as on the privacy page — it&apos;s the same setting, in both
              places, because burying it in one spot would be the kind of thing this page
              exists to not do.
            </p>
            <ConsentControls />
          </Section>

          <Section>
            <H3>Clearing everything</H3>
            <p>
              Clearing this site&apos;s data in your browser settings removes all of it
              instantly. Nothing here survives that, and nothing is quietly restored
              afterwards from a server-side copy — there isn&apos;t one.
            </p>
          </Section>

          <Section>
            <H3>Related</H3>
            <p>
              The <A href="/privacy">privacy policy</A> covers what the analytics actually
              record and how long they&apos;re kept. The <A href="/terms">terms</A> cover
              everything else. Questions:{" "}
              <a
                href={`mailto:${bio.email}`}
                className="text-primary underline underline-offset-4 decoration-border hover:text-glow"
              >
                {bio.email}
              </a>
              .
            </p>
          </Section>

          <Section>
            <H3>Changes</H3>
            <p>Last updated: {LAST_UPDATED}.</p>
          </Section>
        </div>
      </TerminalWindow>
    </div>
  );
}
