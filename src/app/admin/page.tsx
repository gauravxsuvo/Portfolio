import type { Metadata } from "next";
import Link from "next/link";
import { SectionLabel } from "@/components/ui/section-label";
import { TerminalWindow } from "@/components/ui/terminal-window";
import { BracketButton } from "@/components/ui/bracket-button";
import { StatBars } from "@/components/analytics/stat-bars";
import { isAuthConfigured, isAuthed } from "@/lib/analytics/auth";
import { isDbConfigured } from "@/lib/analytics/db";
import {
  clampDays,
  getOverview,
  pageviewSeries,
  scrollDepth,
  topAchievements,
  topBrowsers,
  topCountries,
  topDevices,
  topOses,
  topOutbound,
  topPaths,
  topReferrers,
  topShellCommands,
  webVitals,
} from "@/lib/analytics/queries";
import { LoginForm } from "./login-form";
import { logoutAction } from "./actions";

// Belt and braces with robots.ts: that file asks crawlers not to visit, this
// header tells any that ignore it not to index what they find.
export const metadata: Metadata = {
  title: "analytics",
  robots: { index: false, follow: false, nocache: true },
};

// Reads cookies and live data — must never be prerendered or cached.
export const dynamic = "force-dynamic";

const RANGES = [1, 7, 30, 90];

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border p-3">
      <dt className="text-[10px] uppercase tracking-[0.15em] text-fg/40">{label}</dt>
      <dd className="mt-1 text-xl text-primary text-glow tabular-nums">{value}</dd>
    </div>
  );
}

/** Sparkline in block glyphs — same reasoning as StatBars: no chart library. */
function Sparkline({ values }: { values: number[] }) {
  const glyphs = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
  const max = Math.max(...values, 1);
  return (
    <span aria-hidden="true" className="text-primary">
      {values.map((v) => glyphs[Math.min(glyphs.length - 1, Math.floor((v / max) * (glyphs.length - 1)))]).join("")}
    </span>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  // Async in Next 16 — see .
  searchParams: Promise<{ range?: string }>;
}) {
  const authed = await isAuthed();

  if (!authed) {
    return (
      <div>
        <SectionLabel index="--" label="Restricted" />
        <TerminalWindow title="auth" meta="LOCKED">
          <div className="max-w-sm">
            {!isAuthConfigured() ? (
              <p className="text-sm text-error">
                ADMIN_PASSWORD and ADMIN_SECRET are not set on this deployment, so this
                page is unreachable by design. Set both and redeploy.
              </p>
            ) : (
              <LoginForm />
            )}
          </div>
        </TerminalWindow>
      </div>
    );
  }

  if (!isDbConfigured()) {
    return (
      <div>
        <SectionLabel index="--" label="Analytics" />
        <TerminalWindow title="analytics" meta="NO DB">
          <p className="mb-4 text-sm text-error">
            DATABASE_URL is not set, so there is nothing to read. Add a Neon connection
            string and redeploy.
          </p>
          {/* This branch still needs a way out: you're authenticated here, and
              without it the only exit from a misconfigured deployment is to
              clear the cookie by hand. */}
          <form action={logoutAction}>
            <BracketButton type="submit" variant="ghost">
              LOGOUT
            </BracketButton>
          </form>
        </TerminalWindow>
      </div>
    );
  }

  const days = clampDays((await searchParams).range);

  // One await, not fourteen sequential ones. These are independent queries and
  // Promise.all runs them concurrently; awaited in series this page would take
  // the sum of every round-trip rather than the slowest one.
  const [
    overview,
    series,
    paths,
    referrers,
    countries,
    devices,
    browsers,
    oses,
    shell,
    achievements,
    outbound,
    scroll,
    vitals,
  ] = await Promise.all([
    getOverview(days),
    pageviewSeries(days),
    topPaths(days),
    topReferrers(days),
    topCountries(days),
    topDevices(days),
    topBrowsers(days),
    topOses(days),
    topShellCommands(days),
    topAchievements(days),
    topOutbound(days),
    scrollDepth(days),
    webVitals(days),
  ]);

  return (
    <div>
      <SectionLabel index="--" label="Analytics" />

      <TerminalWindow title={`analytics --last ${days}d`} meta="LIVE">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <nav aria-label="Date range" className="flex flex-wrap gap-2">
            {RANGES.map((r) => (
              <Link
                key={r}
                href={`/admin?range=${r}`}
                aria-current={r === days ? "page" : undefined}
                className={`border px-2.5 py-1 text-xs transition-colors ${
                  r === days
                    ? "border-primary text-primary text-glow"
                    : "border-border text-fg/50 hover:text-fg"
                }`}
              >
                {r}d
              </Link>
            ))}
          </nav>
          <form action={logoutAction} className="ml-auto">
            <BracketButton type="submit" variant="ghost">
              LOGOUT
            </BracketButton>
          </form>
        </div>

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="pageviews" value={(overview?.pageviews ?? 0).toLocaleString()} />
          <Stat label="visitors" value={(overview?.visitors ?? 0).toLocaleString()} />
          <Stat label="sessions" value={(overview?.sessions ?? 0).toLocaleString()} />
          <Stat label="avg time" value={`${overview?.avgSeconds ?? 0}s`} />
          <Stat label="bounce" value={`${overview?.bounceRate ?? 0}%`} />
        </dl>

        {series.length > 0 && (
          <div className="mt-4 border border-border p-3">
            <p className="mb-2 text-[10px] uppercase tracking-[0.15em] text-fg/40">
              pageviews / day
            </p>
            <p className="overflow-x-auto text-lg leading-none">
              <Sparkline values={series.map((s) => s.value)} />
            </p>
            <p className="mt-2 flex justify-between text-[10px] text-fg/30">
              <span>{series[0]?.label}</span>
              <span>{series[series.length - 1]?.label}</span>
            </p>
          </div>
        )}

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <StatBars title="top pages" rows={paths} />
          <StatBars title="referrers" rows={referrers} empty="all direct so far" />
          <StatBars title="countries" rows={countries} />
          <StatBars title="devices" rows={devices} />
          <StatBars title="browsers" rows={browsers} />
          <StatBars title="operating systems" rows={oses} />
          <StatBars title="outbound clicks" rows={outbound} empty="no outbound clicks yet" />
          <StatBars title="shell commands" rows={shell} empty="nobody has used the shell yet" />
          <StatBars title="achievements found" rows={achievements} empty="no easter eggs found yet" />
          <StatBars title="scroll depth" rows={scroll} />
        </div>

        <section className="mt-3 border border-border p-4">
          <h2 className="mb-3 text-xs uppercase tracking-[0.15em] text-secondary">
            web vitals (p75)
          </h2>
          {vitals.length === 0 ? (
            <p className="text-xs text-fg/30">no samples yet</p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-xs">
              {vitals.map((v) => (
                <li key={v.metric} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                  <span className="w-12 text-fg/70">{v.metric}</span>
                  <span className="tabular-nums text-fg">
                    {v.metric === "CLS" ? v.p75.toFixed(3) : `${Math.round(v.p75)}ms`}
                  </span>
                  <span
                    className={
                      v.rating === "good"
                        ? "text-primary"
                        : v.rating === "poor"
                          ? "text-error"
                          : "text-secondary"
                    }
                  >
                    {v.rating}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="mt-4 text-[11px] leading-relaxed text-fg/30">
          Only visitors who accepted the consent prompt appear here, so these numbers are a
          floor, not the true total. Raw events are deleted after 90 days.
        </p>
      </TerminalWindow>
    </div>
  );
}
