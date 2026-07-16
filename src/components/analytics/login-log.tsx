"use client";

import type { LoginRow, LoginSummary } from "@/lib/analytics/admin-log";

/**
 * The /admin auth audit trail.
 *
 * Designed around one question — "was that me?" — rather than around showing
 * every column it has. So: failures are red and impossible to miss, a run of
 * them from several distinct IPs gets called out explicitly rather than left
 * for you to notice by counting rows, and the location and device come before
 * the IP, because "Agra, Chrome on Windows" is something you recognise at a
 * glance and "49.36.24.117" is not.
 */

const OUTCOME_LABEL: Record<string, string> = {
  success: "ok",
  bad_password: "wrong password",
  rate_limited: "rate limited",
  not_configured: "not configured",
};

function outcomeClass(outcome: string): string {
  if (outcome === "success") return "text-primary";
  if (outcome === "rate_limited") return "text-secondary";
  return "text-error";
}

/** "3m ago" / "2h ago" — the useful resolution for an audit trail. */
function relative(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const secs = Math.round((Date.now() - then) / 1000);
  if (secs < 60) return `${Math.max(secs, 0)}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function place(r: LoginRow): string {
  const parts = [r.city, r.region, r.country].filter(Boolean);
  // Country alone is the normal case behind Cloudflare without the location
  // transform enabled — see getGeo. "unknown" beats an empty cell.
  return parts.length ? parts.join(", ") : "unknown";
}

function device(r: LoginRow): string {
  const parts = [r.browser, r.os].filter(Boolean);
  return parts.length ? parts.join(" / ") : "unknown";
}

export function LoginLog({
  rows,
  summary,
}: {
  rows: LoginRow[];
  summary: LoginSummary | null;
}) {
  // More than a couple of failures from more than one address isn't you
  // mistyping — it's someone trying. Surfaced as a banner because a number in a
  // stat tile is exactly the kind of thing you stop reading after a week.
  const suspicious =
    summary != null && summary.failures7d >= 5 && summary.distinctFailingIps7d >= 2;

  return (
    <section className="mt-3 border border-border p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xs uppercase tracking-[0.15em] text-secondary">admin logins</h2>
        {summary?.lastSuccessTs && (
          <p className="text-[10px] text-fg/30">
            last success {relative(summary.lastSuccessTs)}
            {summary.lastSuccessFrom ? ` · ${summary.lastSuccessFrom}` : ""}
          </p>
        )}
      </div>

      {suspicious && (
        <p role="alert" className="mb-3 border border-error/50 p-2.5 text-xs text-error">
          {summary.failures7d} failed attempts from {summary.distinctFailingIps7d} different
          addresses in the last 7 days. If none of those were you, rotate ADMIN_PASSWORD.
        </p>
      )}

      {summary && (
        <dl className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["ok · 24h", String(summary.successes24h), "text-primary"],
            [
              "failed · 24h",
              String(summary.failures24h),
              summary.failures24h > 0 ? "text-error" : "text-fg/60",
            ],
            [
              "failed · 7d",
              String(summary.failures7d),
              summary.failures7d > 0 ? "text-error" : "text-fg/60",
            ],
            [
              "failing IPs · 7d",
              String(summary.distinctFailingIps7d),
              summary.distinctFailingIps7d > 1 ? "text-error" : "text-fg/60",
            ],
          ].map(([label, value, cls]) => (
            <div key={label} className="border border-border p-2">
              <dt className="text-[10px] uppercase tracking-[0.12em] text-fg/40">{label}</dt>
              <dd className={`mt-0.5 text-sm tabular-nums ${cls}`}>{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {rows.length === 0 ? (
        <p className="text-xs text-fg/30">no login attempts recorded yet</p>
      ) : (
        // Scrolls inside itself; the page never scrolls sideways. On a phone the
        // IP column is the first thing that can go — location and device answer
        // "was that me?" first.
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border text-fg/40">
                <th scope="col" className="py-1.5 pr-3 font-normal">when</th>
                <th scope="col" className="py-1.5 pr-3 font-normal">result</th>
                <th scope="col" className="py-1.5 pr-3 font-normal">where</th>
                <th scope="col" className="py-1.5 pr-3 font-normal">device</th>
                <th scope="col" className="hidden py-1.5 font-normal sm:table-cell">ip</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.ts}-${i}`} className="border-b border-border/40 align-top last:border-0">
                  <td className="whitespace-nowrap py-1.5 pr-3 text-fg/50">
                    <span title={new Date(r.ts).toLocaleString()}>{relative(r.ts)}</span>
                  </td>
                  <td className={`whitespace-nowrap py-1.5 pr-3 ${outcomeClass(r.outcome)}`}>
                    {OUTCOME_LABEL[r.outcome] ?? r.outcome}
                  </td>
                  <td className="py-1.5 pr-3 text-fg/70">{place(r)}</td>
                  <td className="py-1.5 pr-3 text-fg/50">{device(r)}</td>
                  <td className="hidden whitespace-nowrap py-1.5 text-fg/40 sm:table-cell">
                    {r.ip ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-[10px] leading-relaxed text-fg/30">
        Every attempt is recorded, including failures — the only place the site stores a full
        IP address. Deliberately not described in the public policies: this panel is private
        and they don&apos;t advertise it. Kept 90 days, then deleted.
      </p>
    </section>
  );
}
