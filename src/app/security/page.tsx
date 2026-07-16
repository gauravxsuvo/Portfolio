import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { SectionLabel } from "@/components/ui/section-label";
import { TerminalWindow } from "@/components/ui/terminal-window";
import { bio } from "@/lib/data";
import { pageMetadata, siteHost } from "@/lib/site";
import { SECURITY_POLICY_UPDATED } from "@/lib/security-policy";

export const metadata: Metadata = pageMetadata({
  title: "cat security.txt",
  description: "How to report a security vulnerability in this site, and what's in scope.",
  path: "/security",
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

/** Things a researcher shouldn't waste an afternoon on, and why. */
const KNOWN: { title: string; detail: string }[] = [
  {
    title: "script-src allows 'unsafe-inline'",
    detail:
      "Known and deliberate. Next.js emits inline bootstrap scripts, and the theme script must run before hydration to avoid a colour flash. Locking it down needs a per-request nonce, which forces every page out of static generation. The policy still blocks script from any third-party origin, which is the realistic vector — the site renders no user-supplied HTML anywhere. Reports of this alone will get a polite version of this paragraph.",
  },
  {
    title: "/api/track accepts unauthenticated POSTs",
    detail:
      "By design — a tracker that required a credential would have to ship one to every browser. It's same-origin checked, bot-filtered, rate-limited, size-capped, and validates against a closed event vocabulary. The worst case is junk rows in my own chart. If you can get it to do something else, I want to hear about it.",
  },
  {
    title: "Analytics ingest rate limits are per-instance",
    detail:
      "Serverless instances don't share memory, so the true limit on /api/track is (limit x live instances). A distributed limiter needs Redis — a second database and a paid tier — to defend a route whose worst case is a junk row in my own bar chart, so this one is an accepted tradeoff rather than an oversight. The login throttle is deliberately not on this list: it had the same weakness and no longer does, because its ceiling is counted in Postgres, which every instance shares.",
  },
  {
    title: "Missing SPF/DMARC on a domain that sends no mail",
    detail: "Worth a mention if you're being thorough, but this site sends no email at all.",
  },
];

export default function SecurityPage() {
  return (
    <div>
      <SectionLabel index="00" label="Security" />
      <TerminalWindow title="security.txt" meta="R/O" className="trace-box">
        <div className="prose-measure flex flex-col text-sm text-fg/70">
          <p className="mb-6 text-fg">
            Found something broken in {siteHost}? Please tell me. Email{" "}
            <A href={`mailto:${bio.email}`}>{bio.email}</A> and I&apos;ll actually read it.
            No bug bounty — this is a portfolio, not a company — but I&apos;ll fix the thing
            and credit you if you want it.
          </p>

          <Section>
            <H3>How to report</H3>
            <p className="mb-3">
              Email <A href={`mailto:${bio.email}`}>{bio.email}</A> with enough detail to
              reproduce it: the URL, what you did, what happened, and what you expected. A
              proof of concept helps. So does telling me how bad you think it is and why.
            </p>
            <p>
              Machine-readable version at{" "}
              <A href="/.well-known/security.txt">/.well-known/security.txt</A> (
              <A href="https://www.rfc-editor.org/rfc/rfc9116" external>
                RFC 9116
              </A>
              ).
            </p>
          </Section>

          <Section>
            <H3>What I promise</H3>
            <ul className="ml-4 flex list-disc flex-col gap-1.5 marker:text-border">
              <li>I&apos;ll acknowledge your report within a few days. I&apos;m one person and a student, so it may not be same-day.</li>
              <li>I&apos;ll tell you honestly whether I think it&apos;s a real issue, and if I disagree, I&apos;ll say why rather than going quiet.</li>
              <li>I&apos;ll fix anything real, and tell you when it&apos;s done.</li>
              <li>I won&apos;t take legal action against you for a good-faith report that follows this page.</li>
              <li>Credit on this page if you want it, or your silence if you&apos;d rather.</li>
            </ul>
          </Section>

          <Section>
            <H3>What I ask</H3>
            <ul className="ml-4 flex list-disc flex-col gap-1.5 marker:text-border">
              <li>Give me a reasonable window to fix it before publishing. 90 days is the usual courtesy; if it&apos;s trivial, I&apos;ll be faster.</li>
              <li>Don&apos;t access, modify, or delete data that isn&apos;t yours. If you find a way into the analytics database, stop there and tell me — I don&apos;t need a demonstration of how much of other people&apos;s data you could have read.</li>
              <li>Don&apos;t run automated scanners at volume. This runs on free tiers; the noise costs me money and tells you nothing a careful look wouldn&apos;t.</li>
              <li>No denial of service, no social engineering, no physical anything.</li>
            </ul>
          </Section>

          <Section>
            <H3>In scope</H3>
            <p>
              {siteHost} and its public endpoints (<code className="text-fg/50">/api/track</code>,{" "}
              <code className="text-fg/50">/api/github</code>,{" "}
              <code className="text-fg/50">/api/health</code>).
            </p>
          </Section>

          <Section>
            <H3>Out of scope</H3>
            <p className="mb-2">These aren&apos;t mine to fix — please report them upstream:</p>
            <ul className="ml-4 flex list-disc flex-col gap-1.5 marker:text-border">
              <li>
                Anything in my <A href={bio.github} external>GitHub repositories</A> as a
                platform issue — that&apos;s GitHub. (Bugs in <em>my</em> code in those repos
                are welcome, just open an issue there.)
              </li>
              <li>Vercel, Neon, and any <code className="text-fg/50">*.vercel.app</code> deployment infrastructure.</li>
              <li>Live demos linked from project pages that run on someone else&apos;s host.</li>
            </ul>
          </Section>

          <Section>
            <H3>Already known — please don&apos;t spend your time here</H3>
            <p className="mb-3">
              Every one of these is a deliberate, documented tradeoff rather than an
              oversight. I&apos;d rather list them honestly than have you spend an evening
              writing up something I decided on purpose.
            </p>
            <dl className="flex flex-col gap-3 border border-border p-3 text-xs sm:text-sm">
              {KNOWN.map((k) => (
                <div key={k.title}>
                  <dt className="mb-1 text-fg/50">{k.title}</dt>
                  <dd>{k.detail}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section>
            <H3>What this site actually does to protect you</H3>
            <p>
              A Content-Security-Policy that blocks script from every origin but this one,
              plus framing, form hijacking, and <code className="text-fg/50">&lt;base&gt;</code>{" "}
              injection. HSTS with a two-year max-age. No third-party script, tag manager, or
              ad network anywhere — so nothing on this page can watch you, because nothing on
              this page is theirs. Your IP is never stored; the analytics keep a
              daily-rotating salted hash instead. Details on the{" "}
              <A href="/privacy">privacy page</A>.
            </p>
          </Section>

          <Section>
            <H3>Changes</H3>
            <p>Last updated: {SECURITY_POLICY_UPDATED}.</p>
          </Section>
        </div>
      </TerminalWindow>
    </div>
  );
}
