"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BracketButton } from "@/components/ui/bracket-button";
import { StatBars } from "@/components/analytics/stat-bars";
import { DashboardSkeleton } from "@/components/analytics/dashboard-skeleton";
import { LoginLog } from "@/components/analytics/login-log";
import type { Row, VitalRow, Overview } from "@/lib/analytics/queries";
import type { LoginRow, LoginSummary } from "@/lib/analytics/admin-log";

type Stats = {
  days: number;
  overview: Overview | null;
  series: Row[];
  paths: Row[];
  referrers: Row[];
  countries: Row[];
  devices: Row[];
  browsers: Row[];
  oses: Row[];
  shell: Row[];
  achievements: Row[];
  outbound: Row[];
  scroll: Row[];
  vitals: VitalRow[];
  searches: Row[];
  zeroSearches: Row[];
  logins: LoginRow[];
  loginStats: LoginSummary | null;
  fetchedAt: string;
  token: string;
  error?: string;
};

const RANGES = [1, 7, 30, 90] as const;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border p-3">
      <dt className="text-[10px] uppercase tracking-[0.15em] text-fg/40">{label}</dt>
      <dd className="mt-1 text-lg text-primary text-glow tabular-nums sm:text-xl">{value}</dd>
    </div>
  );
}

/** Sparkline in block glyphs — no chart library, same as StatBars. */
function Sparkline({ values }: { values: number[] }) {
  const glyphs = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
  const max = Math.max(...values, 1);
  return (
    <span aria-hidden="true" className="text-primary">
      {values
        .map((v) => glyphs[Math.min(glyphs.length - 1, Math.floor((v / max) * (glyphs.length - 1)))])
        .join("")}
    </span>
  );
}

export function Dashboard({
  token,
  onToken,
  onExpired,
  onLogout,
}: {
  token: string;
  /** Swap in the refreshed token from each response — this is what slides the
   *  five-minute window forward while you're actually using the page. */
  onToken: (t: string) => void;
  onExpired: () => void;
  onLogout: () => void;
}) {
  const [days, setDays] = useState<number>(30);
  const [stats, setStats] = useState<Stats | null>(null);
  // Starts true: the first fetch is already in flight by the time anything
  // paints, so the skeleton is the honest initial state.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Bumped by REFRESH to re-run the fetch effect without changing the range. */
  const [reloadNonce, setReloadNonce] = useState(0);

  // The token changes on every response (sliding session). Held in a ref so the
  // fetch effect can read the latest one without listing `token` as a
  // dependency — that would make every fetch re-trigger the effect, forever.
  // Written in an effect, never during render.
  const tokenRef = useRef(token);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  // Callbacks likewise: they're stable in practice but listing them would be
  // noise, and a parent that re-created them would restart the fetch loop.
  const onTokenRef = useRef(onToken);
  const onExpiredRef = useRef(onExpired);
  useEffect(() => {
    onTokenRef.current = onToken;
    onExpiredRef.current = onExpired;
  }, [onToken, onExpired]);

  useEffect(() => {
    // `cancelled` handles the out-of-order fetch bug: a slow response for the
    // 90d range must not overwrite a fast one for 7d that the user asked for
    // afterwards. React runs the cleanup before re-running the effect, so the
    // superseded request marks itself dead on the way out.
    let cancelled = false;

    // Every setState below happens after an await, i.e. in a callback rather
    // than synchronously in the effect body — which is both what the
    // react-hooks/set-state-in-effect rule wants and genuinely correct: a
    // synchronous set here would cascade an extra render before the fetch even
    // started.
    (async () => {
      try {
        const res = await fetch(`/api/admin/stats?range=${days}`, {
          headers: { Authorization: `Bearer ${tokenRef.current}` },
          cache: "no-store",
        });
        if (cancelled) return;

        if (res.status === 401) {
          onExpiredRef.current();
          return;
        }
        if (!res.ok) throw new Error(`stats: ${res.status}`);

        const data = (await res.json()) as Stats;
        if (cancelled) return;

        if (data.token) onTokenRef.current(data.token);

        if (data.error === "no-database") {
          setError("DATABASE_URL is not set on this deployment.");
          setStats(null);
        } else if (data.error === "query-failed") {
          setError("the analytics query failed. check the server logs.");
          setStats(null);
        } else {
          setError(null);
          setStats(data);
        }
      } catch {
        if (!cancelled) setError("couldn't reach the server. try refresh.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [days, reloadNonce]);

  /** Range change and refresh both flip `loading` from an event handler, where
   *  a synchronous setState is exactly right. */
  const selectRange = useCallback((r: number) => {
    setLoading(true);
    setDays(r);
  }, []);

  const refresh = useCallback(() => {
    setLoading(true);
    setReloadNonce((n) => n + 1);
  }, []);

  const busy = loading;

  return (
    <div>
      {/* Controls wrap rather than overflow: at 320px the range buttons and the
          actions end up on separate lines instead of forcing a sideways scroll. */}
      <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2">
        <nav aria-label="Date range" className="flex flex-wrap gap-1.5">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => selectRange(r)}
              aria-current={r === days ? "true" : undefined}
              className={`border px-2.5 py-1 text-xs transition-colors ${
                r === days
                  ? "border-primary text-primary text-glow"
                  : "border-border text-fg/50 hover:border-primary hover:text-fg"
              }`}
            >
              {r}d
            </button>
          ))}
        </nav>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="text-[10px] text-fg/30 tabular-nums" aria-live="polite">
            {busy
              ? "querying…"
              : stats
                ? `updated ${new Date(stats.fetchedAt).toLocaleTimeString()}`
                : ""}
          </span>
          <BracketButton onClick={refresh} variant="ghost" disabled={busy}>
            {busy ? "..." : "REFRESH"}
          </BracketButton>
          <BracketButton onClick={onLogout} variant="ghost">
            LOGOUT
          </BracketButton>
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-4 border border-error/40 p-3 text-xs text-error">
          {error}
        </p>
      )}

      {/* First load shows the skeleton. A refresh keeps the old numbers on
          screen and just dims them — replacing a populated dashboard with
          skeletons on every refresh is a downgrade, not a loading state. */}
      {loading && !stats ? (
        <DashboardSkeleton />
      ) : stats ? (
        <div className={busy ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Stat label="pageviews" value={(stats.overview?.pageviews ?? 0).toLocaleString()} />
            <Stat label="visitors" value={(stats.overview?.visitors ?? 0).toLocaleString()} />
            <Stat label="sessions" value={(stats.overview?.sessions ?? 0).toLocaleString()} />
            <Stat label="avg time" value={`${stats.overview?.avgSeconds ?? 0}s`} />
            <Stat label="bounce" value={`${stats.overview?.bounceRate ?? 0}%`} />
          </dl>

          {stats.series.length > 0 && (
            <div className="mt-4 border border-border p-3">
              <p className="mb-2 text-[10px] uppercase tracking-[0.15em] text-fg/40">
                pageviews / day
              </p>
              {/* Scrolls inside itself on a narrow screen; the page never does. */}
              <p className="overflow-x-auto text-lg leading-none">
                <Sparkline values={stats.series.map((s) => s.value)} />
              </p>
              <p className="mt-2 flex justify-between text-[10px] text-fg/30">
                <span>{stats.series[0]?.label}</span>
                <span>{stats.series[stats.series.length - 1]?.label}</span>
              </p>
            </div>
          )}

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <StatBars title="top pages" rows={stats.paths} />
            <StatBars title="referrers" rows={stats.referrers} empty="all direct so far" />
            <StatBars title="countries" rows={stats.countries} />
            <StatBars title="devices" rows={stats.devices} />
            <StatBars title="browsers" rows={stats.browsers} />
            <StatBars title="operating systems" rows={stats.oses} />
            <StatBars title="outbound clicks" rows={stats.outbound} empty="no outbound clicks yet" />
            <StatBars title="shell commands" rows={stats.shell} empty="nobody has used the shell yet" />
            <StatBars
              title="achievements found"
              rows={stats.achievements}
              empty="no easter eggs found yet"
            />
            <StatBars title="scroll depth" rows={stats.scroll} />
            <StatBars
              title="filter searches"
              rows={stats.searches ?? []}
              empty="nobody has used the filters yet"
            />
            {/* The most actionable panel here: every row is someone looking for
                something this site didn't show them. */}
            <StatBars
              title="searches with 0 results"
              rows={stats.zeroSearches ?? []}
              empty="every search found something"
            />
          </div>

          <section className="mt-3 border border-border p-4">
            <h2 className="mb-3 text-xs uppercase tracking-[0.15em] text-secondary">
              web vitals (p75)
            </h2>
            {stats.vitals.length === 0 ? (
              <p className="text-xs text-fg/30">no samples yet</p>
            ) : (
              <ul className="flex flex-col gap-1.5 text-xs">
                {stats.vitals.map((v) => (
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

          {/* Deliberately not filtered by the date range above: the range picks
              a window for analytics trends, but "have there been failed logins"
              is a question you want answered now, not for whatever window is
              selected. Always the most recent 25. */}
          <LoginLog rows={stats.logins ?? []} summary={stats.loginStats ?? null} />

          <p className="mt-4 text-[11px] leading-relaxed text-fg/30">
            Only visitors who accepted the consent prompt appear here, so these numbers are a
            floor, not the true total. Raw events are deleted after 90 days. This session ends
            after 5 minutes idle.
          </p>
        </div>
      ) : null}
    </div>
  );
}
